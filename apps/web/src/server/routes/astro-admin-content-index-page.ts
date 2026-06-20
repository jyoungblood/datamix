import type { AdminWorkspaceProps } from "@/admin/_workspace/admin-workspace-props";
import { adminRoutes } from "@/admin/_workspace/admin-routes";

import {
  CollectionSchemaError,
  listCollectionDefinitions,
  type StoredCollectionDefinition,
} from "../collections";
import {
  CollectionRecordError,
  listCollectionRecords,
  type StoredCollectionRecord,
} from "../records";
import { getDatamixEnv } from "./http";
import { resolveWorkspacePage, type WorkspacePageResult } from "./astro-workspace-page";

export type ContentIndexRecordRow = {
  collection: StoredCollectionDefinition;
  record: StoredCollectionRecord;
};

export type ContentIndexPageData = {
  collectionLoadError: string | null;
  collections: StoredCollectionDefinition[];
  recordLoadError: string | null;
  recordRows: ContentIndexRecordRow[];
};

type ContentIndexPageResult =
  | Extract<WorkspacePageResult, { kind: "redirect" }>
  | (Extract<WorkspacePageResult, { kind: "shell" }> & {
      contentIndex: ContentIndexPageData;
    });

const emptyContentIndexData: ContentIndexPageData = {
  collectionLoadError: null,
  collections: [],
  recordLoadError: null,
  recordRows: [],
};

function formatCollectionLoadError(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Unable to load collection definitions.";
}

function formatRecordLoadError(error: unknown) {
  if (error instanceof CollectionRecordError && error.message.trim()) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Unable to load content.";
}

async function resolveContentIndexData(
  workspace: AdminWorkspaceProps,
): Promise<ContentIndexPageData> {
  if (!workspace.routeAccess.isAllowed || !workspace.permissions.canViewCollections) {
    return emptyContentIndexData;
  }

  const env = getDatamixEnv();
  let collections: StoredCollectionDefinition[];

  try {
    collections = await listCollectionDefinitions(env);
  } catch (error) {
    return {
      collectionLoadError:
        error instanceof CollectionSchemaError
          ? error.message
          : formatCollectionLoadError(error),
      collections: [],
      recordLoadError: null,
      recordRows: [],
    };
  }

  if (!workspace.permissions.canViewRecords || collections.length === 0) {
    return {
      collectionLoadError: null,
      collections,
      recordLoadError: null,
      recordRows: [],
    };
  }

  const results = await Promise.all(
    collections.map(async (collection) => {
      try {
        const result = await listCollectionRecords(env, collection.definition.name);

        return {
          collection,
          error: null,
          records: result.records,
        };
      } catch (error) {
        return {
          collection,
          error: formatRecordLoadError(error),
          records: [] as StoredCollectionRecord[],
        };
      }
    }),
  );

  const recordRows = results
    .flatMap((result) =>
      result.records.map((record) => ({
        collection: result.collection,
        record,
      })),
    )
    .sort(
      (left, right) =>
        new Date(right.record.updatedAt).getTime() -
        new Date(left.record.updatedAt).getTime(),
    );
  const failedLoads = results.filter((result) => result.error);

  return {
    collectionLoadError: null,
    collections,
    recordLoadError:
      failedLoads.length > 0
        ? `${failedLoads.length} schema${failedLoads.length === 1 ? "" : "s"} could not load content.`
        : null,
    recordRows,
  };
}

export async function resolveContentIndexPage(
  request: Request,
): Promise<ContentIndexPageResult> {
  const route = adminRoutes.content.index();
  const page = await resolveWorkspacePage(request, route);

  if (page.kind === "redirect") {
    return page;
  }

  if (!page.workspace) {
    return {
      ...page,
      contentIndex: emptyContentIndexData,
    };
  }

  return {
    ...page,
    contentIndex: await resolveContentIndexData(page.workspace),
  };
}
