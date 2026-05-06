import {
  isPrimitiveRecordFieldDefinition,
  type DatamixSchemaValidationIssue,
  type DatamixPrimitiveRecordFieldType,
  type DatamixPrimitiveRecordFieldDefinition,
} from "@datamix/core";

import {
  getCollectionDefinition,
  listCollectionDefinitions,
  type StoredCollectionDefinition,
} from "./collections";
import type { ApiBindings } from "./env";

type PrimitiveRecordValue = boolean | number | string | null;

type RawRecordRow = {
  created_at: string;
  id: string;
  updated_at: string;
} & Record<string, unknown>;

export type StoredCollectionRecord = {
  createdAt: string;
  id: string;
  updatedAt: string;
  values: Record<string, PrimitiveRecordValue>;
};

export type GeneratedCollectionCrudRoute = {
  collectionName: string;
  label: string;
  recordItemPath: string;
  recordsPath: string;
  supportedFieldNames: DatamixPrimitiveRecordFieldType[];
  tableName: string;
};

export class CollectionRecordError extends Error {
  readonly issues: DatamixSchemaValidationIssue[] | undefined;
  readonly statusCode: number;

  constructor(
    message: string,
    options?: {
      issues?: DatamixSchemaValidationIssue[];
      statusCode?: number;
    },
  ) {
    super(message);
    this.name = "CollectionRecordError";
    this.issues = options?.issues;
    this.statusCode = options?.statusCode ?? 400;
  }
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function createIssues() {
  return [] as DatamixSchemaValidationIssue[];
}

function buildFieldPath(fieldName: string) {
  return `record.values.${fieldName}`;
}

function listPrimitiveFields(fields: readonly DatamixPrimitiveRecordFieldDefinition[]) {
  if (fields.length === 0) {
    return "none";
  }

  return fields.map((field) => field.name).join(", ");
}

function listPrimitiveFieldTypes(fields: readonly DatamixPrimitiveRecordFieldDefinition[]) {
  const fieldTypes = new Set<DatamixPrimitiveRecordFieldType>();

  for (const field of fields) {
    fieldTypes.add(field.type);
  }

  return [...fieldTypes];
}

function assertPrimitiveCrudFields(
  fields: readonly DatamixPrimitiveRecordFieldDefinition[],
) {
  if (fields.length === 0) {
    throw new CollectionRecordError(
      "This collection has no text, number, or boolean fields to persist in the primitive CRUD slice.",
      { statusCode: 409 },
    );
  }
}

function createGeneratedRecordsPath(collectionName: string) {
  return `/collections/${encodeURIComponent(collectionName)}/records`;
}

function createGeneratedRecordItemPath(collectionName: string) {
  return `${createGeneratedRecordsPath(collectionName)}/{id}`;
}

async function resolveCollectionRecordContext(env: ApiBindings, collectionName: string) {
  const collection = await getCollectionDefinition(env, collectionName);

  if (!collection) {
    throw new CollectionRecordError("Collection definition not found.", {
      statusCode: 404,
    });
  }

  const primitiveFields = collection.definition.fields.filter(isPrimitiveRecordFieldDefinition);

  return {
    collection,
    primitiveFields,
    supportedFieldNames: listPrimitiveFields(primitiveFields),
  };
}

function normalizePrimitiveRecordValues(
  fields: readonly DatamixPrimitiveRecordFieldDefinition[],
  input: unknown,
) {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new CollectionRecordError("Record payload must be a JSON object.");
  }

  const rawValues = "values" in input ? (input as { values?: unknown }).values : undefined;

  if (typeof rawValues !== "object" || rawValues === null || Array.isArray(rawValues)) {
    throw new CollectionRecordError("Record payload must include a values object.");
  }

  const values = rawValues as Record<string, unknown>;
  const issues = createIssues();
  const allowedFieldNames = new Set(fields.map((field) => field.name));
  const normalizedValues: Record<string, PrimitiveRecordValue> = {};

  for (const key of Object.keys(values)) {
    if (!allowedFieldNames.has(key)) {
      issues.push({
        message: "This field is not editable in the primitive CRUD slice.",
        path: buildFieldPath(key),
      });
    }
  }

