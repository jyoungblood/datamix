import { createMiddleware } from "hono/factory";

import {
  PublicApiConfigError,
  readPublicApiRuntime,
  type ApiBindings,
  type PublicApiRuntimeEnv,
} from "./env";

export type PublicApiPermission = "read" | "write";
export type PublicApiKeyAccessLevel = "read" | "write";

export type PublicApiPrincipal =
  | {
      accessLevel: "public";
      type: "anonymous";
    }
  | {
      accessLevel: PublicApiKeyAccessLevel;
      type: "api-key";
    };

type PublicApiVariables = {
  publicApiPrincipal: PublicApiPrincipal;
};

export type PublicApiContext = {
  Bindings: ApiBindings;
  Variables: PublicApiVariables;
};

export type PublicApiKeyAuthHookInput = {
  apiKey: string;
  permission: PublicApiPermission;
  runtime: PublicApiRuntimeEnv;
};

export type PublicApiKeyAuthHook = (
  input: PublicApiKeyAuthHookInput,
) => Promise<PublicApiPrincipal | null>;

function readApiKeyHeader(headers: Headers) {
  const xApiKey = headers.get("x-api-key")?.trim();

  if (xApiKey) {
    return xApiKey;
  }

  const authorization = headers.get("authorization")?.trim();

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(/\s+/, 2);

  if (scheme?.toLowerCase() !== "bearer") {
    return null;
  }

  return token?.trim() || null;
}

async function authorizeConfiguredApiKey({
  apiKey,
  permission,
  runtime,
}: PublicApiKeyAuthHookInput): Promise<PublicApiPrincipal | null> {
  if (runtime.writeKey && apiKey === runtime.writeKey) {
    return {
      accessLevel: "write",
      type: "api-key",
    };
  }

  if (permission === "read" && runtime.readKey && apiKey === runtime.readKey) {
    return {
      accessLevel: "read",
      type: "api-key",
    };
  }

  return null;
}

export function createConfiguredPublicApiKeyAuthHook(): PublicApiKeyAuthHook {
  return authorizeConfiguredApiKey;
}

export function requirePublicApiAccess(
  permission: PublicApiPermission,
  options?: {
    keyAuthHook?: PublicApiKeyAuthHook;
  },
) {
  return createMiddleware<PublicApiContext>(async (c, next) => {
    try {
      const runtime = readPublicApiRuntime(c.env);
      const accessMode =
        permission === "read" ? runtime.readAccess : runtime.writeAccess;

      if (accessMode === "disabled") {
        return c.json(
          {
            error:
              permission === "read"
                ? "Public read access is disabled for this Datamix instance."
                : "Public write access is disabled for this Datamix instance.",
          },
          403,
        );
      }

      if (accessMode === "public") {
        c.set("publicApiPrincipal", {
          accessLevel: "public",
          type: "anonymous",
        });

        await next();
        return;
      }

      const apiKey = readApiKeyHeader(c.req.raw.headers);

      if (!apiKey) {
        return c.json({ error: "API key is required." }, 401);
      }

      // This hook is the future seam for managed API keys in M5.
      const keyAuthHook =
        options?.keyAuthHook ?? createConfiguredPublicApiKeyAuthHook();
      const principal = await keyAuthHook({
        apiKey,
        permission,
        runtime,
      });

      if (!principal) {
        return c.json({ error: "Invalid API key." }, 401);
      }

      c.set("publicApiPrincipal", principal);
      await next();
    } catch (error) {
      if (error instanceof PublicApiConfigError) {
        return c.json({ error: error.message }, 503);
      }

      throw error;
    }
  });
}
