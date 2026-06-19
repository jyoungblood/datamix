import assert from "node:assert/strict";
import test from "node:test";

import { createDatamixAuthorizationSummaryForRole } from "@datamix/core";

import {
  createAdminWorkspacePermissions,
  resolveAdminWorkspaceRouteAccess,
} from "./admin-permissions";
import { createAdminWorkspaceProps } from "./admin-workspace-props";

const mediaRoute = {
  access: "media",
  description: "Upload, browse, and select media assets.",
  href: "/admin/media",
  id: "media",
  label: "Media",
  section: "media",
  title: "Media",
} as const;

const limitedAuthorization = createDatamixAuthorizationSummaryForRole({
  description: "Custom limited test role",
  grants: [],
  id: "limited",
  label: "Limited",
  permissions: [
    "collections.create",
    "media.upload",
    "records.update",
    "settings.update",
    "users.invite",
  ],
  system: false,
});

test("createAdminWorkspacePermissions derives workspace access from individual grants", () => {
  const permissions = createAdminWorkspacePermissions(limitedAuthorization);

  assert.equal(permissions.canAccessCollectionBuilder, true);
  assert.equal(permissions.canAccessMediaWorkspace, true);
  assert.equal(permissions.canAccessRecordsWorkspace, true);
  assert.equal(permissions.canAccessSettingsWorkspace, true);
  assert.equal(permissions.canAccessTeamAccess, true);
  assert.equal(permissions.canCreateCollections, true);
  assert.equal(permissions.canUploadMedia, true);
  assert.equal(permissions.canUpdateRecords, true);
  assert.equal(permissions.canUpdateSettings, true);
  assert.equal(permissions.canInviteUsers, true);
  assert.equal(permissions.canViewCollections, false);
  assert.equal(permissions.canViewMedia, false);
  assert.equal(permissions.canViewRecords, false);
  assert.equal(permissions.canViewSettings, false);
  assert.equal(permissions.canViewUsers, false);
});

test("resolveAdminWorkspaceRouteAccess keeps route restriction copy outside React hooks", () => {
  const permissions = createAdminWorkspacePermissions(limitedAuthorization);
  const deniedPermissions = {
    ...permissions,
    canAccessSettingsWorkspace: false,
  };

  assert.deepEqual(
    resolveAdminWorkspaceRouteAccess({ access: "account" }, deniedPermissions),
    {
      body: "This route is available for the current role.",
      isAllowed: true,
      title: "Route is available",
    },
  );
  assert.deepEqual(
    resolveAdminWorkspaceRouteAccess({ access: "settings" }, deniedPermissions),
    {
      body: "Your current role does not include settings permissions.",
      isAllowed: false,
      title: "This route is restricted",
    },
  );
});

test("createAdminWorkspaceProps returns a serializable route workspace contract", () => {
  const workspace = createAdminWorkspaceProps({
    account: {
      email: "admin@example.com",
      href: "/admin/account",
      id: "user-1",
      image: "",
      initials: "AA",
      name: "Admin Account",
      roleLabel: limitedAuthorization.role.label,
    },
    authorization: limitedAuthorization,
    route: mediaRoute,
  });

  assert.deepEqual(JSON.parse(JSON.stringify(workspace)), workspace);
  assert.deepEqual(workspace.activeRoute, mediaRoute);
  assert.equal(workspace.account.id, "user-1");
  assert.equal(workspace.authorization.role.id, "limited");
  assert.equal(workspace.permissions.canAccessMediaWorkspace, true);
  assert.deepEqual(workspace.role, {
    description: "Custom limited test role",
    id: "limited",
    label: "Limited",
    permissions: [
      "collections.create",
      "media.upload",
      "records.update",
      "settings.update",
      "users.invite",
    ],
    system: false,
  });
});
