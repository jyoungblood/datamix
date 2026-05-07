import {
  canDatamixApiKeyAccess,
  datamixApiKeyAccessLevels,
  datamixApiKeysTableName,
  type DatamixApiKeyAccessLevel,
  type DatamixApiKeySummary,
} from "@datamix/core";

import type { ApiBindings } from "./env";
import type { PublicApiKeyAuthHookInput, PublicApiPrincipal } from "./public-api-auth";

type D1StatementRunner =
  | Pick<D1Database, "batch" | "prepare">
  | Pick<D1DatabaseSession, "batch" | "prepare">;

type ApiKeyRow = {
  access_level: DatamixApiKeyAccessLevel;
  created_at: string;
  id: string;
  label: string;
  last_used_at: string | null;
  revoked_at: string | null;
  secret_hash: string;
  secret_preview: string;
  updated_at: string;
};

export class DatamixApiKeyError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "DatamixApiKeyError";
    this.statusCode = statusCode;
  }
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function buildCreateApiKeysTableSql() {
  return `
    CREATE TABLE IF NOT EXISTS ${quoteIdentifier(datamixApiKeysTableName)} (
      "id" TEXT PRIMARY KEY,
      "label" TEXT NOT NULL,
      "access_level" TEXT NOT NULL,
      "secret_hash" TEXT NOT NULL UNIQUE,
      "secret_preview" TEXT NOT NULL,
      "created_at" TEXT NOT NULL,
      "updated_at" TEXT NOT NULL,
      "last_used_at" TEXT,
      "revoked_at" TEXT
    )
  `.trim();
}

async function ensureApiKeysTable(database: D1StatementRunner) {
  await database.batch([database.prepare(buildCreateApiKeysTableSql())]);
}

function mapApiKeyRow(row: Pick<ApiKeyRow, Exclude<keyof ApiKeyRow, "secret_hash">>): DatamixApiKeySummary {
  return {
    accessLevel: row.access_level,
    createdAt: row.created_at,
    id: row.id,
    label: row.label,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
    secretPreview: row.secret_preview,
    updatedAt: row.updated_at,
  };
}

function normalizeApiKeyLabel(label: string) {
  const normalizedLabel = label.trim();

  if (!normalizedLabel) {
    throw new DatamixApiKeyError("API key label is required.");
  }

  if (normalizedLabel.length > 80) {
    throw new DatamixApiKeyError("API key label must be 80 characters or fewer.");
  }

  return normalizedLabel;
}

function normalizeApiKeyAccessLevel(accessLevel: string): DatamixApiKeyAccessLevel {
  if (datamixApiKeyAccessLevels.includes(accessLevel as DatamixApiKeyAccessLevel)) {
    return accessLevel as DatamixApiKeyAccessLevel;
  }

  throw new DatamixApiKeyError("API key access level must be read or write.");
}

function createRandomToken(byteLength: number) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);

  let token = "";

  for (const byte of bytes) {
    token += byte.toString(16).padStart(2, "0");
  }

  return token;
}

function createApiKeySecret(accessLevel: DatamixApiKeyAccessLevel) {
  return `dmx_${accessLevel}_${createRandomToken(24)}`;
}

function createSecretPreview(secret: string) {
  return `${secret.slice(0, 16)}...`;
}

async function hashApiKeySecret(secret: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  const bytes = new Uint8Array(digest);

  let hex = "";

  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }

  return hex;
}

export async function listDatamixApiKeys(env: ApiBindings) {
  await ensureApiKeysTable(env.DB);

  const result = await env.DB.prepare(
    `
      SELECT id, label, access_level, secret_preview, created_at, updated_at, last_used_at, revoked_at
      FROM ${quoteIdentifier(datamixApiKeysTableName)}
      ORDER BY revoked_at IS NOT NULL ASC, created_at DESC, label ASC
    `.trim(),
  ).all<Omit<ApiKeyRow, "secret_hash">>();

  return result.results.map(mapApiKeyRow);
}

