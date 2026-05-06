import {
  assertCollectionDefinition,
  createCollectionRecordTableName,
  createCollectionStorageShape,
  datamixCollectionDefinitionsTableName,
  datamixSystemColumnNames,
  planCollectionStorageMutation,
  validateCollectionDefinition,
  type DatamixCollectionDefinition,
  type DatamixCollectionStorageColumn,
  type DatamixCollectionStoragePlan,
  type DatamixCollectionStorageShape,
} from "@datamix/core";

import type { ApiBindings } from "./env";

type CollectionDefinitionRow = {
  created_at: string;
  description: string | null;
  label: string;
  name: string;
  schema_json: string;
  table_name: string;
  updated_at: string;
};

export type StoredCollectionDefinition = {
  createdAt: string;
  definition: DatamixCollectionDefinition;
  tableName: string;
  updatedAt: string;
};

type SaveCollectionDefinitionResult = {
  collection: StoredCollectionDefinition;
  plan: DatamixCollectionStoragePlan;
};

type D1StatementRunner = Pick<D1Database, "batch" | "prepare"> | Pick<D1DatabaseSession, "batch" | "prepare">;

type ColumnDescription = {
  name: string;
  notnull: 0 | 1;
  pk: 0 | 1;
  type: string;
};

export class CollectionSchemaError extends Error {
  readonly issues: { message: string; path: string }[] | undefined;
  readonly statusCode: number;

