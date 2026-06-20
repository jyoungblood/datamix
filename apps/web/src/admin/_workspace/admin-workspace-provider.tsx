"use client";

import type {
  DatamixApiKeySummary,
  DatamixAuthorizationSummary,
  DatamixMediaAsset,
  DatamixPermissionKey,
  DatamixRoleDefinition,
  DatamixSchemaValidationIssue,
} from "@datamix/core";
import { createDatamixAuthorizationSummary } from "@datamix/core";
import * as React from "react";

import { LoaderViewTransitionBoundary } from "@/components/loader-view-transition";
import { Button } from "@/components/ui/button";
import type { PublicApiRuntimeSummary } from "@/lib/api-keys";
import { authClient } from "@/lib/auth-client";
import {
  listCollectionDefinitions,
  type StoredCollectionDefinition,
} from "@/lib/collection-definitions";
import {
  CollectionRecordRequestError,
  createCollectionRecord,
  listCollectionRecords,
  updateCollectionRecord,
  type StoredCollectionRecord,
} from "@/lib/records";
import { buildDatamixAdminPath } from "@/lib/runtime";
import { loadSessionAccess, SessionAccessError } from "@/lib/session";
import { useSetupStatus } from "@/lib/setup";
import type { DatamixUserSummary } from "@/lib/users";
import type { ApiKeyDraft } from "../_lib/api-key-drafts";
import {
  createGeneratedRecordFormState,
  createGeneratedRecordFormStateFromRecord,
  createPersistedRecordPayload,
  upsertRecord,
  type GeneratedRecordFormState,
  type GeneratedRecordFormValue,
} from "../_lib/record-drafts";
import type { RoleDraft } from "../_lib/role-drafts";
import { useAdminApiKeysState } from "../_state/admin-api-keys-state";
import {
  createAdminAccountUserFromSession,
  type AdminAccountUser,
  useAdminAccountState,
} from "../_state/admin-account-state";
import { useAdminMediaState } from "../_state/admin-media-state";
import { useAdminRolesState } from "../_state/admin-roles-state";
import { useAdminTeamState } from "../_state/admin-team-state";
import type { AdminWorkspaceRouteSection } from "./admin-routes";
import {
  createAdminWorkspacePermissions,
  type AdminWorkspacePermissions,
} from "./admin-permissions";