export async function createDatamixApiKey(
  env: ApiBindings,
  input: {
    accessLevel: string;
    label: string;
  },
) {
  await ensureApiKeysTable(env.DB);

  const label = normalizeApiKeyLabel(input.label);
  const accessLevel = normalizeApiKeyAccessLevel(input.accessLevel);
  const id = `api_key_${crypto.randomUUID()}`;
  const secret = createApiKeySecret(accessLevel);
  const secretHash = await hashApiKeySecret(secret);
  const secretPreview = createSecretPreview(secret);
  const now = new Date().toISOString();

  await env.DB
    .prepare(
      `
        INSERT INTO ${quoteIdentifier(datamixApiKeysTableName)} (
          id,
          label,
          access_level,
          secret_hash,
          secret_preview,
          created_at,
          updated_at,
          last_used_at,
          revoked_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL)
      `.trim(),
    )
    .bind(id, label, accessLevel, secretHash, secretPreview, now, now)
    .run();

  return {
    apiKey: {
      accessLevel,
      createdAt: now,
      id,
      label,
      lastUsedAt: null,
      revokedAt: null,
      secretPreview,
      updatedAt: now,
    },
    secret,
  };
}

async function getDatamixApiKeyRow(env: ApiBindings, apiKeyId: string) {
  await ensureApiKeysTable(env.DB);

  return env.DB
    .prepare(
      `
        SELECT id, label, access_level, secret_hash, secret_preview, created_at, updated_at, last_used_at, revoked_at
        FROM ${quoteIdentifier(datamixApiKeysTableName)}
        WHERE id = ?
      `.trim(),
    )
    .bind(apiKeyId)
    .first<ApiKeyRow>();
}

export async function updateDatamixApiKey(
  env: ApiBindings,
  apiKeyId: string,
  input: {
    accessLevel: string;
    label: string;
  },
) {
  const existingKey = await getDatamixApiKeyRow(env, apiKeyId);

  if (!existingKey) {
    throw new DatamixApiKeyError("API key not found.", 404);
  }

  if (existingKey.revoked_at) {
    throw new DatamixApiKeyError("Revoked API keys cannot be edited.");
  }

  const label = normalizeApiKeyLabel(input.label);
  const accessLevel = normalizeApiKeyAccessLevel(input.accessLevel);
  const now = new Date().toISOString();

  await env.DB
    .prepare(
      `
        UPDATE ${quoteIdentifier(datamixApiKeysTableName)}
        SET label = ?, access_level = ?, updated_at = ?
        WHERE id = ?
      `.trim(),
    )
    .bind(label, accessLevel, now, apiKeyId)
    .run();

  return mapApiKeyRow({
    ...existingKey,
    access_level: accessLevel,
    label,
    updated_at: now,
  });
}

export async function revokeDatamixApiKey(env: ApiBindings, apiKeyId: string) {
  const existingKey = await getDatamixApiKeyRow(env, apiKeyId);

  if (!existingKey) {
    throw new DatamixApiKeyError("API key not found.", 404);
  }

  if (existingKey.revoked_at) {
    return mapApiKeyRow(existingKey);
  }

  const now = new Date().toISOString();

  await env.DB
    .prepare(
      `
        UPDATE ${quoteIdentifier(datamixApiKeysTableName)}
        SET revoked_at = ?, updated_at = ?
        WHERE id = ?
      `.trim(),
    )
    .bind(now, now, apiKeyId)
    .run();

  return mapApiKeyRow({
    ...existingKey,
    revoked_at: now,
    updated_at: now,
  });
}

export async function authorizeManagedPublicApiKey(
  input: PublicApiKeyAuthHookInput,
): Promise<PublicApiPrincipal | null> {
  await ensureApiKeysTable(input.env.DB);

  const secretHash = await hashApiKeySecret(input.apiKey);
  const key = await input.env.DB
    .prepare(
      `
        SELECT id, access_level, revoked_at
        FROM ${quoteIdentifier(datamixApiKeysTableName)}
        WHERE secret_hash = ?
      `.trim(),
    )
    .bind(secretHash)
    .first<Pick<ApiKeyRow, "id" | "access_level" | "revoked_at">>();

  if (!key || key.revoked_at) {
    return null;
  }

  if (!canDatamixApiKeyAccess(key.access_level, input.permission)) {
    return null;
  }

  const now = new Date().toISOString();

  void input.env.DB
    .prepare(
      `
        UPDATE ${quoteIdentifier(datamixApiKeysTableName)}
        SET last_used_at = ?, updated_at = ?
        WHERE id = ?
      `.trim(),
    )
    .bind(now, now, key.id)
    .run();

  return {
    accessLevel: key.access_level,
    type: "api-key",
  };
}
