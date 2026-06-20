"use client";

import {
  datamixApiKeyAccessLevels,
  datamixRolePresets,
  type DatamixApiKeySummary,
  type DatamixRoleDefinition,
} from "@datamix/core";
import { Copy, KeyRound, Plus, Save, Shield, Trash2 } from "lucide-react";
import type { SubmitEvent } from "react";
import * as React from "react";

import {
  AdminDetailList,
  AdminPageHeader,
  AdminSectionCard,
} from "../_components/admin-design";
import {
  AdminDetailListSkeleton,
  AdminLoadingReserve,
  AdminMiniListSkeleton,
  useDelayedLoadingIndicator,
} from "../_components/admin-skeleton";
import { AdminStateBox } from "../_components/admin-state";
import {
  createApiKeyDraftFromApiKey,
  formatApiKeyAccessLevel,
  formatAuthProviderStatus,
  formatPublicApiAccessMode,
} from "../_lib/api-key-drafts";
import { formatRecordTimestamp } from "../_lib/media-formatting";
import { formatIssuePath } from "../_lib/schema-drafts";
import { rolePermissionSections } from "../_lib/role-drafts";
import { useAdminApiKeysState } from "../_state/admin-api-keys-state";
import { createAdminAccountUserFromWorkspaceAccount } from "../_state/admin-account-state";
import { useAdminRolesState } from "../_state/admin-roles-state";
import type { AdminWorkspaceRouteAccessState } from "../_workspace/admin-permissions";
import type { AdminWorkspaceProps } from "../_workspace/admin-workspace-props";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminPublicEnv } from "@/lib/runtime";
import { useSetupStatus, type SetupStatusState } from "@/lib/setup";
import type { PublicApiRuntimeSummary } from "@/lib/api-keys";

type SettingsApiKeysContentProps = {
  apiKeys?: DatamixApiKeySummary[];
  apiKeysLoadError?: string | null;
  apiKeysLoaded?: boolean;
  publicApiRuntime?: PublicApiRuntimeSummary | null;
  roles?: DatamixRoleDefinition[];
  rolesLoadError?: string | null;
  rolesLoaded?: boolean;
  routeAccess: AdminWorkspaceRouteAccessState;
  setupStatus?: SetupStatusState;
  workspace: AdminWorkspaceProps;
};

type SettingsApiKeysRouteProps = {
  apiKeys?: DatamixApiKeySummary[];
  apiKeysLoadError?: string | null;
  apiKeysLoaded?: boolean;
  publicApiRuntime?: PublicApiRuntimeSummary | null;
  roles?: DatamixRoleDefinition[];
  rolesLoadError?: string | null;
  rolesLoaded?: boolean;
  routeAccess: AdminWorkspaceRouteAccessState;
  setupStatus?: SetupStatusState;
  workspace: AdminWorkspaceProps;
};

type SettingsApiKeysState = ReturnType<typeof useAdminApiKeysState>;

