import {
  createDatamixRoleDefinition,
  getDatamixRolePreset,
  isDatamixRolePresetId,
  listDatamixRoleDefinitions,
  validateDatamixRoleDefinition,
  type DatamixRoleDefinition,
  type DatamixSchemaValidationIssue,
} from "@datamix/core";

import type { DatamixBindings } from "./env";
import {
  getCustomRoleRow,
  listCustomRoleRows,
  upsertCustomRoleRow,
  type DatamixRoleRow,
} from "./db/roles";

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

function mapRoleRow(row: DatamixRoleRow): DatamixRoleDefinition {
  return createDatamixRoleDefinition({
    description: row.description,
    id: row.id,
    label: row.label,
    permissions: parsePermissionsJson(row.permissionsJson),
    system: false,
  });
}

export async function listCustomRoleDefinitions(env: DatamixBindings) {
  return (await listCustomRoleRows(env)).map(mapRoleRow);
}

export async function listAvailableRoleDefinitions(env: DatamixBindings) {
  return listDatamixRoleDefinitions(await listCustomRoleDefinitions(env));
}

export async function getAvailableRoleDefinition(
  env: DatamixBindings,
  roleId: string,
): Promise<DatamixRoleDefinition | null> {
  const normalizedRoleId = roleId.trim();

  if (!normalizedRoleId) {
    return null;
  }

  if (isDatamixRolePresetId(normalizedRoleId)) {
    return getDatamixRolePreset(normalizedRoleId);
  }

  const row = await getCustomRoleRow(env, normalizedRoleId);

  return row ? mapRoleRow(row) : null;
}

export async function saveCustomRoleDefinition(
  env: DatamixBindings,
  input: unknown,
) {
  const parsed = validateDatamixRoleDefinition(input);

  if (!parsed.success) {
    throw new DatamixRoleError("Role definition needs attention.", {
      issues: parsed.issues,
      statusCode: 400,
    });
  }

  const now = new Date().toISOString();
  const existingRow = await getCustomRoleRow(env, parsed.data.id);

  await upsertCustomRoleRow(env, {
    createdAt: existingRow?.createdAt ?? now,
    description: parsed.data.description,
    id: parsed.data.id,
    label: parsed.data.label,
    permissionsJson: JSON.stringify(parsed.data.permissions),
    updatedAt: now,
  });

  return parsed.data;
}
