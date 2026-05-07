import type { ApiBindings } from "./env";
import { getAvailableRoleDefinition } from "./roles";

type UserRow = {
  createdAt: string;
  email: string;
  emailVerified: number | boolean;
  id: string;
  name: string;
  role: string | null;
  updatedAt: string;
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

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function normalizeRoleId(roleId: string) {
  const normalizedRoleId = roleId.trim();

  if (!normalizedRoleId) {
    throw new DatamixUserError("Role id is required.");
  }

  return normalizedRoleId;
}

function mapUserRow(row: UserRow): DatamixUserSummary {
  return {
    createdAt: row.createdAt,
    email: row.email,
    emailVerified: row.emailVerified === true || row.emailVerified === 1,
    id: row.id,
    name: row.name,
    roleId: row.role,
    updatedAt: row.updatedAt,
  };
}

export async function listDatamixUsers(env: ApiBindings) {
  const result = await env.DB.prepare(
    `
      SELECT id, name, email, emailVerified, role, createdAt, updatedAt
      FROM ${quoteIdentifier("user")}
      ORDER BY createdAt ASC, email ASC
    `.trim(),
  ).all<UserRow>();

  return result.results.map(mapUserRow);
}

export async function updateDatamixUserRole(
  env: ApiBindings,
  userId: string,
  roleId: string,
) {
  const normalizedRoleId = normalizeRoleId(roleId);
  const role = await getAvailableRoleDefinition(env, normalizedRoleId);

  if (!role) {
    throw new DatamixUserError(`Role "${normalizedRoleId}" does not exist.`, 404);
  }

  const existingUser = await env.DB
    .prepare(
      `
        SELECT id, name, email, emailVerified, role, createdAt, updatedAt
        FROM ${quoteIdentifier("user")}
        WHERE id = ?
      `.trim(),
    )
    .bind(userId)
    .first<UserRow>();

  if (!existingUser) {
    throw new DatamixUserError("User not found.", 404);
  }

  const nextUpdatedAt = new Date().toISOString();

  await env.DB
    .prepare(
      `
        UPDATE ${quoteIdentifier("user")}
        SET role = ?, updatedAt = ?
        WHERE id = ?
      `.trim(),
    )
    .bind(role.id, nextUpdatedAt, userId)
    .run();

  return {
    ...mapUserRow({
      ...existingUser,
      role: role.id,
      updatedAt: nextUpdatedAt,
    }),
    role,
  };
}
