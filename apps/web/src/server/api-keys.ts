import {
  canDatamixApiKeyAccess,
  datamixApiKeyAccessLevels,
  type DatamixApiKeyAccessLevel,
  type DatamixApiKeySummary,
} from "@datamix/core";

import type { DatamixBindings } from "./env";
import {
  getApiKeyAuthRowBySecretHash,
  getApiKeyRow,
  insertApiKeyRow,
  listApiKeyRows,
  revokeApiKeyRow,
  touchApiKeyUsage,
  updateApiKeyRow,
  type DatamixApiKeyRow,
} from "./db/api-keys";
import type {
  PublicApiKeyAuthHookInput,
  PublicApiKeyAuthResult,
} from "./public-api-auth";

export class DatamixApiKeyError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "DatamixApiKeyError";
    this.statusCode = statusCode;
  }
}

function mapApiKeyRow(row: Omit<DatamixApiKeyRow, "secretHash">): DatamixApiKeySummary {
  return {
    accessLevel: row.accessLevel,
    createdAt: row.createdAt,
    id: row.id,
    label: row.label,
    lastUsedAt: row.lastUsedAt,
    revokedAt: row.revokedAt,
    secretPreview: row.secretPreview,
    updatedAt: row.updatedAt,
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

export async function listDatamixApiKeys(env: DatamixBindings) {
  return (await listApiKeyRows(env)).map(mapApiKeyRow);
}

export async function createDatamixApiKey(
  env: DatamixBindings,
  input: {
    accessLevel: string;
    label: string;
  },
) {
  const label = normalizeApiKeyLabel(input.label);
  const accessLevel = normalizeApiKeyAccessLevel(input.accessLevel);
  const id = `api_key_${crypto.randomUUID()}`;
  const secret = createApiKeySecret(accessLevel);
  const secretHash = await hashApiKeySecret(secret);
  const secretPreview = createSecretPreview(secret);
  const now = new Date().toISOString();

  await insertApiKeyRow(env, {
    accessLevel,
    createdAt: now,
    id,
    label,
    lastUsedAt: null,
    revokedAt: null,
    secretHash,
    secretPreview,
    updatedAt: now,
  });

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

export async function updateDatamixApiKey(
  env: DatamixBindings,
  apiKeyId: string,
  input: {
    accessLevel: string;
    label: string;
  },
) {
  const existingKey = await getApiKeyRow(env, apiKeyId);

  if (!existingKey) {
    throw new DatamixApiKeyError("API key not found.", 404);
  }

  if (existingKey.revokedAt) {
    throw new DatamixApiKeyError("Revoked API keys cannot be edited.");
  }

  const label = normalizeApiKeyLabel(input.label);
  const accessLevel = normalizeApiKeyAccessLevel(input.accessLevel);
  const now = new Date().toISOString();

  await updateApiKeyRow(env, {
    accessLevel,
    apiKeyId,
    label,
    updatedAt: now,
  });

  return mapApiKeyRow({
    ...existingKey,
    accessLevel,
    label,
    updatedAt: now,
  });
}

export async function revokeDatamixApiKey(env: DatamixBindings, apiKeyId: string) {
  const existingKey = await getApiKeyRow(env, apiKeyId);

  if (!existingKey) {
    throw new DatamixApiKeyError("API key not found.", 404);
  }

  if (existingKey.revokedAt) {
    return mapApiKeyRow(existingKey);
  }

  const now = new Date().toISOString();

  await revokeApiKeyRow(env, {
    apiKeyId,
    revokedAt: now,
    updatedAt: now,
  });

  return mapApiKeyRow({
    ...existingKey,
    revokedAt: now,
    updatedAt: now,
  });
}

export async function authorizeManagedPublicApiKey(
  input: PublicApiKeyAuthHookInput,
): Promise<PublicApiKeyAuthResult> {
  const secretHash = await hashApiKeySecret(input.apiKey);
  const key = await getApiKeyAuthRowBySecretHash(input.env, secretHash);

  if (!key || key.revokedAt) {
    return {
      reason: "invalid",
      success: false,
    };
  }

  if (!canDatamixApiKeyAccess(key.accessLevel, input.permission)) {
    return {
      reason: "insufficient-access",
      success: false,
    };
  }

  const now = new Date().toISOString();

  await touchApiKeyUsage(input.env, {
    apiKeyId: key.id,
    lastUsedAt: now,
    updatedAt: now,
  });

  return {
    principal: {
      accessLevel: key.accessLevel,
      type: "api-key",
    },
    success: true,
  };
}
