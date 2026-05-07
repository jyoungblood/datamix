export const datamixPermissionResources = [
  "collections",
  "records",
  "media",
  "users",
  "settings",
] as const;

export const datamixPermissionActions = [
  "read",
  "create",
  "update",
  "delete",
  "upload",
  "invite",
] as const;

export type DatamixPermissionResource = (typeof datamixPermissionResources)[number];
export type DatamixPermissionAction = (typeof datamixPermissionActions)[number];

export type DatamixPermissionActionDefinition = {
  id: DatamixPermissionAction;
  label: string;
  description: string;
};

export type DatamixPermissionResourceDefinition = {
  id: DatamixPermissionResource;
  label: string;
  description: string;
};

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

export type DatamixPermissionResourceMatrixDefinition =
  DatamixPermissionResourceDefinition & {
    permissions: readonly DatamixPermissionDefinition[];
  };

export type DatamixRoleGrant = {
  resource: DatamixPermissionResource;
  actions: DatamixPermissionAction[];
};

export type DatamixResolvedRoleGrant = {
  resource: DatamixPermissionResourceDefinition;
  actions: DatamixPermissionAction[];
  permissions: DatamixPermissionDefinition[];
};

export type DatamixPermissionMap = Record<DatamixPermissionKey, boolean>;

