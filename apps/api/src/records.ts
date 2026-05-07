import {
  isRecordCrudFieldDefinition,
  type DatamixSchemaValidationIssue,
  type DatamixRecordCrudFieldType,
  type DatamixRecordCrudFieldDefinition,
} from "@datamix/core";

import {
  getCollectionDefinition,
  listCollectionDefinitions,
  type StoredCollectionDefinition,
} from "./collections";
import type { ApiBindings } from "./env";

type StoredRecordValue = boolean | number | string | string[] | null;

type RawRecordRow = {
  created_at: string;
  id: string;
  updated_at: string;
} & Record<string, unknown>;

export type StoredCollectionRecord = {
  createdAt: string;
  id: string;
  updatedAt: string;
  values: Record<string, StoredRecordValue>;
};

export type GeneratedCollectionCrudRoute = {
  collectionName: string;
  label: string;
  recordItemPath: string;
  recordsPath: string;
  supportedFieldNames: DatamixRecordCrudFieldType[];
  tableName: string;
};

export type PublicCollectionCrudRoute = Omit<GeneratedCollectionCrudRoute, "tableName">;

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

function listPersistedFields(fields: readonly DatamixRecordCrudFieldDefinition[]) {
  if (fields.length === 0) {
    return "none";
  }

  return fields.map((field) => field.name).join(", ");
}

function listPersistedFieldTypes(fields: readonly DatamixRecordCrudFieldDefinition[]) {
  const fieldTypes = new Set<DatamixRecordCrudFieldType>();

  for (const field of fields) {
    fieldTypes.add(field.type);
  }

  return [...fieldTypes];
}

function assertPersistedCrudFields(
  fields: readonly DatamixRecordCrudFieldDefinition[],
) {
  if (fields.length === 0) {
    throw new CollectionRecordError(
      "This collection has no text, number, boolean, date, select, relationship, richText, or markdown fields to persist in the current CRUD slice.",
      { statusCode: 409 },
    );
  }
}

function isValidDateOnlyString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return false;
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));

  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

