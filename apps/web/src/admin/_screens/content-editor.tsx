"use client";

import {
  isRecordCrudFieldDefinition,
  type DatamixMediaAsset,
} from "@datamix/core";
import type { SubmitEvent } from "react";
import * as React from "react";

import type { StoredCollectionDefinition } from "@/lib/collection-definitions";
import { listMediaAssets } from "@/lib/media";
import type { StoredCollectionRecord } from "@/lib/records";

import { GeneratedRecordFieldInput } from "../_components/generated-record-field-input";
import { AdminStateBox } from "../_components/admin-state";
import { formatRecordTimestamp } from "../_lib/media-formatting";
import {
  createGeneratedRecordPayload,
  createPersistedRecordPayload,
} from "../_lib/record-drafts";
import { formatIssuePath } from "../_lib/schema-drafts";
import { useAdminRecordsState } from "../_state/admin-records-state";
import { adminRoutes } from "../_workspace/admin-routes";
import type { AdminWorkspaceProps } from "../_workspace/admin-workspace-props";

type ContentEditorMode = "create" | "edit";

type ContentEditorFormIslandProps = {
  collections: StoredCollectionDefinition[];
  mediaAssets: DatamixMediaAsset[];
  mediaAssetsLoaded: boolean;
  mediaLoadError: string | null;
  mode: ContentEditorMode;
  recordId?: string | undefined;
  recordLoadError: string | null;
  recordSupportedFieldNames: string;
  records: StoredCollectionRecord[];
  recordsLoaded: boolean;
  schemaId: string;
  workspace: AdminWorkspaceProps;
};

function decodeSchemaId(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function ContentEditorFormIsland({
  collections,
  mediaAssets: initialMediaAssets,
  mediaAssetsLoaded: initialMediaAssetsLoaded,
  mediaLoadError: initialMediaLoadError,
  mode,
  recordLoadError: initialRecordLoadError,
  recordId,
  recordSupportedFieldNames: initialRecordSupportedFieldNames,
  records: initialRecords,
  recordsLoaded: initialRecordsLoaded,
  schemaId,
  workspace,
}: ContentEditorFormIslandProps) {
  const { permissions } = workspace;
  const decodedSchemaId = schemaId ? decodeSchemaId(schemaId) : null;
  const collection =
    decodedSchemaId === null
      ? null
      : collections.find((item) => item.id === decodedSchemaId) ?? null;
  const isEditMode = mode === "edit";
  const {
    hasLoadedRecords,
    isLoadingRecords,
    isSavingRecord,
    loadRecords,
    recordCollectionName,
    recordDraft,
    recordIssues,
    recordLoadError,
    recordMessage,
    records,
    recordSupportedFieldNames,
    saveRecord,
    selectedRecord,
    selectRecord,
    startNewRecord,
    updateRecordDraftValue,
  } = useAdminRecordsState({
    initialCollection: collection,
    initialRecordLoadError,
    initialRecords,
    initialRecordsLoaded,
    initialRecordSupportedFieldNames,
    initialSelectedRecordId: recordId,
  });
  const [mediaAssets, setMediaAssets] = React.useState<DatamixMediaAsset[]>(
    () => initialMediaAssets,
  );
  const [mediaLoadError, setMediaLoadError] = React.useState<string | null>(
    () => initialMediaLoadError,
  );
  const [hasLoadedMediaAssets, setHasLoadedMediaAssets] = React.useState(
    () => initialMediaAssetsLoaded,
  );
  const [isLoadingMediaAssets, setIsLoadingMediaAssets] = React.useState(false);
  const mediaLoadRequestId = React.useRef(0);

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
      setHasLoadedMediaAssets(false);
      setIsLoadingMediaAssets(false);
      return;
    }

    if (hasLoadedMediaAssets) {
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
        setHasLoadedMediaAssets(true);
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
  }, [hasLoadedMediaAssets, permissions.canViewMedia]);

  if (!collection) {
    return null;
  }

  const isActiveRecordCollection =
    recordCollectionName === collection.definition.name;
  const visibleRecords = isActiveRecordCollection ? records : [];
  const activeSelectedRecord =
    isActiveRecordCollection && selectedRecord ? selectedRecord : null;
  const activeRouteRecord =
    isEditMode && recordId
      ? visibleRecords.find((record) => record.id === recordId) ?? null
      : null;
  const editorRecord = isEditMode ? activeRouteRecord : activeSelectedRecord;
  const persistedRecordFields =
    collection.definition.fields.filter(isRecordCrudFieldDefinition);
  const persistedRecordPayload = createPersistedRecordPayload(
    collection.definition,
    recordDraft,
  );
  const generatedRecordPayload = createGeneratedRecordPayload(
    collection.definition,
    recordDraft,
  );
  const canSaveCurrentContent = isEditMode
    ? permissions.canUpdateRecords
    : permissions.canCreateRecords;

  const handleResetContent = () => {
    if (isEditMode) {
      selectRecord(collection, editorRecord);
      return;
    }

    startNewRecord(collection);
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSaveCurrentContent) {
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
    <>
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
    </>
  );
}
