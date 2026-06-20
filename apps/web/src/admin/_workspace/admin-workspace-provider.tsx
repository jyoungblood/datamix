"use client";

import type {
  DatamixApiKeyAccessLevel,
  DatamixApiKeySummary,
  DatamixAuthorizationSummary,
  DatamixMediaAsset,
  DatamixPermissionKey,
  DatamixRoleDefinition,
  DatamixSchemaValidationIssue,
} from "@datamix/core";
import {
  createDatamixAuthorizationSummary,
  datamixDefaultRoleAssignments,
  datamixRolePresets,
} from "@datamix/core";
import * as React from "react";

import { LoaderViewTransitionBoundary } from "@/components/loader-view-transition";
import { Button } from "@/components/ui/button";
import {
  createApiKey as createApiKeyRequest,
  listApiKeys,
  revokeApiKey as revokeApiKeyRequest,
  updateApiKey as updateApiKeyRequest,
  type PublicApiRuntimeSummary,
} from "@/lib/api-keys";
import { authClient } from "@/lib/auth-client";
import {
  listCollectionDefinitions,
  type StoredCollectionDefinition,
} from "@/lib/collection-definitions";
import { sendInvite as sendInviteRequest } from "@/lib/invite";
import {
  CollectionRecordRequestError,
  createCollectionRecord,
  listCollectionRecords,
  updateCollectionRecord,
  type StoredCollectionRecord,
} from "@/lib/records";
import {
  listRoles,
  RoleRequestError,
  saveRole as saveRoleRequest,
} from "@/lib/roles";
import { buildDatamixAdminPath } from "@/lib/runtime";
import { loadSessionAccess, SessionAccessError } from "@/lib/session";
import { useSetupStatus } from "@/lib/setup";
import {
  listUsers,
  updateUserRole as updateUserRoleRequest,
  type DatamixUserSummary,
} from "@/lib/users";
import {
  createApiKeyDraftFromApiKey,
  createEmptyApiKeyDraft,
  type ApiKeyDraft,
} from "../_lib/api-key-drafts";
import {
  createGeneratedRecordFormState,
  createGeneratedRecordFormStateFromRecord,
  createPersistedRecordPayload,
  upsertRecord,
  type GeneratedRecordFormState,
  type GeneratedRecordFormValue,
} from "../_lib/record-drafts";
import {
  createEmptyRoleDraft,
  createRoleDraftFromRole,
  createRoleIdSuggestion,
  type RoleDraft,
} from "../_lib/role-drafts";
import {
  createAdminAccountUserFromSession,
  type AdminAccountUser,
  useAdminAccountState,
} from "../_state/admin-account-state";
import { useAdminMediaState } from "../_state/admin-media-state";
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
  const apiKeysLoadRequestId = React.useRef(0);
  const collectionLoadRequestId = React.useRef(0);
  const prefetchedRouteSectionsRef = React.useRef(
    new Set<AdminWorkspaceRouteSection>(),
  );
  const recordLoadRequestId = React.useRef(0);
  const rolesLoadRequestId = React.useRef(0);
  const usersLoadRequestId = React.useRef(0);
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
  const [availableRoles, setAvailableRoles] = React.useState<DatamixRoleDefinition[]>([
    ...datamixRolePresets,
  ]);
  const [rolesLoadError, setRolesLoadError] = React.useState<string | null>(null);
  const [rolesMessage, setRolesMessage] = React.useState<string | null>(null);
  const [roleIssues, setRoleIssues] = React.useState<DatamixSchemaValidationIssue[]>([]);
  const [hasLoadedRoles, setHasLoadedRoles] = React.useState(false);
  const [isLoadingRoles, setIsLoadingRoles] = React.useState(false);
  const [isSavingRole, setIsSavingRole] = React.useState(false);
  const [isCreatingRole, setIsCreatingRole] = React.useState(false);
  const [selectedRoleId, setSelectedRoleId] = React.useState<string | null>(null);
  const [roleDraft, setRoleDraft] = React.useState<RoleDraft>(createEmptyRoleDraft);
  const [users, setUsers] = React.useState<DatamixUserSummary[]>([]);
  const [usersLoadError, setUsersLoadError] = React.useState<string | null>(null);
  const [usersMessage, setUsersMessage] = React.useState<string | null>(null);
  const [hasLoadedUsers, setHasLoadedUsers] = React.useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(false);
  const [updatingUserRoleId, setUpdatingUserRoleId] = React.useState<string | null>(null);
  const [userRoleDrafts, setUserRoleDrafts] = React.useState<Record<string, string>>({});
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteName, setInviteName] = React.useState("");
  const [inviteRoleId, setInviteRoleId] = React.useState<string>(
    datamixDefaultRoleAssignments.invitedUser,
  );
  const [inviteError, setInviteError] = React.useState<string | null>(null);
  const [inviteMessage, setInviteMessage] = React.useState<string | null>(null);
  const [isInviting, setIsInviting] = React.useState(false);
  const [apiKeys, setApiKeys] = React.useState<DatamixApiKeySummary[]>([]);
  const [apiKeyDraft, setApiKeyDraft] = React.useState<ApiKeyDraft>(
    createEmptyApiKeyDraft,
  );
  const [apiKeyDrafts, setApiKeyDrafts] = React.useState<Record<string, ApiKeyDraft>>({});
  const [apiKeysLoadError, setApiKeysLoadError] = React.useState<string | null>(null);
  const [apiKeysMessage, setApiKeysMessage] = React.useState<string | null>(null);
  const [apiKeySecret, setApiKeySecret] = React.useState<string | null>(null);
  const [apiKeySecretMessage, setApiKeySecretMessage] = React.useState<string | null>(
    null,
  );
  const [publicApiRuntime, setPublicApiRuntime] =
    React.useState<PublicApiRuntimeSummary | null>(null);
  const [hasLoadedApiKeys, setHasLoadedApiKeys] = React.useState(false);
  const [isLoadingApiKeys, setIsLoadingApiKeys] = React.useState(false);
  const [isCreatingApiKey, setIsCreatingApiKey] = React.useState(false);
  const [savingApiKeyId, setSavingApiKeyId] = React.useState<string | null>(null);
  const [revokingApiKeyId, setRevokingApiKeyId] = React.useState<string | null>(null);
  const permissions = React.useMemo(
    () => (authorization ? createAdminWorkspacePermissions(authorization) : null),
    [authorization],
  );

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

  const resetRoleWorkspace = React.useCallback(() => {
    rolesLoadRequestId.current += 1;
    setAvailableRoles([...datamixRolePresets]);
    setRolesLoadError(null);
    setRolesMessage(null);
    setRoleIssues([]);
    setHasLoadedRoles(false);
    setIsLoadingRoles(false);
    setIsSavingRole(false);
    setIsCreatingRole(false);
    setSelectedRoleId(null);
    setRoleDraft(createEmptyRoleDraft());
  }, []);

  const resetUserWorkspace = React.useCallback(() => {
    usersLoadRequestId.current += 1;
    setUsers([]);
    setUsersLoadError(null);
    setUsersMessage(null);
    setHasLoadedUsers(false);
    setIsLoadingUsers(false);
    setUpdatingUserRoleId(null);
    setUserRoleDrafts({});
    setInviteError(null);
    setInviteMessage(null);
    setIsInviting(false);
  }, []);

  const resetApiKeyWorkspace = React.useCallback(() => {
    apiKeysLoadRequestId.current += 1;
    setApiKeys([]);
    setApiKeyDraft(createEmptyApiKeyDraft());
    setApiKeyDrafts({});
    setApiKeysLoadError(null);
    setApiKeysMessage(null);
    setApiKeySecret(null);
    setApiKeySecretMessage(null);
    setPublicApiRuntime(null);
    setHasLoadedApiKeys(false);
    setIsLoadingApiKeys(false);
    setIsCreatingApiKey(false);
    setSavingApiKeyId(null);
    setRevokingApiKeyId(null);
  }, []);

  const loadAvailableRoles = React.useCallback(
    async (options?: { preferredRoleId?: string }) => {
      const requestId = rolesLoadRequestId.current + 1;

      rolesLoadRequestId.current = requestId;
      setRolesLoadError(null);
      setIsLoadingRoles(true);

      try {
        const nextRoles = await listRoles();
        const preferredRoleId = options?.preferredRoleId;

        if (rolesLoadRequestId.current !== requestId) {
          return;
        }

        setAvailableRoles(nextRoles);
        setHasLoadedRoles(true);
        setSelectedRoleId((currentSelectedRoleId) =>
          preferredRoleId && nextRoles.some((role) => role.id === preferredRoleId)
            ? preferredRoleId
            : currentSelectedRoleId &&
                nextRoles.some((role) => role.id === currentSelectedRoleId)
              ? currentSelectedRoleId
              : nextRoles[0]?.id ?? null,
        );
      } catch (error) {
        if (rolesLoadRequestId.current !== requestId) {
          return;
        }

        setRolesLoadError(error instanceof Error ? error.message : "Unable to load roles.");
      } finally {
        if (rolesLoadRequestId.current === requestId) {
          setIsLoadingRoles(false);
        }
      }
    },
    [],
  );

  const loadApiKeyData = React.useCallback(async () => {
    const requestId = apiKeysLoadRequestId.current + 1;

    apiKeysLoadRequestId.current = requestId;
    setApiKeysLoadError(null);
    setIsLoadingApiKeys(true);

    try {
      const result = await listApiKeys();

      if (apiKeysLoadRequestId.current !== requestId) {
        return;
      }

      setApiKeys(result.apiKeys);
      setPublicApiRuntime(result.runtime);
      setHasLoadedApiKeys(true);
      setApiKeyDrafts((currentDrafts) => {
        const nextDrafts: Record<string, ApiKeyDraft> = {};

        result.apiKeys.forEach((apiKey) => {
          nextDrafts[apiKey.id] =
            currentDrafts[apiKey.id] ?? createApiKeyDraftFromApiKey(apiKey);
        });

        return nextDrafts;
      });
    } catch (error) {
      if (apiKeysLoadRequestId.current !== requestId) {
        return;
      }

      setApiKeysLoadError(
        error instanceof Error ? error.message : "Unable to load API keys.",
      );
      setPublicApiRuntime(null);
    } finally {
      if (apiKeysLoadRequestId.current === requestId) {
        setIsLoadingApiKeys(false);
      }
    }
  }, []);

  const loadUserList = React.useCallback(async () => {
    const requestId = usersLoadRequestId.current + 1;

    usersLoadRequestId.current = requestId;
    setUsersLoadError(null);
    setIsLoadingUsers(true);

    try {
      const nextUsers = await listUsers();

      if (usersLoadRequestId.current !== requestId) {
        return;
      }

      setUsers(nextUsers);
      setHasLoadedUsers(true);
      setUserRoleDrafts((currentDrafts) => {
        const nextDrafts: Record<string, string> = {};

        nextUsers.forEach((user) => {
          nextDrafts[user.id] = currentDrafts[user.id] ?? user.roleId ?? "";
        });

        return nextDrafts;
      });
    } catch (error) {
      if (usersLoadRequestId.current !== requestId) {
        return;
      }

      setUsersLoadError(error instanceof Error ? error.message : "Unable to load users.");
    } finally {
      if (usersLoadRequestId.current === requestId) {
        setIsLoadingUsers(false);
      }
    }
  }, []);

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

  const sendInvite = React.useCallback(async () => {
    if (!permissions?.canInviteUsers) {
      return;
    }

    setInviteError(null);
    setInviteMessage(null);
    setIsInviting(true);

    try {
      const message = await sendInviteRequest({
        email: inviteEmail,
        ...(inviteName ? { name: inviteName } : {}),
        roleId: inviteRoleId,
      });

      setInviteMessage(message);
      setInviteEmail("");
      setInviteName("");

      if (permissions.canViewUsers) {
        await loadUserList();
      }
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Unable to send invite.");
    } finally {
      setIsInviting(false);
    }
  }, [
    inviteEmail,
    inviteName,
    inviteRoleId,
    loadUserList,
    permissions?.canInviteUsers,
    permissions?.canViewUsers,
  ]);

  const updateUserRoleDraft = React.useCallback((userId: string, nextRoleId: string) => {
    setUserRoleDrafts((currentDrafts) => ({
      ...currentDrafts,
      [userId]: nextRoleId,
    }));
    setUsersMessage(null);
  }, []);

  const updateUserRole = React.useCallback(
    async (user: DatamixUserSummary) => {
      const nextRoleId = userRoleDrafts[user.id];

      if (!permissions?.canUpdateUsers || !nextRoleId || nextRoleId === user.roleId) {
        return null;
      }

      setUpdatingUserRoleId(user.id);
      setUsersMessage(null);
      setUsersLoadError(null);

      try {
        const result = await updateUserRoleRequest(user.id, nextRoleId);

        setUsers((currentUsers) =>
          currentUsers.map((currentUser) =>
            currentUser.id === result.user.id ? result.user : currentUser,
          ),
        );
        setUserRoleDrafts((currentDrafts) => ({
          ...currentDrafts,
          [result.user.id]: result.user.roleId ?? "",
        }));
        setUsersMessage(
          `Updated ${result.user.name || result.user.email} to ${
            result.role?.label ?? result.user.roleId ?? "the selected role"
          }.`,
        );

        if (session.data?.user.id === result.user.id) {
          await loadSessionAuthorizationData();
        }

        return result.user;
      } catch (error) {
        setUsersLoadError(
          error instanceof Error
            ? error.message
            : "Unable to update the selected user role.",
        );
        return null;
      } finally {
        setUpdatingUserRoleId(null);
      }
    },
    [
      loadSessionAuthorizationData,
      permissions?.canUpdateUsers,
      session.data,
      userRoleDrafts,
    ],
  );

  const selectRole = React.useCallback((role: DatamixRoleDefinition) => {
    setIsCreatingRole(false);
    setSelectedRoleId(role.id);
    setRoleDraft(createRoleDraftFromRole(role));
    setRoleIssues([]);
    setRolesMessage(null);
  }, []);

  const createRole = React.useCallback(
    (sourceRole?: DatamixRoleDefinition) => {
      if (!permissions?.canUpdateSettings) {
        return;
      }

      setIsCreatingRole(true);
      setRoleDraft(createEmptyRoleDraft(sourceRole));
      setRoleIssues([]);
      setRolesMessage(null);
    },
    [permissions?.canUpdateSettings],
  );

  const updateRoleDraftField = React.useCallback(
    (field: "description" | "id" | "label", value: string) => {
      setRoleDraft((currentRoleDraft) => {
        if (field !== "label") {
          return {
            ...currentRoleDraft,
            [field]: value,
          };
        }

        const currentSuggestion = createRoleIdSuggestion(currentRoleDraft.label);
        const nextSuggestion = createRoleIdSuggestion(value);
        const shouldUpdateRoleId =
          currentRoleDraft.id.trim().length === 0 ||
          currentRoleDraft.id === currentSuggestion;

        return {
          ...currentRoleDraft,
          id: shouldUpdateRoleId ? nextSuggestion : currentRoleDraft.id,
          label: value,
        };
      });
      setRoleIssues([]);
      setRolesMessage(null);
    },
    [],
  );

  const toggleRolePermission = React.useCallback((permission: DatamixPermissionKey) => {
    setRoleDraft((currentRoleDraft) => {
      const nextPermissions = currentRoleDraft.permissions.includes(permission)
        ? currentRoleDraft.permissions.filter(
            (currentPermission) => currentPermission !== permission,
          )
        : [...currentRoleDraft.permissions, permission];

      return {
        ...currentRoleDraft,
        permissions: nextPermissions,
      };
    });
    setRoleIssues([]);
    setRolesMessage(null);
  }, []);

  const resetRoleDraft = React.useCallback(() => {
    const selectedRole = isCreatingRole
      ? null
      : availableRoles.find((role) => role.id === selectedRoleId) ?? null;

    setRoleDraft(
      isCreatingRole
        ? createEmptyRoleDraft()
        : selectedRole
          ? createRoleDraftFromRole(selectedRole)
          : createEmptyRoleDraft(),
    );
    setRoleIssues([]);
    setRolesMessage(null);
  }, [availableRoles, isCreatingRole, selectedRoleId]);

  const saveRole = React.useCallback(async () => {
    if (!permissions?.canUpdateSettings) {
      return null;
    }

    setIsSavingRole(true);
    setRoleIssues([]);
    setRolesMessage(null);

    try {
      const result = await saveRoleRequest({
        description: roleDraft.description,
        id: roleDraft.id,
        label: roleDraft.label,
        permissions: [...roleDraft.permissions],
      });

      setIsCreatingRole(false);
      setSelectedRoleId(result.role.id);
      setRoleDraft(createRoleDraftFromRole(result.role));
      setRolesMessage(result.message);
      await loadAvailableRoles({ preferredRoleId: result.role.id });

      if (authorization?.role.id === result.role.id) {
        await loadSessionAuthorizationData();
      }

      return result.role;
    } catch (error) {
      if (error instanceof RoleRequestError) {
        setRoleIssues(error.issues ?? []);
        setRolesMessage(error.message);
      } else {
        setRolesMessage(error instanceof Error ? error.message : "Unable to save role.");
      }

      return null;
    } finally {
      setIsSavingRole(false);
    }
  }, [
    authorization?.role.id,
    loadAvailableRoles,
    loadSessionAuthorizationData,
    permissions?.canUpdateSettings,
    roleDraft,
  ]);

  const setApiKeyDraftField = React.useCallback(
    (field: keyof ApiKeyDraft, value: string) => {
      setApiKeyDraft((currentDraft) => ({
        ...currentDraft,
        [field]: field === "accessLevel" ? (value as DatamixApiKeyAccessLevel) : value,
      }));
      setApiKeysMessage(null);
      setApiKeySecret(null);
      setApiKeySecretMessage(null);
    },
    [],
  );

  const setApiKeyField = React.useCallback(
    (apiKeyId: string, field: keyof ApiKeyDraft, value: string) => {
      setApiKeyDrafts((currentDrafts) => ({
        ...currentDrafts,
        [apiKeyId]: {
          accessLevel:
            field === "accessLevel"
              ? (value as DatamixApiKeyAccessLevel)
              : currentDrafts[apiKeyId]?.accessLevel ?? "read",
          label:
            field === "label" ? value : currentDrafts[apiKeyId]?.label ?? "",
        },
      }));
      setApiKeysMessage(null);
    },
    [],
  );

  const createApiKey = React.useCallback(async () => {
    if (!permissions?.canUpdateSettings) {
      return null;
    }

    setIsCreatingApiKey(true);
    setApiKeysLoadError(null);
    setApiKeysMessage(null);
    setApiKeySecret(null);
    setApiKeySecretMessage(null);

    try {
      const result = await createApiKeyRequest(apiKeyDraft);

      setApiKeys((currentApiKeys) => [result.apiKey, ...currentApiKeys]);
      setApiKeyDrafts((currentDrafts) => ({
        ...currentDrafts,
        [result.apiKey.id]: createApiKeyDraftFromApiKey(result.apiKey),
      }));
      setApiKeyDraft(createEmptyApiKeyDraft());
      setApiKeysMessage(result.message);
      setApiKeySecret(result.secret);
      setHasLoadedApiKeys(true);

      return result.apiKey;
    } catch (error) {
      setApiKeysLoadError(
        error instanceof Error ? error.message : "Unable to create API key.",
      );
      return null;
    } finally {
      setIsCreatingApiKey(false);
    }
  }, [apiKeyDraft, permissions?.canUpdateSettings]);

  const saveApiKey = React.useCallback(
    async (apiKey: DatamixApiKeySummary) => {
      const nextDraft = apiKeyDrafts[apiKey.id];

      if (
        !permissions?.canUpdateSettings ||
        !nextDraft ||
        apiKey.revokedAt ||
        (nextDraft.label === apiKey.label &&
          nextDraft.accessLevel === apiKey.accessLevel)
      ) {
        return null;
      }

      setSavingApiKeyId(apiKey.id);
      setApiKeysLoadError(null);
      setApiKeysMessage(null);

      try {
        const result = await updateApiKeyRequest(apiKey.id, nextDraft);

        setApiKeys((currentApiKeys) =>
          currentApiKeys.map((currentApiKey) =>
            currentApiKey.id === result.apiKey.id ? result.apiKey : currentApiKey,
          ),
        );
        setApiKeyDrafts((currentDrafts) => ({
          ...currentDrafts,
          [result.apiKey.id]: createApiKeyDraftFromApiKey(result.apiKey),
        }));
        setApiKeysMessage(result.message);

        return result.apiKey;
      } catch (error) {
        setApiKeysLoadError(
          error instanceof Error ? error.message : "Unable to update API key.",
        );
        return null;
      } finally {
        setSavingApiKeyId(null);
      }
    },
    [apiKeyDrafts, permissions?.canUpdateSettings],
  );

  const revokeApiKey = React.useCallback(
    async (apiKey: DatamixApiKeySummary) => {
      if (!permissions?.canUpdateSettings || apiKey.revokedAt) {
        return null;
      }

      setRevokingApiKeyId(apiKey.id);
      setApiKeysLoadError(null);
      setApiKeysMessage(null);

      try {
        const result = await revokeApiKeyRequest(apiKey.id);

        setApiKeys((currentApiKeys) =>
          currentApiKeys.map((currentApiKey) =>
            currentApiKey.id === result.apiKey.id ? result.apiKey : currentApiKey,
          ),
        );
        setApiKeyDrafts((currentDrafts) => ({
          ...currentDrafts,
          [result.apiKey.id]: createApiKeyDraftFromApiKey(result.apiKey),
        }));
        setApiKeysMessage(result.message);

        return result.apiKey;
      } catch (error) {
        setApiKeysLoadError(
          error instanceof Error ? error.message : "Unable to revoke API key.",
        );
        return null;
      } finally {
        setRevokingApiKeyId(null);
      }
    },
    [permissions?.canUpdateSettings],
  );

  const copyApiKeySecret = React.useCallback(async () => {
    if (!apiKeySecret) {
      return;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.clipboard ||
      typeof navigator.clipboard.writeText !== "function"
    ) {
      setApiKeySecretMessage("Clipboard access is unavailable in this browser.");
      return;
    }

    try {
      await navigator.clipboard.writeText(apiKeySecret);
      setApiKeySecretMessage("API key secret copied. This is the only time Datamix will show it.");
    } catch {
      setApiKeySecretMessage("Clipboard access failed. Copy the API key secret manually.");
    }
  }, [apiKeySecret]);

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

    usersLoadRequestId.current += 1;
    setUsers([]);
    setUsersLoadError(null);
    setUsersMessage(null);
    setHasLoadedUsers(false);
    setIsLoadingUsers(false);
    setUpdatingUserRoleId(null);
    setUserRoleDrafts({});
  }, [permissions]);

  React.useEffect(() => {
    if (isCreatingRole) {
      return;
    }

    const selectedRole =
      availableRoles.find((role) => role.id === selectedRoleId) ??
      availableRoles[0] ??
      null;

    if (!selectedRole) {
      setSelectedRoleId(null);
      return;
    }

    if (selectedRoleId !== selectedRole.id) {
      setSelectedRoleId(selectedRole.id);
      return;
    }

    setRoleDraft(createRoleDraftFromRole(selectedRole));
  }, [availableRoles, isCreatingRole, selectedRoleId]);

  React.useEffect(() => {
    setInviteRoleId((currentInviteRoleId) => {
      if (availableRoles.some((role) => role.id === currentInviteRoleId)) {
        return currentInviteRoleId;
      }

      const defaultInviteRole = availableRoles.find(
        (role) => role.id === datamixDefaultRoleAssignments.invitedUser,
      );

      return (
        defaultInviteRole?.id ??
        availableRoles[0]?.id ??
        datamixDefaultRoleAssignments.invitedUser
      );
    });
  }, [availableRoles]);

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
  const currentAuthorization = authorization ?? createDatamixAuthorizationSummary(null);
  const currentPermissions =
    permissions ?? createAdminWorkspacePermissions(currentAuthorization);
  const value: AdminWorkspaceContextValue = {
    ...accountState,
    ...mediaState,
    apiKeyDraft,
    apiKeyDrafts,
    apiKeys,
    apiKeysLoadError,
    apiKeysMessage,
    apiKeySecret,
    apiKeySecretMessage,
    authorization: currentAuthorization,
    availableRoles,
    collectionLoadError,
    collections,
    copyApiKeySecret,
    createApiKey,
    createRole,
    hasLoadedApiKeys,
    hasLoadedCollections,
    hasLoadedRecords,
    hasLoadedRoles,
    hasLoadedUsers,
    inviteEmail,
    inviteError,
    inviteMessage,
    inviteName,
    inviteRoleId,
    isCreatingApiKey,
    isCreatingRole,
    isInviting,
    isLoadingApiKeys,
    isLoadingCollections,
    isLoadingRecords,
    isLoadingRoles,
    isLoadingUsers,
    isSavingRecord,
    isSavingRole,
    loadApiKeyData,
    loadAvailableRoles,
    loadCollections,
    loadRecords,
    loadUserList,
    permissions: currentPermissions,
    publicApiRuntime,
    prefetchAdminRoute,
    recordDraft,
    recordCollectionName,
    recordIssues,
    recordLoadError,
    recordMessage,
    records,
    recordSupportedFieldNames,
    resetRoleDraft,
    revokeApiKey,
    role: currentAuthorization.role,
    roleDraft,
    roleIssues,
    rolesLoadError,
    rolesMessage,
    revokingApiKeyId,
    saveApiKey,
    saveRecord,
    saveRole,
    savingApiKeyId,
    selectedRecord,
    selectedRoleId,
    selectRecord,
    selectRole,
    sendInvite,
    setApiKeyDraftField,
    setApiKeyField,
    setInviteEmail,
    setInviteName,
    setInviteRoleId,
    startNewRecord,
    toggleRolePermission,
    updateRecordDraftValue,
    updateRoleDraftField,
    updateUserRole,
    updateUserRoleDraft,
    userRoleDrafts,
    users,
    usersLoadError,
    usersMessage,
    updatingUserRoleId,
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
