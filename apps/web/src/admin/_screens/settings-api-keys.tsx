"use client";

import {
  datamixApiKeyAccessLevels,
  datamixRolePresets,
  type DatamixApiKeySummary,
  type DatamixPermissionKey,
  type DatamixRoleDefinition,
} from "@datamix/core";
import * as React from "react";

import {
  createApiKeyDraftFromApiKey,
  formatApiKeyAccessLevel,
  formatPublicApiAccessMode,
} from "../_lib/api-key-drafts";
import { formatRecordTimestamp } from "../_lib/media-formatting";
import { formatIssuePath } from "../_lib/schema-drafts";
import { rolePermissionSections } from "../_lib/role-drafts";
import { useAdminApiKeysState } from "../_state/admin-api-keys-state";
import { useAdminRolesState } from "../_state/admin-roles-state";
import type { AdminWorkspaceRouteAccessState } from "../_workspace/admin-permissions";
import type { AdminWorkspaceProps } from "../_workspace/admin-workspace-props";

import { badgeVariants } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { PublicApiRuntimeSummary } from "@/lib/api-keys";

type SettingsInteractionsIslandProps = {
  apiKeys?: DatamixApiKeySummary[];
  apiKeysLoadError?: string | null;
  apiKeysLoaded?: boolean;
  publicApiRuntime?: PublicApiRuntimeSummary | null;
  roles?: DatamixRoleDefinition[];
  rolesLoadError?: string | null;
  rolesLoaded?: boolean;
  rootId: string;
  routeAccess: AdminWorkspaceRouteAccessState;
  workspace: AdminWorkspaceProps;
};

type QueryRoot = Document | HTMLElement;
type ApiKeysState = ReturnType<typeof useAdminApiKeysState>;
type RolesState = ReturnType<typeof useAdminRolesState>;

const outlineBadgeClass = badgeVariants({ variant: "outline" });
const secondaryBadgeClass = badgeVariants({ variant: "secondary" });
const destructiveBadgeClass = badgeVariants({ variant: "destructive" });
const smallButtonClass = buttonVariants({ size: "sm" });
const smallDestructiveButtonClass = buttonVariants({
  size: "sm",
  variant: "destructive",
});
const outlineButtonClass = buttonVariants({ variant: "outline" });

function queryElement<T>(root: QueryRoot, selector: string) {
  return root.querySelector(selector) as T | null;
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
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null,
  value: string,
) {
  if (element && element.value !== value) {
    element.value = value;
  }
}

function setStateBoxBody(container: QueryRoot, selector: string, value: string) {
  setText(queryElement<HTMLElement>(container, `${selector} .list-copy`), value);
}

function clearChildren(element: Node) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function createBadge(document: Document, className: string, text: string) {
  const badge = document.createElement("span");
  badge.className = className;
  badge.textContent = text;
  return badge;
}

function createStateBox(
  document: Document,
  options: {
    body: string;
    compact?: boolean;
    title: string;
    tone?: "error" | "neutral" | "success" | "warning";
  },
) {
  const tone = options.tone ?? "neutral";
  const box = document.createElement("div");
  box.className = [
    "empty-state-box state-box",
    `state-box-${tone}`,
    options.compact ? "compact-box" : "",
  ]
    .filter(Boolean)
    .join(" ");
  box.role = tone === "error" ? "alert" : "status";

  const title = document.createElement("p");
  title.className = "list-title";
  title.textContent = options.title;
  box.appendChild(title);

  const body = document.createElement("p");
  body.className = "list-copy";
  body.textContent = options.body;
  box.appendChild(body);

  return box;
}

function createButton(
  document: Document,
  options: {
    className: string;
    disabled?: boolean;
    text: string;
    type?: "button" | "submit";
  },
) {
  const button = document.createElement("button");
  button.className = options.className;
  button.disabled = Boolean(options.disabled);
  button.type = options.type ?? "button";

  const label = document.createElement("span");
  label.textContent = options.text;
  button.appendChild(label);

  return button;
}

