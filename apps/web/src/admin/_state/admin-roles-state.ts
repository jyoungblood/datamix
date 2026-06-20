"use client";

import type {
  DatamixPermissionKey,
  DatamixRoleDefinition,
  DatamixSchemaValidationIssue,
} from "@datamix/core";
import { datamixRolePresets } from "@datamix/core";
import * as React from "react";

import {
  createEmptyRoleDraft,
  createRoleDraftFromRole,
  createRoleIdSuggestion,
  type RoleDraft,
} from "../_lib/role-drafts";
import type { AdminWorkspacePermissions } from "../_workspace/admin-permissions";

import {
  listRoles,
  RoleRequestError,
  saveRole as saveRoleRequest,
} from "@/lib/roles";

type AdminRolesStateOptions = {
  currentRoleId: string | null;
  onCurrentRoleChanged?: () => Promise<void>;
  permissions: Pick<AdminWorkspacePermissions, "canUpdateSettings">;
};

export function useAdminRolesState({
  currentRoleId,
  onCurrentRoleChanged,
  permissions,
}: AdminRolesStateOptions) {
  const rolesLoadRequestId = React.useRef(0);
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

  const selectRole = React.useCallback((role: DatamixRoleDefinition) => {
    setIsCreatingRole(false);
    setSelectedRoleId(role.id);
    setRoleDraft(createRoleDraftFromRole(role));
    setRoleIssues([]);
    setRolesMessage(null);
  }, []);

  const createRole = React.useCallback(
    (sourceRole?: DatamixRoleDefinition) => {
      if (!permissions.canUpdateSettings) {
        return;
      }

      setIsCreatingRole(true);
      setRoleDraft(createEmptyRoleDraft(sourceRole));
      setRoleIssues([]);
      setRolesMessage(null);
    },
    [permissions.canUpdateSettings],
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
    if (!permissions.canUpdateSettings) {
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

      if (currentRoleId === result.role.id) {
        await onCurrentRoleChanged?.();
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
    currentRoleId,
    loadAvailableRoles,
    onCurrentRoleChanged,
    permissions.canUpdateSettings,
    roleDraft,
  ]);

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

  return {
    availableRoles,
    createRole,
    hasLoadedRoles,
    isCreatingRole,
    isLoadingRoles,
    isSavingRole,
    loadAvailableRoles,
    resetRoleDraft,
    resetRoleWorkspace,
    roleDraft,
    roleIssues,
    rolesLoadError,
    rolesMessage,
    saveRole,
    selectedRoleId,
    selectRole,
    toggleRolePermission,
    updateRoleDraftField,
  };
}
