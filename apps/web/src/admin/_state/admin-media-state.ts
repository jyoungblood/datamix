"use client";

import type { DatamixMediaAsset } from "@datamix/core";
import * as React from "react";

import {
  listMediaAssets,
  MediaAssetRequestError,
  uploadMediaAsset as uploadMediaAssetRequest,
} from "@/lib/media";

type AdminMediaStateOptions = {
  initialMediaAssets?: DatamixMediaAsset[] | undefined;
  initialMediaAssetsLoaded?: boolean | undefined;
  initialMediaLoadError?: string | null | undefined;
};

export function useAdminMediaState(options?: AdminMediaStateOptions) {
  const mediaAssetsLoadRequestId = React.useRef(0);
  const [mediaAssets, setMediaAssets] = React.useState<DatamixMediaAsset[]>(
    () => options?.initialMediaAssets ?? [],
  );
  const [mediaLoadError, setMediaLoadError] = React.useState<string | null>(
    () => options?.initialMediaLoadError ?? null,
  );
  const [mediaMessage, setMediaMessage] = React.useState<string | null>(null);
  const [mediaClipboardMessage, setMediaClipboardMessage] = React.useState<string | null>(
    null,
  );
  const [mediaSearchQuery, setMediaSearchQuery] = React.useState("");
  const [selectedMediaAssetId, setSelectedMediaAssetId] = React.useState<string | null>(
    () => options?.initialMediaAssets?.[0]?.id ?? null,
  );
  const [selectedMediaFile, setSelectedMediaFile] = React.useState<File | null>(null);
  const [hasLoadedMediaAssets, setHasLoadedMediaAssets] = React.useState(
    () => options?.initialMediaAssetsLoaded ?? false,
  );
  const [isLoadingMediaAssets, setIsLoadingMediaAssets] = React.useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = React.useState(false);

  const resetMediaWorkspace = React.useCallback(() => {
    mediaAssetsLoadRequestId.current += 1;
    setMediaAssets([]);
    setMediaLoadError(null);
    setMediaMessage(null);
    setMediaClipboardMessage(null);
    setMediaSearchQuery("");
    setSelectedMediaAssetId(null);
    setSelectedMediaFile(null);
    setHasLoadedMediaAssets(false);
    setIsLoadingMediaAssets(false);
    setIsUploadingMedia(false);
  }, []);

  const resetMediaAssetList = React.useCallback(() => {
    mediaAssetsLoadRequestId.current += 1;
    setMediaAssets([]);
    setSelectedMediaAssetId(null);
    setHasLoadedMediaAssets(false);
    setIsLoadingMediaAssets(false);
    setMediaLoadError(null);
  }, []);

  const loadMediaAssets = React.useCallback(async () => {
    const requestId = mediaAssetsLoadRequestId.current + 1;

    mediaAssetsLoadRequestId.current = requestId;
    setMediaLoadError(null);
    setIsLoadingMediaAssets(true);

    try {
      const assets = await listMediaAssets();

      if (mediaAssetsLoadRequestId.current !== requestId) {
        return;
      }

      setMediaAssets(assets);
      setHasLoadedMediaAssets(true);
      setSelectedMediaAssetId((currentSelectedAssetId) =>
        currentSelectedAssetId &&
        assets.some((asset) => asset.id === currentSelectedAssetId)
          ? currentSelectedAssetId
          : assets[0]?.id ?? null,
      );
    } catch (error) {
      if (mediaAssetsLoadRequestId.current !== requestId) {
        return;
      }

      setMediaLoadError(
        error instanceof Error ? error.message : "Unable to load media assets.",
      );
    } finally {
      if (mediaAssetsLoadRequestId.current === requestId) {
        setIsLoadingMediaAssets(false);
      }
    }
  }, []);

  const selectMediaAsset = React.useCallback((assetId: string) => {
    setSelectedMediaAssetId(assetId);
    setMediaClipboardMessage(null);
  }, []);

  const uploadMediaAsset = React.useCallback(async () => {
    if (!selectedMediaFile) {
      setMediaLoadError("Choose a file before uploading.");
      setMediaMessage(null);
      return null;
    }

    setIsUploadingMedia(true);
    setMediaLoadError(null);
    setMediaMessage(null);

    try {
      const result = await uploadMediaAssetRequest(selectedMediaFile);

      setMediaAssets((currentAssets) => [result.asset, ...currentAssets]);
      setHasLoadedMediaAssets(true);
      setSelectedMediaAssetId(result.asset.id);
      setMediaMessage(
        `${result.message} Saved ${result.asset.fileName} to ${result.asset.storageKey}.`,
      );
      setMediaClipboardMessage(null);
      setSelectedMediaFile(null);
      void loadMediaAssets();

      return result.asset;
    } catch (error) {
      setMediaLoadError(
        error instanceof MediaAssetRequestError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unable to upload media asset.",
      );

      return null;
    } finally {
      setIsUploadingMedia(false);
    }
  }, [loadMediaAssets, selectedMediaFile]);

  const copyMediaStorageKey = React.useCallback(async () => {
    const selectedMediaAsset = selectedMediaAssetId
      ? mediaAssets.find((asset) => asset.id === selectedMediaAssetId) ?? null
      : null;

    if (!selectedMediaAsset) {
      return;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.clipboard ||
      typeof navigator.clipboard.writeText !== "function"
    ) {
      setMediaClipboardMessage("Clipboard access is unavailable in this browser.");
      return;
    }

    try {
      await navigator.clipboard.writeText(selectedMediaAsset.storageKey);
      setMediaClipboardMessage("Storage key copied for reuse in image fields.");
    } catch {
      setMediaClipboardMessage("Clipboard access failed. Copy the storage key manually.");
    }
  }, [mediaAssets, selectedMediaAssetId]);

  return {
    copyMediaStorageKey,
    hasLoadedMediaAssets,
    isLoadingMediaAssets,
    isUploadingMedia,
    loadMediaAssets,
    mediaAssets,
    mediaClipboardMessage,
    mediaLoadError,
    mediaMessage,
    mediaSearchQuery,
    resetMediaAssetList,
    resetMediaWorkspace,
    selectedMediaAssetId,
    selectedMediaFile,
    selectMediaAsset,
    setMediaSearchQuery,
    setSelectedMediaFile,
    uploadMediaAsset,
  };
}