function parseStoredRelationshipList(rawValue: unknown) {
  if (typeof rawValue !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function serializeStoredValue(
  field: DatamixRecordCrudFieldDefinition,
  value: StoredRecordValue,
) {
  if (field.type === "relationship" && field.multiple) {
    return JSON.stringify(Array.isArray(value) ? value : []);
  }

  return value;
}

function createGeneratedRecordsPath(collectionName: string) {
  return `/collections/${encodeURIComponent(collectionName)}/records`;
}

function createGeneratedRecordItemPath(collectionName: string) {
  return `${createGeneratedRecordsPath(collectionName)}/{id}`;
}

function createPublicGeneratedRecordsPath(collectionName: string) {
  return `/api${createGeneratedRecordsPath(collectionName)}`;
}

function createPublicGeneratedRecordItemPath(collectionName: string) {
  return `${createPublicGeneratedRecordsPath(collectionName)}/{id}`;
}

async function resolveCollectionRecordContext(env: ApiBindings, collectionName: string) {
  const collection = await getCollectionDefinition(env, collectionName);

  if (!collection) {
    throw new CollectionRecordError("Collection definition not found.", {
      statusCode: 404,
    });
  }

  const persistedFields = collection.definition.fields.filter(isRecordCrudFieldDefinition);

  return {
    collection,
    persistedFields,
    supportedFieldNames: listPersistedFields(persistedFields),
  };
}

function normalizePersistedRecordValues(
  fields: readonly DatamixRecordCrudFieldDefinition[],
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
  const normalizedValues: Record<string, StoredRecordValue> = {};

  for (const key of Object.keys(values)) {
    if (!allowedFieldNames.has(key)) {
      issues.push({
        message: "This field is not editable in the current CRUD slice.",
        path: buildFieldPath(key),
      });
    }
  }

  for (const field of fields) {
    const rawValue = values[field.name];

    switch (field.type) {
      case "text":
      case "date":
      case "select":
      case "richText":
      case "markdown": {
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

        const normalizedValue = rawValue.trim();

        if (field.type === "date" && !isValidDateOnlyString(normalizedValue)) {
          issues.push({
            message: "Expected a valid YYYY-MM-DD date.",
            path: buildFieldPath(field.name),
          });
          break;
        }

        if (
          field.type === "select" &&
          !field.options.some((option) => option.value === normalizedValue)
        ) {
          issues.push({
            message: "Expected one of the saved select options.",
            path: buildFieldPath(field.name),
          });
          break;
        }

        normalizedValues[field.name] = normalizedValue;
        break;
      }
      case "relationship": {
        if (field.multiple) {
          if (rawValue === undefined || rawValue === null) {
            if (field.required) {
              issues.push({
                message: "This field is required.",
                path: buildFieldPath(field.name),
              });
            }

            normalizedValues[field.name] = [];
            break;
          }

          if (!Array.isArray(rawValue)) {
            issues.push({
              message: "Expected an array of relationship ids.",
              path: buildFieldPath(field.name),
            });
            break;
          }

          const relationshipIds = rawValue.map((item) =>
            typeof item === "string" ? item.trim() : item,
          );

          if (
            relationshipIds.some(
              (item) => typeof item !== "string" || item.length === 0,
            )
          ) {
            issues.push({
              message: "Each relationship id must be a non-empty string.",
              path: buildFieldPath(field.name),
            });
            break;
          }

          if (field.required && relationshipIds.length === 0) {
            issues.push({
              message: "This field is required.",
              path: buildFieldPath(field.name),
            });
          }

          normalizedValues[field.name] = relationshipIds as string[];
          break;
        }

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
            message: "Expected a relationship id string.",
            path: buildFieldPath(field.name),
          });
          break;
        }

        const normalizedValue = rawValue.trim();

        if (field.required && normalizedValue.length === 0) {
          issues.push({
            message: "This field is required.",
            path: buildFieldPath(field.name),
          });
        }

        normalizedValues[field.name] = normalizedValue.length > 0 ? normalizedValue : null;
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
  fields: readonly DatamixRecordCrudFieldDefinition[],
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
  fields: readonly DatamixRecordCrudFieldDefinition[],
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
  fields: readonly DatamixRecordCrudFieldDefinition[],
): StoredCollectionRecord {
  const values = Object.fromEntries(
    fields.map((field) => {
      const rawValue = row[field.name];

      switch (field.type) {
        case "text":
        case "date":
        case "select":
        case "richText":
        case "markdown":
          return [field.name, typeof rawValue === "string" ? rawValue : null];
        case "relationship":
          return field.multiple
            ? [field.name, parseStoredRelationshipList(rawValue)]
            : [field.name, typeof rawValue === "string" ? rawValue : null];
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
  fields: readonly DatamixRecordCrudFieldDefinition[],
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
  fields: readonly DatamixRecordCrudFieldDefinition[],
  values: Record<string, StoredRecordValue>,
  recordId?: string,
) {
  const now = new Date().toISOString();
  const recordValues = fields.map((field) =>
    serializeStoredValue(field, values[field.name] ?? null),
  );

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
  const { collection, persistedFields, supportedFieldNames } =
    await resolveCollectionRecordContext(env, collectionName);
  const result = await env.DB
    .prepare(buildListRecordsSql(collection.tableName, persistedFields))
    .all<RawRecordRow>();

  return {
    collection,
    records: result.results.map((row) => mapStoredRecord(row, persistedFields)),
    supportedFieldNames,
  };
}

export async function getCollectionRecord(
  env: ApiBindings,
  collectionName: string,
  recordId: string,
) {
  const { collection, persistedFields, supportedFieldNames } =
    await resolveCollectionRecordContext(env, collectionName);
  const record = await readStoredRecord(env.DB, collection.tableName, persistedFields, recordId);

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
  const { collection, persistedFields, supportedFieldNames } =
    await resolveCollectionRecordContext(env, collectionName);
  assertPersistedCrudFields(persistedFields);
  const values = normalizePersistedRecordValues(persistedFields, input);
  const session = env.DB.withSession("first-primary");
  const write = createWriteStatement(session, collection.tableName, persistedFields, values);

  await session.batch([write.statement]);

  const record = await readStoredRecord(session, collection.tableName, persistedFields, write.id);

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
  const { collection, persistedFields, supportedFieldNames } =
    await resolveCollectionRecordContext(env, collectionName);
  assertPersistedCrudFields(persistedFields);
  const values = normalizePersistedRecordValues(persistedFields, input);
  const session = env.DB.withSession("first-primary");
  const existingRecord = await readStoredRecord(session, collection.tableName, persistedFields, recordId);

  if (!existingRecord) {
    throw new CollectionRecordError("Record not found.", {
      statusCode: 404,
    });
  }

  const write = createWriteStatement(
    session,
    collection.tableName,
    persistedFields,
    values,
    recordId,
  );

  await session.batch([write.statement]);

  const record = await readStoredRecord(session, collection.tableName, persistedFields, recordId);

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
  const { collection, persistedFields, supportedFieldNames } =
    await resolveCollectionRecordContext(env, collectionName);
  const session = env.DB.withSession("first-primary");
  const existingRecord = await readStoredRecord(session, collection.tableName, persistedFields, recordId);

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
  const persistedFields = collection.definition.fields.filter(isRecordCrudFieldDefinition);

  return {
    collectionName: collection.definition.name,
    label: collection.definition.label,
    recordItemPath: createGeneratedRecordItemPath(collection.definition.name),
    recordsPath: createGeneratedRecordsPath(collection.definition.name),
    supportedFieldNames: listPersistedFieldTypes(persistedFields),
    tableName: collection.tableName,
  };
}

function formatPublicCollectionCrudRoute(
  collection: StoredCollectionDefinition,
): PublicCollectionCrudRoute {
  const persistedFields = collection.definition.fields.filter(isRecordCrudFieldDefinition);

  return {
    collectionName: collection.definition.name,
    label: collection.definition.label,
    recordItemPath: createPublicGeneratedRecordItemPath(collection.definition.name),
    recordsPath: createPublicGeneratedRecordsPath(collection.definition.name),
    supportedFieldNames: listPersistedFieldTypes(persistedFields),
  };
}

export async function listGeneratedCollectionCrudRoutes(env: ApiBindings) {
  const collections = await listCollectionDefinitions(env);

  return collections.map(formatGeneratedCollectionCrudRoute);
}

export async function listPublicCollectionCrudRoutes(env: ApiBindings) {
  const collections = await listCollectionDefinitions(env);

  return collections.map(formatPublicCollectionCrudRoute);
}

export async function getPublicCollectionCrudRoute(
  env: ApiBindings,
  collectionName: string,
): Promise<PublicCollectionCrudRoute> {
  const { collection, persistedFields } = await resolveCollectionRecordContext(
    env,
    collectionName,
  );

  return {
    collectionName: collection.definition.name,
    label: collection.definition.label,
    recordItemPath: createPublicGeneratedRecordItemPath(collection.definition.name),
    recordsPath: createPublicGeneratedRecordsPath(collection.definition.name),
    supportedFieldNames: listPersistedFieldTypes(persistedFields),
  };
}

export function createGeneratedCollectionCrudRoute(
  collectionName: string,
): Pick<GeneratedCollectionCrudRoute, "recordItemPath" | "recordsPath"> {
  return {
    recordItemPath: createGeneratedRecordItemPath(collectionName),
    recordsPath: createGeneratedRecordsPath(collectionName),
  };
}

export function createPublicCollectionCrudRoute(
  collectionName: string,
): Pick<PublicCollectionCrudRoute, "recordItemPath" | "recordsPath"> {
  return {
    recordItemPath: createPublicGeneratedRecordItemPath(collectionName),
    recordsPath: createPublicGeneratedRecordsPath(collectionName),
  };
}
