import { createMediaObjectPath, type DatamixMediaAsset } from "@datamix/core";

export function formatRecordTimestamp(value: string) {
  return new Date(value).toLocaleString();
}

export function formatByteSize(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  const kilobytes = value / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`;
  }

  return `${(kilobytes / 1024).toFixed(1)} MB`;
}

export function createMediaAssetSearchText(asset: DatamixMediaAsset) {
  return [
    asset.fileName,
    asset.mimeType,
    asset.storageKey,
    asset.uploadedByUserEmail ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export function createMediaOriginalUrl(storageKey: string) {
  return createMediaObjectPath(storageKey);
}

export function createMediaTransformUrl(storageKey: string) {
  return `${createMediaObjectPath(storageKey)}?width=1280&height=720&format=webp`;
}
