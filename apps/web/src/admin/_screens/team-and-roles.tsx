"use client";

import {
  getDatamixPermissionActionDefinition,
  listDatamixPermissionGrantsForRole,
  type DatamixRoleDefinition,
} from "@datamix/core";
import * as React from "react";

import { resolveRoleLabel } from "../_lib/role-drafts";
import { useAdminRolesState } from "../_state/admin-roles-state";
import { useAdminTeamState } from "../_state/admin-team-state";
import type { AdminWorkspaceRouteAccessState } from "../_workspace/admin-permissions";
import type { AdminWorkspaceProps } from "../_workspace/admin-workspace-props";

import { badgeVariants } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { DatamixUserSummary } from "@/lib/users";

type TeamAndRolesInteractionsIslandProps = {
  roles?: DatamixRoleDefinition[];
  rolesLoadError?: string | null;
  rolesLoaded?: boolean;
  rootId: string;
  routeAccess: AdminWorkspaceRouteAccessState;
  users?: DatamixUserSummary[];
  usersLoadError?: string | null;
  usersLoaded?: boolean;
  workspace: AdminWorkspaceProps;
};

type QueryRoot = Document | HTMLElement;

const outlineBadgeClass = badgeVariants({ variant: "outline" });
const secondaryBadgeClass = badgeVariants({ variant: "secondary" });
const smallButtonClass = buttonVariants({ size: "sm" });

function queryElement<T>(root: QueryRoot, selector: string) {
  return root.querySelector(selector) as T | null;
}

function queryElements<T>(root: QueryRoot, selector: string) {
  return Array.from(root.querySelectorAll(selector)) as T[];
}

function setHidden(element: HTMLElement | null, isHidden: boolean) {
  if (element) {
    element.hidden = isHidden;
  }
}

function setText(element: HTMLElement | null, value: string) {
  if (element) {
    element.textContent = value;
  }
}

function setInputValue(
  element: HTMLInputElement | HTMLSelectElement | null,
  value: string,
) {
  if (element && element.value !== value) {
    element.value = value;
  }
}

function setStateBoxBody(container: QueryRoot, selector: string, value: string) {
  setText(queryElement<HTMLElement>(container, `${selector} .list-copy`), value);
}

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

function createBadge(document: Document, className: string, text: string) {
  const badge = document.createElement("span");
  badge.className = className;
  badge.textContent = text;
  return badge;
}

function createSaveIcon(document: Document) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "size-4");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");

  for (const pathData of [
    "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
    "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",
    "M7 3v4a1 1 0 0 0 1 1h7",
  ]) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    svg.appendChild(path);
  }

  return svg;
}

function populateRoleOptions(
  select: HTMLSelectElement,
  roles: DatamixRoleDefinition[],
  selectedRoleId: string,
  options?: { includePlaceholder?: boolean },
) {
  while (select.firstChild) {
    select.removeChild(select.firstChild);
  }

  if (options?.includePlaceholder) {
    const placeholder = document.createElement("option");
    placeholder.disabled = true;
    placeholder.value = "";
    placeholder.textContent = "Select role";
    placeholder.selected = selectedRoleId === "";
    select.appendChild(placeholder);
  }

  for (const role of roles) {
    const option = document.createElement("option");
    option.value = role.id;
    option.textContent = role.label;
    option.selected = role.id === selectedRoleId;
    select.appendChild(option);
  }
}