function populateApiAccessOptions(
  select: HTMLSelectElement,
  selectedAccessLevel: string,
) {
  clearChildren(select);

  for (const accessLevel of datamixApiKeyAccessLevels) {
    const option = document.createElement("option");
    option.value = accessLevel;
    option.textContent = formatApiKeyAccessLevel(accessLevel);
    option.selected = accessLevel === selectedAccessLevel;
    select.appendChild(option);
  }
}

function createRuntimeDetailList(
  document: Document,
  runtime: PublicApiRuntimeSummary,
) {
  const list = document.createElement("dl");
  list.className = "mb-4 grid grid-cols-2 gap-y-2 text-[11px]";
  list.dataset.settingsApiRuntimeDetails = "";

  for (const item of [
    {
      label: "Public read access",
      value: formatPublicApiAccessMode(runtime.readAccess),
    },
    {
      label: "Public write access",
      value: formatPublicApiAccessMode(runtime.writeAccess),
    },
  ]) {
    const term = document.createElement("dt");
    term.className = "font-bold text-slate-500";
    term.textContent = item.label;
    list.appendChild(term);

    const description = document.createElement("dd");
    description.className = "m-0 min-w-0 text-slate-950";
    description.textContent = item.value;
    list.appendChild(description);
  }

  return list;
}

function createApiKeyItem(
  document: Document,
  apiKey: DatamixApiKeySummary,
  options: {
    apiKeysState: ApiKeysState;
    canUpdateSettings: boolean;
  },
) {
  const draft =
    options.apiKeysState.apiKeyDrafts[apiKey.id] ??
    createApiKeyDraftFromApiKey(apiKey);
  const isSavingThisKey = options.apiKeysState.savingApiKeyId === apiKey.id;
  const isRevokingThisKey = options.apiKeysState.revokingApiKeyId === apiKey.id;
  const isDisabled =
    Boolean(apiKey.revokedAt) || isSavingThisKey || isRevokingThisKey;
  const isUnchanged =
    draft.label === apiKey.label && draft.accessLevel === apiKey.accessLevel;

  const item = document.createElement("div");
  item.className = "mini-list-item mini-list-item-stacked";
  item.dataset.settingsApiKeyItem = "";
  item.dataset.settingsApiKeyId = apiKey.id;

  const content = document.createElement("div");
  content.className = "mini-list-content";

  const title = document.createElement("strong");
  title.textContent = apiKey.label;
  content.appendChild(title);

  const preview = document.createElement("small");
  preview.textContent = apiKey.secretPreview;
  content.appendChild(preview);
  item.appendChild(content);

  const status = document.createElement("div");
  status.className = "status-row status-row-compact";
  status.appendChild(
    createBadge(document, outlineBadgeClass, formatApiKeyAccessLevel(apiKey.accessLevel)),
  );
  status.appendChild(
    createBadge(
      document,
      apiKey.revokedAt ? destructiveBadgeClass : secondaryBadgeClass,
      apiKey.revokedAt ? "Revoked" : "Active",
    ),
  );
  status.appendChild(
    createBadge(
      document,
      outlineBadgeClass,
      apiKey.lastUsedAt
        ? `Last used ${formatRecordTimestamp(apiKey.lastUsedAt)}`
        : "Never used",
    ),
  );
  item.appendChild(status);

  const helper = document.createElement("p");
  helper.className = "helper-text";
  helper.textContent = `Created ${formatRecordTimestamp(apiKey.createdAt)}${
    apiKey.revokedAt ? ` / Revoked ${formatRecordTimestamp(apiKey.revokedAt)}` : ""
  }`;
  item.appendChild(helper);

  if (!options.canUpdateSettings) {
    return item;
  }

  const toolbar = document.createElement("div");
  toolbar.className = "permission-toolbar";

  const labelField = document.createElement("label");
  labelField.className = "field field-inline";
  const labelText = document.createElement("span");
  labelText.textContent = "Label";
  labelField.appendChild(labelText);
  const labelInput = document.createElement("input");
  labelInput.dataset.settingsApiKeyId = apiKey.id;
  labelInput.dataset.settingsApiKeyLabel = "";
  labelInput.disabled = isDisabled;
  labelInput.type = "text";
  labelInput.value = draft.label;
  labelField.appendChild(labelInput);
  toolbar.appendChild(labelField);

  const accessField = document.createElement("label");
  accessField.className = "field field-inline";
  const accessText = document.createElement("span");
  accessText.textContent = "Access";
  accessField.appendChild(accessText);
  const accessSelect = document.createElement("select");
  accessSelect.dataset.settingsApiKeyId = apiKey.id;
  accessSelect.dataset.settingsApiKeyAccess = "";
  accessSelect.disabled = isDisabled;
  populateApiAccessOptions(accessSelect, draft.accessLevel);
  accessField.appendChild(accessSelect);
  toolbar.appendChild(accessField);

  const saveButton = createButton(document, {
    className: smallButtonClass,
    disabled: isDisabled || isUnchanged,
    text: isSavingThisKey ? "Saving" : "Save",
  });
  saveButton.dataset.settingsApiKeyId = apiKey.id;
  saveButton.dataset.settingsApiKeySaveButton = "";
  toolbar.appendChild(saveButton);

  const revokeButton = createButton(document, {
    className: smallDestructiveButtonClass,
    disabled: isDisabled,
    text: isRevokingThisKey ? "Revoking" : "Revoke",
  });
  revokeButton.dataset.settingsApiKeyId = apiKey.id;
  revokeButton.dataset.settingsApiKeyRevokeButton = "";
  toolbar.appendChild(revokeButton);

  item.appendChild(toolbar);
  return item;
}

