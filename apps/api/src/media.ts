import {
  createMediaAssetStorageKey,
  datamixMediaResizeFits,
  datamixMediaTransformFormats,
  datamixMediaAssetsTableName,
  type DatamixMediaAsset,
  type DatamixMediaResizeFit,
  type DatamixMediaTransformFormat,
  type DatamixMediaTransformRequest,
} from "@datamix/core";
import sharp from "sharp";

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

type MediaObjectResult = {
  body: Blob | ReadableStream;
  cacheControl: string;
  contentLength: number;
  contentType: string;
  etag?: string;
};

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

function createMediaObjectCacheControl() {
  return "public, max-age=31536000, immutable";
}

function normalizeMediaStorageKey(storageKey: string) {
  const normalized = storageKey
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .join("/");

  if (
    normalized.length === 0 ||
    normalized.includes("..") ||
    normalized.startsWith("/")
  ) {
    throw new MediaAssetError("Media storage key is invalid.");
  }

  return normalized;
}

function readPositiveInteger(
  value: string | null,
  fieldName: string,
  options?: { max?: number; min?: number },
) {
  if (value === null) {
    return undefined;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue)) {
    throw new MediaAssetError(`${fieldName} must be a whole number.`);
  }

  const min = options?.min ?? 1;
  const max = options?.max;

  if (parsedValue < min) {
    throw new MediaAssetError(`${fieldName} must be at least ${min}.`);
  }

  if (typeof max === "number" && parsedValue > max) {
    throw new MediaAssetError(`${fieldName} must be ${max} or less.`);
  }

  return parsedValue;
}

function readResizeFit(value: string | null) {
  if (value === null) {
    return undefined;
  }

  if (!datamixMediaResizeFits.includes(value as DatamixMediaResizeFit)) {
    throw new MediaAssetError(
      `fit must be one of: ${datamixMediaResizeFits.join(", ")}.`,
    );
  }

  return value as DatamixMediaResizeFit;
}

function readTransformFormat(value: string | null) {
  if (value === null) {
    return undefined;
  }

  if (!datamixMediaTransformFormats.includes(value as DatamixMediaTransformFormat)) {
    throw new MediaAssetError(
      `format must be one of: ${datamixMediaTransformFormats.join(", ")}.`,
    );
  }

  return value as DatamixMediaTransformFormat;
}

function parseMediaTransformRequest(requestUrl: URL): DatamixMediaTransformRequest {
  const width = readPositiveInteger(requestUrl.searchParams.get("width"), "width", {
    max: 4096,
  });
  const height = readPositiveInteger(requestUrl.searchParams.get("height"), "height", {
    max: 4096,
  });
  const fit = readResizeFit(requestUrl.searchParams.get("fit"));
  const quality = readPositiveInteger(
    requestUrl.searchParams.get("quality"),
    "quality",
    {
      max: 100,
    },
  );
  const format = readTransformFormat(requestUrl.searchParams.get("format"));
  const cropLeft = readPositiveInteger(
    requestUrl.searchParams.get("cropLeft"),
    "cropLeft",
    {
      min: 0,
      max: 8192,
    },
  );
  const cropTop = readPositiveInteger(requestUrl.searchParams.get("cropTop"), "cropTop", {
    min: 0,
    max: 8192,
  });
  const cropWidth = readPositiveInteger(
    requestUrl.searchParams.get("cropWidth"),
    "cropWidth",
    {
      max: 8192,
    },
  );
  const cropHeight = readPositiveInteger(
    requestUrl.searchParams.get("cropHeight"),
    "cropHeight",
    {
      max: 8192,
    },
  );

  const cropValues = [cropLeft, cropTop, cropWidth, cropHeight];
  const hasAnyCropValue = cropValues.some((value) => typeof value === "number");

  if (hasAnyCropValue && cropValues.some((value) => typeof value !== "number")) {
    throw new MediaAssetError(
      "cropLeft, cropTop, cropWidth, and cropHeight must all be provided together.",
    );
  }

  return {
    ...(typeof width === "number" ? { width } : {}),
    ...(typeof height === "number" ? { height } : {}),
    ...(fit ? { fit } : {}),
    ...(typeof quality === "number" ? { quality } : {}),
    ...(format ? { format } : {}),
    ...(hasAnyCropValue
      ? {
          crop: {
            height: cropHeight as number,
            left: cropLeft as number,
            top: cropTop as number,
            width: cropWidth as number,
          },
        }
      : {}),
  };
}

