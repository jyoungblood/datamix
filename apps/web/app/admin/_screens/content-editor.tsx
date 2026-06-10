"use client";

import {
  isRecordCrudFieldDefinition,
  type DatamixMediaAsset,
} from "@datamix/core";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { listMediaAssets } from "@/lib/media";
import { GeneratedRecordFieldInput } from "../_components/generated-record-field-input";
import {
  AdminMetric,
  AdminPageHeader,
  AdminSectionCard,
} from "../_components/admin-design";
import { AdminStateBox } from "../_components/admin-state";
import { formatRecordTimestamp } from "../_lib/media-formatting";
import {
  createGeneratedRecordPayload,
  createPersistedRecordPayload,
  summarizeRecord,
} from "../_lib/record-drafts";
import { formatIssuePath } from "../_lib/schema-drafts";
import { AdminWorkspaceRouteFrame } from "../_workspace/admin-workspace-route-frame";
import {
  adminRoutes,
  type AdminWorkspaceRoute,
} from "../_workspace/admin-routes";
import {
  useAdminWorkspace,
  useAdminWorkspaceRouteAccess,
} from "../_workspace/admin-workspace-hooks";

type ContentEditorMode = "create" | "edit";

type ContentEditorContentProps = {
  collectionName: string;
  mode: ContentEditorMode;
  recordId: string | undefined;
  route: AdminWorkspaceRoute;
};

