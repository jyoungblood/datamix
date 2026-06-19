import type { DatamixAuthorizationSummary } from "@datamix/core";

import type {
  AdminWorkspaceRoute,
  AdminWorkspaceRouteAccess,
} from "./admin-routes";
import type { AdminWorkspacePermissions } from "./admin-workspace-props";

export type { AdminWorkspacePermissions } from "./admin-workspace-props";

export type AdminWorkspaceRouteAccessState = {
  body: string;
  isAllowed: boolean;
  title: string;
};

const routeAccessLabels = {
  account: "an active admin session",
  content: "content permissions",
  home: "an active admin session",
  media: "media permissions",
  schema: "schema permissions",
  settings: "settings permissions",
  team: "team permissions",
} as const satisfies Record<AdminWorkspaceRouteAccess, string>;

export function createAdminWorkspacePermissions(
  authorization: DatamixAuthorizationSummary,
): AdminWorkspacePermissions {
  const permissionMap = authorization.permissionMap;
  const canViewCollections = permissionMap["collections.read"] ?? false;
  const canCreateCollections = permissionMap["collections.create"] ?? false;
  const canUpdateCollections = permissionMap["collections.update"] ?? false;
  const canViewRecords = permissionMap["records.read"] ?? false;
  const canCreateRecords = permissionMap["records.create"] ?? false;
  const canUpdateRecords = permissionMap["records.update"] ?? false;
  const canViewMedia = permissionMap["media.read"] ?? false;
  const canUploadMedia = permissionMap["media.upload"] ?? false;
  const canViewUsers = permissionMap["users.read"] ?? false;
  const canInviteUsers = permissionMap["users.invite"] ?? false;
  const canUpdateUsers = permissionMap["users.update"] ?? false;
  const canDeleteUsers = permissionMap["users.delete"] ?? false;
  const canViewSettings = permissionMap["settings.read"] ?? false;
  const canUpdateSettings = permissionMap["settings.update"] ?? false;

  return {
    canAccessCollectionBuilder:
      canViewCollections || canCreateCollections || canUpdateCollections,
    canAccessMediaWorkspace: canViewMedia || canUploadMedia,
    canAccessRecordsWorkspace: canViewRecords || canCreateRecords || canUpdateRecords,
    canAccessSettingsWorkspace: canViewSettings || canUpdateSettings,
    canAccessTeamAccess: canViewUsers || canInviteUsers || canUpdateUsers || canDeleteUsers,
    canCreateCollections,
    canCreateRecords,
    canDeleteUsers,
    canInviteUsers,
    canUpdateCollections,
    canUpdateRecords,
    canUpdateSettings,
    canUpdateUsers,
    canUploadMedia,
    canViewCollections,
    canViewMedia,
    canViewRecords,
    canViewSettings,
    canViewUsers,
  };
}

export function resolveAdminWorkspaceRouteAccess(
  route: Pick<AdminWorkspaceRoute, "access">,
  permissions: AdminWorkspacePermissions,
): AdminWorkspaceRouteAccessState {
  const isAllowed =
    route.access === "account" || route.access === "home"
      ? true
      : route.access === "schema"
        ? permissions.canAccessCollectionBuilder
        : route.access === "content"
          ? permissions.canAccessRecordsWorkspace
          : route.access === "media"
            ? permissions.canAccessMediaWorkspace
            : route.access === "team"
              ? permissions.canAccessTeamAccess
              : permissions.canAccessSettingsWorkspace;

  if (isAllowed) {
    return {
      body: "This route is available for the current role.",
      isAllowed: true,
      title: "Route is available",
    };
  }

  return {
    body: `Your current role does not include ${routeAccessLabels[route.access]}.`,
    isAllowed: false,
    title: "This route is restricted",
  };
}
