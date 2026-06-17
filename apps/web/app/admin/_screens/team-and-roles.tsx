"use client";

import {
  getDatamixPermissionActionDefinition,
  listDatamixPermissionGrantsForRole,
  type DatamixRoleDefinition,
} from "@datamix/core";
import { Save, UserPlus } from "lucide-react";
import * as React from "react";

import {
  AdminPageHeader,
  AdminSectionCard,
} from "../_components/admin-design";
import { AdminMiniListSkeleton } from "../_components/admin-skeleton";
import { AdminStateBox } from "../_components/admin-state";
import { resolveRoleLabel } from "../_lib/role-drafts";
import { AdminWorkspaceRouteFrame } from "../_workspace/admin-workspace-route-frame";
import { adminRoutes, type AdminWorkspaceRoute } from "../_workspace/admin-routes";
import {
  useAdminWorkspace,
  useAdminWorkspaceRouteAccess,
} from "../_workspace/admin-workspace-hooks";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function createRolePermissionSummary(role: DatamixRoleDefinition) {
  const grants = listDatamixPermissionGrantsForRole(role);

  if (grants.length === 0) {
    return "No permissions";
  }

  return grants
    .map((grant) => {
      const actions = grant.actions
        .map((action) => getDatamixPermissionActionDefinition(action).label)
        .join(", ");

      return `${grant.resource.label}: ${actions}`;
    })
    .join(" / ");
}