function createRoleListButton(
  document: Document,
  role: DatamixRoleDefinition,
  selectedRoleId: string | null,
) {
  const button = document.createElement("button");
  button.className =
    selectedRoleId === role.id
      ? "mini-list-item mini-list-item-stacked is-selected"
      : "mini-list-item mini-list-item-stacked";
  button.dataset.settingsRoleButton = "";
  button.dataset.settingsRoleId = role.id;
  button.type = "button";

  const content = document.createElement("div");
  content.className = "mini-list-content";

  const label = document.createElement("span");
  label.textContent = role.label;
  content.appendChild(label);

  const description = document.createElement("small");
  description.textContent = role.description;
  content.appendChild(description);
  button.appendChild(content);

  button.appendChild(
    createBadge(document, outlineBadgeClass, role.system ? "Built-in" : "Custom"),
  );

  return button;
}

function createField(
  document: Document,
  options: {
    dataset: string;
    label: string;
    tag?: "input" | "textarea";
    value: string;
    placeholder: string;
  },
) {
  const label = document.createElement("label");
  label.className = "field";

  const span = document.createElement("span");
  span.textContent = options.label;
  label.appendChild(span);

  if (options.tag === "textarea") {
    const textarea = document.createElement("textarea");
    textarea.dataset[options.dataset] = "";
    textarea.placeholder = options.placeholder;
    textarea.rows = 3;
    textarea.value = options.value;
    label.appendChild(textarea);
    return label;
  }

  const input = document.createElement("input");
  input.dataset[options.dataset] = "";
  input.placeholder = options.placeholder;
  input.type = "text";
  input.value = options.value;
  label.appendChild(input);
  return label;
}

