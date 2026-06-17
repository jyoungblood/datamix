"use client";

import {
  isRecordCrudFieldDefinition,
  type DatamixMediaAsset,
} from "@datamix/core";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { listMediaAssets } from "@/lib/media";
import { GeneratedRecordFieldInput } from "../_components/generated-record-field-input";
import {
  AdminPageHeader,
  AdminSectionCard,
} from "../_components/admin-design";
import {
  AdminLoadingReserve,
  useDelayedLoadingIndicator,
} from "../_components/admin-skeleton";
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
  mode: ContentEditorMode;
  recordId: string | undefined;
  route: AdminWorkspaceRoute;
  schemaId: string | undefined;
};

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-white px-2.5 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50";

function decodeSchemaId(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function ContentEditorContent({
  mode,
  recordId,
  route,
  schemaId,
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
    role,
    saveRecord,
    selectedRecord,
    selectRecord,
    startNewRecord,
    updateRecordDraftValue,
  } = workspace;
  const decodedSchemaId = schemaId ? decodeSchemaId(schemaId) : null;
  const [selectedSchemaId, setSelectedSchemaId] = React.useState<string | null>(
    decodedSchemaId,
  );
  const [mediaAssets, setMediaAssets] = React.useState<DatamixMediaAsset[]>([]);
  const [mediaLoadError, setMediaLoadError] = React.useState<string | null>(null);
  const [isLoadingMediaAssets, setIsLoadingMediaAssets] = React.useState(false);
  const mediaLoadRequestId = React.useRef(0);
  const activeSchemaId = decodedSchemaId ?? selectedSchemaId;
  const collection =
    activeSchemaId === null
      ? null
      : collections.find((item) => item.id === activeSchemaId) ?? null;
  const isEditMode = mode === "edit";
  const isInitialCollectionLoad =
    permissions.canViewCollections && !hasLoadedCollections && !collectionLoadError;
  const shouldBlockContentSchemaUntilLoaded = isInitialCollectionLoad;
  const isActiveRecordCollection =
    collection !== null && recordCollectionName === collection.definition.name;
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
    isEditMode &&
    collection !== null &&
    permissions.canViewRecords &&
    !recordLoadError &&
    (!isActiveRecordCollection || !hasLoadedRecords);
  const shouldShowContentSchemaLoadingState = useDelayedLoadingIndicator(
    shouldBlockContentSchemaUntilLoaded,
  );
  const shouldShowContentRecordLoadingState = useDelayedLoadingIndicator(
    isInitialRecordLoad,
  );

  React.useEffect(() => {
    setSelectedSchemaId(decodedSchemaId);
  }, [decodedSchemaId]);

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
      collection.id,
      nextRecord.id,
    ).href;
  };

  return (
    <AdminWorkspaceRouteFrame route={route}>
        <AdminPageHeader
          action={
            <Button asChild variant="outline">
              <a href={adminRoutes.content.index().href}>All content</a>
            </Button>
          }
          title={
            collection
              ? isEditMode
                ? `Edit ${collection.definition.label} content`
                : `New ${collection.definition.label} content`
              : isEditMode
                ? "Content editor"
                : "New content"
          }
        />

        {!access.isAllowed ? (
          <AdminStateBox body={access.body} title={access.title} tone="warning" />
        ) : shouldBlockContentSchemaUntilLoaded ? (
          shouldShowContentSchemaLoadingState ? (
            <AdminStateBox
              body="Loading schemas before opening this generated content editor."
              title="Loading content schema"
            />
          ) : (
            <AdminLoadingReserve className="min-h-[520px]" />
          )
        ) : collectionLoadError && collections.length === 0 ? (
          <AdminStateBox
            body={collectionLoadError}
            title="Content schema is unavailable"
            tone="error"
          />
        ) : !collection && !activeSchemaId && mode === "create" ? (
          <AdminSectionCard title="Choose schema">
            {collections.length === 0 ? (
              <AdminStateBox
                actionLabel="Create first schema"
                body="Create a schema before adding content."
                compact
                onAction={() => {
                  window.location.href = adminRoutes.schema.new().href;
                }}
                title="No schemas yet"
              />
            ) : (
              <div className="max-w-md space-y-2">
                <Label htmlFor="content-schema-id">Schema</Label>
                <select
                  className={selectClassName}
                  id="content-schema-id"
                  onChange={(event) =>
                    setSelectedSchemaId(event.target.value || null)
                  }
                  value={selectedSchemaId ?? ""}
                >
                  <option value="">Select schema</option>
                  {collections.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.definition.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </AdminSectionCard>
        ) : !collection ? (
          <AdminStateBox
            actionLabel="All content"
            body={`No saved schema with id "${activeSchemaId ?? "this route"}" was found.`}
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
          shouldShowContentRecordLoadingState ? (
            <AdminStateBox
              body="Loading this content record."
              title="Loading content"
            />
          ) : (
            <AdminLoadingReserve className="min-h-[520px]" />
          )
        ) : isEditMode && recordLoadError && visibleRecords.length === 0 ? (
          <AdminStateBox
            body={recordLoadError}
            title="Content is unavailable"
            tone="error"
          />
        ) : isEditMode && !editorRecord ? (
          <AdminStateBox
            actionLabel="Back to content"
            body={`No saved content with record id "${recordId}" was found for ${collection.definition.label}.`}
            onAction={() => {
              window.location.href = adminRoutes.content.index().href;
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
                        collection.id,
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
                    body={`${recordLoadError} You can keep editing the current form with the last content list that loaded.`}
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
    </AdminWorkspaceRouteFrame>
  );
}

export function ContentEditorRoute({
  mode,
  recordId,
  schemaId,
}: {
  mode: ContentEditorMode;
  recordId?: string;
  schemaId?: string;
}) {
  const route =
    mode === "create"
      ? adminRoutes.content.newRecord()
      : adminRoutes.content.record(schemaId ?? "", recordId ?? "");

  return (
    <ContentEditorContent
      mode={mode}
      recordId={recordId}
      route={route}
      schemaId={schemaId}
    />
  );
}
