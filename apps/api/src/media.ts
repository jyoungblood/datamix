import {
  createMediaAssetStorageKey,
  datamixMediaAssetsTableName,
  type DatamixMediaAsset,
} from "@datamix/core";

import type { DatamixSession } from "./auth";
import type { ApiBindings } from "./env";

type MediaAssetRow = {
  byte_size: number | string;
  created_at: string;
  file_name: string;
  id: string;
  mime_type: string;
  storage_key: string;
  updated_at: string;
  uploaded_by_user_email: string | null;
  uploaded_by_user_id: string | null;
};

type D1StatementRunner =
  | Pick<D1Database, "batch" | "prepare">
  | Pick<D1DatabaseSession, "batch" | "prepare">;

export class MediaAssetError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "MediaAssetError";
    this.statusCode = statusCode;
  }
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function mapStoredAsset(row: MediaAssetRow): DatamixMediaAsset {
  return {
    byteSize:
      typeof row.byte_size === "number" ? row.byte_size : Number(row.byte_size),
    createdAt: row.created_at,
    fileName: row.file_name,
    id: row.id,
    mimeType: row.mime_type,
    storageKey: row.storage_key,
    updatedAt: row.updated_at,
    uploadedByUserEmail: row.uploaded_by_user_email,
    uploadedByUserId: row.uploaded_by_user_id,
  };
}

function buildCreateMediaAssetsTableSql() {
  return `
    CREATE TABLE IF NOT EXISTS ${quoteIdentifier(datamixMediaAssetsTableName)} (
      "id" TEXT PRIMARY KEY,
      "file_name" TEXT NOT NULL,
      "mime_type" TEXT NOT NULL,
      "byte_size" INTEGER NOT NULL,
      "storage_key" TEXT NOT NULL UNIQUE,
      "uploaded_by_user_id" TEXT,
      "uploaded_by_user_email" TEXT,
      "created_at" TEXT NOT NULL,
      "updated_at" TEXT NOT NULL
    )
  `.trim();
}

async function ensureMediaAssetsTable(database: D1StatementRunner) {
  await database.batch([database.prepare(buildCreateMediaAssetsTableSql())]);
}

function createBucketMetadata(file: File, session: DatamixSession, assetId: string) {
  return {
    customMetadata: {
      assetId,
      fileName: file.name,
      uploadedByUserEmail: session.user.email,
      uploadedByUserId: session.user.id,
    },
    httpMetadata: {
      contentType: file.type || "application/octet-stream",
    },
  } satisfies R2PutOptions;
}

function assertUploadFile(value: FormDataEntryValue | null) {
  if (!(value instanceof File)) {
    throw new MediaAssetError("Upload must include a file field.");
  }

  if (value.name.trim().length === 0) {
    throw new MediaAssetError("Uploaded file must include a filename.");
  }

  if (value.size <= 0) {
    throw new MediaAssetError("Uploaded file must not be empty.");
  }

  return value;
}

export async function listMediaAssets(env: ApiBindings) {
  await ensureMediaAssetsTable(env.DB);

  const rows = await env.DB.prepare(
    `
      SELECT
        id,
        file_name,
        mime_type,
        byte_size,
        storage_key,
        uploaded_by_user_id,
        uploaded_by_user_email,
        created_at,
        updated_at
      FROM ${quoteIdentifier(datamixMediaAssetsTableName)}
      ORDER BY created_at DESC, id DESC
      LIMIT 50
    `.trim(),
  ).all<MediaAssetRow>();

  return rows.results.map(mapStoredAsset);
}

export async function createMediaAsset(
  env: ApiBindings,
  session: DatamixSession,
  formData: FormData,
) {
  await ensureMediaAssetsTable(env.DB);

  const file = assertUploadFile(formData.get("file"));
  const now = new Date().toISOString();
  const assetId = crypto.randomUUID();
  const storageKey = createMediaAssetStorageKey(assetId, file.name);

  await env.MEDIA_BUCKET.put(
    storageKey,
    file.stream(),
    createBucketMetadata(file, session, assetId),
  );

  try {
    await env.DB.batch([
      env.DB
        .prepare(
          `
            INSERT INTO ${quoteIdentifier(datamixMediaAssetsTableName)} (
              id,
              file_name,
              mime_type,
              byte_size,
              storage_key,
              uploaded_by_user_id,
              uploaded_by_user_email,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `.trim(),
        )
        .bind(
          assetId,
          file.name,
          file.type || "application/octet-stream",
          file.size,
          storageKey,
          session.user.id,
          session.user.email,
          now,
          now,
        ),
    ]);
  } catch (error) {
    await env.MEDIA_BUCKET.delete(storageKey);
    throw error;
  }

  return {
    asset: {
      byteSize: file.size,
      createdAt: now,
      fileName: file.name,
      id: assetId,
      mimeType: file.type || "application/octet-stream",
      storageKey,
      updatedAt: now,
      uploadedByUserEmail: session.user.email,
      uploadedByUserId: session.user.id,
    } satisfies DatamixMediaAsset,
  };
}
