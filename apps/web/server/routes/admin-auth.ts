import {
  createDatamixAuthorizationSummaryForRole,
  readDatamixRoleId,
  resolveDatamixRolePreset,
  type DatamixAuthorizationSummary,
  type DatamixPermissionKey,
} from "@datamix/core";

import { createAuth, type DatamixSession } from "../auth";
import { AuthConfigError, type DatamixBindings } from "../env";
import { getAvailableRoleDefinition } from "../roles";
import { jsonResponse } from "./http";

export type AuthorizedAdminSession = {
  authorization: DatamixAuthorizationSummary;
  session: DatamixSession;
};

type AdminAccessResult =
  | ({
      success: true;
    } & AuthorizedAdminSession)
  | {
      response: Response;
      success: false;
    };

function isBetterAuthError(error: unknown): error is { getResponse: () => Response } {
  return typeof error === "object" && error !== null && "getResponse" in error;
}

export async function resolveAuthorizedSession(
  request: Request,
  env: DatamixBindings,
): Promise<AdminAccessResult> {
  try {
    const session = await createAuth(env, {
      baseURL: new URL(request.url).origin,
    }).api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return {
        response: jsonResponse({ error: "Unauthorized" }, 401),
        success: false,
      };
    }

    const roleId = readDatamixRoleId(session.user);
    const role =
      (roleId ? await getAvailableRoleDefinition(env, roleId) : null) ??
      resolveDatamixRolePreset(roleId);
    const authorization = createDatamixAuthorizationSummaryForRole(role);

    return {
      authorization,
      session,
      success: true,
    };
  } catch (error) {
    if (isBetterAuthError(error)) {
      return {
        response: error.getResponse(),
        success: false,
      };
    }

    if (error instanceof AuthConfigError) {
      return {
        response: jsonResponse({ error: error.message }, 503),
        success: false,
      };
    }

    throw error;
  }
}

export function forbidMissingPermission(
  authorization: DatamixAuthorizationSummary,
  permission: DatamixPermissionKey,
) {
  if (authorization.permissionMap[permission]) {
    return null;
  }

  return jsonResponse(
    {
      error: `Missing permission: ${permission}.`,
      permission,
      role: {
        id: authorization.role.id,
        label: authorization.role.label,
      },
    },
    403,
  );
}

export async function requireSession(request: Request, env: DatamixBindings) {
  return resolveAuthorizedSession(request, env);
}

export async function requirePermission(
  request: Request,
  env: DatamixBindings,
  permission: DatamixPermissionKey,
) {
  const resolvedSession = await resolveAuthorizedSession(request, env);

  if (!resolvedSession.success) {
    return resolvedSession;
  }

  const forbiddenResponse = forbidMissingPermission(
    resolvedSession.authorization,
    permission,
  );

  if (forbiddenResponse) {
    return {
      response: forbiddenResponse,
      success: false as const,
    };
  }

  return resolvedSession;
}

export async function requireAnyPermission(
  request: Request,
  env: DatamixBindings,
  permissions: readonly DatamixPermissionKey[],
) {
  const resolvedSession = await resolveAuthorizedSession(request, env);

  if (!resolvedSession.success) {
    return resolvedSession;
  }

  const grantedPermission = permissions.find(
    (permission) => resolvedSession.authorization.permissionMap[permission],
  );

  if (!grantedPermission) {
    return {
      response: jsonResponse(
        {
          error: `Missing one of the required permissions: ${permissions.join(", ")}.`,
          permissions,
          role: {
            id: resolvedSession.authorization.role.id,
            label: resolvedSession.authorization.role.label,
          },
        },
        403,
      ),
      success: false as const,
    };
  }

  return resolvedSession;
}

export async function requireEveryPermission(
  request: Request,
  env: DatamixBindings,
  permissions: readonly DatamixPermissionKey[],
) {
  const resolvedSession = await resolveAuthorizedSession(request, env);

  if (!resolvedSession.success) {
    return resolvedSession;
  }

  const missingPermissions = permissions.filter(
    (permission) => !resolvedSession.authorization.permissionMap[permission],
  );

  if (missingPermissions.length > 0) {
    return {
      response: jsonResponse(
        {
          error: `Missing required permissions: ${missingPermissions.join(", ")}.`,
          missingPermissions,
          permissions,
          role: {
            id: resolvedSession.authorization.role.id,
            label: resolvedSession.authorization.role.label,
          },
        },
        403,
      ),
      success: false as const,
    };
  }

  return resolvedSession;
}