  constructor(
    message: string,
    options?: {
      issues?: { message: string; path: string }[];
      statusCode?: number;
    },
  ) {
    super(message);
    this.name = "CollectionSchemaError";
    this.issues = options?.issues;
    this.statusCode = options?.statusCode ?? 400;
  }
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function buildColumnSql(column: DatamixCollectionStorageColumn) {
  return `${quoteIdentifier(column.columnName)} ${column.sqliteType}`;
}

function buildCreateCollectionDefinitionsTableSql() {
  return `
    CREATE TABLE IF NOT EXISTS ${quoteIdentifier(datamixCollectionDefinitionsTableName)} (
      "name" TEXT PRIMARY KEY,
      "label" TEXT NOT NULL,
      "description" TEXT,
      "schema_json" TEXT NOT NULL,
      "table_name" TEXT NOT NULL UNIQUE,
      "created_at" TEXT NOT NULL,
      "updated_at" TEXT NOT NULL
    )
  `.trim();
}

function buildCreateRecordTableSql(shape: DatamixCollectionStorageShape) {
  const fieldColumns = shape.columns.map(buildColumnSql);
  const columnLines = [
    `"id" TEXT PRIMARY KEY`,
    `"created_at" TEXT NOT NULL`,
    `"updated_at" TEXT NOT NULL`,
    ...fieldColumns,
  ];

  return `
    CREATE TABLE IF NOT EXISTS ${quoteIdentifier(shape.tableName)} (
      ${columnLines.join(",\n      ")}
    )
  `.trim();
}

function buildAddColumnSql(tableName: string, column: DatamixCollectionStorageColumn) {
  return `ALTER TABLE ${quoteIdentifier(tableName)} ADD COLUMN ${buildColumnSql(column)}`;
}

function buildDropTableSql(tableName: string) {
  return `DROP TABLE IF EXISTS ${quoteIdentifier(tableName)}`;
}

function mapStoredRow(row: CollectionDefinitionRow): StoredCollectionDefinition {
  const definition = assertCollectionDefinition(JSON.parse(row.schema_json) as unknown);

  return {
    createdAt: row.created_at,
    definition,
    tableName: row.table_name,
    updatedAt: row.updated_at,
  };
}

async function ensureCollectionDefinitionsTable(database: D1StatementRunner) {
  await database.batch([database.prepare(buildCreateCollectionDefinitionsTableSql())]);
}

async function readStoredCollectionDefinition(
  database: D1StatementRunner,
  name: string,
): Promise<StoredCollectionDefinition | null> {
  const row = await database
    .prepare(
      `
        SELECT name, label, description, schema_json, table_name, created_at, updated_at
        FROM ${quoteIdentifier(datamixCollectionDefinitionsTableName)}
        WHERE name = ?
      `.trim(),
    )
    .bind(name)
    .first<CollectionDefinitionRow>();

  return row ? mapStoredRow(row) : null;
}

async function countRecords(database: D1StatementRunner, tableName: string) {
  const result = await database
    .prepare(`SELECT COUNT(*) as count FROM ${quoteIdentifier(tableName)}`)
    .first<{ count: number | string }>();

  const countValue = result?.count ?? 0;

  return typeof countValue === "number" ? countValue : Number(countValue);
}

async function readTableColumns(database: D1StatementRunner, tableName: string) {
  const rows = await database
    .prepare(`PRAGMA table_info(${quoteIdentifier(tableName)})`)
    .all<ColumnDescription>();

  return rows.results;
}

async function createRecordTableIfMissing(
  database: D1StatementRunner,
  definition: DatamixCollectionDefinition,
) {
  const expectedShape = createCollectionStorageShape(definition);
  const knownColumns = await readTableColumns(database, expectedShape.tableName);

  if (knownColumns.length > 0) {
    return;
  }

  await database.batch([database.prepare(buildCreateRecordTableSql(expectedShape))]);
}

function createSchemaUpdateStatements(
  database: D1StatementRunner,
  definition: DatamixCollectionDefinition,
  existing: StoredCollectionDefinition | null,
  plan: DatamixCollectionStoragePlan,
  now: string,
) {
  const statements: D1PreparedStatement[] = [];

  if (plan.mode === "create") {
    statements.push(database.prepare(buildCreateRecordTableSql(plan.nextShape)));
  }

  if (plan.mode === "add_columns") {
    for (const column of plan.addedColumns) {
      statements.push(database.prepare(buildAddColumnSql(plan.tableName, column)));
    }
  }

  if (plan.mode === "rebuild") {
    statements.push(database.prepare(buildDropTableSql(plan.tableName)));
    statements.push(database.prepare(buildCreateRecordTableSql(plan.nextShape)));
  }

  statements.push(
    database
      .prepare(
        `
          INSERT INTO ${quoteIdentifier(datamixCollectionDefinitionsTableName)} (
            name,
            label,
            description,
            schema_json,
            table_name,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(name) DO UPDATE SET
            label = excluded.label,
            description = excluded.description,
            schema_json = excluded.schema_json,
            table_name = excluded.table_name,
            updated_at = excluded.updated_at
        `.trim(),
      )
      .bind(
        definition.name,
        definition.label,
        definition.description ?? null,
        JSON.stringify(definition),
        createCollectionRecordTableName(definition.name),
        existing?.createdAt ?? now,
        now,
      ),
  );

  return statements;
}

function createCollectionDiffSummary(plan: DatamixCollectionStoragePlan) {
  return {
    addedFields: plan.addedColumns.map((column) => column.fieldName),
    changedFields: plan.changedColumns.map((column) => ({
      fieldName: column.fieldName,
      nextStorage: column.next.storageSignature,
      previousStorage: column.previous.storageSignature,
    })),
    mode: plan.mode,
    removedFields: plan.removedColumns.map((column) => column.fieldName),
    tableName: plan.tableName,
  };
}

function validateExistingTableShape(
  columns: ColumnDescription[],
  definition: DatamixCollectionDefinition,
) {
  const expectedShape = createCollectionStorageShape(definition);
  const actualColumns = new Map(columns.map((column) => [column.name, column]));

  for (const systemColumnName of datamixSystemColumnNames) {
    if (!actualColumns.has(systemColumnName)) {
      throw new CollectionSchemaError(
        `Existing table ${expectedShape.tableName} is missing the required system column "${systemColumnName}".`,
        { statusCode: 409 },
      );
    }
  }

  for (const column of expectedShape.columns) {
    const actualColumn = actualColumns.get(column.columnName);

    if (!actualColumn) {
      continue;
    }

    if (actualColumn.type.toUpperCase() !== column.sqliteType) {
      throw new CollectionSchemaError(
        `Existing table ${expectedShape.tableName} has an unexpected type for "${column.columnName}".`,
        { statusCode: 409 },
      );
    }
  }
}

export async function listCollectionDefinitions(env: ApiBindings) {
  await ensureCollectionDefinitionsTable(env.DB);

  const result = await env.DB
    .prepare(
      `
        SELECT name, label, description, schema_json, table_name, created_at, updated_at
        FROM ${quoteIdentifier(datamixCollectionDefinitionsTableName)}
        ORDER BY label ASC, name ASC
      `.trim(),
    )
    .all<CollectionDefinitionRow>();

  return result.results.map(mapStoredRow);
}

export async function getCollectionDefinition(env: ApiBindings, name: string) {
  await ensureCollectionDefinitionsTable(env.DB);

  return readStoredCollectionDefinition(env.DB, name);
}

export async function saveCollectionDefinition(
  env: ApiBindings,
  input: unknown,
): Promise<SaveCollectionDefinitionResult> {
  const validation = validateCollectionDefinition(input);

  if (!validation.success) {
    throw new CollectionSchemaError("Collection definition is invalid.", {
      issues: validation.issues,
      statusCode: 400,
    });
  }

  const definition = validation.data;
  const session = env.DB.withSession("first-primary");

  await ensureCollectionDefinitionsTable(session);

  const existing = await readStoredCollectionDefinition(session, definition.name);
  const plan = planCollectionStorageMutation(existing?.definition ?? null, definition);
  const currentColumns =
    plan.previousShape && (await readTableColumns(session, plan.tableName));

  if (currentColumns && currentColumns.length > 0) {
    validateExistingTableShape(currentColumns, existing?.definition ?? definition);
  }

  if (existing && plan.previousShape && (!currentColumns || currentColumns.length === 0)) {
    await createRecordTableIfMissing(session, existing.definition);
  }

  if (plan.mode === "rebuild") {
    const recordCount = await countRecords(session, plan.tableName);

    if (recordCount > 0) {
      throw new CollectionSchemaError(
        [
          `Collection "${definition.name}" already has ${recordCount} saved record${recordCount === 1 ? "" : "s"}.`,
          "This safe first-pass migration layer only auto-rebuilds empty collection tables.",
          "Additive field changes are supported in place; destructive storage changes must wait for a richer migration flow.",
        ].join(" "),
        {
          statusCode: 409,
        },
      );
    }
  }

  const now = new Date().toISOString();
  const statements = createSchemaUpdateStatements(session, definition, existing, plan, now);

  await session.batch(statements);

  return {
    collection: {
      createdAt: existing?.createdAt ?? now,
      definition,
      tableName: plan.tableName,
      updatedAt: now,
    },
    plan,
  };
}

export function formatCollectionDefinitionResponse(result: SaveCollectionDefinitionResult) {
  return {
    collection: {
      createdAt: result.collection.createdAt,
      definition: result.collection.definition,
      tableName: result.collection.tableName,
      updatedAt: result.collection.updatedAt,
    },
    plan: createCollectionDiffSummary(result.plan),
  };
}
