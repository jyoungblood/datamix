"use client";

import {
  isRecordCrudFieldDefinition,
  type DatamixMediaAsset,
} from "@datamix/core";
import * as React from "react";
import { createPortal } from "react-dom";

import type { StoredCollectionDefinition } from "@/lib/collection-definitions";
import { listMediaAssets } from "@/lib/media";
import type { StoredCollectionRecord } from "@/lib/records";

import { GeneratedRecordFieldInput } from "../_components/generated-record-field-input";
import { AdminStateBox } from "../_components/admin-state";
import {
  createGeneratedRecordPayload,
  createPersistedRecordPayload,
} from "../_lib/record-drafts";
import { formatIssuePath } from "../_lib/schema-drafts";
import { useAdminRecordsState } from "../_state/admin-records-state";
import { adminRoutes } from "../_workspace/admin-routes";
import type { AdminWorkspaceProps } from "../_workspace/admin-workspace-props";

type ContentEditorMode = "create" | "edit";
type ContentEditorRegion =
  | "fields"
  | "media-status"
  | "payload-preview"
  | "record-actions"
  | "record-status";

type ContentEditorFormIslandProps = {
  activeCollection: StoredCollectionDefinition | null;
  canSave: boolean;
  mediaAssets: DatamixMediaAsset[];
  mediaAssetsLoaded: boolean;
  mediaLoadError: string | null;
  mode: ContentEditorMode;
  recordId?: string | undefined;
  recordLoadError: string | null;
  records: StoredCollectionRecord[];
  recordsLoaded: boolean;
  workspace: AdminWorkspaceProps;
};

const contentEditorFormId = "content-editor-form";

function useContentEditorRegion(region: ContentEditorRegion) {
  const [target, setTarget] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    setTarget(
      document.querySelector<HTMLElement>(
        `[data-content-editor-region="${region}"]`,
      ),
    );
  }, [region]);

  return target;
}

function ContentEditorPortal({
  children,
  region,
}: {
  children: React.ReactNode;
  region: ContentEditorRegion;
}) {
  const target = useContentEditorRegion(region);

  return target ? createPortal(children, target) : null;
}

export function ContentEditorFormIsland({
  activeCollection: collection,
  canSave,
  mediaAssets: initialMediaAssets,
  mediaAssetsLoaded: initialMediaAssetsLoaded,
  mediaLoadError: initialMediaLoadError,
  mode,
  recordLoadError: initialRecordLoadError,
  recordId,
  records: initialRecords,
  recordsLoaded: initialRecordsLoaded,
  workspace,
}: ContentEditorFormIslandProps) {
  const { permissions } = workspace;
  const isEditMode = mode === "edit";
  const {
    hasLoadedRecords,
    isLoadingRecords,
    isSavingRecord,
    loadRecords,
    recordCollectionName,
    recordDraft,
    recordIssues,
    recordMessage,
    records,
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

  const canSaveCurrentContent = canSave;
  const handleSubmit = React.useCallback(async (event: Event) => {
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
  }, [canSaveCurrentContent, collection, isEditMode, saveRecord]);

  React.useEffect(() => {
    const form = document.getElementById(contentEditorFormId);

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    form.addEventListener("submit", handleSubmit);

    return () => {
      form.removeEventListener("submit", handleSubmit);
    };
  }, [handleSubmit]);

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

  const handleResetContent = () => {
    if (isEditMode) {
      selectRecord(collection, editorRecord);
      return;
    }

    startNewRecord(collection);
  };

  return (
    <>
      <ContentEditorPortal region="media-status">
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
      </ContentEditorPortal>

      <ContentEditorPortal region="fields">
        {collection.definition.fields.map((field) => (
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
        ))}
      </ContentEditorPortal>

      <ContentEditorPortal region="record-status">
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
        {recordIssues.length > 0 ? (
          <ul className="issue-list">
            {recordIssues.map((issue) => (
              <li key={`${issue.path}-${issue.message}`}>
                <strong>{formatIssuePath(issue.path)}</strong>: {issue.message}
              </li>
            ))}
          </ul>
        ) : null}
      </ContentEditorPortal>

      <ContentEditorPortal region="record-actions">
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
      </ContentEditorPortal>

      <ContentEditorPortal region="payload-preview">
        <pre className="code-block">
          <code>{JSON.stringify(persistedRecordPayload, null, 2)}</code>
        </pre>
        <pre className="code-block">
          <code>{JSON.stringify(generatedRecordPayload, null, 2)}</code>
        </pre>
      </ContentEditorPortal>
    </>
  );
}
