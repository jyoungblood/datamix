"use client";

import type {
  DatamixApiKeySummary,
  DatamixMediaAsset,
  DatamixRoleDefinition,
} from "@datamix/core";
import * as React from "react";

import type { AdminWorkspacePermissions } from "../_workspace/admin-permissions";

import type { StoredCollectionDefinition } from "@/lib/collection-definitions";
import type { DatamixUserSummary } from "@/lib/users";

type AdminDashboardDataOptions = {
  apiKeysState: {
    apiKeys: DatamixApiKeySummary[];
    hasLoadedApiKeys: boolean;
    isLoadingApiKeys: boolean;
    loadApiKeyData: () => Promise<void>;
  };
  collectionsState: {
    collections: StoredCollectionDefinition[];
    hasLoadedCollections: boolean;
    isLoadingCollections: boolean;
    loadCollections: () => Promise<void>;
  };
  mediaState: {
    hasLoadedMediaAssets: boolean;
    isLoadingMediaAssets: boolean;
    loadMediaAssets: () => Promise<void>;
    mediaAssets: DatamixMediaAsset[];
  };
  permissions: Pick<
    AdminWorkspacePermissions,
    | "canAccessSettingsWorkspace"
    | "canAccessTeamAccess"
    | "canViewCollections"
    | "canViewMedia"
    | "canViewUsers"
  >;
  rolesState: {
    availableRoles: DatamixRoleDefinition[];
    hasLoadedRoles: boolean;
    isLoadingRoles: boolean;
    loadAvailableRoles: () => Promise<void>;
  };
  teamState: {
    hasLoadedUsers: boolean;
    isLoadingUsers: boolean;
    loadUserList: () => Promise<void>;
    users: DatamixUserSummary[];
  };
};

export function useAdminDashboardData({
  apiKeysState,
  collectionsState,
  mediaState,
  permissions,
  rolesState,
  teamState,
}: AdminDashboardDataOptions) {
  React.useEffect(() => {
    const dashboardPrefetchTasks: Promise<void>[] = [];

    if (
      permissions.canViewCollections &&
      !collectionsState.hasLoadedCollections &&
      !collectionsState.isLoadingCollections
    ) {
      dashboardPrefetchTasks.push(collectionsState.loadCollections());
    }

    if (
      permissions.canViewMedia &&
      !mediaState.hasLoadedMediaAssets &&
      !mediaState.isLoadingMediaAssets
    ) {
      dashboardPrefetchTasks.push(mediaState.loadMediaAssets());
    }

    if (
      permissions.canViewUsers &&
      !teamState.hasLoadedUsers &&
      !teamState.isLoadingUsers
    ) {
      dashboardPrefetchTasks.push(teamState.loadUserList());
    }

    if (
      (permissions.canAccessTeamAccess ||
        permissions.canAccessSettingsWorkspace) &&
      !rolesState.hasLoadedRoles &&
      !rolesState.isLoadingRoles
    ) {
      dashboardPrefetchTasks.push(rolesState.loadAvailableRoles());
    }

    if (
      permissions.canAccessSettingsWorkspace &&
      !apiKeysState.hasLoadedApiKeys &&
      !apiKeysState.isLoadingApiKeys
    ) {
      dashboardPrefetchTasks.push(apiKeysState.loadApiKeyData());
    }

    if (dashboardPrefetchTasks.length === 0) {
      return;
    }

    void Promise.allSettled(dashboardPrefetchTasks);
  }, [
    apiKeysState,
    collectionsState,
    mediaState,
    permissions.canAccessSettingsWorkspace,
    permissions.canAccessTeamAccess,
    permissions.canViewCollections,
    permissions.canViewMedia,
    permissions.canViewUsers,
    rolesState,
    teamState,
  ]);

  const { contentReadyCount, recentSchemas, totalFieldCount } = React.useMemo(() => {
    const nextRecentSchemas = [...collectionsState.collections]
      .sort((firstCollection, secondCollection) => {
        const firstTime = Date.parse(firstCollection.updatedAt);
        const secondTime = Date.parse(secondCollection.updatedAt);

        return (
          (Number.isNaN(secondTime) ? 0 : secondTime) -
          (Number.isNaN(firstTime) ? 0 : firstTime)
        );
      })
      .slice(0, 4);

    return {
      contentReadyCount: collectionsState.collections.filter(
        (collection) => collection.definition.fields.length > 0,
      ).length,
      recentSchemas: nextRecentSchemas,
      totalFieldCount: collectionsState.collections.reduce(
        (count, collection) => count + collection.definition.fields.length,
        0,
      ),
    };
  }, [collectionsState.collections]);
  const activeApiKeyCount = React.useMemo(
    () => apiKeysState.apiKeys.filter((apiKey) => !apiKey.revokedAt).length,
    [apiKeysState.apiKeys],
  );
  const roleDataIsAllowed =
    permissions.canAccessTeamAccess || permissions.canAccessSettingsWorkspace;

  return {
    activeApiKeyCount,
    contentReadyCount,
    recentSchemas,
    roleDataIsAllowed,
    totalFieldCount,
  };
}
