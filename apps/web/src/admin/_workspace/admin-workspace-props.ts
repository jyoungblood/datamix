import type {
  DatamixAuthorizationSummary,
  DatamixPermissionKey,
  DatamixRoleDefinition,
} from "@datamix/core";

import type { AdminWorkspaceRoute } from "./admin-routes";
import { createAdminWorkspacePermissions } from "./admin-permissions";

export type AdminWorkspacePermissions = {
  canAccessCollectionBuilder: boolean;
  canAccessMediaWorkspace: boolean;
  canAccessRecordsWorkspace: boolean;
  canAccessSettingsWorkspace: boolean;
  canAccessTeamAccess: boolean;
  canCreateCollections: boolean;
  canCreateRecords: boolean;
  canDeleteUsers: boolean;
  canInviteUsers: boolean;
  canUpdateCollections: boolean;
  canUpdateRecords: boolean;
  canUpdateSettings: boolean;
  canUpdateUsers: boolean;
  canUploadMedia: boolean;
  canViewCollections: boolean;
  canViewMedia: boolean;
  canViewRecords: boolean;
  canViewSettings: boolean;
  canViewUsers: boolean;
};

export type AdminWorkspaceAccountProps = {
  email: string | null;
  href: string;
  id: string | null;
  image: string;
  initials: string;
  name: string;
  roleLabel: string;
};

export type AdminWorkspaceRouteMetadata = Pick<
  AdminWorkspaceRoute,
  "access" | "description" | "href" | "id" | "label" | "section" | "title"
>;

export type AdminWorkspaceRoleSummary = Pick<
  DatamixRoleDefinition,
  "description" | "id" | "label" | "system"
> & {
  permissions: DatamixPermissionKey[];
};

export type AdminWorkspaceProps = {
  account: AdminWorkspaceAccountProps;
  activeRoute: AdminWorkspaceRouteMetadata;
  authorization: DatamixAuthorizationSummary;
  permissions: AdminWorkspacePermissions;
  role: AdminWorkspaceRoleSummary;
};

export function createAdminWorkspaceProps(input: {
  account: AdminWorkspaceAccountProps;
  authorization: DatamixAuthorizationSummary;
  route: AdminWorkspaceRoute;
}): AdminWorkspaceProps {
  return {
    account: { ...input.account },
    activeRoute: { ...input.route },
    authorization: input.authorization,
    permissions: createAdminWorkspacePermissions(input.authorization),
    role: {
      description: input.authorization.role.description,
      id: input.authorization.role.id,
      label: input.authorization.role.label,
      permissions: [...input.authorization.role.permissions],
      system: input.authorization.role.system,
    },
  };
}
