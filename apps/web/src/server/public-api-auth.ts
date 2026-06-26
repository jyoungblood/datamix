import { authorizeManagedPublicApiKey } from "./api-keys";
import {
  PublicApiConfigError,
  readPublicApiRuntime,
  type DatamixBindings,
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

export type PublicApiKeyAuthHookInput = {
  apiKey: string;
  env: DatamixBindings;
  permission: PublicApiPermission;
  runtime: PublicApiRuntimeEnv;
};

export type PublicApiKeyAuthResult =
  | {
      principal: Extract<PublicApiPrincipal, { type: "api-key" }>;
      success: true;
    }
  | {
      reason: "insufficient-access" | "invalid";
      success: false;
    };

export type PublicApiKeyAuthHook = (
  input: PublicApiKeyAuthHookInput,
) => Promise<PublicApiKeyAuthResult>;

export type PublicApiAccessResult =
  | {
      principal: PublicApiPrincipal;
      success: true;
    }
  | {
      body: {
        error: string;
      };
      statusCode: 401 | 403 | 503;
      success: false;
    };

export function readApiKeyHeader(headers: Headers) {
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

export async function resolvePublicApiAccess(
  env: DatamixBindings,
  headers: Headers,
  permission: PublicApiPermission,
  options?: {
    keyAuthHook?: PublicApiKeyAuthHook;
  },
): Promise<PublicApiAccessResult> {
  try {
    const runtime = readPublicApiRuntime(env);
    const accessMode = permission === "read" ? runtime.readAccess : runtime.writeAccess;

    if (accessMode === "disabled") {
      return {
        body: {
          error:
            permission === "read"
              ? "Public read access is disabled for this Datamix instance."
              : "Public write access is disabled for this Datamix instance.",
        },
        statusCode: 403,
        success: false,
      };
    }

    if (accessMode === "public") {
      return {
        principal: {
          accessLevel: "public",
          type: "anonymous",
        },
        success: true,
      };
    }

    const apiKey = readApiKeyHeader(headers);

    if (!apiKey) {
      return {
        body: { error: "API key is required." },
        statusCode: 401,
        success: false,
      };
    }

    const keyAuthHook = options?.keyAuthHook ?? authorizeManagedPublicApiKey;
    const keyAuthResult = await keyAuthHook({
      apiKey,
      env,
      permission,
      runtime,
    });

    if (!keyAuthResult.success) {
      if (keyAuthResult.reason === "insufficient-access") {
        return {
          body: {
            error:
              permission === "read"
                ? "API key does not have read access."
                : "API key does not have write access.",
          },
          statusCode: 403,
          success: false,
        };
      }

      return {
        body: { error: "Invalid API key." },
        statusCode: 401,
        success: false,
      };
    }

    return {
      principal: keyAuthResult.principal,
      success: true,
    };
  } catch (error) {
    if (error instanceof PublicApiConfigError) {
      return {
        body: { error: error.message },
        statusCode: 503,
        success: false,
      };
    }

    throw error;
  }
}
