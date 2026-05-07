export const datamixPermissionResources = [
  "collections",
  "records",
  "media",
  "users",
  "settings",
] as const;

export type DatamixPermissionResource = (typeof datamixPermissionResources)[number];

export type DatamixPermissionResourceDefinition = {
  id: DatamixPermissionResource;
  label: string;
  description: string;
};

export const datamixPermissionResourceDefinitions = [
  {
    id: "collections",
    label: "Collections",
    description: "Collection schemas, field definitions, and generated editor structure.",
  },
  {
    id: "records",
    label: "Records",
    description: "Content entries created from saved collection definitions.",
  },
  {
    id: "media",
    label: "Media",
    description: "Shared library assets stored in R2 and served through Worker routes.",
  },
  {
    id: "users",
    label: "Users",
    description: "People who can sign in to the Datamix admin.",
  },
  {
    id: "settings",
    label: "Settings",
    description: "Instance-wide configuration, including future role and integration controls.",
  },
] as const satisfies readonly DatamixPermissionResourceDefinition[];

export type DatamixPermissionAction =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "upload"
  | "invite";

export type DatamixPermissionKey =
  | "collections.read"
  | "collections.create"
  | "collections.update"
  | "collections.delete"
  | "records.read"
  | "records.create"
  | "records.update"
  | "records.delete"
  | "media.read"
  | "media.upload"
  | "media.update"
  | "media.delete"
  | "users.read"
  | "users.invite"
  | "users.update"
  | "users.delete"
  | "settings.read"
  | "settings.update";

export type DatamixPermissionDefinition = {
  key: DatamixPermissionKey;
  resource: DatamixPermissionResource;
  action: DatamixPermissionAction;
  label: string;
  description: string;
};

export const datamixPermissionDefinitions = [
  {
    key: "collections.read",
    resource: "collections",
    action: "read",
    label: "View collections",
    description: "See collection schemas, field ordering, and generated editor structure.",
  },
  {
    key: "collections.create",
    resource: "collections",
    action: "create",
    label: "Create collections",
    description: "Create new collection definitions and their backing storage plan.",
  },
  {
    key: "collections.update",
    resource: "collections",
    action: "update",
    label: "Edit collections",
    description: "Change collection labels, descriptions, fields, and field ordering.",
  },
  {
    key: "collections.delete",
    resource: "collections",
    action: "delete",
    label: "Delete collections",
    description: "Remove collection definitions and their stored content structure.",
  },
  {
    key: "records.read",
    resource: "records",
    action: "read",
    label: "View records",
    description: "Browse and inspect records in the admin and future protected APIs.",
  },
  {
    key: "records.create",
    resource: "records",
    action: "create",
    label: "Create records",
    description: "Create new records within permitted collections.",
  },
  {
    key: "records.update",
    resource: "records",
    action: "update",
    label: "Edit records",
    description: "Update saved records, including media-backed fields and gallery order.",
  },
  {
    key: "records.delete",
    resource: "records",
    action: "delete",
    label: "Delete records",
    description: "Permanently remove records from a collection.",
  },
  {
    key: "media.read",
    resource: "media",
    action: "read",
    label: "View media",
    description: "Browse the shared media library and inspect stored asset metadata.",
  },
  {
    key: "media.upload",
    resource: "media",
    action: "upload",
    label: "Upload media",
    description: "Upload new originals to R2 and add them to the shared media library.",
  },
  {
    key: "media.update",
    resource: "media",
    action: "update",
    label: "Edit media",
    description: "Update asset metadata and future media-level configuration fields.",
  },
  {
    key: "media.delete",
    resource: "media",
    action: "delete",
    label: "Delete media",
    description: "Remove media assets and their stored originals.",
  },
  {
    key: "users.read",
    resource: "users",
    action: "read",
    label: "View users",
    description: "See signed-in users, invites, and their assigned roles.",
  },
  {
    key: "users.invite",
    resource: "users",
    action: "invite",
    label: "Invite users",
    description: "Create invitations for new Datamix users.",
  },
  {
    key: "users.update",
    resource: "users",
    action: "update",
    label: "Edit users",
    description: "Change a user's role assignment or future account access state.",
  },
  {
    key: "users.delete",
    resource: "users",
    action: "delete",
    label: "Remove users",
    description: "Remove an existing user from the instance.",
  },
  {
    key: "settings.read",
    resource: "settings",
    action: "read",
    label: "View settings",
    description: "See instance-wide settings such as auth, media, API, and role configuration.",
  },
  {
    key: "settings.update",
    resource: "settings",
    action: "update",
    label: "Edit settings",
    description: "Change instance-wide settings and future role definitions.",
  },
] as const satisfies readonly DatamixPermissionDefinition[];

export const datamixPermissionKeys = datamixPermissionDefinitions.map(
  (permission) => permission.key,
) as DatamixPermissionKey[];

export type DatamixPermissionMap = Record<DatamixPermissionKey, boolean>;

export type DatamixRoleDefinition = {
  id: string;
  label: string;
  description: string;
  permissions: DatamixPermissionKey[];
  system: boolean;
};

export const datamixRolePresetIds = [
  "administrator",
  "editor",
  "contributor",
  "viewer",
] as const;

export type DatamixRolePresetId = (typeof datamixRolePresetIds)[number];

export type DatamixRolePreset = DatamixRoleDefinition & {
  id: DatamixRolePresetId;
  system: true;
};