export type AdminWorkspaceContextValue = {
  accountError: string | null;
  accountImage: string;
  accountMessage: string | null;
  accountName: string;
  apiKeyDraft: ApiKeyDraft;
  apiKeyDrafts: Record<string, ApiKeyDraft>;
  apiKeys: DatamixApiKeySummary[];
  apiKeysLoadError: string | null;
  apiKeysMessage: string | null;
  apiKeySecret: string | null;
  apiKeySecretMessage: string | null;
  authorization: DatamixAuthorizationSummary;
  availableRoles: DatamixRoleDefinition[];
  collectionLoadError: string | null;
  collections: StoredCollectionDefinition[];
  copyApiKeySecret: () => Promise<void>;
  copyMediaStorageKey: () => Promise<void>;
  createApiKey: () => Promise<DatamixApiKeySummary | null>;
  createRole: (sourceRole?: DatamixRoleDefinition) => void;
  hasLoadedApiKeys: boolean;
  hasLoadedCollections: boolean;
  hasLoadedMediaAssets: boolean;
  hasLoadedRecords: boolean;
  hasLoadedRoles: boolean;
  hasLoadedUsers: boolean;
  inviteEmail: string;
  inviteError: string | null;
  inviteMessage: string | null;
  inviteName: string;
  inviteRoleId: string;
  isCreatingApiKey: boolean;
  isCreatingRole: boolean;
  isInviting: boolean;
  isLoadingApiKeys: boolean;
  isLoadingCollections: boolean;
  isLoadingMediaAssets: boolean;
  isLoadingRecords: boolean;
  isLoadingRoles: boolean;
  isLoadingUsers: boolean;
  isSavingAccountProfile: boolean;
  isSavingRecord: boolean;
  isSavingRole: boolean;
  isUploadingMedia: boolean;
  loadApiKeyData: () => Promise<void>;
  loadAvailableRoles: (options?: { preferredRoleId?: string }) => Promise<void>;
  loadCollections: () => Promise<void>;
  loadMediaAssets: () => Promise<void>;
  loadRecords: (
    collection: StoredCollectionDefinition,
    options?: { selectedRecordId?: string | null },
  ) => Promise<void>;
  loadUserList: () => Promise<void>;
  mediaAssets: DatamixMediaAsset[];
  mediaClipboardMessage: string | null;
  mediaLoadError: string | null;
  mediaMessage: string | null;
  mediaSearchQuery: string;
  permissions: AdminWorkspacePermissions;
  publicApiRuntime: PublicApiRuntimeSummary | null;
  prefetchAdminRoute: (route: { section: AdminWorkspaceRouteSection }) => Promise<void>;
  recordDraft: GeneratedRecordFormState;
  recordCollectionName: string | null;
  recordIssues: DatamixSchemaValidationIssue[];
  recordLoadError: string | null;
  recordMessage: string | null;
  records: StoredCollectionRecord[];
  recordSupportedFieldNames: string;
  resetRoleDraft: () => void;
  revokeApiKey: (apiKey: DatamixApiKeySummary) => Promise<DatamixApiKeySummary | null>;
  role: DatamixAuthorizationSummary["role"];
  roleDraft: RoleDraft;
  roleIssues: DatamixSchemaValidationIssue[];
  rolesLoadError: string | null;
  rolesMessage: string | null;
  revokingApiKeyId: string | null;
  saveApiKey: (apiKey: DatamixApiKeySummary) => Promise<DatamixApiKeySummary | null>;
  saveRecord: (collection: StoredCollectionDefinition) => Promise<StoredCollectionRecord | null>;
  saveRole: () => Promise<DatamixRoleDefinition | null>;
  savingApiKeyId: string | null;
  selectedMediaAssetId: string | null;
  selectedMediaFile: File | null;
  selectedRecord: StoredCollectionRecord | null;
  selectedRoleId: string | null;
  selectMediaAsset: (assetId: string) => void;
  selectRecord: (
    collection: StoredCollectionDefinition,
    record: StoredCollectionRecord | null,
  ) => void;
  selectRole: (role: DatamixRoleDefinition) => void;
  sendInvite: () => Promise<void>;
  setAccountImage: (image: string) => void;
  setAccountName: (name: string) => void;
  setApiKeyDraftField: (field: keyof ApiKeyDraft, value: string) => void;
  setApiKeyField: (
    apiKeyId: string,
    field: keyof ApiKeyDraft,
    value: string,
  ) => void;
  setInviteEmail: (email: string) => void;
  setInviteName: (name: string) => void;
  setInviteRoleId: (roleId: string) => void;
  setMediaSearchQuery: (query: string) => void;
  setSelectedMediaFile: (file: File | null) => void;
  signOut: () => Promise<void>;
  startNewRecord: (collection: StoredCollectionDefinition) => void;
  toggleRolePermission: (permission: DatamixPermissionKey) => void;
  updateAccountProfile: () => Promise<DatamixUserSummary | null>;
  updateRecordDraftValue: (
    fieldName: string,
    nextValue: GeneratedRecordFormValue,
  ) => void;
  updateRoleDraftField: (
    field: "description" | "id" | "label",
    value: string,
  ) => void;
  updateUserRole: (user: DatamixUserSummary) => Promise<DatamixUserSummary | null>;
  updateUserRoleDraft: (userId: string, nextRoleId: string) => void;
  uploadMediaAsset: () => Promise<DatamixMediaAsset | null>;
  user: AdminAccountUser;
  userRoleDrafts: Record<string, string>;
  users: DatamixUserSummary[];
  usersLoadError: string | null;
  usersMessage: string | null;
  updatingUserRoleId: string | null;
};

