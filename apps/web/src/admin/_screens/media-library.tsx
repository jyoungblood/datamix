"use client";

import type { DatamixMediaAsset } from "@datamix/core";
import * as React from "react";

import {
  createMediaAssetSearchText,
  createMediaOriginalUrl,
  createMediaTransformUrl,
  formatByteSize,
  formatRecordTimestamp,
} from "../_lib/media-formatting";
import { useAdminMediaState } from "../_state/admin-media-state";
import type { AdminWorkspaceProps } from "../_workspace/admin-workspace-props";

type MediaLibraryInteractionsIslandProps = {
  mediaAssets?: DatamixMediaAsset[] | undefined;
  mediaAssetsLoaded?: boolean | undefined;
  mediaLoadError?: string | null | undefined;
  rootId: string;
  workspace: AdminWorkspaceProps;
};

type QueryRoot = Document | HTMLElement;

function queryElement<T>(root: QueryRoot, selector: string) {
  return root.querySelector(selector) as T | null;
}

function setHidden(element: HTMLElement | null, isHidden: boolean) {
  if (element) {
    element.hidden = isHidden;
  }
}

function setText(element: HTMLElement | null, value: string) {
  if (element) {
    element.textContent = value;
  }
}

function setStateBoxBody(container: QueryRoot, selector: string, value: string) {
  setText(queryElement<HTMLElement>(container, `${selector} .list-copy`), value);
}

function createMediaAssetButton(
  document: Document,
  asset: DatamixMediaAsset,
  selectedAssetId: string | null,
) {
  const button = document.createElement("button");
  button.className =
    asset.id === selectedAssetId
      ? "mini-list-item mini-list-item-stacked is-selected"
      : "mini-list-item mini-list-item-stacked";
  button.dataset.mediaAssetButton = "";
  button.dataset.mediaAssetId = asset.id;
  button.dataset.mediaAssetSearch = createMediaAssetSearchText(asset);
  button.type = "button";

  const content = document.createElement("div");
  content.className = "mini-list-content";

  const fileName = document.createElement("span");
  fileName.textContent = asset.fileName;
  content.appendChild(fileName);

  const metadata = document.createElement("small");
  metadata.textContent = `${asset.mimeType} / ${formatByteSize(asset.byteSize)}`;
  content.appendChild(metadata);

  const storageKey = document.createElement("small");
  storageKey.textContent = asset.storageKey;
  content.appendChild(storageKey);

  const createdAt = document.createElement("small");
  createdAt.textContent = formatRecordTimestamp(asset.createdAt);

  button.appendChild(content);
  button.appendChild(createdAt);

  return button;
}