export type DatamixRoleDefinition = {
  id: string;
  label: string;
  description: string;
  grants: DatamixRoleGrant[];
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

export type DatamixAuthorizationSummary = {
  grants: DatamixResolvedRoleGrant[];
  permissionMap: DatamixPermissionMap;
  permissions: DatamixPermissionKey[];
  role: DatamixRolePreset;
};

export const datamixDefaultRoleAssignments = {
  fallback: "viewer",
  firstUser: "administrator",
  invitedUser: "contributor",
} as const satisfies {
  fallback: DatamixRolePresetId;
  firstUser: DatamixRolePresetId;
  invitedUser: DatamixRolePresetId;
};

export const datamixPermissionActionDefinitions = [
  {
    id: "read",
    label: "View",
    description: "Inspect data without changing it.",
  },
  {
    id: "create",
    label: "Create",
    description: "Create new resources within the admin or API.",
  },
  {
    id: "update",
    label: "Edit",
    description: "Modify an existing resource.",
  },
  {
    id: "delete",
    label: "Delete",
    description: "Remove a resource.",
  },
  {
    id: "upload",
    label: "Upload",
    description: "Create new media assets by uploading originals.",
  },
  {
    id: "invite",
    label: "Invite",
    description: "Invite another user into the Datamix admin.",
  },
] as const satisfies readonly DatamixPermissionActionDefinition[];

function definePermissionResource(
  id: DatamixPermissionResource,
  label: string,
  description: string,
  permissions: readonly Omit<DatamixPermissionDefinition, "resource">[],
): DatamixPermissionResourceMatrixDefinition {
  return {
    id,
    label,
    description,
    permissions: permissions.map((permission) => ({
      ...permission,
      resource: id,
    })),
  };
}

// This matrix is the contributor-readable source of truth for v0 RBAC.
export const datamixPermissionMatrix = [
  definePermissionResource(
    "collections",
    "Collections",
    "Collection schemas, field definitions, and generated editor structure.",
    [
      {
        key: "collections.read",
        action: "read",
        label: "View collections",
        description: "See collection schemas, field ordering, and generated editor structure.",
      },
      {
        key: "collections.create",
        action: "create",
        label: "Create collections",
        description: "Create new collection definitions and their backing storage plan.",
      },
      {
        key: "collections.update",
        action: "update",
        label: "Edit collections",
        description: "Change collection labels, descriptions, fields, and field ordering.",
      },
      {
        key: "collections.delete",
        action: "delete",
        label: "Delete collections",
        description: "Remove collection definitions and their stored content structure.",
      },
    ],
  ),
  definePermissionResource(
    "records",
    "Records",
    "Content entries created from saved collection definitions.",
    [
      {
        key: "records.read",
        action: "read",
        label: "View records",
        description: "Browse and inspect records in the admin and future protected APIs.",
      },
      {
        key: "records.create",
        action: "create",
        label: "Create records",
        description: "Create new records within permitted collections.",
      },
      {
        key: "records.update",
        action: "update",
        label: "Edit records",
        description: "Update saved records, including media-backed fields and gallery order.",
      },
      {
        key: "records.delete",
        action: "delete",
        label: "Delete records",
        description: "Permanently remove records from a collection.",
      },
    ],
  ),
  definePermissionResource(
    "media",
    "Media",
    "Shared library assets stored in R2 and served through Worker routes.",
    [
      {
        key: "media.read",
        action: "read",
        label: "View media",
        description: "Browse the shared media library and inspect stored asset metadata.",
      },
      {
        key: "media.upload",
        action: "upload",
        label: "Upload media",
        description: "Upload new originals to R2 and add them to the shared media library.",
      },
      {
        key: "media.update",
        action: "update",
        label: "Edit media",
        description: "Update asset metadata and future media-level configuration fields.",
      },
      {
        key: "media.delete",
        action: "delete",
        label: "Delete media",
        description: "Remove media assets and their stored originals.",
      },
    ],
  ),
  definePermissionResource(
    "users",
    "Users",
    "People who can sign in to the Datamix admin.",
    [
      {
        key: "users.read",
        action: "read",
        label: "View users",
        description: "See signed-in users, invites, and their assigned roles.",
      },
      {
        key: "users.invite",
        action: "invite",
        label: "Invite users",
        description: "Create invitations for new Datamix users.",
      },
      {
        key: "users.update",
        action: "update",
        label: "Edit users",
        description: "Change a user's role assignment or future account access state.",
      },
      {
        key: "users.delete",
        action: "delete",
        label: "Remove users",
        description: "Remove an existing user from the instance.",
      },
    ],
  ),
  definePermissionResource(
    "settings",
    "Settings",
    "Instance-wide configuration, including future role and integration controls.",
    [
      {
        key: "settings.read",
        action: "read",
        label: "View settings",
        description: "See instance-wide settings such as auth, media, API, and role configuration.",
      },
      {
        key: "settings.update",
        action: "update",
        label: "Edit settings",
        description: "Change instance-wide settings and future role definitions.",
      },
    ],
  ),
] as const satisfies readonly DatamixPermissionResourceMatrixDefinition[];

export const datamixPermissionResourceDefinitions = datamixPermissionMatrix.map(
  ({ id, label, description }) => ({
    id,
    label,
    description,
  }),
) as DatamixPermissionResourceDefinition[];

export const datamixPermissionDefinitions = datamixPermissionMatrix.flatMap(
  (resource) => resource.permissions,
) as DatamixPermissionDefinition[];

export const datamixPermissionKeys = datamixPermissionDefinitions.map(
  (permission) => permission.key,
) as DatamixPermissionKey[];

const datamixPermissionActionDefinitionMap = new Map(
  datamixPermissionActionDefinitions.map((action) => [action.id, action] as const),
);

const datamixPermissionDefinitionMap = new Map(
  datamixPermissionDefinitions.map((permission) => [permission.key, permission] as const),
);

const datamixPermissionDefinitionByGrantMap = new Map(
  datamixPermissionDefinitions.map((permission) => [
    `${permission.resource}.${permission.action}`,
    permission,
  ] as const),
);

const datamixPermissionResourceDefinitionMap = new Map(
  datamixPermissionResourceDefinitions.map((resource) => [resource.id, resource] as const),
);

const datamixPermissionResourceMatrixMap = new Map(
  datamixPermissionMatrix.map((resource) => [resource.id, resource] as const),
);

type DatamixRoleGrantInput = {
  resource: DatamixPermissionResource;
  actions: readonly DatamixPermissionAction[];
};

function normalizeDatamixRoleGrants(
  grants: readonly DatamixRoleGrantInput[],
): DatamixRoleGrant[] {
  const requestedActionsByResource = new Map<
    DatamixPermissionResource,
    Set<DatamixPermissionAction>
  >();

  for (const grant of grants) {
    const requestedActions =
      requestedActionsByResource.get(grant.resource) ?? new Set<DatamixPermissionAction>();

    for (const action of grant.actions) {
      requestedActions.add(action);
    }

    requestedActionsByResource.set(grant.resource, requestedActions);
  }

  return datamixPermissionMatrix.flatMap((resource) => {
    const requestedActions = requestedActionsByResource.get(resource.id);

    if (!requestedActions) {
      return [];
    }

    const actions = resource.permissions
      .map((permission) => permission.action)
      .filter((action) => requestedActions.has(action));

    if (actions.length === 0) {
      return [];
    }

    return [
      {
        resource: resource.id,
        actions,
      },
    ];
  });
}

export function isDatamixPermissionKey(value: string): value is DatamixPermissionKey {
  return datamixPermissionDefinitionMap.has(value as DatamixPermissionKey);
}

export function isDatamixRolePresetId(value: string): value is DatamixRolePresetId {
  return datamixRolePresets.some((role) => role.id === value);
}

export function normalizeDatamixPermissions(
  permissions: readonly string[],
): DatamixPermissionKey[] {
  const requestedPermissions = new Set(permissions);

  return datamixPermissionKeys.filter((permission) => requestedPermissions.has(permission));
}

export function createDatamixPermissionKeysForRoleGrants(
  grants: readonly DatamixRoleGrantInput[],
): DatamixPermissionKey[] {
  const normalizedGrants = normalizeDatamixRoleGrants(grants);

  return normalizedGrants.flatMap((grant) => {
    const resourceDefinition = datamixPermissionResourceMatrixMap.get(grant.resource)!;

    return resourceDefinition.permissions
      .filter((permission) => grant.actions.includes(permission.action))
      .map((permission) => permission.key);
  });
}

function createRolePreset(
  id: DatamixRolePresetId,
  label: string,
  description: string,
  grants: readonly DatamixRoleGrantInput[],
): DatamixRolePreset {
  return {
    id,
    label,
    description,
    grants: normalizeDatamixRoleGrants(grants),
    permissions: createDatamixPermissionKeysForRoleGrants(grants),
    system: true,
  };
}

export const datamixRolePresets = [
  createRolePreset(
    "administrator",
    "Administrator",
    "Full access to schemas, content, media, users, and instance settings.",
    datamixPermissionMatrix.map((resource) => ({
      resource: resource.id,
      actions: resource.permissions.map((permission) => permission.action),
    })),
  ),
  createRolePreset(
    "editor",
    "Editor",
    "Manages content and media without changing instance configuration or user access.",
    [
      {
        resource: "collections",
        actions: ["read"],
      },
      {
        resource: "records",
        actions: ["read", "create", "update", "delete"],
      },
      {
        resource: "media",
        actions: ["read", "upload", "update", "delete"],
      },
    ],
  ),
  createRolePreset(
    "contributor",
    "Contributor",
    "Creates and updates content with upload access, but cannot delete records or administer the instance.",
    [
      {
        resource: "collections",
        actions: ["read"],
      },
      {
        resource: "records",
        actions: ["read", "create", "update"],
      },
      {
        resource: "media",
        actions: ["read", "upload"],
      },
    ],
  ),
  createRolePreset(
    "viewer",
    "Viewer",
    "Read-only access to collection structure, records, and the shared media library.",
    [
      {
        resource: "collections",
        actions: ["read"],
      },
      {
        resource: "records",
        actions: ["read"],
      },
      {
        resource: "media",
        actions: ["read"],
      },
    ],
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

export function readDatamixRoleId(
  input: object | null | undefined,
): string | null {
  if (!input || !("role" in input) || typeof input.role !== "string") {
    return null;
  }

  const trimmedRoleId = input.role.trim();

  return trimmedRoleId.length > 0 ? trimmedRoleId : null;
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

export function getDatamixPermissionActionDefinition(action: DatamixPermissionAction) {
  return datamixPermissionActionDefinitionMap.get(action)!;
}

export function getDatamixPermissionDefinition(permission: DatamixPermissionKey) {
  return datamixPermissionDefinitionMap.get(permission)!;
}

export function getDatamixPermissionDefinitionForAction(
  resource: DatamixPermissionResource,
  action: DatamixPermissionAction,
) {
  return (
    datamixPermissionDefinitionByGrantMap.get(
      `${resource}.${action}`,
    ) ?? null
  );
}

export function getDatamixPermissionKeyForAction(
  resource: DatamixPermissionResource,
  action: DatamixPermissionAction,
) {
  return getDatamixPermissionDefinitionForAction(resource, action)?.key ?? null;
}

export function getDatamixPermissionResourceDefinition(
  resource: DatamixPermissionResource,
) {
  return datamixPermissionResourceDefinitionMap.get(resource)!;
}

export function listDatamixPermissionsByResource(
  resource: DatamixPermissionResource,
) {
  return datamixPermissionResourceMatrixMap.get(resource)!.permissions;
}

export function listDatamixPermissionsForRole(
  input: Pick<DatamixRoleDefinition, "permissions"> | readonly DatamixPermissionKey[],
) {
  const enabledPermissions = new Set(normalizeDatamixPermissions(readPermissionKeys(input)));

  return datamixPermissionDefinitions.filter((permission) =>
    enabledPermissions.has(permission.key),
  );
}

export function listDatamixPermissionGrantsForRole(
  input: Pick<DatamixRoleDefinition, "permissions"> | readonly DatamixPermissionKey[],
) {
  const enabledPermissions = new Set(normalizeDatamixPermissions(readPermissionKeys(input)));

  return datamixPermissionMatrix.flatMap((resource) => {
    const permissions = resource.permissions.filter((permission) =>
      enabledPermissions.has(permission.key),
    );

    if (permissions.length === 0) {
      return [];
    }

    return [
      {
        resource: getDatamixPermissionResourceDefinition(resource.id),
        actions: permissions.map((permission) => permission.action),
        permissions,
      },
    ];
  }) as DatamixResolvedRoleGrant[];
}

export function listDatamixPermissionResourcesForRole(
  input: Pick<DatamixRoleDefinition, "permissions"> | readonly DatamixPermissionKey[],
) {
  return listDatamixPermissionGrantsForRole(input).map((grant) => grant.resource);
}

export function getDatamixRolePreset(roleId: DatamixRolePresetId) {
  return datamixRolePresetMap.get(roleId)!;
}

export function resolveDatamixRolePreset(
  roleId: string | null | undefined,
  fallbackRoleId: DatamixRolePresetId = datamixDefaultRoleAssignments.fallback,
) {
  if (roleId && isDatamixRolePresetId(roleId)) {
    return getDatamixRolePreset(roleId);
  }

  return getDatamixRolePreset(fallbackRoleId);
}

export function createDatamixAuthorizationSummary(
  roleId: string | null | undefined,
  fallbackRoleId: DatamixRolePresetId = datamixDefaultRoleAssignments.fallback,
): DatamixAuthorizationSummary {
  const role = resolveDatamixRolePreset(roleId, fallbackRoleId);

  return {
    grants: listDatamixPermissionGrantsForRole(role),
    permissionMap: createDatamixPermissionMap(role.permissions),
    permissions: [...role.permissions],
    role,
  };
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
