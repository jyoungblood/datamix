import type { DatamixSchemaValidationIssue } from "@datamix/core";

import { adminPublicEnv } from "./runtime";

export type PrimitiveRecordValue = boolean | number | string | null;

export type StoredCollectionRecord = {
  createdAt: string;
  id: string;
  updatedAt: string;
  values: Record<string, PrimitiveRecordValue>;
};

type RecordApiBody = {
  error?: string;
  issues?: DatamixSchemaValidationIssue[];
  message?: string;
  record?: StoredCollectionRecord;
  records?: StoredCollectionRecord[];
  supportedFieldNames?: string;
};

export class CollectionRecordRequestError extends Error {
  readonly issues: DatamixSchemaValidationIssue[] | undefined;

  constructor(message: string, issues?: DatamixSchemaValidationIssue[]) {
    super(message);
    this.name = "CollectionRecordRequestError";
    this.issues = issues;
  }
}

async function readApiBody<TValue>(response: Response) {
  return (await response.json().catch(() => null)) as TValue | null;
}

function buildRecordsUrl(collectionName: string, recordId?: string) {
  const pathname = recordId
    ? `/records/${encodeURIComponent(collectionName)}/${encodeURIComponent(recordId)}`
    : `/records/${encodeURIComponent(collectionName)}`;

  return `${adminPublicEnv.NEXT_PUBLIC_API_ORIGIN}${pathname}`;
}

export async function listCollectionRecords(collectionName: string) {
  const response = await fetch(buildRecordsUrl(collectionName), {
    credentials: "include",
  });

  const body = await readApiBody<RecordApiBody>(response);

  if (!response.ok) {
    throw new CollectionRecordRequestError(
      body?.error ?? "Unable to load records.",
      body?.issues,
    );
  }

  return {
    records: body?.records ?? [],
    supportedFieldNames: body?.supportedFieldNames ?? "none",
  };
}

export async function createCollectionRecord(
  collectionName: string,
  values: Record<string, PrimitiveRecordValue>,
) {
  const response = await fetch(buildRecordsUrl(collectionName), {
    body: JSON.stringify({ values }),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const body = await readApiBody<RecordApiBody>(response);

  if (!response.ok) {
    throw new CollectionRecordRequestError(
      body?.error ?? "Unable to create record.",
      body?.issues,
    );
  }

  if (!body?.record || !body.message) {
    throw new CollectionRecordRequestError("Record create response was incomplete.");
  }

  return {
    message: body.message,
    record: body.record,
    supportedFieldNames: body.supportedFieldNames ?? "none",
  };
}

export async function updateCollectionRecord(
  collectionName: string,
  recordId: string,
  values: Record<string, PrimitiveRecordValue>,
) {
  const response = await fetch(buildRecordsUrl(collectionName, recordId), {
    body: JSON.stringify({ values }),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
  });

  const body = await readApiBody<RecordApiBody>(response);

  if (!response.ok) {
    throw new CollectionRecordRequestError(
      body?.error ?? "Unable to update record.",
      body?.issues,
    );
  }

  if (!body?.record || !body.message) {
    throw new CollectionRecordRequestError("Record update response was incomplete.");
  }

  return {
    message: body.message,
    record: body.record,
    supportedFieldNames: body.supportedFieldNames ?? "none",
  };
}
