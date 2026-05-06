import type {
  DatamixCollectionDefinition,
  DatamixSchemaValidationIssue,
} from "@datamix/core";

import { adminPublicEnv } from "./runtime";

export type StoredCollectionDefinition = {
  createdAt: string;
  definition: DatamixCollectionDefinition;
  tableName: string;
  updatedAt: string;
};

export type SavedCollectionPlanSummary = {
  addedFields: string[];
  changedFields: Array<{
    fieldName: string;
    nextStorage: string;
    previousStorage: string;
  }>;
  mode: "add_columns" | "create" | "noop" | "rebuild";
  removedFields: string[];
  tableName: string;
};

export type SaveCollectionDefinitionResponse = {
  collection: StoredCollectionDefinition;
  message: string;
  plan: SavedCollectionPlanSummary;
};

type ApiErrorBody = {
  error?: string;
  issues?: DatamixSchemaValidationIssue[];
};

export class CollectionDefinitionRequestError extends Error {
  readonly issues: DatamixSchemaValidationIssue[] | undefined;

  constructor(message: string, issues?: DatamixSchemaValidationIssue[]) {
    super(message);
    this.name = "CollectionDefinitionRequestError";
    this.issues = issues;
  }
}

async function readApiBody<TValue>(response: Response) {
  return (await response.json().catch(() => null)) as TValue | null;
}

function buildCollectionDefinitionsUrl(name?: string) {
  const pathname = name
    ? `/collection-definitions/${encodeURIComponent(name)}`
    : "/collection-definitions";

  return `${adminPublicEnv.NEXT_PUBLIC_API_ORIGIN}${pathname}`;
}

export async function listCollectionDefinitions() {
  const response = await fetch(buildCollectionDefinitionsUrl(), {
    credentials: "include",
  });

  const body = await readApiBody<{ collections?: StoredCollectionDefinition[] } & ApiErrorBody>(
    response,
  );

  if (!response.ok) {
    throw new CollectionDefinitionRequestError(
      body?.error ?? "Unable to load collection definitions.",
      body?.issues,
    );
  }

  return body?.collections ?? [];
}

export async function saveCollectionDefinition(definition: DatamixCollectionDefinition) {
  const response = await fetch(buildCollectionDefinitionsUrl(definition.name), {
    body: JSON.stringify(definition),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
  });

  const body = await readApiBody<SaveCollectionDefinitionResponse & ApiErrorBody>(response);

  if (!response.ok) {
    throw new CollectionDefinitionRequestError(
      body?.error ?? "Unable to save collection definition.",
      body?.issues,
    );
  }

  if (!body?.collection || !body.plan || !body.message) {
    throw new CollectionDefinitionRequestError(
      "Collection definition response was incomplete.",
    );
  }

  return body;
}
