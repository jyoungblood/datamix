import {
  createMediaAssetStorageKey,
  datamixMediaResizeFits,
  datamixMediaTransformFormats,
  type DatamixMediaAsset,
  type DatamixMediaResizeFit,
  type DatamixMediaTransformFormat,
  type DatamixMediaTransformRequest,
} from "@datamix/core";

import type { DatamixSession } from "./auth";
import { insertMediaAssetRow, listMediaAssetRows } from "./db/media-assets";
import { readApiRuntime, type DatamixBindings } from "./env";

type MediaObjectResult = {
  body: Blob | ReadableStream;
  cacheControl: string;
  contentLength: number;
  contentType: string;
  etag?: string;
};

type ImagesTrimOptions = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export class MediaAssetError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "MediaAssetError";
    this.statusCode = statusCode;
  }
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

function mapFormatToContentType(
  format: DatamixMediaTransformFormat,
): "image/avif" | "image/jpeg" | "image/png" | "image/webp" {
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

function mapResizeFitToImagesFit(fit?: DatamixMediaResizeFit) {
  switch (fit) {
    case "contain":
      return "contain";
    case "cover":
      return "cover";
    case "inside":
      return "scale-down";
    case "fill":
    case undefined:
      return undefined;
  }
}

function createImagesTrimOptions(transform: DatamixMediaTransformRequest) {
  if (!transform.crop) {
    return undefined;
  }

  return {
    height: transform.crop.height,
    left: transform.crop.left,
    top: transform.crop.top,
    width: transform.crop.width,
  } satisfies ImagesTrimOptions;
}

async function createTransformedMediaObject(
  env: DatamixBindings,
  object: R2ObjectBody,
  transform: DatamixMediaTransformRequest,
  sourceContentType: string,
) {
  if (!isTransformableImageContentType(sourceContentType)) {
    throw new MediaAssetError(
      "Transforms are only available for image assets in the current media slice.",
    );
  }

  if (!object.body) {
    throw new MediaAssetError("Media asset body is unavailable.", 500);
  }

  const runtime = readApiRuntime(env);
  const imagesTransform: Record<string, unknown> = {};

  if (typeof transform.width === "number") {
    imagesTransform.width = transform.width;
  }

  if (typeof transform.height === "number") {
    imagesTransform.height = transform.height;
  }

  if (runtime.APP_ENV !== "development") {
    const fit = mapResizeFitToImagesFit(transform.fit);
    const trim = createImagesTrimOptions(transform);

    if (fit) {
      imagesTransform.fit = fit;
    }

    if (trim) {
      imagesTransform.trim = trim;
    }
  }

  const outputFormat = resolveOutputFormat(sourceContentType, transform.format);
  const imagesOutput: {
    format: ReturnType<typeof mapFormatToContentType>;
    quality?: number;
  } = {
    format: mapFormatToContentType(outputFormat),
  };

  if (runtime.APP_ENV !== "development" && typeof transform.quality === "number") {
    imagesOutput.quality = transform.quality;
  }

  let image = env.IMAGES.input(object.body);

  if (Object.keys(imagesTransform).length > 0) {
    image = image.transform(imagesTransform);
  }

  const response = (await image.output(imagesOutput)).response();
  const responseContentType =
    response.headers.get("content-type") ?? mapFormatToContentType(outputFormat);
  const responseContentLength = Number(response.headers.get("content-length") ?? 0);

  return {
    body: response.body ?? (await response.blob()),
    cacheControl: createMediaObjectCacheControl(),
    contentLength: responseContentLength,
    contentType: responseContentType,
  } satisfies MediaObjectResult;
}

function mapStoredAsset(row: DatamixMediaAsset): DatamixMediaAsset {
  return {
    byteSize: row.byteSize,
    createdAt: row.createdAt,
    fileName: row.fileName,
    id: row.id,
    mimeType: row.mimeType,
    storageKey: row.storageKey,
    updatedAt: row.updatedAt,
    uploadedByUserEmail: row.uploadedByUserEmail,
    uploadedByUserId: row.uploadedByUserId,
  };
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

export async function listMediaAssets(env: DatamixBindings) {
  return (await listMediaAssetRows(env)).map(mapStoredAsset);
}

export async function createMediaAsset(
  env: DatamixBindings,
  session: DatamixSession,
  formData: FormData,
) {
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
    await insertMediaAssetRow(env, {
      byteSize: file.size,
      createdAt: now,
      fileName: file.name,
      id: assetId,
      mimeType: file.type || "application/octet-stream",
      storageKey,
      updatedAt: now,
      uploadedByUserEmail: session.user.email,
      uploadedByUserId: session.user.id,
    });
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
  env: DatamixBindings,
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
    return createTransformedMediaObject(env, object, transform, contentType);
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
