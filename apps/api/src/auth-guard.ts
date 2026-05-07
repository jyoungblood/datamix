import {
  createDatamixAuthorizationSummary,
  readDatamixRoleId,
  type DatamixAuthorizationSummary,
  type DatamixPermissionKey,
} from "@datamix/core";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import type { HTTPException } from "hono/http-exception";

import { createAuth, type DatamixSession } from "./auth";
import { AuthConfigError, type ApiBindings } from "./env";

type AuthVariables = {
  authorization: DatamixAuthorizationSummary;
  session: DatamixSession;
};

export type ApiAuthContext = {
  Bindings: ApiBindings;
  Variables: AuthVariables;
};

type ApiAuthRequestContext = Context<ApiAuthContext>;

function isBetterAuthError(error: unknown): error is HTTPException {
  return typeof error === "object" && error !== null && "getResponse" in error;
}

async function resolveAuthorizedSession(c: ApiAuthRequestContext) {
  try {
    const session = await createAuth(c.env).api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session) {
      return {
        response: c.json({ error: "Unauthorized" }, 401),
        success: false as const,
      };
    }

    const authorization = createDatamixAuthorizationSummary(
      readDatamixRoleId(session.user),
      "administrator",
    );

    c.set("session", session);
    c.set("authorization", authorization);

    return {
      authorization,
      session,
      success: true as const,
    };
  } catch (error) {
    if (isBetterAuthError(error)) {
      return {
        response: error.getResponse(),
        success: false as const,
      };
    }

    if (error instanceof AuthConfigError) {
      return {
        response: c.json({ error: error.message }, 503),
        success: false as const,
      };
    }

    throw error;
  }
}

export function forbidMissingPermission(
  c: ApiAuthRequestContext,
  permission: DatamixPermissionKey,
) {
  const authorization = c.get("authorization");

  if (authorization.permissionMap[permission]) {
    return null;
  }

  return c.json(
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
export const requireSession = createMiddleware<ApiAuthContext>(async (c, next) => {
  const resolvedSession = await resolveAuthorizedSession(c);

  if (!resolvedSession.success) {
    return resolvedSession.response;
  }

  await next();
});

export function requirePermission(permission: DatamixPermissionKey) {
  return createMiddleware<ApiAuthContext>(async (c, next) => {
    const resolvedSession = await resolveAuthorizedSession(c);

    if (!resolvedSession.success) {
      return resolvedSession.response;
    }

    const forbiddenResponse = forbidMissingPermission(c, permission);

    if (forbiddenResponse) {
      return forbiddenResponse;
    }

    await next();
  });
}

export function requireAnyPermission(permissions: readonly DatamixPermissionKey[]) {
  return createMiddleware<ApiAuthContext>(async (c, next) => {
    const resolvedSession = await resolveAuthorizedSession(c);

    if (!resolvedSession.success) {
      return resolvedSession.response;
    }

    const grantedPermission = permissions.find(
      (permission) => resolvedSession.authorization.permissionMap[permission],
    );

    if (!grantedPermission) {
      return c.json(
        {
          error: `Missing one of the required permissions: ${permissions.join(", ")}.`,
          permissions,
          role: {
            id: resolvedSession.authorization.role.id,
            label: resolvedSession.authorization.role.label,
          },
        },
        403,
      );
    }

    await next();
  });
}
