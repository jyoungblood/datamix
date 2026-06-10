"use client";

import { Copy, RefreshCcw, Upload } from "lucide-react";
import * as React from "react";

import {
  AdminMetric,
  AdminPageHeader,
  AdminSectionCard,
} from "../_components/admin-design";
import { AdminStateBox } from "../_components/admin-state";
import {
  createMediaAssetSearchText,
  createMediaOriginalUrl,
  createMediaTransformUrl,
  formatByteSize,
  formatRecordTimestamp,
} from "../_lib/media-formatting";
import { AdminWorkspaceRouteFrame } from "../_workspace/admin-workspace-route-frame";
import { adminRoutes, type AdminWorkspaceRoute } from "../_workspace/admin-routes";
import {
  useAdminWorkspace,
  useAdminWorkspaceRouteAccess,
} from "../_workspace/admin-workspace-hooks";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function MediaLibraryContent({ route }: { route: AdminWorkspaceRoute }) {
  const workspace = useAdminWorkspace();
  const access = useAdminWorkspaceRouteAccess(route);
  const mediaFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const {
    copyMediaStorageKey,
    hasLoadedMediaAssets,
    isLoadingMediaAssets,
    isRefreshingMediaAssets,
    isUploadingMedia,
    loadMediaAssets,
    mediaAssets,
    mediaClipboardMessage,
    mediaLoadError,
    mediaMessage,
    mediaSearchQuery,
    permissions,
    refreshMediaAssets,
    role,
    selectedMediaAssetId,
    selectedMediaFile,
    selectMediaAsset,
    setMediaSearchQuery,
    setSelectedMediaFile,
    uploadMediaAsset,
  } = workspace;
  const canRefreshMediaAssets =
    permissions.canViewMedia && !isLoadingMediaAssets && !isRefreshingMediaAssets;
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
  const selectedMediaOriginalUrl = selectedFilteredMediaAsset
    ? createMediaOriginalUrl(selectedFilteredMediaAsset.storageKey)
    : null;
  const selectedMediaTransformUrl = selectedFilteredMediaAsset
    ? createMediaTransformUrl(selectedFilteredMediaAsset.storageKey)
    : null;

  React.useEffect(() => {
    if (!permissions.canViewMedia || hasLoadedMediaAssets) {
      return;
    }

    void loadMediaAssets();
  }, [hasLoadedMediaAssets, loadMediaAssets, permissions.canViewMedia]);

  const handleMediaUploadSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!permissions.canUploadMedia) {
      return;
    }

    const uploadedAsset = await uploadMediaAsset();

    if (uploadedAsset && mediaFileInputRef.current) {
      mediaFileInputRef.current.value = "";
    }
  };

  return (
    <AdminWorkspaceRouteFrame route={route}>
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <AdminPageHeader
          action={
            <Button
              disabled={!canRefreshMediaAssets}
              onClick={() => void refreshMediaAssets()}
              type="button"
              variant="outline"
            >
              <RefreshCcw />
              {isRefreshingMediaAssets ? "Refreshing" : "Refresh"}
            </Button>
          }
          description="Upload originals, browse stored asset metadata, and copy storage keys for content image fields."
          eyebrow="Media"
          title="Media library"
        />

        <div className="grid gap-3 md:grid-cols-3">
          <AdminMetric
            description={
              permissions.canViewMedia
                ? "Assets available in the shared library."
                : "Library browsing is hidden for this role."
            }
            label="Assets"
            value={permissions.canViewMedia ? mediaAssets.length : "Hidden"}
          />
          <AdminMetric
            description="Current detail panel selection."
            label="Selected"
            value={selectedMediaAsset ? selectedMediaAsset.fileName : "None"}
          />
          <AdminMetric
            description="Server-side media upload permission."
            label="Upload"
            value={
              permissions.canUploadMedia
                ? "Allowed"
                : permissions.canViewMedia
                  ? "View only"
                  : "Restricted"
            }
          />
        </div>

        {!access.isAllowed ? (
          <AdminStateBox
            body={`Your ${role.label} role cannot access the shared media library.`}
            title="Media access is restricted"
            tone="warning"
          />
        ) : (
          <>
            <AdminSectionCard
              description="Choose a file to store the original in media storage and create an asset record."
              title="Upload original"
            >
              <form className="auth-form" onSubmit={handleMediaUploadSubmit}>
                {!permissions.canUploadMedia ? (
                  <AdminStateBox
                    body={`Your ${role.label} role can browse media, but it cannot upload new assets.`}
                    compact
                    title="Upload is disabled"
                    tone="warning"
                  />
                ) : null}

                <label className="field">
                  <span>Upload file</span>
                  <input
                    accept="*/*"
                    disabled={!permissions.canUploadMedia || isUploadingMedia}
                    onChange={(event) =>
                      setSelectedMediaFile(event.target.files?.[0] ?? null)
                    }
                    ref={mediaFileInputRef}
                    type="file"
                  />
                </label>

                {selectedMediaFile ? (
                  <div className="type-specific-box">
                    <p className="section-title">{selectedMediaFile.name}</p>
                    <p className="section-copy">
                      {selectedMediaFile.type || "application/octet-stream"} /{" "}
                      {formatByteSize(selectedMediaFile.size)}
                    </p>
                  </div>
                ) : (
                  <AdminStateBox
                    body="Choose a file to store the original and create an asset record."
                    compact
                    title="No file selected"
                  />
                )}

                {mediaMessage ? (
                  <AdminStateBox
                    body={mediaMessage}
                    compact
                    title="Media asset uploaded"
                    tone="success"
                  />
                ) : null}
                {mediaLoadError ? (
                  <AdminStateBox
                    body={mediaLoadError}
                    compact
                    title="Media upload flow needs attention"
                    tone="error"
                    {...(permissions.canViewMedia
                      ? {
                          actionLabel: "Refresh uploads",
                          onAction: () => void refreshMediaAssets(),
                        }
                      : {})}
                  />
                ) : null}

                <div className="actions">
                  <Button
                    disabled={!permissions.canUploadMedia || isUploadingMedia}
                    type="submit"
                  >
                    <Upload />
                    {isUploadingMedia ? "Uploading asset" : "Upload asset"}
                  </Button>
                  <Button
                    disabled={!canRefreshMediaAssets}
                    onClick={() => void refreshMediaAssets()}
                    type="button"
                    variant="outline"
                  >
                    <RefreshCcw />
                    {isRefreshingMediaAssets ? "Refreshing" : "Refresh uploads"}
                  </Button>
                </div>
              </form>
            </AdminSectionCard>

            {permissions.canViewMedia ? (
              <AdminSectionCard
                action={
                  <Badge variant="outline">
                    {filteredMediaAssets.length} visible
                  </Badge>
                }
                description="Search by filename, MIME type, uploader email, or storage key."
                title="Browse assets"
              >
                <div className="record-browser">
                  <div className="record-browser-list">
                    <label className="field">
                      <span>Filter assets</span>
                      <input
                        onChange={(event) => setMediaSearchQuery(event.target.value)}
                        placeholder="Search by filename, MIME type, uploader, or storage key"
                        type="text"
                        value={mediaSearchQuery}
                      />
                    </label>

                    {isLoadingMediaAssets ? (
                      <AdminStateBox
                        body="Loading recent uploads."
                        compact
                        title="Loading uploads"
                      />
                    ) : mediaLoadError && mediaAssets.length === 0 ? (
                      <AdminStateBox
                        actionLabel="Try again"
                        body={mediaLoadError}
                        compact
                        onAction={() => void refreshMediaAssets()}
                        title="Media library is unavailable"
                        tone="error"
                      />
                    ) : mediaAssets.length === 0 ? (
                      <AdminStateBox
                        body="Upload a file to add it to the library."
                        compact
                        title="No uploads yet"
                      />
                    ) : filteredMediaAssets.length === 0 ? (
                      <AdminStateBox
                        actionLabel="Clear filter"
                        body={`No assets matched "${mediaSearchQuery}".`}
                        compact
                        onAction={() => setMediaSearchQuery("")}
                        title="No matching assets"
                        tone="warning"
                      />
                    ) : (
                      <>
                        {filteredMediaAssets.map((asset) => (
                          <button
                            className={
                              asset.id === selectedMediaAssetId
                                ? "mini-list-item mini-list-item-stacked is-selected"
                                : "mini-list-item mini-list-item-stacked"
                            }
                            key={asset.id}
                            onClick={() => selectMediaAsset(asset.id)}
                            type="button"
                          >
                            <div className="mini-list-content">
                              <span>{asset.fileName}</span>
                              <small>
                                {asset.mimeType} / {formatByteSize(asset.byteSize)}
                              </small>
                              <small>{asset.storageKey}</small>
                            </div>
                            <small>{formatRecordTimestamp(asset.createdAt)}</small>
                          </button>
                        ))}
                        {isRefreshingMediaAssets ? (
                          <p className="px-1 text-xs text-slate-500">
                            Refreshing media assets...
                          </p>
                        ) : null}
                        {mediaLoadError ? (
                          <AdminStateBox
                            actionLabel="Retry refresh"
                            body={`${mediaLoadError} Showing the last media list that loaded successfully.`}
                            compact
                            onAction={() => void refreshMediaAssets()}
                            title="Media refresh did not finish"
                            tone="error"
                          />
                        ) : null}
                      </>
                    )}
                  </div>

                  <aside className="generated-record-preview">
                    <p className="card-eyebrow">Asset detail</p>
                    {selectedFilteredMediaAsset ? (
                      <>
                        <h4 className="section-title">
                          {selectedFilteredMediaAsset.fileName}
                        </h4>
                        <p className="section-copy">
                          Metadata and delivery URLs for the selected asset.
                        </p>
                        <dl className="detail-list">
                          <div>
                            <dt>Storage key</dt>
                            <dd className="detail-list-code">
                              {selectedFilteredMediaAsset.storageKey}
                            </dd>
                          </div>
                          <div>
                            <dt>MIME type</dt>
                            <dd>{selectedFilteredMediaAsset.mimeType}</dd>
                          </div>
                          <div>
                            <dt>Size</dt>
                            <dd>{formatByteSize(selectedFilteredMediaAsset.byteSize)}</dd>
                          </div>
                          <div>
                            <dt>Uploaded</dt>
                            <dd>
                              {formatRecordTimestamp(selectedFilteredMediaAsset.createdAt)}
                            </dd>
                          </div>
                          <div>
                            <dt>Uploader</dt>
                            <dd>
                              {selectedFilteredMediaAsset.uploadedByUserEmail ??
                                "Unknown uploader"}
                            </dd>
                          </div>
                          <div>
                            <dt>Asset id</dt>
                            <dd className="detail-list-code">
                              {selectedFilteredMediaAsset.id}
                            </dd>
                          </div>
                          {selectedMediaOriginalUrl ? (
                            <div>
                              <dt>Original URL</dt>
                              <dd className="detail-list-code">
                                {selectedMediaOriginalUrl}
                              </dd>
                            </div>
                          ) : null}
                          {selectedMediaTransformUrl ? (
                            <div>
                              <dt>Transform URL example</dt>
                              <dd className="detail-list-code">
                                {selectedMediaTransformUrl}
                              </dd>
                            </div>
                          ) : null}
                          <div>
                            <dt>Transform query contract</dt>
                            <dd>
                              `width`, `height`, `fit`, `quality`, `format`,
                              `cropLeft`, `cropTop`, `cropWidth`, `cropHeight`
                            </dd>
                          </div>
                        </dl>
                        {mediaClipboardMessage ? (
                          <p className="helper-text">{mediaClipboardMessage}</p>
                        ) : null}
                        <div className="actions">
                          <Button
                            onClick={() => void copyMediaStorageKey()}
                            type="button"
                            variant="outline"
                          >
                            <Copy />
                            Copy storage key
                          </Button>
                        </div>
                      </>
                    ) : selectedMediaAsset ? (
                      <AdminStateBox
                        actionLabel="Clear filter"
                        body="The selected asset is hidden by the current filter. Clear the filter or pick a different visible asset."
                        onAction={() => setMediaSearchQuery("")}
                        title="Selected asset is filtered out"
                        tone="warning"
                      />
                    ) : (
                      <AdminStateBox
                        body="Choose an asset from the library to inspect its metadata."
                        title="No asset selected"
                      />
                    )}
                  </aside>
                </div>
              </AdminSectionCard>
            ) : null}
          </>
        )}
      </div>
    </AdminWorkspaceRouteFrame>
  );
}

export function MediaLibraryRoute() {
  const route = adminRoutes.media();

  return <MediaLibraryContent route={route} />;
}
