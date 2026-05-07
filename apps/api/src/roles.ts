import {
  createDatamixRoleDefinition,
  datamixRolesTableName,
  getDatamixRolePreset,
  isDatamixRolePresetId,
  listDatamixRoleDefinitions,
  validateDatamixRoleDefinition,
  type DatamixRoleDefinition,
  type DatamixSchemaValidationIssue,
} from "@datamix/core";

import type { ApiBindings } from "./env";

type D1StatementRunner =
  | Pick<D1Database, "batch" | "prepare">
  | Pick<D1DatabaseSession, "batch" | "prepare">;

type RoleRow = {
  created_at: string;
  description: string;
  id: string;
  label: string;
  permissions_json: string;
  updated_at: string;
};

export class DatamixRoleError extends Error {
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
    this.name = "DatamixRoleError";
    this.issues = options?.issues;
    this.statusCode = options?.statusCode ?? 400;
  }
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function buildCreateRolesTableSql() {
  return `
    CREATE TABLE IF NOT EXISTS ${quoteIdentifier(datamixRolesTableName)} (
      "id" TEXT PRIMARY KEY,
      "label" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "permissions_json" TEXT NOT NULL,
      "created_at" TEXT NOT NULL,
      "updated_at" TEXT NOT NULL
    )
  `.trim();
}

async function ensureRolesTable(database: D1StatementRunner) {
  await database.batch([database.prepare(buildCreateRolesTableSql())]);
}

function parsePermissionsJson(rawValue: string) {
  try {
    const parsed = JSON.parse(rawValue) as unknown;

    return Array.isArray(parsed)
      ? parsed.filter((permission): permission is string => typeof permission === "string")
      : [];
  } catch {
    return [];
  }
}

function mapRoleRow(row: RoleRow): DatamixRoleDefinition {
  return createDatamixRoleDefinition({
    description: row.description,
    id: row.id,
    label: row.label,
    permissions: parsePermissionsJson(row.permissions_json),
    system: false,
  });
}

export async function listCustomRoleDefinitions(env: ApiBindings) {
  await ensureRolesTable(env.DB);

  const result = await env.DB.prepare(
    `
      SELECT id, label, description, permissions_json, created_at, updated_at
      FROM ${quoteIdentifier(datamixRolesTableName)}
      ORDER BY label ASC, id ASC
    `.trim(),
  ).all<RoleRow>();

  return result.results.map(mapRoleRow);
}

export async function listAvailableRoleDefinitions(env: ApiBindings) {
  return listDatamixRoleDefinitions(await listCustomRoleDefinitions(env));
}

export async function getAvailableRoleDefinition(
  env: ApiBindings,
  roleId: string,
): Promise<DatamixRoleDefinition | null> {
  const normalizedRoleId = roleId.trim();

  if (!normalizedRoleId) {
    return null;
  }

  if (isDatamixRolePresetId(normalizedRoleId)) {
    return getDatamixRolePreset(normalizedRoleId);
  }

  await ensureRolesTable(env.DB);

  const row = await env.DB
    .prepare(
      `
        SELECT id, label, description, permissions_json, created_at, updated_at
        FROM ${quoteIdentifier(datamixRolesTableName)}
        WHERE id = ?
      `.trim(),
    )
    .bind(normalizedRoleId)
    .first<RoleRow>();

  return row ? mapRoleRow(row) : null;
}

export async function saveCustomRoleDefinition(
  env: ApiBindings,
  input: unknown,
) {
  const parsed = validateDatamixRoleDefinition(input);

  if (!parsed.success) {
    throw new DatamixRoleError("Role definition needs attention.", {
      issues: parsed.issues,
      statusCode: 400,
    });
  }

  await ensureRolesTable(env.DB);

  const now = new Date().toISOString();
  const existingRow = await env.DB
    .prepare(
      `
        SELECT created_at
        FROM ${quoteIdentifier(datamixRolesTableName)}
        WHERE id = ?
      `.trim(),
    )
    .bind(parsed.data.id)
    .first<{ created_at: string }>();

  await env.DB.batch([
    env.DB
      .prepare(
        `
          INSERT INTO ${quoteIdentifier(datamixRolesTableName)} (
            id,
            label,
            description,
            permissions_json,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            label = excluded.label,
            description = excluded.description,
            permissions_json = excluded.permissions_json,
            updated_at = excluded.updated_at
        `.trim(),
      )
      .bind(
        parsed.data.id,
        parsed.data.label,
        parsed.data.description,
        JSON.stringify(parsed.data.permissions),
        existingRow?.created_at ?? now,
        now,
      ),
  ]);

  return parsed.data;
}
