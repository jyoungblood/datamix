import {
  datamixPermissionResourceDefinitions,
  listDatamixPermissionsByResource,
  type DatamixPermissionKey,
  type DatamixRoleDefinition,
} from "@datamix/core";

export type RoleDraft = {
  description: string;
  id: string;
  label: string;
  permissions: DatamixPermissionKey[];
};

export const rolePermissionSections = datamixPermissionResourceDefinitions.map((resource) => ({
  permissions: listDatamixPermissionsByResource(resource.id),
  resource,
}));

export function createRoleIdSuggestion(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "_")
    .replaceAll(/_+/g, "_")
    .replaceAll(/^_+|_+$/g, "")
    .replaceAll(/^[^a-z]+/, "");
}

export function createRoleDraftFromRole(role: DatamixRoleDefinition): RoleDraft {
  return {
    description: role.description,
    id: role.id,
    label: role.label,
    permissions: [...role.permissions],
  };
}

export function createEmptyRoleDraft(sourceRole?: DatamixRoleDefinition): RoleDraft {
  if (!sourceRole) {
    return {
      description: "",
      id: "",
      label: "",
      permissions: [],
    };
  }

  const nextLabel = sourceRole.system
    ? `${sourceRole.label} copy`
    : sourceRole.label;
  const suggestedId = createRoleIdSuggestion(nextLabel);

  return {
    description: sourceRole.description,
    id: suggestedId === sourceRole.id ? `${suggestedId}_custom` : suggestedId,
    label: nextLabel,
    permissions: [...sourceRole.permissions],
  };
}

export function resolveRoleLabel(
  roles: readonly DatamixRoleDefinition[],
  roleId: string | null,
) {
  if (!roleId) {
    return "Unknown role";
  }

  return roles.find((role) => role.id === roleId)?.label ?? roleId;
}