function createUserItem(
  document: Document,
  user: DatamixUserSummary,
  options: {
    availableRoles: DatamixRoleDefinition[];
    canUpdateUsers: boolean;
    currentUserId: string | null;
    draftRoleId: string;
    isSavingUser: boolean;
  },
) {
  const item = document.createElement("div");
  item.className = "mini-list-item mini-list-item-stacked";
  item.dataset.teamUserItem = "";
  item.dataset.teamUserId = user.id;

  const content = document.createElement("div");
  content.className = "mini-list-content";

  const name = document.createElement("strong");
  name.textContent = user.name || user.email;
  content.appendChild(name);

  const email = document.createElement("small");
  email.textContent = user.email;
  content.appendChild(email);
  item.appendChild(content);

  const statusRow = document.createElement("div");
  statusRow.className = "status-row status-row-compact";
  statusRow.appendChild(
    createBadge(
      document,
      outlineBadgeClass,
      resolveRoleLabel(options.availableRoles, user.roleId),
    ),
  );

  if (options.currentUserId === user.id) {
    statusRow.appendChild(
      createBadge(document, secondaryBadgeClass, "Current session"),
    );
  }

  statusRow.appendChild(
    createBadge(
      document,
      outlineBadgeClass,
      user.emailVerified ? "Joined" : "Invite pending",
    ),
  );
  item.appendChild(statusRow);

  if (options.canUpdateUsers) {
    const toolbar = document.createElement("div");
    toolbar.className = "permission-toolbar";

    const label = document.createElement("label");
    label.className = "field field-inline";

    const labelText = document.createElement("span");
    labelText.textContent = "Assigned role";
    label.appendChild(labelText);

    const select = document.createElement("select");
    select.dataset.teamUserId = user.id;
    select.dataset.teamUserRoleSelect = "";
    populateRoleOptions(select, options.availableRoles, options.draftRoleId, {
      includePlaceholder: true,
    });
    label.appendChild(select);
    toolbar.appendChild(label);

    const button = document.createElement("button");
    button.className = smallButtonClass;
    button.dataset.teamUserId = user.id;
    button.dataset.teamUserSaveButton = "";
    button.disabled =
      options.isSavingUser ||
      !options.draftRoleId ||
      options.draftRoleId === user.roleId;
    button.type = "button";
    button.appendChild(createSaveIcon(document));

    const buttonLabel = document.createElement("span");
    buttonLabel.dataset.teamUserSaveLabel = "";
    buttonLabel.textContent = options.isSavingUser ? "Saving" : "Save role";
    button.appendChild(buttonLabel);
    toolbar.appendChild(button);
    item.appendChild(toolbar);
  }

  return item;
}

function createRoleItem(document: Document, role: DatamixRoleDefinition) {
  const item = document.createElement("div");
  item.className = "type-specific-box";
  item.dataset.teamRoleItem = "";
  item.dataset.teamRoleId = role.id;

  const content = document.createElement("div");
  content.className = "mini-list-content";

  const label = document.createElement("strong");
  label.textContent = role.label;
  content.appendChild(label);

  const description = document.createElement("small");
  description.textContent = role.description;
  content.appendChild(description);
  item.appendChild(content);

  const statusRow = document.createElement("div");
  statusRow.className = "status-row status-row-compact";
  statusRow.appendChild(
    createBadge(document, outlineBadgeClass, `${role.permissions.length} permissions`),
  );
  statusRow.appendChild(
    createBadge(document, secondaryBadgeClass, role.system ? "Built-in" : "Custom"),
  );
  item.appendChild(statusRow);

  const summary = document.createElement("p");
  summary.className = "helper-text";
  summary.textContent = createRolePermissionSummary(role);
  item.appendChild(summary);

  return item;
}

