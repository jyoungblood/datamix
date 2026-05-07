export const datamixMediaAssetsTableName = "dmx_media_assets";

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

export function createMediaAssetStorageKey(assetId: string, fileName: string) {
  const sanitizedName = fileName
    .trim()
    .replaceAll(/[/\\]/g, "-")
    .replaceAll(/[^a-zA-Z0-9._-]+/g, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^-|-$/g, "");

  return `originals/${assetId}/${sanitizedName || "upload.bin"}`;
}