type AdminWorkspaceProviderProps = {
  children: React.ReactNode;
};

type AdminWorkspaceGateShellProps = {
  action?: React.ReactNode;
  body: React.ReactNode;
  eyebrow?: string;
  title: string;
};

export const AdminWorkspaceContext =
  React.createContext<AdminWorkspaceContextValue | null>(null);

function createCurrentAdminPath() {
  if (typeof window === "undefined") {
    return buildDatamixAdminPath();
  }

  return `${window.location.pathname}${window.location.search}`;
}

function createLoginHref() {
  return `${buildDatamixAdminPath("/login")}?next=${encodeURIComponent(
    createCurrentAdminPath(),
  )}`;
}

function AdminWorkspaceGateShell({
  action,
  body,
  eyebrow = "Admin",
  title,
}: AdminWorkspaceGateShellProps) {
  return (
    <main className="shell">
      <div className="panel stack">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="page-title">{title}</h1>
        <div className="body">{body}</div>
        {action ? <div className="actions">{action}</div> : null}
      </div>
    </main>
  );
}

function AdminRedirectCanvas() {
  return (
    <main
      aria-hidden="true"
      data-page-canvas="sidebar"
      className="min-h-svh bg-[var(--sidebar)]"
    />
  );
}

function AdminWorkspaceResolutionCanvas() {
  return (
    <main
      aria-hidden="true"
      data-page-canvas="muted"
      className="min-h-svh bg-[var(--muted)]"
    />
  );
}