export function MediaLibraryInteractionsIsland({
  mediaAssets: initialMediaAssets,
  mediaAssetsLoaded: initialMediaAssetsLoaded,
  mediaLoadError: initialMediaLoadError,
  rootId,
  workspace,
}: MediaLibraryInteractionsIslandProps) {
  const {
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
    selectedMediaAssetId,
    selectedMediaFile,
    selectMediaAsset,
    setMediaSearchQuery,
    setSelectedMediaFile,
    uploadMediaAsset,
  } = useAdminMediaState({
    initialMediaAssets,
    initialMediaAssetsLoaded,
    initialMediaLoadError,
  });
  const { permissions } = workspace;
  const normalizedMediaSearchQuery = mediaSearchQuery.trim().toLowerCase();
  const filteredMediaAssets =
    normalizedMediaSearchQuery.length === 0
      ? mediaAssets
      : mediaAssets.filter((asset) =>
          createMediaAssetSearchText(asset).includes(normalizedMediaSearchQuery),
        );
  const selectedMediaAsset = selectedMediaAssetId
    ? mediaAssets.find((asset) => asset.id === selectedMediaAssetId) ?? null
    : null;
  const selectedFilteredMediaAsset = selectedMediaAsset
    ? filteredMediaAssets.find((asset) => asset.id === selectedMediaAsset.id) ?? null
    : null;
  const shouldShowMediaLoading =
    permissions.canViewMedia &&
    !hasLoadedMediaAssets &&
    !mediaLoadError &&
    (isLoadingMediaAssets || mediaAssets.length === 0);
  const shouldShowNoMatches =
    !shouldShowMediaLoading &&
    mediaAssets.length > 0 &&
    filteredMediaAssets.length === 0;
  const shouldShowMediaError =
    !shouldShowMediaLoading && Boolean(mediaLoadError) && mediaAssets.length === 0;
  const shouldShowEmptyMedia =
    !shouldShowMediaLoading &&
    !mediaLoadError &&
    hasLoadedMediaAssets &&
    mediaAssets.length === 0;
  const shouldShowMediaList =
    !shouldShowMediaLoading &&
    !shouldShowNoMatches &&
    mediaAssets.length > 0 &&
    filteredMediaAssets.length > 0;

  React.useEffect(() => {
    if (!permissions.canViewMedia || hasLoadedMediaAssets) {
      return;
    }

    void loadMediaAssets();
  }, [hasLoadedMediaAssets, loadMediaAssets, permissions.canViewMedia]);

  React.useEffect(() => {
    const root = document.getElementById(rootId);
    const fileInput = root
      ? queryElement<HTMLInputElement>(root, "[data-media-file-input]")
      : null;

    if (!root || !fileInput) {
      return;
    }

    const handleFileChange = () => {
      setSelectedMediaFile(fileInput.files?.[0] ?? null);
    };

    fileInput.addEventListener("change", handleFileChange);

    return () => {
      fileInput.removeEventListener("change", handleFileChange);
    };
  }, [rootId, setSelectedMediaFile]);

  React.useEffect(() => {
    const root = document.getElementById(rootId);
    const form = root
      ? queryElement<HTMLFormElement>(root, "[data-media-upload-form]")
      : null;
    const fileInput = root
      ? queryElement<HTMLInputElement>(root, "[data-media-file-input]")
      : null;

    if (!root || !form) {
      return;
    }

    const handleSubmit = (event: SubmitEvent) => {
      event.preventDefault();

      if (!permissions.canUploadMedia) {
        return;
      }

      void (async () => {
        const uploadedAsset = await uploadMediaAsset();

        if (uploadedAsset && fileInput) {
          fileInput.value = "";
        }
      })();
    };

    form.addEventListener("submit", handleSubmit);

    return () => {
      form.removeEventListener("submit", handleSubmit);
    };
  }, [permissions.canUploadMedia, rootId, uploadMediaAsset]);

  React.useEffect(() => {
    const root = document.getElementById(rootId);
    const filterInput = root
      ? queryElement<HTMLInputElement>(root, "[data-media-filter-input]")
      : null;

    if (!root || !filterInput) {
      return;
    }

    const handleFilterInput = () => {
      setMediaSearchQuery(filterInput.value);
    };

    filterInput.addEventListener("input", handleFilterInput);

    return () => {
      filterInput.removeEventListener("input", handleFilterInput);
    };
  }, [rootId, setMediaSearchQuery]);

  React.useEffect(() => {
    const root = document.getElementById(rootId);

    if (!root) {
      return;
    }

    const handleRootClick = (event: MouseEvent) => {
      const target = event.target as
        | {
            closest?: (selector: string) => HTMLElement | null;
          }
        | null;

      if (!target?.closest) {
        return;
      }

      const assetButton = target.closest("[data-media-asset-button]");

      if (assetButton) {
        const nextAssetId = assetButton.dataset.mediaAssetId;

        if (nextAssetId) {
          event.preventDefault();
          selectMediaAsset(nextAssetId);
        }

        return;
      }

      if (target.closest("[data-media-clear-filter]")) {
        event.preventDefault();
        setMediaSearchQuery("");
        const filterInput = queryElement<HTMLInputElement>(
          root,
          "[data-media-filter-input]",
        );

        if (filterInput) {
          filterInput.value = "";
        }

        return;
      }

      if (target.closest("[data-media-copy-button]")) {
        event.preventDefault();
        void copyMediaStorageKey();
      }
    };

    root.addEventListener("click", handleRootClick);

    return () => {
      root.removeEventListener("click", handleRootClick);
    };
  }, [copyMediaStorageKey, rootId, selectMediaAsset, setMediaSearchQuery]);

  React.useEffect(() => {
    const root = document.getElementById(rootId);

    if (!root) {
      return;
    }

    root.dataset.mediaHydrated = "true";

    const fileInput = queryElement<HTMLInputElement>(root, "[data-media-file-input]");
    const uploadButton = queryElement<HTMLButtonElement>(
      root,
      "[data-media-upload-button]",
    );
    const uploadLabel = queryElement<HTMLElement>(root, "[data-media-upload-label]");
    const selectedFileBox = queryElement<HTMLElement>(
      root,
      "[data-media-selected-file]",
    );
    const selectedFileName = queryElement<HTMLElement>(
      root,
      "[data-media-selected-file-name]",
    );
    const selectedFileMeta = queryElement<HTMLElement>(
      root,
      "[data-media-selected-file-meta]",
    );
    const noFileBox = queryElement<HTMLElement>(root, "[data-media-no-file]");

    if (fileInput) {
      fileInput.disabled = !permissions.canUploadMedia || isUploadingMedia;
    }

    if (uploadButton) {
      uploadButton.disabled = !permissions.canUploadMedia || isUploadingMedia;
    }

    setText(uploadLabel, isUploadingMedia ? "Uploading asset" : "Upload asset");
    setHidden(selectedFileBox, !selectedMediaFile);
    setHidden(noFileBox, Boolean(selectedMediaFile));

    if (selectedMediaFile) {
      setText(selectedFileName, selectedMediaFile.name);
      setText(
        selectedFileMeta,
        `${selectedMediaFile.type || "application/octet-stream"} / ${formatByteSize(
          selectedMediaFile.size,
        )}`,
      );
    }

    const uploadSuccess = queryElement<HTMLElement>(root, "[data-media-upload-success]");
    const uploadError = queryElement<HTMLElement>(root, "[data-media-upload-error]");

    setHidden(uploadSuccess, !mediaMessage);
    setHidden(uploadError, !mediaLoadError);
    setStateBoxBody(root, "[data-media-upload-success]", mediaMessage ?? "");
    setStateBoxBody(root, "[data-media-upload-error]", mediaLoadError ?? "");

    const filterInput = queryElement<HTMLInputElement>(root, "[data-media-filter-input]");

    if (filterInput && filterInput.value !== mediaSearchQuery) {
      filterInput.value = mediaSearchQuery;
    }

    setText(
      queryElement<HTMLElement>(root, "[data-media-visible-count]"),
      String(filteredMediaAssets.length),
    );

    setHidden(
      queryElement<HTMLElement>(root, "[data-media-list-loading]"),
      !shouldShowMediaLoading,
    );
    setHidden(
      queryElement<HTMLElement>(root, "[data-media-list-error]"),
      !shouldShowMediaError,
    );
    setStateBoxBody(root, "[data-media-list-error]", mediaLoadError ?? "");
    setHidden(
      queryElement<HTMLElement>(root, "[data-media-list-empty]"),
      !shouldShowEmptyMedia,
    );
    setHidden(
      queryElement<HTMLElement>(root, "[data-media-no-matches]"),
      !shouldShowNoMatches,
    );
    setStateBoxBody(
      root,
      "[data-media-no-matches]",
      `No assets matched "${mediaSearchQuery}".`,
    );
    setHidden(
      queryElement<HTMLElement>(root, "[data-media-list-content]"),
      !shouldShowMediaList,
    );

    const listItems = queryElement<HTMLElement>(root, "[data-media-list-items]");

    if (listItems) {
      while (listItems.firstChild) {
        listItems.removeChild(listItems.firstChild);
      }

      for (const asset of filteredMediaAssets) {
        listItems.appendChild(
          createMediaAssetButton(document, asset, selectedMediaAssetId),
        );
      }
    }

    const staleError = queryElement<HTMLElement>(root, "[data-media-stale-error]");
    const shouldShowStaleError =
      Boolean(mediaLoadError) &&
      mediaAssets.length > 0 &&
      !shouldShowMediaLoading &&
      !shouldShowNoMatches;

    setHidden(staleError, !shouldShowStaleError);
    setStateBoxBody(
      root,
      "[data-media-stale-error]",
      mediaLoadError
        ? `${mediaLoadError} Showing the last media list that loaded successfully.`
        : "",
    );

    const detailLoading = queryElement<HTMLElement>(
      root,
      "[data-media-detail-loading]",
    );
    const detailContent = queryElement<HTMLElement>(
      root,
      "[data-media-detail-content]",
    );
    const selectedFilteredState = queryElement<HTMLElement>(
      root,
      "[data-media-selected-filtered]",
    );
    const noSelectedState = queryElement<HTMLElement>(root, "[data-media-no-selected]");

    setHidden(detailLoading, !shouldShowMediaLoading);
    setHidden(detailContent, !selectedFilteredMediaAsset || shouldShowMediaLoading);
    setHidden(
      selectedFilteredState,
      !selectedMediaAsset || Boolean(selectedFilteredMediaAsset) || shouldShowMediaLoading,
    );
    setHidden(
      noSelectedState,
      Boolean(selectedMediaAsset) || shouldShowMediaLoading,
    );

    if (selectedFilteredMediaAsset) {
      const originalUrl = createMediaOriginalUrl(selectedFilteredMediaAsset.storageKey);
      const transformUrl = createMediaTransformUrl(selectedFilteredMediaAsset.storageKey);

      setText(
        queryElement<HTMLElement>(root, "[data-media-detail-file-name]"),
        selectedFilteredMediaAsset.fileName,
      );
      setText(
        queryElement<HTMLElement>(root, "[data-media-detail-storage-key]"),
        selectedFilteredMediaAsset.storageKey,
      );
      setText(
        queryElement<HTMLElement>(root, "[data-media-detail-mime-type]"),
        selectedFilteredMediaAsset.mimeType,
      );
      setText(
        queryElement<HTMLElement>(root, "[data-media-detail-byte-size]"),
        formatByteSize(selectedFilteredMediaAsset.byteSize),
      );
      setText(
        queryElement<HTMLElement>(root, "[data-media-detail-created-at]"),
        formatRecordTimestamp(selectedFilteredMediaAsset.createdAt),
      );
      setText(
        queryElement<HTMLElement>(root, "[data-media-detail-uploader]"),
        selectedFilteredMediaAsset.uploadedByUserEmail ?? "Unknown uploader",
      );
      setText(
        queryElement<HTMLElement>(root, "[data-media-detail-id]"),
        selectedFilteredMediaAsset.id,
      );
      setHidden(
        queryElement<HTMLElement>(root, "[data-media-detail-original-url-row]"),
        !originalUrl,
      );
      setText(
        queryElement<HTMLElement>(root, "[data-media-detail-original-url]"),
        originalUrl,
      );
      setHidden(
        queryElement<HTMLElement>(root, "[data-media-detail-transform-url-row]"),
        !transformUrl,
      );
      setText(
        queryElement<HTMLElement>(root, "[data-media-detail-transform-url]"),
        transformUrl,
      );
    }

    const clipboardMessage = queryElement<HTMLElement>(
      root,
      "[data-media-clipboard-message]",
    );
    const copyButton = queryElement<HTMLButtonElement>(root, "[data-media-copy-button]");

    setHidden(clipboardMessage, !mediaClipboardMessage);
    setText(clipboardMessage, mediaClipboardMessage ?? "");

    if (copyButton) {
      copyButton.disabled = !selectedFilteredMediaAsset;
    }
  }, [
    filteredMediaAssets,
    isUploadingMedia,
    mediaAssets.length,
    mediaClipboardMessage,
    mediaLoadError,
    mediaMessage,
    mediaSearchQuery,
    permissions.canUploadMedia,
    rootId,
    selectedFilteredMediaAsset,
    selectedMediaAsset,
    selectedMediaAssetId,
    selectedMediaFile,
    shouldShowEmptyMedia,
    shouldShowMediaError,
    shouldShowMediaList,
    shouldShowMediaLoading,
    shouldShowNoMatches,
  ]);

  return null;
}
