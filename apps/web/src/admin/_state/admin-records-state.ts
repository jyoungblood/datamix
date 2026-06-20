"use client";

import type { DatamixSchemaValidationIssue } from "@datamix/core";
import * as React from "react";

import {
  createGeneratedRecordFormState,
  createGeneratedRecordFormStateFromRecord,
  createPersistedRecordPayload,
  upsertRecord,
  type GeneratedRecordFormState,
  type GeneratedRecordFormValue,
} from "../_lib/record-drafts";

import type { StoredCollectionDefinition } from "@/lib/collection-definitions";
import {
  CollectionRecordRequestError,
  createCollectionRecord,
  listCollectionRecords,
  updateCollectionRecord,
  type StoredCollectionRecord,
} from "@/lib/records";

export function useAdminRecordsState() {
  const recordLoadRequestId = React.useRef(0);
  const [recordCollectionName, setRecordCollectionName] = React.useState<string | null>(
    null,
  );
  const [records, setRecords] = React.useState<StoredCollectionRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = React.useState<string | null>(null);
  const [recordDraft, setRecordDraft] = React.useState<GeneratedRecordFormState>({});
  const [recordIssues, setRecordIssues] = React.useState<DatamixSchemaValidationIssue[]>(
    [],
  );
  const [recordLoadError, setRecordLoadError] = React.useState<string | null>(null);
  const [recordMessage, setRecordMessage] = React.useState<string | null>(null);
  const [recordSupportedFieldNames, setRecordSupportedFieldNames] =
    React.useState("none");
  const [hasLoadedRecords, setHasLoadedRecords] = React.useState(false);
  const [isLoadingRecords, setIsLoadingRecords] = React.useState(false);
  const [isSavingRecord, setIsSavingRecord] = React.useState(false);

  const resetRecordWorkspace = React.useCallback(() => {
    recordLoadRequestId.current += 1;
    setRecordCollectionName(null);
    setRecords([]);
    setSelectedRecordId(null);
    setRecordDraft({});
    setRecordIssues([]);
    setRecordLoadError(null);
    setRecordMessage(null);
    setRecordSupportedFieldNames("none");
    setHasLoadedRecords(false);
    setIsLoadingRecords(false);
    setIsSavingRecord(false);
  }, []);

  const loadRecords = React.useCallback(
    async (
      collection: StoredCollectionDefinition,
      options?: { selectedRecordId?: string | null },
    ) => {
      const nextCollectionName = collection.definition.name;
      const isSameCollection = recordCollectionName === nextCollectionName;
      const requestId = recordLoadRequestId.current + 1;

      recordLoadRequestId.current = requestId;
      setRecordCollectionName(nextCollectionName);
      setRecordIssues([]);
      setRecordLoadError(null);
      setHasLoadedRecords(false);
      setIsLoadingRecords(true);
      setRecordMessage(null);
      setRecords([]);
      setSelectedRecordId(options?.selectedRecordId ?? null);
      setRecordDraft(createGeneratedRecordFormState(collection.definition));
      setRecordSupportedFieldNames("none");

      try {
        const result = await listCollectionRecords(nextCollectionName);

        if (recordLoadRequestId.current !== requestId) {
          return;
        }

        const preferredRecordId = options?.selectedRecordId ?? null;
        const nextSelectedRecordId =
          preferredRecordId && result.records.some((record) => record.id === preferredRecordId)
            ? preferredRecordId
            : selectedRecordId &&
                isSameCollection &&
                result.records.some((record) => record.id === selectedRecordId)
              ? selectedRecordId
              : null;
        const nextSelectedRecord = nextSelectedRecordId
          ? result.records.find((record) => record.id === nextSelectedRecordId) ?? null
          : null;

        setRecords(result.records);
        setRecordSupportedFieldNames(result.supportedFieldNames);
        setHasLoadedRecords(true);
        setSelectedRecordId(nextSelectedRecordId);
        setRecordDraft(
          nextSelectedRecord
            ? createGeneratedRecordFormStateFromRecord(
                collection.definition,
                nextSelectedRecord,
              )
            : createGeneratedRecordFormState(collection.definition),
        );
      } catch (error) {
        if (recordLoadRequestId.current !== requestId) {
          return;
        }

        setRecords([]);
        setRecordSupportedFieldNames("none");
        setRecordLoadError(
          error instanceof Error ? error.message : "Unable to load collection records.",
        );
      } finally {
        if (recordLoadRequestId.current === requestId) {
          setIsLoadingRecords(false);
        }
      }
    },
    [recordCollectionName, selectedRecordId],
  );

  const selectRecord = React.useCallback(
    (collection: StoredCollectionDefinition, record: StoredCollectionRecord | null) => {
      setRecordCollectionName(collection.definition.name);
      setSelectedRecordId(record?.id ?? null);
      setRecordDraft(
        record
          ? createGeneratedRecordFormStateFromRecord(collection.definition, record)
          : createGeneratedRecordFormState(collection.definition),
      );
      setRecordIssues([]);
      setRecordMessage(null);
    },
    [],
  );

  const startNewRecord = React.useCallback(
    (collection: StoredCollectionDefinition) => {
      selectRecord(collection, null);
    },
    [selectRecord],
  );

  const updateRecordDraftValue = React.useCallback(
    (fieldName: string, nextValue: GeneratedRecordFormValue) => {
      setRecordDraft((currentRecordDraft) => ({
        ...currentRecordDraft,
        [fieldName]: nextValue,
      }));
      setRecordIssues([]);
      setRecordMessage(null);
    },
    [],
  );

  const saveRecord = React.useCallback(
    async (collection: StoredCollectionDefinition) => {
      const currentSelectedRecordId =
        recordCollectionName === collection.definition.name ? selectedRecordId : null;
      const persistedRecordPayload = createPersistedRecordPayload(
        collection.definition,
        recordDraft,
      );

      setIsSavingRecord(true);
      setRecordIssues([]);
      setRecordMessage(null);

      try {
        const result = currentSelectedRecordId
          ? await updateCollectionRecord(
              collection.definition.name,
              currentSelectedRecordId,
              persistedRecordPayload,
            )
          : await createCollectionRecord(
              collection.definition.name,
              persistedRecordPayload,
            );

        setRecordCollectionName(collection.definition.name);
        setRecords((currentRecords) => upsertRecord(currentRecords, result.record));
        setSelectedRecordId(result.record.id);
        setRecordSupportedFieldNames(result.supportedFieldNames);
        setRecordDraft(
          createGeneratedRecordFormStateFromRecord(collection.definition, result.record),
        );
        setRecordMessage(result.message);
        setRecordLoadError(null);

        return result.record;
      } catch (error) {
        if (error instanceof CollectionRecordRequestError) {
          setRecordIssues(error.issues ?? []);
          setRecordMessage(error.message);
        } else {
          setRecordMessage(error instanceof Error ? error.message : "Unable to save record.");
        }

        return null;
      } finally {
        setIsSavingRecord(false);
      }
    },
    [recordCollectionName, recordDraft, selectedRecordId],
  );

  const selectedRecord =
    selectedRecordId && recordCollectionName
      ? records.find((record) => record.id === selectedRecordId) ?? null
      : null;

  return {
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
    resetRecordWorkspace,
    saveRecord,
    selectedRecord,
    selectRecord,
    startNewRecord,
    updateRecordDraftValue,
  };
}

export type AdminRecordsState = ReturnType<typeof useAdminRecordsState>;
