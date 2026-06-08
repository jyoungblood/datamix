import type { DatamixBindings } from "./env";
import { getUserRow, listUserRows, updateUserRoleRow } from "./db/users";
import { getAvailableRoleDefinition } from "./roles";

type UserRow = {
  createdAt: Date | number | string;
  email: string;
  emailVerified: number | boolean;
  id: string;
  name: string;
  role: string | null;
  updatedAt: Date | number | string;
};

export type DatamixUserSummary = {
  createdAt: string;
  email: string;
  emailVerified: boolean;
  id: string;
  name: string;
  roleId: string | null;
  updatedAt: string;
};

export class DatamixUserError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "DatamixUserError";
    this.statusCode = statusCode;
  }
}

function normalizeRoleId(roleId: string) {
  const normalizedRoleId = roleId.trim();

  if (!normalizedRoleId) {
    throw new DatamixUserError("Role id is required.");
  }

  return normalizedRoleId;
}

function formatAuthTimestamp(value: Date | number | string) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "number") {
    return new Date(value).toISOString();
  }

  return value;
}

function mapUserRow(row: UserRow): DatamixUserSummary {
  return {
    createdAt: formatAuthTimestamp(row.createdAt),
    email: row.email,
    emailVerified: row.emailVerified === true || row.emailVerified === 1,
    id: row.id,
    name: row.name,
    roleId: row.role,
    updatedAt: formatAuthTimestamp(row.updatedAt),
  };
}

export async function listDatamixUsers(env: DatamixBindings) {
  return (await listUserRows(env)).map(mapUserRow);
}

export async function updateDatamixUserRole(
  env: DatamixBindings,
  userId: string,
  roleId: string,
) {
  const normalizedRoleId = normalizeRoleId(roleId);
  const role = await getAvailableRoleDefinition(env, normalizedRoleId);

  if (!role) {
    throw new DatamixUserError(`Role "${normalizedRoleId}" does not exist.`, 404);
  }

  const existingUser = await getUserRow(env, userId);

  if (!existingUser) {
    throw new DatamixUserError("User not found.", 404);
  }

  const nextUpdatedAt = new Date();

  await updateUserRoleRow(env, {
    roleId: role.id,
    updatedAt: nextUpdatedAt,
    userId,
  });

  return {
    ...mapUserRow({
      ...existingUser,
      role: role.id,
      updatedAt: nextUpdatedAt,
    }),
    role,
  };
}
