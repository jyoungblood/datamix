import {
  datamixRolePresets,
  type DatamixApiKeySummary,
  type DatamixMediaAsset,
  type DatamixRoleDefinition,
} from "@datamix/core";

import type { AdminWorkspaceRoute } from "@/admin/_workspace/admin-routes";
import type { AdminWorkspaceProps } from "@/admin/_workspace/admin-workspace-props";
import type { PublicApiRuntimeSummary } from "@/lib/api-keys";
import type { SetupStatusState } from "@/lib/setup";

import { getAuthSetupStatus } from "../auth";
import {
  CollectionSchemaError,
  listCollectionDefinitions,
  type StoredCollectionDefinition,
} from "../collections";
import {
  AuthConfigError,
  createPublicApiRuntimeSummary,
  PublicApiConfigError,
  readPublicApiRuntime,
} from "../env";
import { DatamixApiKeyError, listDatamixApiKeys } from "../api-keys";
import { MediaAssetError, listMediaAssets } from "../media";
import {
  CollectionRecordError,
  listCollectionRecords,
  type StoredCollectionRecord,
} from "../records";
import { DatamixRoleError, listAvailableRoleDefinitions } from "../roles";
import { DatamixUserError, listDatamixUsers, type DatamixUserSummary } from "../users";
import { getDatamixEnv } from "./http";
import { resolveWorkspacePage, type WorkspacePageResult } from "./astro-workspace-page";

type ShellPage = Extract<WorkspacePageResult, { kind: "shell" }>;

export type SchemaBuilderPageData = {
  collectionLoadError: string | null;
  collections: StoredCollectionDefinition[];
  collectionsLoaded: boolean;
};

export type ContentEditorPageData = SchemaBuilderPageData & {
  mediaAssets: DatamixMediaAsset[];
  mediaAssetsLoaded: boolean;
  mediaLoadError: string | null;
  recordLoadError: string | null;
  recordSupportedFieldNames: string;
  records: StoredCollectionRecord[];
  recordsLoaded: boolean;
};

export type MediaLibraryPageData = {
  mediaAssets: DatamixMediaAsset[];
  mediaAssetsLoaded: boolean;
  mediaLoadError: string | null;
};

export type TeamPageData = {
  roles: DatamixRoleDefinition[];
  rolesLoadError: string | null;
  rolesLoaded: boolean;
  users: DatamixUserSummary[];
  usersLoadError: string | null;
  usersLoaded: boolean;
};

export type SettingsPageData = {
  apiKeys: DatamixApiKeySummary[];
  apiKeysLoadError: string | null;
  apiKeysLoaded: boolean;
  publicApiRuntime: PublicApiRuntimeSummary | null;
  roles: DatamixRoleDefinition[];
  rolesLoadError: string | null;
  rolesLoaded: boolean;
  setupStatus: SetupStatusState;
};

type SchemaBuilderPageResult =
  | Extract<WorkspacePageResult, { kind: "redirect" }>
  | (ShellPage & { schemaBuilder: SchemaBuilderPageData });

type ContentEditorPageResult =
  | Extract<WorkspacePageResult, { kind: "redirect" }>
  | (ShellPage & { contentEditor: ContentEditorPageData });

type MediaLibraryPageResult =
  | Extract<WorkspacePageResult, { kind: "redirect" }>
  | (ShellPage & { mediaLibrary: MediaLibraryPageData });

type TeamPageResult =
  | Extract<WorkspacePageResult, { kind: "redirect" }>
  | (ShellPage & { team: TeamPageData });

type SettingsPageResult =
  | Extract<WorkspacePageResult, { kind: "redirect" }>
  | (ShellPage & { settings: SettingsPageData });

const emptySchemaBuilderData: SchemaBuilderPageData = {
  collectionLoadError: null,
  collections: [],
  collectionsLoaded: false,
};

const emptyMediaLibraryData: MediaLibraryPageData = {
  mediaAssets: [],
  mediaAssetsLoaded: false,
  mediaLoadError: null,
};

const emptyTeamData: TeamPageData = {
  roles: [...datamixRolePresets],
  rolesLoadError: null,
  rolesLoaded: false,
  users: [],
  usersLoadError: null,
  usersLoaded: false,
};

const emptySetupStatus: SetupStatusState = {
  data: null,
  errorMessage: null,
  isPending: false,
  oauth: null,
  statusCode: null,
};

const emptySettingsData: SettingsPageData = {
  apiKeys: [],
  apiKeysLoadError: null,
  apiKeysLoaded: false,
  publicApiRuntime: null,
  roles: [...datamixRolePresets],
  rolesLoadError: null,
  rolesLoaded: false,
  setupStatus: emptySetupStatus,
};

function formatErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function decodeRouteSegment(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function withEmptyState<TData extends object, TKey extends string>(
  page: ShellPage,
  key: TKey,
  data: TData,
): ShellPage & Record<TKey, TData> {
  return {
    ...page,
    [key]: data,
  } as ShellPage & Record<TKey, TData>;
}

async function resolveCollectionData(
  workspace: AdminWorkspaceProps,
): Promise<SchemaBuilderPageData> {
  if (!workspace.routeAccess.isAllowed || !workspace.permissions.canViewCollections) {
    return emptySchemaBuilderData;
  }

  try {
    return {
      collectionLoadError: null,
      collections: await listCollectionDefinitions(getDatamixEnv()),
      collectionsLoaded: true,
    };
  } catch (error) {
    return {
      collectionLoadError:
        error instanceof CollectionSchemaError
          ? error.message
          : formatErrorMessage(error, "Unable to load collection definitions."),
      collections: [],
      collectionsLoaded: true,
    };
  }
}

async function resolveMediaData(
  workspace: AdminWorkspaceProps,
): Promise<MediaLibraryPageData> {
  if (!workspace.routeAccess.isAllowed || !workspace.permissions.canViewMedia) {
    return emptyMediaLibraryData;
  }

  try {
    return {
      mediaAssets: await listMediaAssets(getDatamixEnv()),
      mediaAssetsLoaded: true,
      mediaLoadError: null,
    };
  } catch (error) {
    return {
      mediaAssets: [],
      mediaAssetsLoaded: true,
      mediaLoadError:
        error instanceof MediaAssetError
          ? error.message
          : formatErrorMessage(error, "Unable to load media assets."),
    };
  }
}

async function resolveTeamData(
  workspace: AdminWorkspaceProps,
): Promise<TeamPageData> {
  const env = getDatamixEnv();
  const nextData: TeamPageData = { ...emptyTeamData };

  if (!workspace.routeAccess.isAllowed) {
    return nextData;
  }

  if (workspace.permissions.canAccessTeamAccess) {
    try {
      nextData.roles = await listAvailableRoleDefinitions(env);
      nextData.rolesLoadError = null;
      nextData.rolesLoaded = true;
    } catch (error) {
      nextData.roles = [...datamixRolePresets];
      nextData.rolesLoadError =
        error instanceof DatamixRoleError
          ? error.message
          : formatErrorMessage(error, "Unable to load roles.");
      nextData.rolesLoaded = true;
    }
  }

  if (workspace.permissions.canViewUsers) {
    try {
      nextData.users = await listDatamixUsers(env);
      nextData.usersLoadError = null;
      nextData.usersLoaded = true;
    } catch (error) {
      nextData.users = [];
      nextData.usersLoadError =
        error instanceof DatamixUserError
          ? error.message
          : formatErrorMessage(error, "Unable to load users.");
      nextData.usersLoaded = true;
    }
  }

  return nextData;
}

async function resolveSetupStatusData(): Promise<SetupStatusState> {
  try {
    const auth = await getAuthSetupStatus(getDatamixEnv());

    return {
      data: auth.setup,
      errorMessage: null,
      isPending: false,
      oauth: auth.oauth,
      statusCode: null,
    };
  } catch (error) {
    return {
      data: null,
      errorMessage: formatErrorMessage(error, "Unable to load setup status."),
      isPending: false,
      oauth: null,
      statusCode: error instanceof AuthConfigError ? 503 : null,
    };
  }
}

async function resolveSettingsData(
  workspace: AdminWorkspaceProps,
): Promise<SettingsPageData> {
  const env = getDatamixEnv();
  const nextData: SettingsPageData = {
    ...emptySettingsData,
    roles: [...emptySettingsData.roles],
    setupStatus: await resolveSetupStatusData(),
  };

  if (!workspace.routeAccess.isAllowed || !workspace.permissions.canAccessSettingsWorkspace) {
    return nextData;
  }

  try {
    nextData.publicApiRuntime = createPublicApiRuntimeSummary(
      readPublicApiRuntime(env),
    );
    nextData.apiKeys = await listDatamixApiKeys(env);
    nextData.apiKeysLoadError = null;
    nextData.apiKeysLoaded = true;
  } catch (error) {
    nextData.apiKeys = [];
    nextData.publicApiRuntime = null;
    nextData.apiKeysLoadError =
      error instanceof DatamixApiKeyError || error instanceof PublicApiConfigError
        ? error.message
        : formatErrorMessage(error, "Unable to load API keys.");
    nextData.apiKeysLoaded = true;
  }

  try {
    nextData.roles = await listAvailableRoleDefinitions(env);
    nextData.rolesLoadError = null;
    nextData.rolesLoaded = true;
  } catch (error) {
    nextData.roles = [...datamixRolePresets];
    nextData.rolesLoadError =
      error instanceof DatamixRoleError
        ? error.message
        : formatErrorMessage(error, "Unable to load roles.");
    nextData.rolesLoaded = true;
  }

  return nextData;
}

async function resolveContentEditorData(
  workspace: AdminWorkspaceProps,
  input: {
    schemaId?: string | undefined;
  },
): Promise<ContentEditorPageData> {
  const collectionData = await resolveCollectionData(workspace);
  const mediaData = await resolveMediaData(workspace);
  const activeSchemaId = decodeRouteSegment(input.schemaId);
  const collection = activeSchemaId
    ? collectionData.collections.find((item) => item.id === activeSchemaId) ?? null
    : null;

  if (
    !workspace.routeAccess.isAllowed ||
    !collection ||
    !workspace.permissions.canViewRecords
  ) {
    return {
      ...collectionData,
      ...mediaData,
      recordLoadError: null,
      recordSupportedFieldNames: "none",
      records: [],
      recordsLoaded: false,
    };
  }

  try {
    const result = await listCollectionRecords(
      getDatamixEnv(),
      collection.definition.name,
    );

    return {
      ...collectionData,
      ...mediaData,
      recordLoadError: null,
      recordSupportedFieldNames: Array.isArray(result.supportedFieldNames)
        ? result.supportedFieldNames.join(", ")
        : result.supportedFieldNames,
      records: result.records,
      recordsLoaded: true,
    };
  } catch (error) {
    return {
      ...collectionData,
      ...mediaData,
      recordLoadError:
        error instanceof CollectionRecordError
          ? error.message
          : formatErrorMessage(error, "Unable to load records."),
      recordSupportedFieldNames: "none",
      records: [],
      recordsLoaded: true,
    };
  }
}

export async function resolveSchemaBuilderPage(
  request: Request,
  route: AdminWorkspaceRoute,
): Promise<SchemaBuilderPageResult> {
  const page = await resolveWorkspacePage(request, route);

  if (page.kind === "redirect") {
    return page;
  }

  if (!page.workspace) {
    return withEmptyState(page, "schemaBuilder", emptySchemaBuilderData);
  }

  return {
    ...page,
    schemaBuilder: await resolveCollectionData(page.workspace),
  };
}

export async function resolveContentEditorPage(
  request: Request,
  route: AdminWorkspaceRoute,
  input: {
    schemaId?: string | undefined;
  } = {},
): Promise<ContentEditorPageResult> {
  const page = await resolveWorkspacePage(request, route);

  if (page.kind === "redirect") {
    return page;
  }

  if (!page.workspace) {
    return withEmptyState(page, "contentEditor", {
      ...emptySchemaBuilderData,
      ...emptyMediaLibraryData,
      recordLoadError: null,
      recordSupportedFieldNames: "none",
      records: [],
      recordsLoaded: false,
    });
  }

  return {
    ...page,
    contentEditor: await resolveContentEditorData(page.workspace, input),
  };
}

export async function resolveMediaLibraryPage(
  request: Request,
  route: AdminWorkspaceRoute,
): Promise<MediaLibraryPageResult> {
  const page = await resolveWorkspacePage(request, route);

  if (page.kind === "redirect") {
    return page;
  }

  if (!page.workspace) {
    return withEmptyState(page, "mediaLibrary", emptyMediaLibraryData);
  }

  return {
    ...page,
    mediaLibrary: await resolveMediaData(page.workspace),
  };
}

export async function resolveTeamPage(
  request: Request,
  route: AdminWorkspaceRoute,
): Promise<TeamPageResult> {
  const page = await resolveWorkspacePage(request, route);

  if (page.kind === "redirect") {
    return page;
  }

  if (!page.workspace) {
    return withEmptyState(page, "team", emptyTeamData);
  }

  return {
    ...page,
    team: await resolveTeamData(page.workspace),
  };
}

export async function resolveSettingsPage(
  request: Request,
  route: AdminWorkspaceRoute,
): Promise<SettingsPageResult> {
  const page = await resolveWorkspacePage(request, route);

  if (page.kind === "redirect") {
    return page;
  }

  if (!page.workspace) {
    return withEmptyState(page, "settings", emptySettingsData);
  }

  return {
    ...page,
    settings: await resolveSettingsData(page.workspace),
  };
}