function hasMediaTransformRequest(transform: DatamixMediaTransformRequest) {
  return (
    typeof transform.width === "number" ||
    typeof transform.height === "number" ||
    typeof transform.quality === "number" ||
    Boolean(transform.fit) ||
    Boolean(transform.format) ||
    Boolean(transform.crop)
  );
}

function isTransformableImageContentType(contentType: string) {
  return contentType.startsWith("image/");
}

function resolveOutputFormat(
  sourceContentType: string,
  explicitFormat?: DatamixMediaTransformFormat,
) {
  if (explicitFormat) {
    return explicitFormat;
  }

  switch (sourceContentType) {
    case "image/jpeg":
      return "jpeg";
    case "image/png":
      return "png";
    case "image/avif":
      return "avif";
    default:
      return "webp";
  }
}

function mapFormatToContentType(format: DatamixMediaTransformFormat) {
  switch (format) {
    case "avif":
      return "image/avif";
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
  }
}

async function createTransformedMediaObject(
  object: R2ObjectBody,
  transform: DatamixMediaTransformRequest,
  sourceContentType: string,
) {
  if (!isTransformableImageContentType(sourceContentType)) {
    throw new MediaAssetError(
      "Transforms are only available for image assets in the current media slice.",
    );
  }

  const inputBuffer = Buffer.from(await object.arrayBuffer());
  let pipeline = sharp(inputBuffer, { animated: true }).rotate();

  if (transform.crop) {
    pipeline = pipeline.extract(transform.crop);
  }

  if (typeof transform.width === "number" || typeof transform.height === "number") {
    pipeline = pipeline.resize({
      fit: transform.fit ?? "cover",
      height: transform.height,
      width: transform.width,
      withoutEnlargement: true,
    });
  }

  const outputFormat = resolveOutputFormat(sourceContentType, transform.format);
  const quality = transform.quality ?? 80;

  switch (outputFormat) {
    case "avif":
      pipeline = pipeline.avif({ quality });
      break;
    case "jpeg":
      pipeline = pipeline.flatten({ background: "#ffffff" }).jpeg({
        mozjpeg: true,
        quality,
      });
      break;
    case "png":
      pipeline = pipeline.png({
        compressionLevel: 9,
        progressive: true,
        quality,
      });
      break;
    case "webp":
      pipeline = pipeline.webp({ quality });
      break;
  }

  const output = await pipeline.toBuffer();
  const outputBytes = Uint8Array.from(output);

  return {
    body: new Blob([outputBytes], {
      type: mapFormatToContentType(outputFormat),
    }),
    cacheControl: createMediaObjectCacheControl(),
    contentLength: output.byteLength,
    contentType: mapFormatToContentType(outputFormat),
  } satisfies MediaObjectResult;
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
  const fileBytes = await file.arrayBuffer();

  await env.MEDIA_BUCKET.put(
    storageKey,
    fileBytes,
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

export async function getMediaObject(
  env: ApiBindings,
  storageKey: string,
  requestUrl: URL,
): Promise<MediaObjectResult> {
  const normalizedStorageKey = normalizeMediaStorageKey(storageKey);
  const object = await env.MEDIA_BUCKET.get(normalizedStorageKey);

  if (!object) {
    throw new MediaAssetError("Media asset not found.", 404);
  }

  const contentType =
    object.httpMetadata?.contentType || "application/octet-stream";
  const transform = parseMediaTransformRequest(requestUrl);

  if (hasMediaTransformRequest(transform)) {
    return createTransformedMediaObject(object, transform, contentType);
  }

  if (!object.body) {
    throw new MediaAssetError("Media asset body is unavailable.", 500);
  }

  return {
    body: object.body,
    cacheControl: createMediaObjectCacheControl(),
    contentLength: object.size,
    contentType,
    etag: object.httpEtag,
  } satisfies MediaObjectResult;
}