  for (const field of fields) {
    const rawValue = values[field.name];

    switch (field.type) {
      case "text": {
        if (rawValue === undefined || rawValue === null || rawValue === "") {
          if (field.required) {
            issues.push({
              message: "This field is required.",
              path: buildFieldPath(field.name),
            });
          }

          normalizedValues[field.name] = null;
          break;
        }

        if (typeof rawValue !== "string") {
          issues.push({
            message: "Expected a string value.",
            path: buildFieldPath(field.name),
          });
          break;
        }

        if (field.required && rawValue.trim().length === 0) {
          issues.push({
            message: "This field is required.",
            path: buildFieldPath(field.name),
          });
        }

        normalizedValues[field.name] = rawValue;
        break;
      }
      case "number": {
        if (rawValue === undefined || rawValue === null || rawValue === "") {
          if (field.required) {
            issues.push({
              message: "This field is required.",
              path: buildFieldPath(field.name),
            });
          }

          normalizedValues[field.name] = null;
          break;
        }

        if (typeof rawValue !== "number" || Number.isNaN(rawValue)) {
          issues.push({
            message: "Expected a valid number.",
            path: buildFieldPath(field.name),
          });
          break;
        }

        normalizedValues[field.name] = rawValue;
        break;
      }
      case "boolean": {
        if (rawValue === undefined) {
          normalizedValues[field.name] = false;
          break;
        }

        if (typeof rawValue !== "boolean") {
          issues.push({
            message: "Expected a boolean value.",
            path: buildFieldPath(field.name),
          });
          break;
        }

        normalizedValues[field.name] = rawValue;
        break;
      }
    }
  }

  if (issues.length > 0) {
    throw new CollectionRecordError("Record payload is invalid.", {
      issues,
      statusCode: 400,
    });
  }

  return normalizedValues;
}

function buildListRecordsSql(
  tableName: string,
  fields: readonly DatamixPrimitiveRecordFieldDefinition[],
) {
  const columns = [
    `"id"`,
    `"created_at"`,
    `"updated_at"`,
    ...fields.map((field) => quoteIdentifier(field.name)),
  ];

  return `
    SELECT ${columns.join(", ")}
    FROM ${quoteIdentifier(tableName)}
    ORDER BY "updated_at" DESC, "created_at" DESC
    LIMIT 50
  `.trim();
}

function buildReadRecordSql(
  tableName: string,
  fields: readonly DatamixPrimitiveRecordFieldDefinition[],
) {
  const columns = [
    `"id"`,
    `"created_at"`,
    `"updated_at"`,
    ...fields.map((field) => quoteIdentifier(field.name)),
  ];

  return `
    SELECT ${columns.join(", ")}
    FROM ${quoteIdentifier(tableName)}
    WHERE "id" = ?
    LIMIT 1
  `.trim();
}

function mapStoredRecord(
  row: RawRecordRow,
  fields: readonly DatamixPrimitiveRecordFieldDefinition[],
): StoredCollectionRecord {
  const values = Object.fromEntries(
    fields.map((field) => {
      const rawValue = row[field.name];

      switch (field.type) {
        case "text":
          return [field.name, typeof rawValue === "string" ? rawValue : null];
        case "number":
          return [
            field.name,
            typeof rawValue === "number"
              ? rawValue
              : rawValue === null || rawValue === undefined
                ? null
                : Number(rawValue),
          ];
        case "boolean":
          return [field.name, rawValue === null || rawValue === undefined ? false : Boolean(rawValue)];
      }
    }),
  );

  return {
    createdAt: row.created_at,
    id: row.id,
    updatedAt: row.updated_at,
    values,
  };
}

async function readStoredRecord(
  database: D1Database | D1DatabaseSession,
  tableName: string,
  fields: readonly DatamixPrimitiveRecordFieldDefinition[],
  id: string,
) {
  const row = await database
    .prepare(buildReadRecordSql(tableName, fields))
    .bind(id)
    .first<RawRecordRow>();

  return row ? mapStoredRecord(row, fields) : null;
}

function buildDeleteRecordSql(tableName: string) {
  return `
    DELETE FROM ${quoteIdentifier(tableName)}
    WHERE "id" = ?
  `.trim();
}

function createWriteStatement(
  database: D1DatabaseSession,
  tableName: string,
  fields: readonly DatamixPrimitiveRecordFieldDefinition[],
  values: Record<string, PrimitiveRecordValue>,
  recordId?: string,
) {
  const now = new Date().toISOString();
  const recordValues = fields.map((field) => values[field.name]);

  if (recordId) {
    const assignments = fields.map((field) => `${quoteIdentifier(field.name)} = ?`);

    return {
      id: recordId,
      now,
      statement: database
        .prepare(
          `
            UPDATE ${quoteIdentifier(tableName)}
            SET "updated_at" = ?, ${assignments.join(", ")}
            WHERE "id" = ?
          `.trim(),
        )
        .bind(now, ...recordValues, recordId),
    };
  }

  const id = crypto.randomUUID();
  const columns = [
    `"id"`,
    `"created_at"`,
    `"updated_at"`,
    ...fields.map((field) => quoteIdentifier(field.name)),
  ];
  const placeholders = columns.map(() => "?");

  return {
    id,
    now,
    statement: database
      .prepare(
        `
          INSERT INTO ${quoteIdentifier(tableName)} (${columns.join(", ")})
          VALUES (${placeholders.join(", ")})
        `.trim(),
      )
      .bind(id, now, now, ...recordValues),
  };
}