export type DatamixRoleAssignment = {
  roleId: string;
};

const datamixPermissionDefinitionMap = new Map(
  datamixPermissionDefinitions.map((permission) => [permission.key, permission] as const),
);

const datamixPermissionResourceDefinitionMap = new Map(
  datamixPermissionResourceDefinitions.map((resource) => [resource.id, resource] as const),
);

function createRolePreset(
  id: DatamixRolePresetId,
  label: string,
  description: string,
  permissions: DatamixPermissionKey[],
): DatamixRolePreset {
  return {
    id,
    label,
    description,
    permissions: normalizeDatamixPermissions(permissions),
    system: true,
  };
}

export const datamixRolePresets = [
  createRolePreset(
    "administrator",
    "Administrator",
    "Full access to schemas, content, media, users, and instance settings.",
    [...datamixPermissionKeys],
  ),
  createRolePreset(
    "editor",
    "Editor",
    "Manages content and media without changing instance configuration or user access.",
    [
      "collections.read",
      "records.read",
      "records.create",
      "records.update",
      "records.delete",
      "media.read",
      "media.upload",
      "media.update",
      "media.delete",
    ],
  ),
  createRolePreset(
    "contributor",
    "Contributor",
    "Creates and updates content with upload access, but cannot delete records or administer the instance.",
    [
      "collections.read",
      "records.read",
      "records.create",
      "records.update",
      "media.read",
      "media.upload",
    ],
  ),
  createRolePreset(
    "viewer",
    "Viewer",
    "Read-only access to collection structure, records, and the shared media library.",
    ["collections.read", "records.read", "media.read"],
  ),
] as const satisfies readonly DatamixRolePreset[];

const datamixRolePresetMap = new Map(
  datamixRolePresets.map((role) => [role.id, role] as const),
);

function readPermissionKeys(
  input: Pick<DatamixRoleDefinition, "permissions"> | readonly DatamixPermissionKey[],
) {
  return "permissions" in input ? input.permissions : input;
}

export function isDatamixPermissionKey(value: string): value is DatamixPermissionKey {
  return datamixPermissionDefinitionMap.has(value as DatamixPermissionKey);
}

export function isDatamixRolePresetId(value: string): value is DatamixRolePresetId {
  return datamixRolePresetMap.has(value as DatamixRolePresetId);
}

export function normalizeDatamixPermissions(
  permissions: readonly string[],
): DatamixPermissionKey[] {
  const requestedPermissions = new Set(permissions);

  return datamixPermissionKeys.filter((permission) => requestedPermissions.has(permission));
}

export function createDatamixPermissionMap(
  permissions: readonly string[] = [],
): DatamixPermissionMap {
  const enabledPermissions = new Set(normalizeDatamixPermissions(permissions));

  return datamixPermissionKeys.reduce(
    (permissionMap, permission) => {
      permissionMap[permission] = enabledPermissions.has(permission);
      return permissionMap;
    },
    {} as DatamixPermissionMap,
  );
}

export function getDatamixPermissionDefinition(permission: DatamixPermissionKey) {
  return datamixPermissionDefinitionMap.get(permission)!;
}

export function getDatamixPermissionResourceDefinition(
  resource: DatamixPermissionResource,
) {
  return datamixPermissionResourceDefinitionMap.get(resource)!;
}

export function listDatamixPermissionsByResource(
  resource: DatamixPermissionResource,
) {
  return datamixPermissionDefinitions.filter(
    (permission) => permission.resource === resource,
  );
}

export function listDatamixPermissionsForRole(
  input: Pick<DatamixRoleDefinition, "permissions"> | readonly DatamixPermissionKey[],
) {
  const enabledPermissions = new Set(normalizeDatamixPermissions(readPermissionKeys(input)));

  return datamixPermissionDefinitions.filter((permission) =>
    enabledPermissions.has(permission.key),
  );
}

export function listDatamixPermissionResourcesForRole(
  input: Pick<DatamixRoleDefinition, "permissions"> | readonly DatamixPermissionKey[],
) {
  const enabledResources = new Set(
    listDatamixPermissionsForRole(input).map((permission) => permission.resource),
  );

  return datamixPermissionResourceDefinitions.filter((resource) =>
    enabledResources.has(resource.id),
  );
}

export function getDatamixRolePreset(roleId: DatamixRolePresetId) {
  return datamixRolePresetMap.get(roleId)!;
}

export function hasDatamixPermission(
  input: Pick<DatamixRoleDefinition, "permissions"> | readonly DatamixPermissionKey[],
  permission: DatamixPermissionKey,
) {
  return new Set(normalizeDatamixPermissions(readPermissionKeys(input))).has(permission);
}

export function hasAnyDatamixPermission(
  input: Pick<DatamixRoleDefinition, "permissions"> | readonly DatamixPermissionKey[],
  permissions: readonly DatamixPermissionKey[],
) {
  const enabledPermissions = new Set(normalizeDatamixPermissions(readPermissionKeys(input)));

  return permissions.some((permission) => enabledPermissions.has(permission));
}

export function hasEveryDatamixPermission(
  input: Pick<DatamixRoleDefinition, "permissions"> | readonly DatamixPermissionKey[],
  permissions: readonly DatamixPermissionKey[],
) {
  const enabledPermissions = new Set(normalizeDatamixPermissions(readPermissionKeys(input)));

  return permissions.every((permission) => enabledPermissions.has(permission));
}