export function TeamAndRolesInteractionsIsland({
  roles: initialRoles,
  rolesLoadError: initialRolesLoadError,
  rolesLoaded: initialRolesLoaded,
  rootId,
  routeAccess,
  users: initialUsers,
  usersLoadError: initialUsersLoadError,
  usersLoaded: initialUsersLoaded,
  workspace,
}: TeamAndRolesInteractionsIslandProps) {
  const { permissions } = workspace;
  const reloadWorkspace = React.useCallback(async () => {
    window.location.reload();
  }, []);
  const rolesState = useAdminRolesState({
    currentRoleId: workspace.authorization.role.id,
    initialRoles,
    initialRolesLoadError,
    initialRolesLoaded,
    onCurrentRoleChanged: reloadWorkspace,
    permissions,
  });
  const teamState = useAdminTeamState({
    availableRoles: rolesState.availableRoles,
    currentUserId: workspace.account.id,
    initialUsers,
    initialUsersLoadError,
    initialUsersLoaded,
    onCurrentUserRoleUpdated: reloadWorkspace,
    permissions,
  });
  const {
    availableRoles,
    hasLoadedRoles,
    isLoadingRoles,
    loadAvailableRoles,
    rolesLoadError,
  } = rolesState;
  const {
    hasLoadedUsers,
    inviteEmail,
    inviteError,
    inviteMessage,
    inviteName,
    inviteRoleId,
    isInviting,
    isLoadingUsers,
    loadUserList,
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
  } = teamState;
  const isInitialUserLoad =
    permissions.canViewUsers && !hasLoadedUsers && !usersLoadError;
  const isInitialRoleLoad =
    permissions.canAccessTeamAccess && !hasLoadedRoles && !rolesLoadError;
  const shouldShowUserLoading =
    isInitialUserLoad || (isLoadingUsers && !hasLoadedUsers);
  const shouldShowRoleLoading = isInitialRoleLoad && availableRoles.length === 0;

  React.useEffect(() => {
    if (
      !routeAccess.isAllowed ||
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
    routeAccess.isAllowed,
  ]);

  React.useEffect(() => {
    if (
      !routeAccess.isAllowed ||
      !permissions.canViewUsers ||
      hasLoadedUsers ||
      isLoadingUsers
    ) {
      return;
    }

    void loadUserList();
  }, [
    hasLoadedUsers,
    isLoadingUsers,
    loadUserList,
    permissions.canViewUsers,
    routeAccess.isAllowed,
  ]);

  React.useEffect(() => {
    const root = document.getElementById(rootId);

    if (!root) {
      return;
    }

    const handleInput = (event: Event) => {
      const target = event.target as HTMLInputElement | null;

      if (!target) {
        return;
      }

      if (target.matches("[data-team-invite-name]")) {
        setInviteName(target.value);
      }

      if (target.matches("[data-team-invite-email]")) {
        setInviteEmail(target.value);
      }
    };

    const handleChange = (event: Event) => {
      const target = event.target as HTMLSelectElement | null;

      if (!target) {
        return;
      }

      if (target.matches("[data-team-invite-role]")) {
        setInviteRoleId(target.value);
        return;
      }

      if (target.matches("[data-team-user-role-select]")) {
        const userId = target.dataset.teamUserId;

        if (userId) {
          updateUserRoleDraft(userId, target.value);
        }
      }
    };

    const handleSubmit = (event: SubmitEvent) => {
      const target = event.target as HTMLFormElement | null;

      if (!target?.matches("[data-team-invite-form]")) {
        return;
      }

      event.preventDefault();
      void sendInvite();
    };

    root.addEventListener("input", handleInput);
    root.addEventListener("change", handleChange);
    root.addEventListener("submit", handleSubmit);

    return () => {
      root.removeEventListener("input", handleInput);
      root.removeEventListener("change", handleChange);
      root.removeEventListener("submit", handleSubmit);
    };
  }, [
    rootId,
    sendInvite,
    setInviteEmail,
    setInviteName,
    setInviteRoleId,
    updateUserRoleDraft,
  ]);

  React.useEffect(() => {
    const root = document.getElementById(rootId);

    if (!root) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target as
        | {
            closest?: (selector: string) => HTMLElement | null;
          }
        | null;

      if (!target?.closest) {
        return;
      }

      const saveButton = target.closest("[data-team-user-save-button]");
      const userId = saveButton?.dataset.teamUserId;

      if (!userId) {
        return;
      }

      const user = users.find((currentUser) => currentUser.id === userId);

      if (!user) {
        return;
      }

      event.preventDefault();
      void updateUserRole(user);
    };

    root.addEventListener("click", handleClick);

    return () => {
      root.removeEventListener("click", handleClick);
    };
  }, [rootId, updateUserRole, users]);

  React.useEffect(() => {
    const root = document.getElementById(rootId);

    if (!root) {
      return;
    }

    root.dataset.teamHydrated = "true";
    const canShowUserList = routeAccess.isAllowed && permissions.canViewUsers;

    setText(
      queryElement<HTMLElement>(root, "[data-team-users-message]"),
      usersMessage ?? "",
    );
    setHidden(
      queryElement<HTMLElement>(root, "[data-team-users-message]"),
      !usersMessage,
    );

    setHidden(
      queryElement<HTMLElement>(root, "[data-team-users-loading]"),
      !canShowUserList || !shouldShowUserLoading,
    );
    setHidden(
      queryElement<HTMLElement>(root, "[data-team-users-error]"),
      !canShowUserList ||
        shouldShowUserLoading ||
        !usersLoadError ||
        users.length > 0,
    );
    setStateBoxBody(root, "[data-team-users-error]", usersLoadError ?? "");
    setHidden(
      queryElement<HTMLElement>(root, "[data-team-users-empty]"),
      !canShowUserList ||
        shouldShowUserLoading ||
        Boolean(usersLoadError) ||
        users.length > 0,
    );

    const usersItems = queryElement<HTMLElement>(root, "[data-team-users-items]");
    const shouldShowUsersList =
      canShowUserList && !shouldShowUserLoading && users.length > 0;

    setHidden(usersItems, !shouldShowUsersList);

    if (usersItems) {
      while (usersItems.firstChild) {
        usersItems.removeChild(usersItems.firstChild);
      }

      for (const user of users) {
        usersItems.appendChild(
          createUserItem(document, user, {
            availableRoles,
            canUpdateUsers: permissions.canUpdateUsers,
            currentUserId: workspace.account.id,
            draftRoleId: userRoleDrafts[user.id] ?? user.roleId ?? "",
            isSavingUser: updatingUserRoleId === user.id,
          }),
        );
      }
    }

    setHidden(
      queryElement<HTMLElement>(root, "[data-team-users-stale-error]"),
      !canShowUserList ||
        shouldShowUserLoading ||
        !usersLoadError ||
        users.length === 0,
    );
    setStateBoxBody(root, "[data-team-users-stale-error]", usersLoadError ?? "");

    const inviteNameInput = queryElement<HTMLInputElement>(
      root,
      "[data-team-invite-name]",
    );
    const inviteEmailInput = queryElement<HTMLInputElement>(
      root,
      "[data-team-invite-email]",
    );
    const inviteRoleSelect = queryElement<HTMLSelectElement>(
      root,
      "[data-team-invite-role]",
    );
    const inviteButton = queryElement<HTMLButtonElement>(
      root,
      "[data-team-invite-button]",
    );

    setInputValue(inviteNameInput, inviteName);
    setInputValue(inviteEmailInput, inviteEmail);

    if (inviteNameInput) {
      inviteNameInput.disabled = !permissions.canInviteUsers || isInviting;
    }

    if (inviteEmailInput) {
      inviteEmailInput.disabled = !permissions.canInviteUsers || isInviting;
    }

    if (inviteRoleSelect) {
      populateRoleOptions(inviteRoleSelect, availableRoles, inviteRoleId);
      inviteRoleSelect.disabled =
        !permissions.canInviteUsers || isInviting || availableRoles.length === 0;
    }

    if (inviteButton) {
      inviteButton.disabled = isInviting || !permissions.canInviteUsers;
    }

    setText(
      queryElement<HTMLElement>(root, "[data-team-invite-button-label]"),
      isInviting ? "Sending invite" : "Send invite",
    );
    setText(
      queryElement<HTMLElement>(root, "[data-team-invite-error]"),
      inviteError ?? "",
    );
    setHidden(
      queryElement<HTMLElement>(root, "[data-team-invite-error]"),
      !inviteError,
    );
    setText(
      queryElement<HTMLElement>(root, "[data-team-invite-message]"),
      inviteMessage ?? "",
    );
    setHidden(
      queryElement<HTMLElement>(root, "[data-team-invite-message]"),
      !inviteMessage,
    );

    setHidden(
      queryElement<HTMLElement>(root, "[data-team-roles-loading]"),
      !shouldShowRoleLoading,
    );
    setHidden(
      queryElement<HTMLElement>(root, "[data-team-roles-error]"),
      shouldShowRoleLoading || !rolesLoadError || availableRoles.length > 0,
    );
    setStateBoxBody(root, "[data-team-roles-error]", rolesLoadError ?? "");

    const rolesItems = queryElement<HTMLElement>(root, "[data-team-roles-items]");
    const shouldShowRolesList =
      !shouldShowRoleLoading &&
      (!rolesLoadError || availableRoles.length > 0);

    setHidden(rolesItems, !shouldShowRolesList);

    if (rolesItems) {
      while (rolesItems.firstChild) {
        rolesItems.removeChild(rolesItems.firstChild);
      }

      for (const role of availableRoles) {
        rolesItems.appendChild(createRoleItem(document, role));
      }
    }

    setHidden(
      queryElement<HTMLElement>(root, "[data-team-roles-stale-error]"),
      shouldShowRoleLoading || !rolesLoadError || availableRoles.length === 0,
    );
    setStateBoxBody(root, "[data-team-roles-stale-error]", rolesLoadError ?? "");

    for (const select of queryElements<HTMLSelectElement>(
      root,
      "[data-team-user-role-select]",
    )) {
      const userId = select.dataset.teamUserId;
      const user = userId
        ? users.find((currentUser) => currentUser.id === userId)
        : null;

      if (!user) {
        continue;
      }

      setInputValue(select, userRoleDrafts[user.id] ?? user.roleId ?? "");
    }
  }, [
    availableRoles,
    inviteEmail,
    inviteError,
    inviteMessage,
    inviteName,
    inviteRoleId,
    isInviting,
    permissions.canInviteUsers,
    permissions.canUpdateUsers,
    permissions.canViewUsers,
    rolesLoadError,
    routeAccess.isAllowed,
    rootId,
    shouldShowRoleLoading,
    shouldShowUserLoading,
    updatingUserRoleId,
    userRoleDrafts,
    users,
    usersLoadError,
    usersMessage,
    workspace.account.id,
  ]);

  return null;
}