export async function listCollectionRecords(env: ApiBindings, collectionName: string) {
  const { collection, primitiveFields, supportedFieldNames } =
    await resolveCollectionRecordContext(env, collectionName);
  const result = await env.DB
    .prepare(buildListRecordsSql(collection.tableName, primitiveFields))
    .all<RawRecordRow>();

  return {
    collection,
    records: result.results.map((row) => mapStoredRecord(row, primitiveFields)),
    supportedFieldNames,
  };
}

export async function getCollectionRecord(
  env: ApiBindings,
  collectionName: string,
  recordId: string,
) {
  const { collection, primitiveFields, supportedFieldNames } =
    await resolveCollectionRecordContext(env, collectionName);
  const record = await readStoredRecord(env.DB, collection.tableName, primitiveFields, recordId);

  if (!record) {
    throw new CollectionRecordError("Record not found.", {
      statusCode: 404,
    });
  }

  return {
    collection,
    record,
    supportedFieldNames,
  };
}

export async function createCollectionRecord(
  env: ApiBindings,
  collectionName: string,
  input: unknown,
) {
  const { collection, primitiveFields, supportedFieldNames } =
    await resolveCollectionRecordContext(env, collectionName);
  assertPrimitiveCrudFields(primitiveFields);
  const values = normalizePrimitiveRecordValues(primitiveFields, input);
  const session = env.DB.withSession("first-primary");
  const write = createWriteStatement(session, collection.tableName, primitiveFields, values);

  await session.batch([write.statement]);

  const record = await readStoredRecord(session, collection.tableName, primitiveFields, write.id);

  if (!record) {
    throw new CollectionRecordError("Record was created but could not be reloaded.", {
      statusCode: 500,
    });
  }

  return {
    collection,
    record,
    supportedFieldNames,
  };
}

export async function updateCollectionRecord(
  env: ApiBindings,
  collectionName: string,
  recordId: string,
  input: unknown,
) {
  const { collection, primitiveFields, supportedFieldNames } =
    await resolveCollectionRecordContext(env, collectionName);
  assertPrimitiveCrudFields(primitiveFields);
  const values = normalizePrimitiveRecordValues(primitiveFields, input);
  const session = env.DB.withSession("first-primary");
  const existingRecord = await readStoredRecord(session, collection.tableName, primitiveFields, recordId);

  if (!existingRecord) {
    throw new CollectionRecordError("Record not found.", {
      statusCode: 404,
    });
  }

  const write = createWriteStatement(
    session,
    collection.tableName,
    primitiveFields,
    values,
    recordId,
  );

  await session.batch([write.statement]);

  const record = await readStoredRecord(session, collection.tableName, primitiveFields, recordId);

  if (!record) {
    throw new CollectionRecordError("Record was updated but could not be reloaded.", {
      statusCode: 500,
    });
  }

  return {
    collection,
    record,
    supportedFieldNames,
  };
}

export async function deleteCollectionRecord(
  env: ApiBindings,
  collectionName: string,
  recordId: string,
) {
  const { collection, primitiveFields, supportedFieldNames } =
    await resolveCollectionRecordContext(env, collectionName);
  const session = env.DB.withSession("first-primary");
  const existingRecord = await readStoredRecord(session, collection.tableName, primitiveFields, recordId);

  if (!existingRecord) {
    throw new CollectionRecordError("Record not found.", {
      statusCode: 404,
    });
  }

  await session.batch([
    session.prepare(buildDeleteRecordSql(collection.tableName)).bind(recordId),
  ]);

  return {
    collection,
    deletedRecordId: recordId,
    supportedFieldNames,
  };
}

function formatGeneratedCollectionCrudRoute(
  collection: StoredCollectionDefinition,
): GeneratedCollectionCrudRoute {
  const primitiveFields = collection.definition.fields.filter(isPrimitiveRecordFieldDefinition);

  return {
    collectionName: collection.definition.name,
    label: collection.definition.label,
    recordItemPath: createGeneratedRecordItemPath(collection.definition.name),
    recordsPath: createGeneratedRecordsPath(collection.definition.name),
    supportedFieldNames: listPrimitiveFieldTypes(primitiveFields),
    tableName: collection.tableName,
  };
}

export async function listGeneratedCollectionCrudRoutes(env: ApiBindings) {
  const collections = await listCollectionDefinitions(env);

  return collections.map(formatGeneratedCollectionCrudRoute);
}

export function createGeneratedCollectionCrudRoute(
  collectionName: string,
): Pick<GeneratedCollectionCrudRoute, "recordItemPath" | "recordsPath"> {
  return {
    recordItemPath: createGeneratedRecordItemPath(collectionName),
    recordsPath: createGeneratedRecordsPath(collectionName),
  };
}