function createRoleEditorForm(
  document: Document,
  rolesState: RolesState,
  canUpdateSettings: boolean,
) {
  const form = document.createElement("form");
  form.className = "generated-record-form";
  form.dataset.settingsRoleForm = "";

  const fieldset = document.createElement("fieldset");
  fieldset.className = "form-fieldset-reset";
  fieldset.disabled = !canUpdateSettings || rolesState.isSavingRole;
  fieldset.appendChild(
    createField(document, {
      dataset: "settingsRoleLabel",
      label: "Role label",
      placeholder: "Content manager",
      value: rolesState.roleDraft.label,
    }),
  );
  fieldset.appendChild(
    createField(document, {
      dataset: "settingsRoleId",
      label: "Role id",
      placeholder: "content_manager",
      value: rolesState.roleDraft.id,
    }),
  );
  fieldset.appendChild(
    createField(document, {
      dataset: "settingsRoleDescription",
      label: "Description",
      placeholder: "Manages content and media without user administration.",
      tag: "textarea",
      value: rolesState.roleDraft.description,
    }),
  );

  const permissionList = document.createElement("div");
  permissionList.className = "permission-section-list";

  for (const section of rolePermissionSections) {
    const box = document.createElement("div");
    box.className = "type-specific-box";

    const title = document.createElement("p");
    title.className = "section-title";
    title.textContent = section.resource.label;
    box.appendChild(title);

    const copy = document.createElement("p");
    copy.className = "section-copy";
    copy.textContent = section.resource.description;
    box.appendChild(copy);

    const grid = document.createElement("div");
    grid.className = "permission-grid";

    for (const permission of section.permissions) {
      const permissionLabel = document.createElement("label");
      permissionLabel.className = "permission-row";

      const checkbox = document.createElement("input");
      checkbox.checked = rolesState.roleDraft.permissions.includes(permission.key);
      checkbox.dataset.settingsRolePermission = "";
      checkbox.type = "checkbox";
      checkbox.value = permission.key;
      permissionLabel.appendChild(checkbox);

      const content = document.createElement("span");
      const permissionTitle = document.createElement("strong");
      permissionTitle.textContent = permission.label;
      content.appendChild(permissionTitle);
      const permissionDescription = document.createElement("small");
      permissionDescription.textContent = permission.description;
      content.appendChild(permissionDescription);
      permissionLabel.appendChild(content);
      grid.appendChild(permissionLabel);
    }

    box.appendChild(grid);
    permissionList.appendChild(box);
  }

  fieldset.appendChild(permissionList);
  form.appendChild(fieldset);

  if (rolesState.rolesMessage) {
    form.appendChild(
      createStateBox(document, {
        body: rolesState.rolesMessage,
        compact: true,
        title: rolesState.roleIssues.length > 0 ? "Role needs attention" : "Role saved",
        tone: rolesState.roleIssues.length > 0 ? "error" : "success",
      }),
    );
  }

  if (rolesState.roleIssues.length > 0) {
    const issues = document.createElement("ul");
    issues.className = "issue-list";

    for (const issue of rolesState.roleIssues) {
      const item = document.createElement("li");
      const path = document.createElement("strong");
      path.textContent = formatIssuePath(issue.path);
      item.appendChild(path);
      item.append(`: ${issue.message}`);
      issues.appendChild(item);
    }

    form.appendChild(issues);
  }

  const actions = document.createElement("div");
  actions.className = "actions";
  actions.appendChild(
    createButton(document, {
      className: buttonVariants(),
      disabled: !canUpdateSettings || rolesState.isSavingRole,
      text: rolesState.isSavingRole ? "Saving role" : "Save role",
      type: "submit",
    }),
  );
  const resetButton = createButton(document, {
    className: outlineButtonClass,
    disabled: !canUpdateSettings || rolesState.isSavingRole,
    text: "Reset draft",
  });
  resetButton.dataset.settingsRoleResetButton = "";
  actions.appendChild(resetButton);
  form.appendChild(actions);

  return form;
}

