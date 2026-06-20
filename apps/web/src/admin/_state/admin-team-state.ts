"use client";

import type { DatamixRoleDefinition } from "@datamix/core";
import { datamixDefaultRoleAssignments } from "@datamix/core";
import * as React from "react";

import type { AdminWorkspacePermissions } from "../_workspace/admin-permissions";

import { sendInvite as sendInviteRequest } from "@/lib/invite";
import {
  listUsers,
  updateUserRole as updateUserRoleRequest,
  type DatamixUserSummary,
} from "@/lib/users";

type AdminTeamStateOptions = {
  availableRoles: DatamixRoleDefinition[];
  currentUserId: string | null;
  initialUsers?: DatamixUserSummary[] | undefined;
  initialUsersLoadError?: string | null | undefined;
  initialUsersLoaded?: boolean | undefined;
  onCurrentUserRoleUpdated?: () => Promise<void>;
  permissions: Pick<
    AdminWorkspacePermissions,
    "canInviteUsers" | "canUpdateUsers" | "canViewUsers"
  >;
};

export function useAdminTeamState({
  availableRoles,
  currentUserId,
  initialUsers,
  initialUsersLoadError,
  initialUsersLoaded,
  onCurrentUserRoleUpdated,
  permissions,
}: AdminTeamStateOptions) {
  const usersLoadRequestId = React.useRef(0);
  const [users, setUsers] = React.useState<DatamixUserSummary[]>(
    () => initialUsers ?? [],
  );
  const [usersLoadError, setUsersLoadError] = React.useState<string | null>(
    () => initialUsersLoadError ?? null,
  );
  const [usersMessage, setUsersMessage] = React.useState<string | null>(null);
  const [hasLoadedUsers, setHasLoadedUsers] = React.useState(
    () => initialUsersLoaded ?? false,
  );
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(false);
  const [updatingUserRoleId, setUpdatingUserRoleId] = React.useState<string | null>(null);
  const [userRoleDrafts, setUserRoleDrafts] = React.useState<Record<string, string>>(
    () => {
      const drafts: Record<string, string> = {};

      (initialUsers ?? []).forEach((user) => {
        drafts[user.id] = user.roleId ?? "";
      });

      return drafts;
    },
  );
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteName, setInviteName] = React.useState("");
  const [inviteRoleId, setInviteRoleId] = React.useState<string>(
    datamixDefaultRoleAssignments.invitedUser,
  );
  const [inviteError, setInviteError] = React.useState<string | null>(null);
  const [inviteMessage, setInviteMessage] = React.useState<string | null>(null);
  const [isInviting, setIsInviting] = React.useState(false);

  const resetUserList = React.useCallback(() => {
    usersLoadRequestId.current += 1;
    setUsers([]);
    setUsersLoadError(null);
    setUsersMessage(null);
    setHasLoadedUsers(false);
    setIsLoadingUsers(false);
    setUpdatingUserRoleId(null);
    setUserRoleDrafts({});
  }, []);

  const resetUserWorkspace = React.useCallback(() => {
    resetUserList();
    setInviteError(null);
    setInviteMessage(null);
    setIsInviting(false);
  }, [resetUserList]);

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

  const sendInvite = React.useCallback(async () => {
    if (!permissions.canInviteUsers) {
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
    permissions.canInviteUsers,
    permissions.canViewUsers,
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

      if (!permissions.canUpdateUsers || !nextRoleId || nextRoleId === user.roleId) {
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

        if (currentUserId === result.user.id) {
          await onCurrentUserRoleUpdated?.();
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
      currentUserId,
      onCurrentUserRoleUpdated,
      permissions.canUpdateUsers,
      userRoleDrafts,
    ],
  );

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

  return {
    hasLoadedUsers,
    inviteEmail,
    inviteError,
    inviteMessage,
    inviteName,
    inviteRoleId,
    isInviting,
    isLoadingUsers,
    loadUserList,
    resetUserList,
    resetUserWorkspace,
    sendInvite,
    setInviteEmail,
    setInviteName,
    setInviteRoleId,
    updateUserRole,
    updateUserRoleDraft,
    updatingUserRoleId,
    userRoleDrafts,
    users,
    usersLoadError,
    usersMessage,
  };
}