function TeamAndRolesContent({ route }: { route: AdminWorkspaceRoute }) {
  const workspace = useAdminWorkspace();
  const access = useAdminWorkspaceRouteAccess(route);
  const {
    availableRoles,
    hasLoadedRoles,
    hasLoadedUsers,
    inviteEmail,
    inviteError,
    inviteMessage,
    inviteName,
    inviteRoleId,
    isInviting,
    isLoadingRoles,
    isLoadingUsers,
    loadAvailableRoles,
    loadUserList,
    permissions,
    role,
    rolesLoadError,
    sendInvite,
    setInviteEmail,
    setInviteName,
    setInviteRoleId,
    updateUserRole,
    updateUserRoleDraft,
    updatingUserRoleId,
    user: currentUser,
    userRoleDrafts,
    users,
    usersLoadError,
    usersMessage,
  } = workspace;
  const isInitialUserLoad =
    permissions.canViewUsers && !hasLoadedUsers && !usersLoadError;
  const isInitialRoleLoad =
    permissions.canAccessTeamAccess && !hasLoadedRoles && !rolesLoadError;

  React.useEffect(() => {
    if (
      !permissions.canAccessTeamAccess ||
      hasLoadedRoles ||
      isLoadingRoles
    ) {
      return;
    }

    void loadAvailableRoles();
  }, [
    hasLoadedRoles,
    isLoadingRoles,
    loadAvailableRoles,
    permissions.canAccessTeamAccess,
  ]);

  React.useEffect(() => {
    if (!permissions.canViewUsers || hasLoadedUsers || isLoadingUsers) {
      return;
    }

    void loadUserList();
  }, [hasLoadedUsers, isLoadingUsers, loadUserList, permissions.canViewUsers]);

  const handleInviteSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendInvite();
  };

  return (
    <AdminWorkspaceRouteFrame route={route}>
      <AdminPageHeader title="Team" />

        {!access.isAllowed ? (
          <AdminStateBox
            body={`Your ${role.label} role cannot access user administration yet.`}
            title="Team access is restricted"
            tone="warning"
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
            <AdminSectionCard
              description="Manage who can sign in and which role they receive."
              title="Current users"
            >
              {usersMessage ? <p className="form-success">{usersMessage}</p> : null}

              {!permissions.canViewUsers ? (
                <AdminStateBox
                  body={
                    permissions.canUpdateUsers
                      ? "This role can update users, but it cannot browse the current user list."
                      : "This role cannot browse the current user list yet."
                  }
                  compact
                  title="User list is restricted"
                  tone="warning"
                />
              ) : isInitialUserLoad || (isLoadingUsers && !hasLoadedUsers) ? (
                <AdminMiniListSkeleton rows={3} />
              ) : usersLoadError && users.length === 0 ? (
                <AdminStateBox
                  body={usersLoadError}
                  compact
                  title="User list is unavailable"
                  tone="error"
                />
              ) : users.length === 0 ? (
                <AdminStateBox
                  body="No users are available yet beyond the current session."
                  compact
                  title="No users found"
                />
              ) : (
                <div className="mini-list">
                  {users.map((user) => {
                    const draftRoleId = userRoleDrafts[user.id] ?? user.roleId ?? "";
                    const isSavingUser = updatingUserRoleId === user.id;

                    return (
                      <div className="mini-list-item mini-list-item-stacked" key={user.id}>
                        <div className="mini-list-content">
                          <strong>{user.name || user.email}</strong>
                          <small>{user.email}</small>
                        </div>

                        <div className="status-row status-row-compact">
                          <Badge variant="outline">
                            {resolveRoleLabel(availableRoles, user.roleId)}
                          </Badge>
                          {currentUser.id === user.id ? (
                            <Badge variant="secondary">Current session</Badge>
                          ) : null}
                          <Badge variant="outline">
                            {user.emailVerified ? "Joined" : "Invite pending"}
                          </Badge>
                        </div>

                        {permissions.canUpdateUsers ? (
                          <div className="permission-toolbar">
                            <label className="field field-inline">
                              <span>Assigned role</span>
                              <select
                                onChange={(event) =>
                                  updateUserRoleDraft(user.id, event.target.value)
                                }
                                value={draftRoleId}
                              >
                                <option disabled value="">
                                  Select role
                                </option>
                                {availableRoles.map((availableRole) => (
                                  <option key={availableRole.id} value={availableRole.id}>
                                    {availableRole.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <Button
                              disabled={
                                isSavingUser || !draftRoleId || draftRoleId === user.roleId
                              }
                              onClick={() => void updateUserRole(user)}
                              size="sm"
                              type="button"
                            >
                              <Save />
                              {isSavingUser ? "Saving" : "Save role"}
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}

              {usersLoadError && users.length > 0 ? (
                <div className="mt-4">
                  <AdminStateBox
                    body={usersLoadError}
                    compact
                    title="User list may be out of date"
                    tone="warning"
                  />
                </div>
              ) : null}
            </AdminSectionCard>

            <AdminSectionCard
              description="Send an invite and choose the starting role."
              title="Invite a teammate"
            >
              <form className="auth-form" onSubmit={handleInviteSubmit}>
                <label className="field">
                  <span>Name</span>
                  <input
                    disabled={!permissions.canInviteUsers || isInviting}
                    onChange={(event) => setInviteName(event.target.value)}
                    placeholder="Optional display name"
                    type="text"
                    value={inviteName}
                  />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input
                    disabled={!permissions.canInviteUsers || isInviting}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    required
                    type="email"
                    value={inviteEmail}
                  />
                </label>
                <label className="field">
                  <span>Starting role</span>
                  <select
                    disabled={
                      !permissions.canInviteUsers || isInviting || availableRoles.length === 0
                    }
                    onChange={(event) => setInviteRoleId(event.target.value)}
                    value={inviteRoleId}
                  >
                    {availableRoles.map((availableRole) => (
                      <option key={availableRole.id} value={availableRole.id}>
                        {availableRole.label}
                      </option>
                    ))}
                  </select>
                </label>

                {inviteError ? <p className="form-error">{inviteError}</p> : null}
                {inviteMessage ? <p className="form-success">{inviteMessage}</p> : null}

                {!permissions.canInviteUsers ? (
                  <AdminStateBox
                    body={`Your ${role.label} role can sign in, but it cannot send team invites.`}
                    compact
                    title="Invites are restricted"
                    tone="warning"
                  />
                ) : null}

                <div className="actions">
                  <Button
                    disabled={isInviting || !permissions.canInviteUsers}
                    type="submit"
                  >
                    <UserPlus />
                    {isInviting ? "Sending invite" : "Send invite"}
                  </Button>
                </div>
              </form>
            </AdminSectionCard>
          </div>
        )}

        <AdminSectionCard
          description="Review built-in and custom roles available to users and invites."
          title="Available roles"
        >
          {isInitialRoleLoad && availableRoles.length === 0 ? (
            <AdminMiniListSkeleton rows={4} />
          ) : rolesLoadError && availableRoles.length === 0 ? (
            <AdminStateBox
              body={rolesLoadError}
              compact
              title="Role list is unavailable"
              tone="error"
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {availableRoles.map((availableRole) => (
                <div className="type-specific-box" key={availableRole.id}>
                  <div className="mini-list-content">
                    <strong>{availableRole.label}</strong>
                    <small>{availableRole.description}</small>
                  </div>
                  <div className="status-row status-row-compact">
                    <Badge variant="outline">
                      {availableRole.permissions.length} permissions
                    </Badge>
                    <Badge variant="secondary">
                      {availableRole.system ? "Built-in" : "Custom"}
                    </Badge>
                  </div>
                  <p className="helper-text">{createRolePermissionSummary(availableRole)}</p>
                </div>
              ))}
            </div>
          )}
          {rolesLoadError && availableRoles.length > 0 ? (
            <div className="mt-4">
              <AdminStateBox
                body={rolesLoadError}
                compact
                title="Role list may be out of date"
                tone="warning"
              />
            </div>
          ) : null}
        </AdminSectionCard>
    </AdminWorkspaceRouteFrame>
  );
}

export function TeamAndRolesRoute() {
  return <TeamAndRolesContent route={adminRoutes.team()} />;
}