function renderRoleEditor(
  document: Document,
  editor: HTMLElement,
  options: {
    canUpdateSettings: boolean;
    rolesState: RolesState;
    selectedRole: DatamixRoleDefinition | null;
  },
) {
  clearChildren(editor);

  const eyebrow = document.createElement("p");
  eyebrow.className = "card-eyebrow";
  eyebrow.textContent = "Role editor";
  editor.appendChild(eyebrow);

  const title = document.createElement("h4");
  title.className = "section-title";
  const copy = document.createElement("p");
  copy.className = "section-copy";

  if (options.rolesState.isCreatingRole) {
    title.textContent = "Create custom role";
    copy.textContent =
      "Start from scratch or a built-in preset copy, then choose the permissions this role should carry.";
  } else if (options.selectedRole) {
    title.textContent = options.selectedRole.label;
    copy.textContent = options.selectedRole.description;
  } else {
    title.textContent = "Select a role";
    copy.textContent = "Choose a role from the list to inspect or edit it.";
  }

  editor.appendChild(title);
  editor.appendChild(copy);

  if (!options.rolesState.isCreatingRole && options.selectedRole?.system) {
    const stack = document.createElement("div");
    stack.className = "section-stack";
    stack.appendChild(
      createStateBox(document, {
        body: "Built-in roles are locked. Create a custom role to change permissions.",
        compact: true,
        title: "Built-in role",
      }),
    );

    if (options.canUpdateSettings) {
      const actions = document.createElement("div");
      actions.className = "actions";
      const copyButton = createButton(document, {
        className: buttonVariants(),
        text: "Create custom copy",
      });
      copyButton.dataset.settingsRoleCopyButton = "";
      copyButton.dataset.settingsRoleId = options.selectedRole.id;
      actions.appendChild(copyButton);
      stack.appendChild(actions);
    }

    editor.appendChild(stack);
    return;
  }

  if (
    options.canUpdateSettings ||
    (options.selectedRole && !options.selectedRole.system)
  ) {
    editor.appendChild(
      createRoleEditorForm(document, options.rolesState, options.canUpdateSettings),
    );
    return;
  }

  editor.appendChild(
    createStateBox(document, {
      body: "Select a role to inspect its permissions.",
      compact: true,
      title: "No role selected",
    }),
  );
}

