import { asc, desc, eq, sql } from "drizzle-orm";
import type { DatamixApiKeyAccessLevel } from "@datamix/core";

import type { DatamixBindings } from "../env";
import { createDb } from "./index";
import { datamixApiKeys } from "./schema";

export type DatamixApiKeyRow = {
  accessLevel: DatamixApiKeyAccessLevel;
  createdAt: string;
  id: string;
  label: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  secretHash: string;
  secretPreview: string;
  updatedAt: string;
};

export type DatamixApiKeyAuthRow = Pick<
  DatamixApiKeyRow,
  "accessLevel" | "id" | "revokedAt"
>;

export async function listApiKeyRows(env: DatamixBindings) {
  return createDb(env)
    .select({
      accessLevel: datamixApiKeys.accessLevel,
      createdAt: datamixApiKeys.createdAt,
      id: datamixApiKeys.id,
      label: datamixApiKeys.label,
      lastUsedAt: datamixApiKeys.lastUsedAt,
      revokedAt: datamixApiKeys.revokedAt,
      secretPreview: datamixApiKeys.secretPreview,
      updatedAt: datamixApiKeys.updatedAt,
    })
    .from(datamixApiKeys)
    .orderBy(
      sql`${datamixApiKeys.revokedAt} IS NOT NULL`,
      desc(datamixApiKeys.createdAt),
      asc(datamixApiKeys.label),
    ) as Promise<Omit<DatamixApiKeyRow, "secretHash">[]>;
}

export async function insertApiKeyRow(
  env: DatamixBindings,
  row: DatamixApiKeyRow,
) {
  await createDb(env).insert(datamixApiKeys).values(row);
}

export async function getApiKeyRow(env: DatamixBindings, apiKeyId: string) {
  const [row] = await createDb(env)
    .select()
    .from(datamixApiKeys)
    .where(eq(datamixApiKeys.id, apiKeyId))
    .limit(1);

  return (row as DatamixApiKeyRow | undefined) ?? null;
}

export async function updateApiKeyRow(
  env: DatamixBindings,
  input: {
    accessLevel: DatamixApiKeyAccessLevel;
    apiKeyId: string;
    label: string;
    updatedAt: string;
  },
) {
  await createDb(env)
    .update(datamixApiKeys)
    .set({
      accessLevel: input.accessLevel,
      label: input.label,
      updatedAt: input.updatedAt,
    })
    .where(eq(datamixApiKeys.id, input.apiKeyId));
}

export async function revokeApiKeyRow(
  env: DatamixBindings,
  input: {
    apiKeyId: string;
    revokedAt: string;
    updatedAt: string;
  },
) {
  await createDb(env)
    .update(datamixApiKeys)
    .set({
      revokedAt: input.revokedAt,
      updatedAt: input.updatedAt,
    })
    .where(eq(datamixApiKeys.id, input.apiKeyId));
}

export async function getApiKeyAuthRowBySecretHash(
  env: DatamixBindings,
  secretHash: string,
) {
  const [row] = await createDb(env)
    .select({
      accessLevel: datamixApiKeys.accessLevel,
      id: datamixApiKeys.id,
      revokedAt: datamixApiKeys.revokedAt,
    })
    .from(datamixApiKeys)
    .where(eq(datamixApiKeys.secretHash, secretHash))
    .limit(1);

  return (row as DatamixApiKeyAuthRow | undefined) ?? null;
}

export function touchApiKeyUsage(
  env: DatamixBindings,
  input: {
    apiKeyId: string;
    lastUsedAt: string;
    updatedAt: string;
  },
) {
  return createDb(env)
    .update(datamixApiKeys)
    .set({
      lastUsedAt: input.lastUsedAt,
      updatedAt: input.updatedAt,
    })
    .where(eq(datamixApiKeys.id, input.apiKeyId));
}