function SettingsApiKeyRow({
  apiKey,
  apiKeysState,
  permissions,
}: {
  apiKey: DatamixApiKeySummary;
  apiKeysState: SettingsApiKeysState;
  permissions: AdminWorkspaceProps["permissions"];
}) {
  const {
    apiKeyDrafts,
    revokingApiKeyId,
    saveApiKey,
    savingApiKeyId,
    setApiKeyField,
    revokeApiKey,
  } = apiKeysState;
  const draft = apiKeyDrafts[apiKey.id] ?? createApiKeyDraftFromApiKey(apiKey);
  const isSavingThisKey = savingApiKeyId === apiKey.id;
  const isRevokingThisKey = revokingApiKeyId === apiKey.id;
  const isDisabled = Boolean(apiKey.revokedAt) || isSavingThisKey || isRevokingThisKey;
  const isUnchanged =
    draft.label === apiKey.label && draft.accessLevel === apiKey.accessLevel;

  return (
    <div className="mini-list-item mini-list-item-stacked">
      <div className="mini-list-content">
        <strong>{apiKey.label}</strong>
        <small>{apiKey.secretPreview}</small>
      </div>

      <div className="status-row status-row-compact">
        <Badge variant="outline">{formatApiKeyAccessLevel(apiKey.accessLevel)}</Badge>
        <Badge variant={apiKey.revokedAt ? "destructive" : "secondary"}>
          {apiKey.revokedAt ? "Revoked" : "Active"}
        </Badge>
        <Badge variant="outline">
          {apiKey.lastUsedAt
            ? `Last used ${formatRecordTimestamp(apiKey.lastUsedAt)}`
            : "Never used"}
        </Badge>
      </div>

      <p className="helper-text">
        Created {formatRecordTimestamp(apiKey.createdAt)}
        {apiKey.revokedAt
          ? ` / Revoked ${formatRecordTimestamp(apiKey.revokedAt)}`
          : ""}
      </p>

      {permissions.canUpdateSettings ? (
        <div className="permission-toolbar">
          <label className="field field-inline">
            <span>Label</span>
            <input
              disabled={isDisabled}
              onChange={(event) =>
                setApiKeyField(apiKey.id, "label", event.target.value)
              }
              type="text"
              value={draft.label}
            />
          </label>
          <label className="field field-inline">
            <span>Access</span>
            <select
              disabled={isDisabled}
              onChange={(event) =>
                setApiKeyField(apiKey.id, "accessLevel", event.target.value)
              }
              value={draft.accessLevel}
            >
              {datamixApiKeyAccessLevels.map((accessLevel) => (
                <option key={accessLevel} value={accessLevel}>
                  {formatApiKeyAccessLevel(accessLevel)}
                </option>
              ))}
            </select>
          </label>
          <Button
            disabled={isDisabled || isUnchanged}
            onClick={() => void saveApiKey(apiKey)}
            size="sm"
            type="button"
          >
            <Save />
            {isSavingThisKey ? "Saving" : "Save"}
          </Button>
          <Button
            disabled={isDisabled}
            onClick={() => void revokeApiKey(apiKey)}
            size="sm"
            type="button"
            variant="destructive"
          >
            <Trash2 />
            {isRevokingThisKey ? "Revoking" : "Revoke"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function SettingsApiKeysContent({
  apiKeys: initialApiKeys,
  apiKeysLoadError: initialApiKeysLoadError,
  apiKeysLoaded: initialApiKeysLoaded,
  publicApiRuntime: initialPublicApiRuntime,
  roles: initialRoles,
  rolesLoadError: initialRolesLoadError,
  rolesLoaded: initialRolesLoaded,
  routeAccess,
  setupStatus: initialSetupStatus,
  workspace,
}: SettingsApiKeysContentProps) {
  const setupStatus = useSetupStatus(initialSetupStatus);
  const access = routeAccess;
  const { permissions, role } = workspace;
  const reloadWorkspace = React.useCallback(async () => {
    window.location.reload();
  }, []);
  const user = React.useMemo(
    () => createAdminAccountUserFromWorkspaceAccount(workspace.account),
    [
      workspace.account.email,
      workspace.account.id,
      workspace.account.image,
      workspace.account.initials,
      workspace.account.name,
    ],
  );
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
    availableRoles,
    copyApiKeySecret,
    createApiKey,
    createRole,
    hasLoadedApiKeys,
    hasLoadedRoles,
    isCreatingApiKey,
    isCreatingRole,
    isLoadingApiKeys,
    isLoadingRoles,
    isSavingRole,
    loadApiKeyData,
    loadAvailableRoles,
    publicApiRuntime,
    resetRoleDraft,
    roleDraft,
    roleIssues,
    rolesLoadError,
    rolesMessage,
    saveRole,
    selectedRoleId,
    selectRole,
    setApiKeyDraftField,
    toggleRolePermission,
    updateRoleDraftField,
  } = {
    ...apiKeysState,
    ...rolesState,
  };
  const rolePreviewItems = availableRoles.length > 0 ? availableRoles : datamixRolePresets;
  const selectedRole = isCreatingRole
    ? null
    : availableRoles.find((availableRole) => availableRole.id === selectedRoleId) ?? null;
  const isInitialApiKeyLoad =
    permissions.canAccessSettingsWorkspace && !hasLoadedApiKeys && !apiKeysLoadError;
  const isInitialRoleLoad =
    permissions.canAccessSettingsWorkspace && !hasLoadedRoles && !rolesLoadError;
  const shouldShowOAuthSkeleton = setupStatus.isPending;
  const shouldShowApiKeyRuntimeSkeleton = isInitialApiKeyLoad && !publicApiRuntime;
  const shouldShowApiKeySkeleton =
    isInitialApiKeyLoad || (isLoadingApiKeys && apiKeys.length === 0);
  const shouldShowRoleSkeleton =
    isInitialRoleLoad && availableRoles.length === 0;
  const shouldShowDelayedOAuthSkeleton =
    useDelayedLoadingIndicator(shouldShowOAuthSkeleton);
  const shouldShowDelayedApiKeyRuntimeSkeleton = useDelayedLoadingIndicator(
    shouldShowApiKeyRuntimeSkeleton,
  );
  const shouldShowDelayedApiKeySkeleton =
    useDelayedLoadingIndicator(shouldShowApiKeySkeleton);
  const shouldShowDelayedRoleSkeleton =
    useDelayedLoadingIndicator(shouldShowRoleSkeleton);

  React.useEffect(() => {
    if (
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
  ]);

  React.useEffect(() => {
    if (
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
  ]);

  const handleCreateApiKey = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    void createApiKey();
  };

  const handleSaveRole = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    void saveRole();
  };

  return (
    <>
      <AdminPageHeader title="Settings" />

        {!access.isAllowed ? (
          <AdminStateBox
            body={`Your ${role.label} role cannot access settings yet.`}
            title="Settings are restricted"
            tone="warning"
          />
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <AdminSectionCard title="Session details">
                <AdminDetailList
                  items={[
                    { label: "Signed in as", value: user.displayName },
                    { label: "Current role", value: role.label },
                    { label: "Email", value: user.email ?? "Unknown" },
                    { label: "App environment", value: adminPublicEnv.NEXT_PUBLIC_APP_ENV },
                    { label: "App", value: "Admin and API routes share this origin" },
                    { label: "Auth", value: "Session cookie active" },
                  ]}
                />
              </AdminSectionCard>

              <AdminSectionCard
                description="Enable GitHub or Google for invited users through environment configuration."
                title="Optional OAuth sign-in"
              >
                {shouldShowOAuthSkeleton ? (
                  shouldShowDelayedOAuthSkeleton ? (
                    <AdminMiniListSkeleton rows={2} />
                  ) : (
                    <AdminLoadingReserve className="min-h-[126px]" />
                  )
                ) : setupStatus.oauth ? (
                  <div className="mini-list">
                    {setupStatus.oauth.providers.map((provider) => (
                      <div
                        className="mini-list-item mini-list-item-stacked"
                        key={provider.id}
                      >
                        <div className="mini-list-content">
                          <strong>{provider.label}</strong>
                          <small>{provider.message}</small>
                        </div>
                        <Badge variant="outline">
                          {formatAuthProviderStatus(provider.status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <AdminStateBox
                    body={
                      setupStatus.errorMessage ??
                      "OAuth provider status is unavailable right now."
                    }
                    compact
                    title="OAuth status unavailable"
                    tone={setupStatus.errorMessage ? "warning" : "neutral"}
                  />
                )}
              </AdminSectionCard>
            </div>

            <AdminSectionCard
              description="Create read-only or write-capable keys. Raw secrets are shown once."
              title="Public API keys"
            >
              {shouldShowApiKeyRuntimeSkeleton ? (
                shouldShowDelayedApiKeyRuntimeSkeleton ? (
                  <AdminDetailListSkeleton className="mb-4" />
                ) : (
                  <AdminLoadingReserve className="mb-4 min-h-[76px]" />
                )
              ) : publicApiRuntime ? (
                <AdminDetailList
                  className="mb-4"
                  items={[
                    {
                      label: "Public read access",
                      value: formatPublicApiAccessMode(publicApiRuntime.readAccess),
                    },
                    {
                      label: "Public write access",
                      value: formatPublicApiAccessMode(publicApiRuntime.writeAccess),
                    },
                  ]}
                />
              ) : null}

              {apiKeysMessage ? <p className="form-success">{apiKeysMessage}</p> : null}
              {apiKeysLoadError ? <p className="form-error">{apiKeysLoadError}</p> : null}

              {apiKeySecret ? (
                <div className="type-specific-box mb-4">
                  <p className="section-title">Copy this secret now</p>
                  <p className="section-copy">
                    This raw API key will not be shown again.
                  </p>
                  <code className="record-json-preview">{apiKeySecret}</code>
                  {apiKeySecretMessage ? (
                    <p className="helper-text">{apiKeySecretMessage}</p>
                  ) : null}
                  <div className="actions">
                    <Button
                      onClick={() => void copyApiKeySecret()}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Copy />
                      Copy secret
                    </Button>
                  </div>
                </div>
              ) : null}

              {permissions.canUpdateSettings ? (
                <form className="auth-form mb-4" onSubmit={handleCreateApiKey}>
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
                    <label className="field">
                      <span>Key label</span>
                      <input
                        disabled={isCreatingApiKey}
                        onChange={(event) =>
                          setApiKeyDraftField("label", event.target.value)
                        }
                        placeholder="Production website"
                        type="text"
                        value={apiKeyDraft.label}
                      />
                    </label>
                    <label className="field">
                      <span>Access level</span>
                      <select
                        disabled={isCreatingApiKey}
                        onChange={(event) =>
                          setApiKeyDraftField("accessLevel", event.target.value)
                        }
                        value={apiKeyDraft.accessLevel}
                      >
                        {datamixApiKeyAccessLevels.map((accessLevel) => (
                          <option key={accessLevel} value={accessLevel}>
                            {formatApiKeyAccessLevel(accessLevel)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Button disabled={isCreatingApiKey} type="submit">
                      <KeyRound />
                      {isCreatingApiKey ? "Creating" : "Create key"}
                    </Button>
                  </div>
                </form>
              ) : (
                <AdminStateBox
                  body={`Your ${role.label} role can inspect API keys, but it cannot create or revoke them.`}
                  compact
                  title="API key writes are restricted"
                  tone="warning"
                />
              )}

              {shouldShowApiKeySkeleton ? (
                shouldShowDelayedApiKeySkeleton ? (
                  <AdminMiniListSkeleton rows={3} />
                ) : (
                  <AdminLoadingReserve className="min-h-[190px]" />
                )
              ) : apiKeys.length === 0 ? (
                <AdminStateBox
                  body="No managed API keys have been created yet."
                  compact
                  title="No managed keys"
                />
              ) : (
                <div className="mini-list">
                  {apiKeys.map((apiKey) => (
                    <SettingsApiKeyRow
                      apiKey={apiKey}
                      apiKeysState={apiKeysState}
                      key={apiKey.id}
                      permissions={permissions}
                    />
                  ))}
                </div>
              )}
            </AdminSectionCard>

            <AdminSectionCard
              action={
                permissions.canUpdateSettings ? (
                  <Button onClick={() => createRole()} size="sm" type="button">
                    <Plus />
                    New custom role
                  </Button>
                ) : null
              }
              description="Select a role to inspect it, or create a custom role for this instance."
              title="Roles"
            >
              <div className="record-browser">
                <div className="record-browser-list">
                  {shouldShowRoleSkeleton ? (
                    shouldShowDelayedRoleSkeleton ? (
                      <AdminMiniListSkeleton rows={4} />
                    ) : (
                      <AdminLoadingReserve className="min-h-[252px]" />
                    )
                  ) : rolesLoadError && availableRoles.length === 0 ? (
                    <AdminStateBox
                      body={rolesLoadError}
                      compact
                      title="Role list is unavailable"
                      tone="error"
                    />
                  ) : (
                    <div className="mini-list">
                      {rolePreviewItems.map((availableRole) => (
                        <button
                          className={
                            !isCreatingRole && selectedRoleId === availableRole.id
                              ? "mini-list-item mini-list-item-stacked is-selected"
                              : "mini-list-item mini-list-item-stacked"
                          }
                          key={availableRole.id}
                          onClick={() => selectRole(availableRole)}
                          type="button"
                        >
                          <div className="mini-list-content">
                            <span>{availableRole.label}</span>
                            <small>{availableRole.description}</small>
                          </div>
                          <Badge variant="outline">
                            {availableRole.system ? "Built-in" : "Custom"}
                          </Badge>
                        </button>
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
                </div>

                <aside className="generated-record-preview">
                  <p className="card-eyebrow">Role editor</p>
                  {isCreatingRole ? (
                    <>
                      <h4 className="section-title">Create custom role</h4>
                      <p className="section-copy">
                        Start from scratch or a built-in preset copy, then choose the
                        permissions this role should carry.
                      </p>
                    </>
                  ) : selectedRole ? (
                    <>
                      <h4 className="section-title">{selectedRole.label}</h4>
                      <p className="section-copy">{selectedRole.description}</p>
                    </>
                  ) : (
                    <>
                      <h4 className="section-title">Select a role</h4>
                      <p className="section-copy">
                        Choose a role from the list to inspect or edit it.
                      </p>
                    </>
                  )}

                  {!isCreatingRole && selectedRole?.system ? (
                    <div className="section-stack">
                      <AdminStateBox
                        body="Built-in roles are locked. Create a custom role to change permissions."
                        compact
                        title="Built-in role"
                      />
                      {permissions.canUpdateSettings ? (
                        <div className="actions">
                          <Button onClick={() => createRole(selectedRole)} type="button">
                            <Shield />
                            Create custom copy
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ) : permissions.canUpdateSettings || (selectedRole && !selectedRole.system) ? (
                    <form className="generated-record-form" onSubmit={handleSaveRole}>
                      <fieldset
                        className="form-fieldset-reset"
                        disabled={!permissions.canUpdateSettings || isSavingRole}
                      >
                        <label className="field">
                          <span>Role label</span>
                          <input
                            onChange={(event) =>
                              updateRoleDraftField("label", event.target.value)
                            }
                            placeholder="Content manager"
                            type="text"
                            value={roleDraft.label}
                          />
                        </label>
                        <label className="field">
                          <span>Role id</span>
                          <input
                            onChange={(event) =>
                              updateRoleDraftField("id", event.target.value)
                            }
                            placeholder="content_manager"
                            type="text"
                            value={roleDraft.id}
                          />
                        </label>
                        <label className="field">
                          <span>Description</span>
                          <textarea
                            onChange={(event) =>
                              updateRoleDraftField("description", event.target.value)
                            }
                            placeholder="Manages content and media without user administration."
                            rows={3}
                            value={roleDraft.description}
                          />
                        </label>

                        <div className="permission-section-list">
                          {rolePermissionSections.map((section) => (
                            <div className="type-specific-box" key={section.resource.id}>
                              <p className="section-title">{section.resource.label}</p>
                              <p className="section-copy">{section.resource.description}</p>
                              <div className="permission-grid">
                                {section.permissions.map((permission) => (
                                  <label className="permission-row" key={permission.key}>
                                    <input
                                      checked={roleDraft.permissions.includes(permission.key)}
                                      onChange={() => toggleRolePermission(permission.key)}
                                      type="checkbox"
                                    />
                                    <span>
                                      <strong>{permission.label}</strong>
                                      <small>{permission.description}</small>
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </fieldset>

                      {rolesMessage ? (
                        <AdminStateBox
                          body={rolesMessage}
                          compact
                          title={roleIssues.length > 0 ? "Role needs attention" : "Role saved"}
                          tone={roleIssues.length > 0 ? "error" : "success"}
                        />
                      ) : null}
                      {roleIssues.length > 0 ? (
                        <ul className="issue-list">
                          {roleIssues.map((issue) => (
                            <li key={`${issue.path}-${issue.message}`}>
                              <strong>{formatIssuePath(issue.path)}</strong>: {issue.message}
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      <div className="actions">
                        <Button
                          disabled={!permissions.canUpdateSettings || isSavingRole}
                          type="submit"
                        >
                          <Save />
                          {isSavingRole ? "Saving role" : "Save role"}
                        </Button>
                        <Button
                          disabled={!permissions.canUpdateSettings || isSavingRole}
                          onClick={resetRoleDraft}
                          type="button"
                          variant="outline"
                        >
                          Reset draft
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <AdminStateBox
                      body="Select a role to inspect its permissions."
                      compact
                      title="No role selected"
                    />
                  )}
                </aside>
              </div>
            </AdminSectionCard>
          </>
        )}
    </>
  );
}

export function SettingsApiKeysRoute({
  routeAccess,
  ...props
}: SettingsApiKeysRouteProps) {
  return <SettingsApiKeysContent routeAccess={routeAccess} {...props} />;
}