export function SettingsInteractionsIsland({
  apiKeys: initialApiKeys,
  apiKeysLoadError: initialApiKeysLoadError,
  apiKeysLoaded: initialApiKeysLoaded,
  publicApiRuntime: initialPublicApiRuntime,
  roles: initialRoles,
  rolesLoadError: initialRolesLoadError,
  rolesLoaded: initialRolesLoaded,
  rootId,
  routeAccess,
  workspace,
}: SettingsInteractionsIslandProps) {
  const { permissions } = workspace;
  const reloadWorkspace = React.useCallback(async () => {
    window.location.reload();
  }, []);
  const apiKeysState = useAdminApiKeysState({
    initialApiKeys,
    initialApiKeysLoadError,
    initialApiKeysLoaded,
    initialPublicApiRuntime,
    permissions,
  });
  const rolesState = useAdminRolesState({
    currentRoleId: workspace.authorization.role.id,
    initialRoles,
    initialRolesLoadError,
    initialRolesLoaded,
    onCurrentRoleChanged: reloadWorkspace,
    permissions,
  });
  const {
    apiKeyDraft,
    apiKeys,
    apiKeysLoadError,
    apiKeysMessage,
    apiKeySecret,
    apiKeySecretMessage,
    copyApiKeySecret,
    createApiKey,
    hasLoadedApiKeys,
    isCreatingApiKey,
    isLoadingApiKeys,
    loadApiKeyData,
    publicApiRuntime,
    setApiKeyDraftField,
    setApiKeyField,
  } = apiKeysState;
  const {
    availableRoles,
    hasLoadedRoles,
    isCreatingRole,
    isLoadingRoles,
    loadAvailableRoles,
    rolesLoadError,
    saveRole,
    selectRole,
    toggleRolePermission,
    updateRoleDraftField,
  } = rolesState;
  const rolePreviewItems =
    availableRoles.length > 0 ? availableRoles : datamixRolePresets;
  const selectedRole = isCreatingRole
    ? null
    : availableRoles.find((availableRole) => availableRole.id === rolesState.selectedRoleId) ??
      null;
  const isInitialApiKeyLoad =
    permissions.canAccessSettingsWorkspace && !hasLoadedApiKeys && !apiKeysLoadError;
  const shouldShowApiKeyRuntimeLoading =
    isInitialApiKeyLoad && !publicApiRuntime;
  const shouldShowApiKeyLoading =
    isInitialApiKeyLoad || (isLoadingApiKeys && apiKeys.length === 0);
  const isInitialRoleLoad =
    permissions.canAccessSettingsWorkspace && !hasLoadedRoles && !rolesLoadError;
  const shouldShowRoleLoading =
    isInitialRoleLoad && availableRoles.length === 0;

  React.useEffect(() => {
    if (
      !routeAccess.isAllowed ||
      !permissions.canAccessSettingsWorkspace ||
      hasLoadedApiKeys ||
      isLoadingApiKeys
    ) {
      return;
    }

    void loadApiKeyData();
  }, [
    hasLoadedApiKeys,
    isLoadingApiKeys,
    loadApiKeyData,
    permissions.canAccessSettingsWorkspace,
    routeAccess.isAllowed,
  ]);

  React.useEffect(() => {
    if (
      !routeAccess.isAllowed ||
      !permissions.canAccessSettingsWorkspace ||
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
    permissions.canAccessSettingsWorkspace,
    routeAccess.isAllowed,
  ]);

  React.useEffect(() => {
    const root = document.getElementById(rootId);

    if (!root) {
      return;
    }

    const handleInput = (event: Event) => {
      const target = event.target as
        | (HTMLInputElement & {
            dataset: DOMStringMap;
          })
        | (HTMLTextAreaElement & {
            dataset: DOMStringMap;
          })
        | null;

      if (!target) {
        return;
      }

      if (target.matches("[data-settings-api-key-draft-label]")) {
        setApiKeyDraftField("label", target.value);
        return;
      }

      if (target.matches("[data-settings-api-key-label]")) {
        const apiKeyId = target.dataset.settingsApiKeyId;

        if (apiKeyId) {
          setApiKeyField(apiKeyId, "label", target.value);
        }

        return;
      }

      if (target.matches("[data-settings-role-label]")) {
        updateRoleDraftField("label", target.value);
        return;
      }

      if (target.matches("[data-settings-role-id]")) {
        updateRoleDraftField("id", target.value);
        return;
      }

      if (target.matches("[data-settings-role-description]")) {
        updateRoleDraftField("description", target.value);
      }
    };

    const handleChange = (event: Event) => {
      const target = event.target as HTMLInputElement | HTMLSelectElement | null;

      if (!target) {
        return;
      }

      if (target.matches("[data-settings-api-key-draft-access]")) {
        setApiKeyDraftField("accessLevel", target.value);
        return;
      }

      if (target.matches("[data-settings-api-key-access]")) {
        const apiKeyId = target.dataset.settingsApiKeyId;

        if (apiKeyId) {
          setApiKeyField(apiKeyId, "accessLevel", target.value);
        }

        return;
      }

      if (target.matches("[data-settings-role-permission]")) {
        toggleRolePermission(target.value as DatamixPermissionKey);
      }
    };

    const handleSubmit = (event: SubmitEvent) => {
      const target = event.target as HTMLFormElement | null;

      if (target?.matches("[data-settings-api-key-create-form]")) {
        event.preventDefault();
        void createApiKey();
        return;
      }

      if (target?.matches("[data-settings-role-form]")) {
        event.preventDefault();
        void saveRole();
      }
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
    createApiKey,
    rootId,
    saveRole,
    setApiKeyDraftField,
    setApiKeyField,
    toggleRolePermission,
    updateRoleDraftField,
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

      if (target.closest("[data-settings-api-key-secret-copy]")) {
        event.preventDefault();
        void copyApiKeySecret();
        return;
      }

      const saveButton = target.closest("[data-settings-api-key-save-button]");
      const saveApiKeyId = saveButton?.dataset.settingsApiKeyId;

      if (saveApiKeyId) {
        const apiKey = apiKeys.find((currentApiKey) => currentApiKey.id === saveApiKeyId);

        if (apiKey) {
          event.preventDefault();
          void apiKeysState.saveApiKey(apiKey);
        }

        return;
      }

      const revokeButton = target.closest("[data-settings-api-key-revoke-button]");
      const revokeApiKeyId = revokeButton?.dataset.settingsApiKeyId;

      if (revokeApiKeyId) {
        const apiKey = apiKeys.find(
          (currentApiKey) => currentApiKey.id === revokeApiKeyId,
        );

        if (apiKey) {
          event.preventDefault();
          void apiKeysState.revokeApiKey(apiKey);
        }

        return;
      }

      if (target.closest("[data-settings-create-role-button]")) {
        event.preventDefault();
        rolesState.createRole();
        return;
      }

      const roleButton = target.closest("[data-settings-role-button]");
      const roleButtonId = roleButton?.dataset.settingsRoleId;

      if (roleButtonId) {
        const role = rolePreviewItems.find(
          (availableRole) => availableRole.id === roleButtonId,
        );

        if (role) {
          event.preventDefault();
          selectRole(role);
        }

        return;
      }

      const copyRoleButton = target.closest("[data-settings-role-copy-button]");
      const copyRoleId = copyRoleButton?.dataset.settingsRoleId;

      if (copyRoleId) {
        const role = rolePreviewItems.find(
          (availableRole) => availableRole.id === copyRoleId,
        );

        if (role) {
          event.preventDefault();
          rolesState.createRole(role);
        }

        return;
      }

      if (target.closest("[data-settings-role-reset-button]")) {
        event.preventDefault();
        rolesState.resetRoleDraft();
      }
    };

    root.addEventListener("click", handleClick);

    return () => {
      root.removeEventListener("click", handleClick);
    };
  }, [
    apiKeys,
    apiKeysState,
    copyApiKeySecret,
    rolePreviewItems,
    rolesState,
    rootId,
    selectRole,
  ]);

  React.useEffect(() => {
    const root = document.getElementById(rootId);

    if (!root) {
      return;
    }

    root.dataset.settingsHydrated = "true";

    const runtimeLoading = queryElement<HTMLElement>(
      root,
      "[data-settings-api-runtime-loading]",
    );
    setHidden(runtimeLoading, !shouldShowApiKeyRuntimeLoading);

    const runtimeContainer = queryElement<HTMLElement>(
      root,
      "[data-settings-api-runtime]",
    );

    if (runtimeContainer) {
      clearChildren(runtimeContainer);

      if (publicApiRuntime) {
        runtimeContainer.appendChild(
          createRuntimeDetailList(document, publicApiRuntime),
        );
      }
    }

    setHidden(runtimeContainer, !publicApiRuntime);
    setText(
      queryElement<HTMLElement>(root, "[data-settings-api-keys-message]"),
      apiKeysMessage ?? "",
    );
    setHidden(
      queryElement<HTMLElement>(root, "[data-settings-api-keys-message]"),
      !apiKeysMessage,
    );
    setText(
      queryElement<HTMLElement>(root, "[data-settings-api-keys-error-message]"),
      apiKeysLoadError ?? "",
    );
    setHidden(
      queryElement<HTMLElement>(root, "[data-settings-api-keys-error-message]"),
      !apiKeysLoadError,
    );

    const secretBox = queryElement<HTMLElement>(
      root,
      "[data-settings-api-key-secret-box]",
    );
    const secretPreview = queryElement<HTMLElement>(
      root,
      "[data-settings-api-key-secret]",
    );
    const secretMessage = queryElement<HTMLElement>(
      root,
      "[data-settings-api-key-secret-message]",
    );
    setHidden(secretBox, !apiKeySecret);
    setText(secretPreview, apiKeySecret ?? "");
    setText(secretMessage, apiKeySecretMessage ?? "");
    setHidden(secretMessage, !apiKeySecretMessage);

    const draftLabel = queryElement<HTMLInputElement>(
      root,
      "[data-settings-api-key-draft-label]",
    );
    const draftAccess = queryElement<HTMLSelectElement>(
      root,
      "[data-settings-api-key-draft-access]",
    );
    const createButton = queryElement<HTMLButtonElement>(
      root,
      "[data-settings-api-key-create-button]",
    );

    setInputValue(draftLabel, apiKeyDraft.label);
    setInputValue(draftAccess, apiKeyDraft.accessLevel);

    if (draftLabel) {
      draftLabel.disabled = isCreatingApiKey;
    }

    if (draftAccess) {
      draftAccess.disabled = isCreatingApiKey;
    }

    if (createButton) {
      createButton.disabled = isCreatingApiKey;
    }

    setText(
      queryElement<HTMLElement>(root, "[data-settings-api-key-create-label]"),
      isCreatingApiKey ? "Creating" : "Create key",
    );

    setHidden(
      queryElement<HTMLElement>(root, "[data-settings-api-keys-loading]"),
      !shouldShowApiKeyLoading,
    );
    setHidden(
      queryElement<HTMLElement>(root, "[data-settings-api-keys-empty]"),
      shouldShowApiKeyLoading || apiKeys.length > 0,
    );

    const apiKeyList = queryElement<HTMLElement>(
      root,
      "[data-settings-api-key-list]",
    );
    const shouldShowApiKeyList = !shouldShowApiKeyLoading && apiKeys.length > 0;
    setHidden(apiKeyList, !shouldShowApiKeyList);

    if (apiKeyList) {
      clearChildren(apiKeyList);

      for (const apiKey of apiKeys) {
        apiKeyList.appendChild(
          createApiKeyItem(document, apiKey, {
            apiKeysState,
            canUpdateSettings: permissions.canUpdateSettings,
          }),
        );
      }
    }

    setHidden(
      queryElement<HTMLElement>(root, "[data-settings-roles-loading]"),
      !shouldShowRoleLoading,
    );
    setHidden(
      queryElement<HTMLElement>(root, "[data-settings-roles-error]"),
      shouldShowRoleLoading || !rolesLoadError || rolePreviewItems.length > 0,
    );
    setStateBoxBody(root, "[data-settings-roles-error]", rolesLoadError ?? "");

    const roleList = queryElement<HTMLElement>(root, "[data-settings-role-list]");
    const shouldShowRoleList =
      !shouldShowRoleLoading && (!rolesLoadError || rolePreviewItems.length > 0);
    setHidden(roleList, !shouldShowRoleList);

    if (roleList) {
      clearChildren(roleList);

      for (const role of rolePreviewItems) {
        roleList.appendChild(
          createRoleListButton(document, role, rolesState.selectedRoleId),
        );
      }
    }

    setHidden(
      queryElement<HTMLElement>(root, "[data-settings-roles-stale-error]"),
      shouldShowRoleLoading || !rolesLoadError || rolePreviewItems.length === 0,
    );
    setStateBoxBody(root, "[data-settings-roles-stale-error]", rolesLoadError ?? "");

    const roleEditor = queryElement<HTMLElement>(
      root,
      "[data-settings-role-editor]",
    );

    if (roleEditor) {
      renderRoleEditor(document, roleEditor, {
        canUpdateSettings: permissions.canUpdateSettings,
        rolesState,
        selectedRole,
      });
    }
  }, [
    apiKeyDraft.accessLevel,
    apiKeyDraft.label,
    apiKeySecret,
    apiKeySecretMessage,
    apiKeys,
    apiKeysLoadError,
    apiKeysMessage,
    apiKeysState,
    isCreatingApiKey,
    permissions.canUpdateSettings,
    publicApiRuntime,
    rolePreviewItems,
    rolesLoadError,
    rolesState,
    rootId,
    selectedRole,
    shouldShowApiKeyLoading,
    shouldShowApiKeyRuntimeLoading,
    shouldShowRoleLoading,
  ]);

  return null;
}
