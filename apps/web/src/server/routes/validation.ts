export type InviteRequest = {
  email: string;
  name?: string;
  roleId?: string;
};

export type RoleDefinitionRequest = {
  description: string;
  id: string;
  label: string;
  permissions: string[];
};

export type UserRoleRequest = {
  roleId: string;
};

export type ApiKeyRequest = {
  accessLevel: "read" | "write";
  label: string;
};

export type CurrentUserProfileRequest = {
  image: string | null;
  name: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function readOptionalTrimmedString(
  input: Record<string, unknown>,
  key: string,
  options?: {
    maxLength?: number;
  },
) {
  const value = input[key];

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  if (options?.maxLength && trimmed.length > options.maxLength) {
    return undefined;
  }

  return trimmed;
}

export function parseInviteRequest(input: unknown): InviteRequest | null {
  if (!isRecord(input)) {
    return null;
  }

  const email = readOptionalTrimmedString(input, "email");

  if (!email || !isValidEmail(email)) {
    return null;
  }

  const name = readOptionalTrimmedString(input, "name", { maxLength: 120 });
  const roleId = readOptionalTrimmedString(input, "roleId", { maxLength: 64 });

  return {
    email,
    ...(name ? { name } : {}),
    ...(roleId ? { roleId } : {}),
  };
}

export function parseRoleDefinitionRequest(
  input: unknown,
): RoleDefinitionRequest | null {
  if (!isRecord(input)) {
    return null;
  }

  const { description, id, label, permissions } = input;

  if (
    typeof description !== "string" ||
    typeof id !== "string" ||
    typeof label !== "string" ||
    !Array.isArray(permissions) ||
    permissions.some((permission) => typeof permission !== "string")
  ) {
    return null;
  }

  return {
    description,
    id,
    label,
    permissions,
  };
}

export function parseUserRoleRequest(input: unknown): UserRoleRequest | null {
  if (!isRecord(input)) {
    return null;
  }

  const roleId = readOptionalTrimmedString(input, "roleId", { maxLength: 64 });

  if (!roleId) {
    return null;
  }

  return {
    roleId,
  };
}

export function parseApiKeyRequest(input: unknown): ApiKeyRequest | null {
  if (!isRecord(input)) {
    return null;
  }

  const accessLevel = input.accessLevel;
  const label = readOptionalTrimmedString(input, "label", { maxLength: 80 });

  if ((accessLevel !== "read" && accessLevel !== "write") || !label) {
    return null;
  }

  return {
    accessLevel,
    label,
  };
}

export function parseCurrentUserProfileRequest(
  input: unknown,
): CurrentUserProfileRequest | null {
  if (!isRecord(input)) {
    return null;
  }

  const name = readOptionalTrimmedString(input, "name", { maxLength: 120 });
  const rawImage = input.image;

  if (!name) {
    return null;
  }

  if (rawImage === null || rawImage === undefined) {
    return {
      image: null,
      name,
    };
  }

  if (typeof rawImage !== "string" || rawImage.length > 2048) {
    return null;
  }

  return {
    image: rawImage.trim() || null,
    name,
  };
}