export function AdminWorkspaceProvider({ children }: AdminWorkspaceProviderProps) {
  const session = authClient.useSession();
  const setupStatus = useSetupStatus();
  const initialAccountUser = React.useMemo(
    () => createAdminAccountUserFromSession(session.data),
    [session.data],
  );
  const accountState = useAdminAccountState({ initialUser: initialAccountUser });
  const mediaState = useAdminMediaState();
  const {
    hasLoadedMediaAssets,
    isLoadingMediaAssets,
    loadMediaAssets,
    resetMediaAssetList,
    resetMediaWorkspace,
  } = mediaState;
  const collectionLoadRequestId = React.useRef(0);
  const prefetchedRouteSectionsRef = React.useRef(
    new Set<AdminWorkspaceRouteSection>(),
  );
  const recordLoadRequestId = React.useRef(0);
  const [authorization, setAuthorization] =
    React.useState<DatamixAuthorizationSummary | null>(null);
  const [authorizationError, setAuthorizationError] = React.useState<string | null>(null);
  const [authorizationStatusCode, setAuthorizationStatusCode] = React.useState<number | null>(
    null,
  );
  const [collections, setCollections] = React.useState<StoredCollectionDefinition[]>([]);
  const [collectionLoadError, setCollectionLoadError] = React.useState<string | null>(null);
  const [hasLoadedCollections, setHasLoadedCollections] = React.useState(false);
  const [isLoadingCollections, setIsLoadingCollections] = React.useState(false);
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
  const permissions = React.useMemo(
    () => (authorization ? createAdminWorkspacePermissions(authorization) : null),
    [authorization],
  );
  const currentAuthorization = authorization ?? createDatamixAuthorizationSummary(null);
  const currentPermissions =
    permissions ?? createAdminWorkspacePermissions(currentAuthorization);

  const setupStatusHeading =
    setupStatus.statusCode === 503
      ? "Datamix setup is missing required configuration"
      : "Datamix setup status is temporarily unavailable";

  const loadSessionAuthorizationData = React.useCallback(async () => {
    setAuthorizationError(null);
    setAuthorizationStatusCode(null);

    try {
      const nextAuthorization = await loadSessionAccess();

      setAuthorization(nextAuthorization);
    } catch (error) {
      if (error instanceof SessionAccessError && error.statusCode === 401) {
        window.location.replace(createLoginHref());
        return;
      }

      setAuthorization(null);
      setAuthorizationError(
        error instanceof Error
          ? error.message
          : "Unable to load the current access profile.",
      );
      setAuthorizationStatusCode(
        error instanceof SessionAccessError ? error.statusCode : null,
      );
    }
  }, []);

  const rolesState = useAdminRolesState({
    currentRoleId: currentAuthorization.role.id,
    onCurrentRoleChanged: loadSessionAuthorizationData,
    permissions: currentPermissions,
  });
  const teamState = useAdminTeamState({
    availableRoles: rolesState.availableRoles,
    currentUserId: accountState.user.id,
    onCurrentUserRoleUpdated: loadSessionAuthorizationData,
    permissions: currentPermissions,
  });
  const apiKeysState = useAdminApiKeysState({ permissions: currentPermissions });
  const {
    hasLoadedRoles,
    isLoadingRoles,
    loadAvailableRoles,
    resetRoleWorkspace,
  } = rolesState;
  const {
    hasLoadedUsers,
    isLoadingUsers,
    loadUserList,
    resetUserList,
    resetUserWorkspace,
  } = teamState;
  const {
    hasLoadedApiKeys,
    isLoadingApiKeys,
    loadApiKeyData,
    resetApiKeyWorkspace,
  } = apiKeysState;

  const loadCollections = React.useCallback(
    async () => {
      const requestId = collectionLoadRequestId.current + 1;

      collectionLoadRequestId.current = requestId;
      setCollectionLoadError(null);
      setIsLoadingCollections(true);

      try {
        const nextCollections = await listCollectionDefinitions();

        if (collectionLoadRequestId.current !== requestId) {
          return;
        }

        setCollections(nextCollections);
        setHasLoadedCollections(true);
      } catch (error) {
        if (collectionLoadRequestId.current !== requestId) {
          return;
        }

        setCollectionLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load collection definitions.",
        );
      } finally {
        if (collectionLoadRequestId.current === requestId) {
          setIsLoadingCollections(false);
        }
      }
    },
    [],
  );

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

  const prefetchAdminRoute = React.useCallback(
    async (route: { section: AdminWorkspaceRouteSection }) => {
      if (prefetchedRouteSectionsRef.current.has(route.section)) {
        return;
      }

      prefetchedRouteSectionsRef.current.add(route.section);

      const prefetchTasks: Promise<void>[] = [];
      const dashboardPrefetchTasks: Promise<void>[] = [];

      if (route.section === "home" && permissions) {
        if (
          permissions.canViewCollections &&
          !hasLoadedCollections &&
          !isLoadingCollections
        ) {
          dashboardPrefetchTasks.push(loadCollections());
        }

        if (
          permissions.canViewMedia &&
          !hasLoadedMediaAssets &&
          !isLoadingMediaAssets
        ) {
          dashboardPrefetchTasks.push(loadMediaAssets());
        }

        if (permissions.canViewUsers && !hasLoadedUsers && !isLoadingUsers) {
          dashboardPrefetchTasks.push(loadUserList());
        }

        if (
          (permissions.canAccessTeamAccess ||
            permissions.canAccessSettingsWorkspace) &&
          !hasLoadedRoles &&
          !isLoadingRoles
        ) {
          dashboardPrefetchTasks.push(loadAvailableRoles());
        }

        if (
          permissions.canAccessSettingsWorkspace &&
          !hasLoadedApiKeys &&
          !isLoadingApiKeys
        ) {
          dashboardPrefetchTasks.push(loadApiKeyData());
        }
      }

      prefetchTasks.push(...dashboardPrefetchTasks);

      if (
        (route.section === "schema" || route.section === "content") &&
        permissions?.canViewCollections &&
        !hasLoadedCollections &&
        !isLoadingCollections
      ) {
        prefetchTasks.push(loadCollections());
      }

      if (
        route.section === "media" &&
        permissions?.canViewMedia &&
        !hasLoadedMediaAssets &&
        !isLoadingMediaAssets
      ) {
        prefetchTasks.push(loadMediaAssets());
      }

      if (route.section === "team" && permissions?.canAccessTeamAccess) {
        if (permissions.canViewUsers && !hasLoadedUsers && !isLoadingUsers) {
          prefetchTasks.push(loadUserList());
        }

        if (!hasLoadedRoles && !isLoadingRoles) {
          prefetchTasks.push(loadAvailableRoles());
        }
      }

      if (route.section === "settings" && permissions?.canAccessSettingsWorkspace) {
        if (!hasLoadedApiKeys && !isLoadingApiKeys) {
          prefetchTasks.push(loadApiKeyData());
        }

        if (!hasLoadedRoles && !isLoadingRoles) {
          prefetchTasks.push(loadAvailableRoles());
        }
      }

      await Promise.allSettled(prefetchTasks);
    },
    [
      hasLoadedApiKeys,
      hasLoadedCollections,
      hasLoadedMediaAssets,
      hasLoadedRoles,
      hasLoadedUsers,
      isLoadingApiKeys,
      isLoadingCollections,
      isLoadingMediaAssets,
      isLoadingRoles,
      isLoadingUsers,
      loadApiKeyData,
      loadAvailableRoles,
      loadCollections,
      loadMediaAssets,
      loadUserList,
      permissions,
    ],
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
          : await createCollectionRecord(collection.definition.name, persistedRecordPayload);

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

  React.useEffect(() => {
    if (session.isPending || setupStatus.isPending || session.data) {
      return;
    }

    if (setupStatus.data?.setupRequired) {
      window.location.replace(buildDatamixAdminPath("/setup"));
      return;
    }

    window.location.replace(createLoginHref());
  }, [session.data, session.isPending, setupStatus.data, setupStatus.isPending]);

  React.useEffect(() => {
    if (!session.data) {
      prefetchedRouteSectionsRef.current.clear();
      setAuthorization(null);
      setAuthorizationError(null);
      setAuthorizationStatusCode(null);
      collectionLoadRequestId.current += 1;
      setCollections([]);
      setCollectionLoadError(null);
      setHasLoadedCollections(false);
      setIsLoadingCollections(false);
      resetMediaWorkspace();
      resetRecordWorkspace();
      resetRoleWorkspace();
      resetUserWorkspace();
      resetApiKeyWorkspace();
      return;
    }

    void loadSessionAuthorizationData();
  }, [
    loadSessionAuthorizationData,
    resetApiKeyWorkspace,
    resetMediaWorkspace,
    resetRecordWorkspace,
    resetRoleWorkspace,
    resetUserWorkspace,
    session.data,
  ]);

  React.useEffect(() => {
    if (!session.data || !authorizationError) {
      return;
    }

    const reload = () => {
      void loadSessionAuthorizationData();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        reload();
      }
    };

    window.addEventListener("online", reload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("online", reload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [authorizationError, loadSessionAuthorizationData, session.data]);

  React.useEffect(() => {
    if (!permissions) {
      return;
    }

    if (permissions.canAccessRecordsWorkspace) {
      return;
    }

    resetRecordWorkspace();
  }, [permissions, resetRecordWorkspace]);

  React.useEffect(() => {
    if (!permissions) {
      return;
    }

    if (!permissions.canAccessMediaWorkspace) {
      resetMediaWorkspace();
      return;
    }

    if (!permissions.canViewMedia) {
      resetMediaAssetList();
    }
  }, [permissions, resetMediaAssetList, resetMediaWorkspace]);

  React.useEffect(() => {
    if (!permissions) {
      return;
    }

    if (permissions.canAccessTeamAccess || permissions.canAccessSettingsWorkspace) {
      return;
    }

    resetRoleWorkspace();
  }, [permissions, resetRoleWorkspace]);

  React.useEffect(() => {
    if (!permissions) {
      return;
    }

    if (permissions.canAccessSettingsWorkspace) {
      return;
    }

    resetApiKeyWorkspace();
  }, [permissions, resetApiKeyWorkspace]);

  React.useEffect(() => {
    if (!permissions) {
      return;
    }

    if (permissions.canViewUsers) {
      return;
    }

    resetUserList();
  }, [permissions, resetUserList]);

  const selectedRecord =
    selectedRecordId && recordCollectionName
      ? records.find((record) => record.id === selectedRecordId) ?? null
      : null;
  const isResolvingInitialSession =
    !session.data &&
    !setupStatus.errorMessage &&
    (session.isPending || setupStatus.isPending);
  const isResolvingInitialAuthorization =
    Boolean(session.data) && !authorization && !authorizationError;
  const isResolvingInitialAdmin =
    isResolvingInitialSession || isResolvingInitialAuthorization;
  const value: AdminWorkspaceContextValue = {
    ...accountState,
    ...apiKeysState,
    ...mediaState,
    ...rolesState,
    ...teamState,
    authorization: currentAuthorization,
    collectionLoadError,
    collections,
    hasLoadedCollections,
    hasLoadedRecords,
    isLoadingCollections,
    isLoadingRecords,
    isSavingRecord,
    loadCollections,
    loadRecords,
    permissions: currentPermissions,
    prefetchAdminRoute,
    recordDraft,
    recordCollectionName,
    recordIssues,
    recordLoadError,
    recordMessage,
    records,
    recordSupportedFieldNames,
    role: currentAuthorization.role,
    saveRecord,
    selectedRecord,
    selectRecord,
    startNewRecord,
    updateRecordDraftValue,
  };

  const renderAdminWorkspaceContent = () => {
    if (setupStatus.errorMessage) {
      return (
        <AdminWorkspaceGateShell
          action={
            <Button asChild variant="outline">
              <a href={buildDatamixAdminPath("/login")}>Back home</a>
            </Button>
          }
          body={
            <>
              <p>{setupStatus.errorMessage}</p>
              <p>
                {setupStatus.statusCode === 503
                  ? "Set `BETTER_AUTH_SECRET` on the Datamix Worker, then reload this page."
                  : "Datamix will retry automatically when the network comes back or this tab regains focus."}
              </p>
            </>
          }
          title={setupStatusHeading}
        />
      );
    }

    if (!session.data) {
      return <AdminRedirectCanvas />;
    }

    if (authorizationError || !authorization) {
      return (
        <AdminWorkspaceGateShell
          action={
            <Button asChild variant="outline">
              <a href={buildDatamixAdminPath("/login")}>Back home</a>
            </Button>
          }
          body={
            <>
              <p>
                {authorizationError ??
                  "Datamix could not resolve the current role and permission summary."}
              </p>
              <p>
                {authorizationStatusCode && authorizationStatusCode >= 500
                  ? "The protected session route is reachable, but it could not finish resolving your role just now."
                  : "Datamix will retry automatically when the session stabilizes."}
              </p>
            </>
          }
          title="Access profile is unavailable"
        />
      );
    }

    return children;
  };

  return (
    <AdminWorkspaceContext.Provider value={value}>
      <LoaderViewTransitionBoundary
        active={isResolvingInitialAdmin}
        activePageCanvas="muted"
        fallback={<AdminWorkspaceResolutionCanvas />}
      >
        {isResolvingInitialAdmin ? (
          <AdminWorkspaceResolutionCanvas />
        ) : (
          renderAdminWorkspaceContent()
        )}
      </LoaderViewTransitionBoundary>
    </AdminWorkspaceContext.Provider>
  );
}
