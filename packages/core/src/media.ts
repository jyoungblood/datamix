export const datamixMediaAssetsTableName = "dmx_media_assets";
export const datamixMediaObjectPathPrefix = "/media/object";

export const datamixMediaTransformFormats = ["avif", "jpeg", "png", "webp"] as const;
export const datamixMediaResizeFits = ["contain", "cover", "fill", "inside"] as const;

export type DatamixMediaAsset = {
  byteSize: number;
  createdAt: string;
  fileName: string;
  id: string;
  mimeType: string;
  storageKey: string;
  updatedAt: string;
  uploadedByUserEmail: string | null;
  uploadedByUserId: string | null;
};

export type DatamixMediaTransformFormat = (typeof datamixMediaTransformFormats)[number];
export type DatamixMediaResizeFit = (typeof datamixMediaResizeFits)[number];

export type DatamixMediaTransformCrop = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type DatamixMediaTransformRequest = {
  crop?: DatamixMediaTransformCrop;
  fit?: DatamixMediaResizeFit;
  format?: DatamixMediaTransformFormat;
  height?: number;
  quality?: number;
  width?: number;
};

export function createMediaAssetStorageKey(assetId: string, fileName: string) {
  const sanitizedName = fileName
    .trim()
    .replaceAll(/[/\\]/g, "-")
    .replaceAll(/[^a-zA-Z0-9._-]+/g, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^-|-$/g, "");

  return `originals/${assetId}/${sanitizedName || "upload.bin"}`;
}

function createEncodedStorageKeyPath(storageKey: string) {
  return storageKey
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function createMediaObjectPath(storageKey: string) {
  const encodedStorageKeyPath = createEncodedStorageKeyPath(storageKey);

  return `${datamixMediaObjectPathPrefix}/${encodedStorageKeyPath}`;
}

export function createMediaObjectUrl(
  apiOrigin: string,
  storageKey: string,
  transform?: DatamixMediaTransformRequest,
) {
  const url = new URL(createMediaObjectPath(storageKey), apiOrigin);

  if (transform?.width) {
    url.searchParams.set("width", String(transform.width));
  }

  if (transform?.height) {
    url.searchParams.set("height", String(transform.height));
  }

  if (transform?.fit) {
    url.searchParams.set("fit", transform.fit);
  }

  if (transform?.quality) {
    url.searchParams.set("quality", String(transform.quality));
  }

  if (transform?.format) {
    url.searchParams.set("format", transform.format);
  }

  if (transform?.crop) {
    url.searchParams.set("cropLeft", String(transform.crop.left));
    url.searchParams.set("cropTop", String(transform.crop.top));
    url.searchParams.set("cropWidth", String(transform.crop.width));
    url.searchParams.set("cropHeight", String(transform.crop.height));
  }

  return url.toString();
}
