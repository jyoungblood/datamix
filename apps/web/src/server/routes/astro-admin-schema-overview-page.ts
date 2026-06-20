import type { AdminWorkspaceProps } from "@/admin/_workspace/admin-workspace-props";
import { adminRoutes } from "@/admin/_workspace/admin-routes";

import {
  CollectionSchemaError,
  listCollectionDefinitions,
  type StoredCollectionDefinition,
} from "../collections";
import { getDatamixEnv } from "./http";
import { resolveWorkspacePage, type WorkspacePageResult } from "./astro-workspace-page";

export type SchemaOverviewPageData = {
  collectionLoadError: string | null;
  collections: StoredCollectionDefinition[];
};

type SchemaOverviewPageResult =
  | Extract<WorkspacePageResult, { kind: "redirect" }>
  | (Extract<WorkspacePageResult, { kind: "shell" }> & {
      schemaOverview: SchemaOverviewPageData;
    });

const emptySchemaOverviewData: SchemaOverviewPageData = {
  collectionLoadError: null,
  collections: [],
};

function formatCollectionLoadError(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Unable to load collection definitions.";
}

async function resolveSchemaOverviewData(
  workspace: AdminWorkspaceProps,
): Promise<SchemaOverviewPageData> {
  if (!workspace.routeAccess.isAllowed || !workspace.permissions.canViewCollections) {
    return emptySchemaOverviewData;
  }

  const env = getDatamixEnv();

  try {
    return {
      collectionLoadError: null,
      collections: await listCollectionDefinitions(env),
    };
  } catch (error) {
    if (error instanceof CollectionSchemaError) {
      return {
        collectionLoadError: error.message,
        collections: [],
      };
    }

    return {
      collectionLoadError: formatCollectionLoadError(error),
      collections: [],
    };
  }
}

export async function resolveSchemaOverviewPage(
  request: Request,
): Promise<SchemaOverviewPageResult> {
  const route = adminRoutes.schema.index();
  const page = await resolveWorkspacePage(request, route);

  if (page.kind === "redirect") {
    return page;
  }

  if (!page.workspace) {
    return {
      ...page,
      schemaOverview: emptySchemaOverviewData,
    };
  }

  return {
    ...page,
    schemaOverview: await resolveSchemaOverviewData(page.workspace),
  };
}