function ContentEditorContent({
  collectionName,
  mode,
  recordId,
  route,
}: ContentEditorContentProps) {
  const workspace = useAdminWorkspace();
  const access = useAdminWorkspaceRouteAccess(route);
  const {
    collectionLoadError,
    collections,
    hasLoadedCollections,
    hasLoadedRecords,
    isLoadingCollections,
    isLoadingRecords,
    isRefreshingRecords,
    isSavingRecord,
    loadCollections,
    loadRecords,
    permissions,
    recordCollectionName,
    recordDraft,
    recordIssues,
    recordLoadError,
    recordMessage,
    records,
    recordSupportedFieldNames,
    refreshRecords,
    role,
    saveRecord,
    selectedRecord,
    selectRecord,
    startNewRecord,
    updateRecordDraftValue,
  } = workspace;
  const [mediaAssets, setMediaAssets] = React.useState<DatamixMediaAsset[]>([]);
  const [mediaLoadError, setMediaLoadError] = React.useState<string | null>(null);
  const [isLoadingMediaAssets, setIsLoadingMediaAssets] = React.useState(false);
  const mediaLoadRequestId = React.useRef(0);
  const collection =
    collections.find((item) => item.definition.name === collectionName) ?? null;
  const isEditMode = mode === "edit";
  const isInitialCollectionLoad = isLoadingCollections && !hasLoadedCollections;
  const isActiveRecordCollection = recordCollectionName === collectionName;
  const visibleRecords = isActiveRecordCollection ? records : [];
  const activeSelectedRecord =
    isActiveRecordCollection && selectedRecord ? selectedRecord : null;
  const activeRouteRecord =
    isEditMode && recordId
      ? visibleRecords.find((record) => record.id === recordId) ?? null
      : null;
  const editorRecord = isEditMode ? activeRouteRecord : activeSelectedRecord;
  const persistedRecordFields = collection
    ? collection.definition.fields.filter(isRecordCrudFieldDefinition)
    : [];
  const persistedRecordPayload = collection
    ? createPersistedRecordPayload(collection.definition, recordDraft)
    : null;
  const generatedRecordPayload = collection
    ? createGeneratedRecordPayload(collection.definition, recordDraft)
    : null;
  const canSaveCurrentContent = isEditMode
    ? permissions.canUpdateRecords
    : permissions.canCreateRecords;
  const isInitialRecordLoad =
    isActiveRecordCollection && isLoadingRecords && !hasLoadedRecords;

  React.useEffect(() => {
    if (
      !permissions.canViewCollections ||
      hasLoadedCollections ||
      isLoadingCollections
    ) {
      return;
    }

    void loadCollections();
  }, [
    hasLoadedCollections,
    isLoadingCollections,
    loadCollections,
    permissions.canViewCollections,
  ]);

  React.useEffect(() => {
    if (!collection) {
      return;
    }

    if (isEditMode) {
      if (!permissions.canViewRecords || !recordId) {
        return;
      }

      if (recordCollectionName !== collection.definition.name) {
        void loadRecords(collection, { selectedRecordId: recordId });
        return;
      }

      if (isLoadingRecords) {
        return;
      }

      if (!hasLoadedRecords) {
        void loadRecords(collection, { selectedRecordId: recordId });
        return;
      }

      const routeRecord = records.find((record) => record.id === recordId) ?? null;

      if (routeRecord && selectedRecord?.id !== routeRecord.id) {
        selectRecord(collection, routeRecord);
      }

      return;
    }

    if (recordCollectionName !== collection.definition.name) {
      if (permissions.canViewRecords) {
        void loadRecords(collection);
      } else if (permissions.canCreateRecords) {
        startNewRecord(collection);
      }
      return;
    }

    if (!permissions.canViewRecords || hasLoadedRecords || isLoadingRecords) {
      if (permissions.canCreateRecords && selectedRecord) {
        startNewRecord(collection);
      }
      return;
    }

    void loadRecords(collection);
  }, [
    collection,
    hasLoadedRecords,
    isEditMode,
    isLoadingRecords,
    loadRecords,
    permissions.canCreateRecords,
    permissions.canViewRecords,
    recordCollectionName,
    recordId,
    records,
    selectRecord,
    selectedRecord,
    startNewRecord,
  ]);

  React.useEffect(() => {
    if (!permissions.canViewMedia) {
      setMediaAssets([]);
      setMediaLoadError(null);
      setIsLoadingMediaAssets(false);
      return;
    }

    const requestId = mediaLoadRequestId.current + 1;

    mediaLoadRequestId.current = requestId;
    setMediaLoadError(null);
    setIsLoadingMediaAssets(true);

    listMediaAssets()
      .then((assets) => {
        if (mediaLoadRequestId.current !== requestId) {
          return;
        }

        setMediaAssets(assets);
      })
      .catch((error: unknown) => {
        if (mediaLoadRequestId.current !== requestId) {
          return;
        }

        setMediaLoadError(
          error instanceof Error ? error.message : "Unable to load media assets.",
        );
      })
      .finally(() => {
        if (mediaLoadRequestId.current === requestId) {
          setIsLoadingMediaAssets(false);
        }
      });
  }, [permissions.canViewMedia]);

  const handleResetContent = () => {
    if (!collection) {
      return;
    }

    if (isEditMode) {
      selectRecord(collection, editorRecord);
      return;
    }

    startNewRecord(collection);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!collection || !canSaveCurrentContent) {
      return;
    }

    const nextRecord = await saveRecord(collection);

    if (!nextRecord || isEditMode) {
      return;
    }

    window.location.href = adminRoutes.content.record(
      collection.definition.name,
      nextRecord.id,
    ).href;
  };

  return (
    <AdminWorkspaceRouteFrame route={route}>
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <AdminPageHeader
          action={
            collection ? (
              <Button asChild variant="outline">
                <a href={adminRoutes.content.collection(collection.definition.name).href}>
                  Back to content
                </a>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <a href={adminRoutes.content.index().href}>Choose content</a>
              </Button>
            )
          }
          description="This editor is generated directly from the saved schema fields."
          eyebrow="Content"
          title={
            collection
              ? isEditMode
                ? `Edit ${collection.definition.label} content`
                : `New ${collection.definition.label} content`
              : "Content editor"
          }
        />

        <div className="grid gap-3 md:grid-cols-3">
          <AdminMetric
            description="Generated fields in this editor."
            label="Fields"
            value={collection ? collection.definition.fields.length : "Unknown"}
          />
          <AdminMetric
            description="Saved content available in this route context."
            label="Content"
            value={permissions.canViewRecords ? visibleRecords.length : "Restricted"}
          />
          <AdminMetric
            description="Fields currently accepted by storage."
            label="Stored fields"
            value={permissions.canViewRecords ? recordSupportedFieldNames : "Restricted"}
          />
        </div>

        {!access.isAllowed ? (
          <AdminStateBox body={access.body} title={access.title} tone="warning" />
        ) : isInitialCollectionLoad ? (
          <AdminStateBox
            body="Loading schemas before opening this generated content editor."
            title="Loading content schema"
          />
        ) : collectionLoadError && collections.length === 0 ? (
          <AdminStateBox
            actionLabel="Try again"
            body={collectionLoadError}
            onAction={() => void loadCollections({ refresh: true })}
            title="Content schema is unavailable"
            tone="error"
          />
        ) : !collection ? (
          <AdminStateBox
            actionLabel="Choose content"
            body={`No saved schema named "${collectionName}" was found.`}
            onAction={() => {
              window.location.href = adminRoutes.content.index().href;
            }}
            title="Content schema not found"
            tone="warning"
          />
        ) : isEditMode && !permissions.canViewRecords ? (
          <AdminStateBox
            body={`Your ${role.label} role cannot load saved content for editing.`}
            title="Content editing is restricted"
            tone="warning"
          />
        ) : !canSaveCurrentContent ? (
          <AdminStateBox
            body={`Your ${role.label} role cannot ${
              isEditMode ? "update" : "create"
            } content.`}
            title="Content save is restricted"
            tone="warning"
          />
        ) : isEditMode && isInitialRecordLoad ? (
          <AdminStateBox
            body={`Loading content record id ${recordId}.`}
            title="Loading content"
          />
        ) : isEditMode && recordLoadError && visibleRecords.length === 0 ? (
          <AdminStateBox
            actionLabel="Try again"
            body={recordLoadError}
            onAction={() =>
              void refreshRecords(collection, { selectedRecordId: recordId ?? null })
            }
            title="Content is unavailable"
            tone="error"
          />
        ) : isEditMode && !editorRecord ? (
          <AdminStateBox
            actionLabel="Back to content"
            body={`No saved content with record id "${recordId}" was found for ${collection.definition.label}.`}
            onAction={() => {
              window.location.href = adminRoutes.content.collection(
                collection.definition.name,
              ).href;
            }}
            title="Content not found"
            tone="warning"
          />
        ) : (
          <AdminSectionCard
            description={`Field order matches the saved ${collection.definition.label} schema.`}
            title={
              isEditMode && editorRecord
                ? summarizeRecord(collection.definition, editorRecord)
                : "Create content"
            }
          >
            {!permissions.canViewRecords && permissions.canCreateRecords ? (
              <div className="mb-4">
                <AdminStateBox
                  body="This role can create content, but it cannot browse saved content."
                  compact
                  title="Content list is hidden for this role"
                  tone="warning"
                />
              </div>
            ) : null}

            {mediaLoadError ? (
              <div className="mb-4">
                <AdminStateBox
                  body={`${mediaLoadError} Image fields can still accept pasted storage keys.`}
                  compact
                  title="Media assets are unavailable"
                  tone="warning"
                />
              </div>
            ) : null}

            {isLoadingMediaAssets ? (
              <p className="mb-4 text-xs text-slate-500">Loading media assets...</p>
            ) : null}

            <div className="generated-record-layout">
              <form className="generated-record-form" onSubmit={handleSubmit}>
                {collection.definition.fields.length === 0 ? (
                  <AdminStateBox
                    actionLabel="Open schema"
                    body="Add fields to this schema before creating content."
                    onAction={() => {
                      window.location.href = adminRoutes.schema.detail(
                        collection.definition.name,
                      ).href;
                    }}
                    title="This schema has no fields yet"
                    tone="warning"
                  />
                ) : (
                  collection.definition.fields.map((field) => (
                    <GeneratedRecordFieldInput
                      disabled={
                        !isRecordCrudFieldDefinition(field) || !canSaveCurrentContent
                      }
                      field={field}
                      key={field.name}
                      mediaAssets={mediaAssets}
                      onChange={(nextValue) =>
                        updateRecordDraftValue(field.name, nextValue)
                      }
                      onOpenMediaLibrary={() => {
                        window.location.href = adminRoutes.media().href;
                      }}
                      value={recordDraft[field.name] ?? ""}
                    />
                  ))
                )}

                {recordMessage ? (
                  <AdminStateBox
                    body={
                      recordIssues.length > 0
                        ? recordMessage
                        : `${recordMessage} This content is saved for ${collection.definition.label}.`
                    }
                    title={
                      recordIssues.length > 0
                        ? "Content needs attention"
                        : "Content saved"
                    }
                    tone={recordIssues.length > 0 ? "error" : "success"}
                  />
                ) : null}
                {recordLoadError && visibleRecords.length > 0 ? (
                  <AdminStateBox
                    actionLabel="Retry content"
                    body={`${recordLoadError} You can keep editing the current form while Datamix retries the latest content list.`}
                    onAction={() =>
                      void refreshRecords(collection, {
                        selectedRecordId: isEditMode ? (recordId ?? null) : null,
                      })
                    }
                    title="Saved content may be out of date"
                    tone="warning"
                  />
                ) : null}
                {recordIssues.length > 0 ? (
                  <ul className="issue-list">
                    {recordIssues.map((issue) => (
                      <li key={`${issue.path}-${issue.message}`}>
                        <strong>{formatIssuePath(issue.path)}</strong>: {issue.message}
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="actions">
                  <button
                    className="button"
                    disabled={
                      isSavingRecord ||
                      persistedRecordFields.length === 0 ||
                      !canSaveCurrentContent
                    }
                    type="submit"
                  >
                    {isSavingRecord
                      ? isEditMode
                        ? "Saving content..."
                        : "Creating content..."
                      : isEditMode
                        ? "Save content"
                        : "Create content"}
                  </button>
                  <button
                    className="button button-secondary"
                    disabled={!canSaveCurrentContent}
                    onClick={handleResetContent}
                    type="button"
                  >
                    Reset values
                  </button>
                </div>
              </form>

              <aside className="generated-record-preview">
                <p className="card-eyebrow">Payload preview</p>
                <h4 className="section-title">Save payload</h4>
                <p className="section-copy">
                  Preview the data that will be saved for this content.
                </p>
                {editorRecord ? (
                  <p className="section-copy">
                    Record id: <strong>{editorRecord.id}</strong>
                    <br />
                    Updated:{" "}
                    <strong>{formatRecordTimestamp(editorRecord.updatedAt)}</strong>
                  </p>
                ) : null}
                {isRefreshingRecords ? (
                  <p className="section-copy">Refreshing saved content...</p>
                ) : null}
                <p className="section-copy">
                  Stored fields: <strong>{recordSupportedFieldNames}</strong>
                </p>
                {persistedRecordFields.length === 0 ? (
                  <AdminStateBox
                    body="Add a persisted field before creating content."
                    compact
                    title="No persisted fields yet"
                    tone="warning"
                  />
                ) : null}
                <pre className="code-block">
                  <code>{JSON.stringify(persistedRecordPayload, null, 2)}</code>
                </pre>
                <pre className="code-block">
                  <code>{JSON.stringify(generatedRecordPayload, null, 2)}</code>
                </pre>
              </aside>
            </div>
          </AdminSectionCard>
        )}
      </div>
    </AdminWorkspaceRouteFrame>
  );
}

export function ContentEditorRoute({
  collectionName,
  mode,
  recordId,
}: {
  collectionName: string;
  mode: ContentEditorMode;
  recordId?: string;
}) {
  const route =
    mode === "create"
      ? adminRoutes.content.newRecord(collectionName)
      : adminRoutes.content.record(collectionName, recordId ?? "");

  return (
    <ContentEditorContent
      collectionName={collectionName}
      mode={mode}
      recordId={recordId}
      route={route}
    />
  );
}
