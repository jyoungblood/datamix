import { createServiceStatus } from "@datamix/core";
import { APIError } from "better-auth";
import { cors } from "hono/cors";
import { Hono } from "hono";

import {
  createDatamixApiKey,
  DatamixApiKeyError,
  listDatamixApiKeys,
  revokeDatamixApiKey,
  updateDatamixApiKey,
} from "./api-keys";
import { createAuth, getAuthSetupStatus } from "./auth";
import {
  forbidMissingPermission,
  requireAnyPermission,
  requireEveryPermission,
  requirePermission,
  requireSession,
} from "./auth-guard";
import {
  CollectionSchemaError,
  formatCollectionDefinitionResponse,
  getCollectionDefinition,
  listCollectionDefinitions,
  saveCollectionDefinition,
} from "./collections";
import {
  AuthConfigError,
  PublicApiConfigError,
  createPublicApiRuntimeSummary,
  readApiRuntime,
  readPublicApiRuntime,
  type ApiBindings,
} from "./env";
import { createInvite } from "./invite";
import {
  createMediaAsset,
  getMediaObject,
  listMediaAssets,
  MediaAssetError,
} from "./media";
import {
  DatamixRoleError,
  listAvailableRoleDefinitions,
  saveCustomRoleDefinition,
} from "./roles";
import {
  requirePublicApiAccess,
  type PublicApiPrincipal,
} from "./public-api-auth";
import {
  CollectionRecordError,
  createCollectionRecord,
  createGeneratedCollectionCrudRoute,
  createPublicCollectionCrudRoute,
  deleteCollectionRecord,
  getPublicCollectionCrudRoute,
  getCollectionRecord,
  listGeneratedCollectionCrudRoutes,
  listPublicCollectionCrudRoutes,
  listCollectionRecords,
  updateCollectionRecord,
} from "./records";
import { runWithExecutionContext } from "./request-context";
import { DatamixUserError, listDatamixUsers, updateDatamixUserRole } from "./users";

export const app = new Hono<{ Bindings: ApiBindings }>();

type InviteRequest = {
  email: string;
  name?: string;
  roleId?: string;
};

type RoleDefinitionRequest = {
  description: string;
  id: string;
  label: string;
  permissions: string[];
};

type UserRoleRequest = {
  roleId: string;
};

type ApiKeyRequest = {
  accessLevel: "read" | "write";
  label: string;
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

function parseInviteRequest(input: unknown): InviteRequest | null {
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

function parseRoleDefinitionRequest(input: unknown): RoleDefinitionRequest | null {
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

function parseUserRoleRequest(input: unknown): UserRoleRequest | null {
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

function parseApiKeyRequest(input: unknown): ApiKeyRequest | null {
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

function allowAdminBrowser(origin: string) {
  return cors({
    origin,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });
}

function allowPublicJsonApi() {
  return cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-API-Key"],
  });
}

function allowPublicMedia() {
  return cors({
    origin: "*",
    allowMethods: ["GET", "OPTIONS"],
  });
}

function formatPublicApiAccess(principal: PublicApiPrincipal) {
  if (principal.type === "api-key") {
    return {
      accessLevel: principal.accessLevel,
      type: principal.type,
    };
  }

  return {
    type: "public" as const,
  };
}

app.use("/api/auth/*", async (c, next) => {
  return allowAdminBrowser(c.env.ADMIN_ORIGIN)(c, next);
});

app.use("/api/collections", async (c, next) => {
  return allowPublicJsonApi()(c, next);
});

app.use("/api/collections/*", async (c, next) => {
  return allowPublicJsonApi()(c, next);
});

app.use("/setup/*", async (c, next) => {
  return allowAdminBrowser(c.env.ADMIN_ORIGIN)(c, next);
});

app.use("/invites", async (c, next) => {
  return allowAdminBrowser(c.env.ADMIN_ORIGIN)(c, next);
});

app.use("/collection-definitions", async (c, next) => {
  return allowAdminBrowser(c.env.ADMIN_ORIGIN)(c, next);
});

app.use("/collection-definitions/*", async (c, next) => {
  return allowAdminBrowser(c.env.ADMIN_ORIGIN)(c, next);
});

app.use("/collections", async (c, next) => {
  return allowAdminBrowser(c.env.ADMIN_ORIGIN)(c, next);
});

app.use("/collections/*", async (c, next) => {
  return allowAdminBrowser(c.env.ADMIN_ORIGIN)(c, next);
});

app.use("/records", async (c, next) => {
  return allowAdminBrowser(c.env.ADMIN_ORIGIN)(c, next);
});

app.use("/records/*", async (c, next) => {
  return allowAdminBrowser(c.env.ADMIN_ORIGIN)(c, next);
});

app.use("/media/assets", async (c, next) => {
  return allowAdminBrowser(c.env.ADMIN_ORIGIN)(c, next);
});

app.use("/media/assets/*", async (c, next) => {
  return allowAdminBrowser(c.env.ADMIN_ORIGIN)(c, next);
});

app.use("/media/object/*", async (c, next) => {
  return allowPublicMedia()(c, next);
});

app.use("/session", async (c, next) => {
  const corsMiddleware = cors({
    origin: c.env.ADMIN_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  return corsMiddleware(c, next);
});

app.use("/roles", async (c, next) => {
  return allowAdminBrowser(c.env.ADMIN_ORIGIN)(c, next);
});

app.use("/roles/*", async (c, next) => {
  return allowAdminBrowser(c.env.ADMIN_ORIGIN)(c, next);
});

app.use("/users", async (c, next) => {
  return allowAdminBrowser(c.env.ADMIN_ORIGIN)(c, next);
});

app.use("/users/*", async (c, next) => {
  return allowAdminBrowser(c.env.ADMIN_ORIGIN)(c, next);
});

app.use("/api-keys", async (c, next) => {
  return allowAdminBrowser(c.env.ADMIN_ORIGIN)(c, next);
});

app.use("/api-keys/*", async (c, next) => {
  return allowAdminBrowser(c.env.ADMIN_ORIGIN)(c, next);
});

app.on(["GET", "POST"], "/api/auth/*", (c) => {
  return runWithExecutionContext(c.executionCtx, () => {
    try {
      return createAuth(c.env, {
        baseURL: new URL(c.req.url).origin,
      }).handler(c.req.raw);
    } catch (error) {
      if (error instanceof AuthConfigError) {
        return c.json({ error: error.message }, 503);
      }

      throw error;
    }
  });
});

app.get("/", (c) => {
  const runtime = readApiRuntime(c.env);

  return c.json({
    ...createServiceStatus("api"),
    runtime,
    message: "Datamix API scaffold is ready for Cloudflare runtime wiring.",
  });
});

app.get("/api/collections", requirePublicApiAccess("read"), async (c) => {
  try {
    const collections = await listPublicCollectionCrudRoutes(c.env);

    return c.json({
      ...createServiceStatus("api"),
      access: formatPublicApiAccess(c.get("publicApiPrincipal")),
      collections,
      message: "Public collection API routes are available.",
    });
  } catch (error) {
    if (error instanceof CollectionRecordError) {
      return c.json(
        {
          error: error.message,
          issues: error.issues,
        },
        error.statusCode as 400,
      );
    }

    throw error;
  }
});

app.get("/api/collections/:name", requirePublicApiAccess("read"), async (c) => {
  try {
    const collection = await getPublicCollectionCrudRoute(c.env, c.req.param("name"));

    return c.json({
      ...createServiceStatus("api"),
      access: formatPublicApiAccess(c.get("publicApiPrincipal")),
      collection: {
        collectionName: collection.collectionName,
        label: collection.label,
        routes: createPublicCollectionCrudRoute(collection.collectionName),
        supportedFieldNames: collection.supportedFieldNames,
      },
    });
  } catch (error) {
    if (error instanceof CollectionRecordError) {
      return c.json(
        {
          error: error.message,
          issues: error.issues,
        },
        error.statusCode as 400,
      );
    }

    throw error;
  }
});

app.get("/api/collections/:name/records", requirePublicApiAccess("read"), async (c) => {
  try {
    const result = await listCollectionRecords(c.env, c.req.param("name"));

    return c.json({
      ...createServiceStatus("api"),
      access: formatPublicApiAccess(c.get("publicApiPrincipal")),
      collection: {
        collectionName: result.collection.definition.name,
        label: result.collection.definition.label,
        routes: createPublicCollectionCrudRoute(result.collection.definition.name),
        supportedFieldNames: result.supportedFieldNames,
      },
      records: result.records,
    });
  } catch (error) {
    if (error instanceof CollectionRecordError) {
      return c.json(
        {
          error: error.message,
          issues: error.issues,
        },
        error.statusCode as 400,
      );
    }

    throw error;
  }
});

app.post("/api/collections/:name/records", requirePublicApiAccess("write"), async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Record payload must be valid JSON." }, 400);
  }

  try {
    const result = await createCollectionRecord(c.env, c.req.param("name"), body);

    return c.json({
      ...createServiceStatus("api"),
      access: formatPublicApiAccess(c.get("publicApiPrincipal")),
      collection: {
        collectionName: result.collection.definition.name,
        label: result.collection.definition.label,
        routes: createPublicCollectionCrudRoute(result.collection.definition.name),
        supportedFieldNames: result.supportedFieldNames,
      },
      message: "Record created.",
      record: result.record,
    });
  } catch (error) {
    if (error instanceof CollectionRecordError) {
      return c.json(
        {
          error: error.message,
          issues: error.issues,
        },
        error.statusCode as 400,
      );
    }

    throw error;
  }
});

app.get("/api/collections/:name/records/:id", requirePublicApiAccess("read"), async (c) => {
  try {
    const result = await getCollectionRecord(c.env, c.req.param("name"), c.req.param("id"));

    return c.json({
      ...createServiceStatus("api"),
      access: formatPublicApiAccess(c.get("publicApiPrincipal")),
      collection: {
        collectionName: result.collection.definition.name,
        label: result.collection.definition.label,
        routes: createPublicCollectionCrudRoute(result.collection.definition.name),
        supportedFieldNames: result.supportedFieldNames,
      },
      record: result.record,
    });
  } catch (error) {
    if (error instanceof CollectionRecordError) {
      return c.json(
        {
          error: error.message,
          issues: error.issues,
        },
        error.statusCode as 400,
      );
    }

    throw error;
  }
});

app.put("/api/collections/:name/records/:id", requirePublicApiAccess("write"), async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Record payload must be valid JSON." }, 400);
  }

  try {
    const result = await updateCollectionRecord(
      c.env,
      c.req.param("name"),
      c.req.param("id"),
      body,
    );

    return c.json({
      ...createServiceStatus("api"),
      access: formatPublicApiAccess(c.get("publicApiPrincipal")),
      collection: {
        collectionName: result.collection.definition.name,
        label: result.collection.definition.label,
        routes: createPublicCollectionCrudRoute(result.collection.definition.name),
        supportedFieldNames: result.supportedFieldNames,
      },
      message: "Record updated.",
      record: result.record,
    });
  } catch (error) {
    if (error instanceof CollectionRecordError) {
      return c.json(
        {
          error: error.message,
          issues: error.issues,
        },
        error.statusCode as 400,
      );
    }

    throw error;
  }
});

app.delete(
  "/api/collections/:name/records/:id",
  requirePublicApiAccess("write"),
  async (c) => {
    try {
      const result = await deleteCollectionRecord(
        c.env,
        c.req.param("name"),
        c.req.param("id"),
      );

      return c.json({
        ...createServiceStatus("api"),
        access: formatPublicApiAccess(c.get("publicApiPrincipal")),
        collection: {
          collectionName: result.collection.definition.name,
          label: result.collection.definition.label,
          routes: createPublicCollectionCrudRoute(result.collection.definition.name),
          supportedFieldNames: result.supportedFieldNames,
        },
        deletedRecordId: result.deletedRecordId,
        message: "Record deleted.",
      });
    } catch (error) {
      if (error instanceof CollectionRecordError) {
        return c.json(
          {
            error: error.message,
            issues: error.issues,
          },
          error.statusCode as 400,
        );
      }

      throw error;
    }
  },
);

app.get("/setup/status", async (c) => {
  try {
    const auth = await getAuthSetupStatus(c.env);

    return c.json({
      ...createServiceStatus("api"),
      auth,
    });
  } catch (error) {
    if (error instanceof AuthConfigError) {
      return c.json({ error: error.message }, 503);
    }

    throw error;
  }
});

app.get("/session", requireSession, (c) => {
  return c.json({
    ...createServiceStatus("api"),
    authorization: c.get("authorization"),
    session: c.get("session"),
  });
});

app.post("/invites", requirePermission("users.invite"), async (c) => {
  const body = await c.req.json();
  const parsed = parseInviteRequest(body);

  if (!parsed) {
    return c.json({ error: "A valid invite email is required." }, 400);
  }

  try {
    const invite = await runWithExecutionContext(c.executionCtx, () =>
      createInvite(c.env, {
        email: parsed.email,
        ...(parsed.name ? { inviteeName: parsed.name } : {}),
        inviterName: c.get("session").user.name || c.get("session").user.email,
        ...(parsed.roleId ? { roleId: parsed.roleId } : {}),
      }),
    );

    return c.json({
      ...createServiceStatus("api"),
      invite,
      message: "Invite email queued.",
    });
  } catch (error) {
    if (error instanceof AuthConfigError) {
      return c.json({ error: error.message }, 503);
    }

    if (error instanceof APIError) {
      return c.json(
        { error: error.message },
        typeof error.statusCode === "number" ? (error.statusCode as 400) : 400,
      );
    }

    throw error;
  }
});

app.get(
  "/roles",
  requireAnyPermission([
    "users.read",
    "users.invite",
    "users.update",
    "settings.read",
    "settings.update",
  ]),
  async (c) => {
    try {
      const roles = await listAvailableRoleDefinitions(c.env);

      return c.json({
        ...createServiceStatus("api"),
        roles,
      });
    } catch (error) {
      if (error instanceof DatamixRoleError) {
        return c.json(
          {
            error: error.message,
            issues: error.issues,
          },
          error.statusCode as 400,
        );
      }

      throw error;
    }
  },
);

app.put("/roles/:id", requirePermission("settings.update"), async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Role definition payload must be valid JSON." }, 400);
  }

  const parsed = parseRoleDefinitionRequest(body);

  if (!parsed) {
    return c.json({ error: "Role definition payload is incomplete." }, 400);
  }

  if (parsed.id !== c.req.param("id")) {
    return c.json({ error: "Route role id must match the role definition id." }, 400);
  }

  try {
    const role = await saveCustomRoleDefinition(c.env, parsed);

    return c.json({
      ...createServiceStatus("api"),
      message: "Role definition saved.",
      role,
    });
  } catch (error) {
    if (error instanceof DatamixRoleError) {
      return c.json(
        {
          error: error.message,
          issues: error.issues,
        },
        error.statusCode as 400,
      );
    }

    throw error;
  }
});

app.get("/users", requirePermission("users.read"), async (c) => {
  try {
    const users = await listDatamixUsers(c.env);

    return c.json({
      ...createServiceStatus("api"),
      users,
    });
  } catch (error) {
    if (error instanceof DatamixUserError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }

    throw error;
  }
});

app.put("/users/:id/role", requirePermission("users.update"), async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "User role payload must be valid JSON." }, 400);
  }

  const parsed = parseUserRoleRequest(body);

  if (!parsed) {
    return c.json({ error: "A valid role id is required." }, 400);
  }

  try {
    const result = await updateDatamixUserRole(c.env, c.req.param("id"), parsed.roleId);

    return c.json({
      ...createServiceStatus("api"),
      message: "User role updated.",
      role: result.role,
      user: result,
    });
  } catch (error) {
    if (error instanceof DatamixUserError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }

    throw error;
  }
});

app.get(
  "/api-keys",
  requireAnyPermission(["settings.read", "settings.update"]),
  async (c) => {
  try {
    const runtime = readPublicApiRuntime(c.env);
    const apiKeys = await listDatamixApiKeys(c.env);

    return c.json({
      ...createServiceStatus("api"),
      apiKeys,
      runtime: createPublicApiRuntimeSummary(runtime),
    });
  } catch (error) {
    if (error instanceof DatamixApiKeyError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }

    if (error instanceof PublicApiConfigError) {
      return c.json({ error: error.message }, 503);
    }

    throw error;
  }
  },
);

app.post("/api-keys", requirePermission("settings.update"), async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "API key payload must be valid JSON." }, 400);
  }

  const parsed = parseApiKeyRequest(body);

  if (!parsed) {
    return c.json({ error: "API key label and access level are required." }, 400);
  }

  try {
    const result = await createDatamixApiKey(c.env, parsed);

    return c.json({
      ...createServiceStatus("api"),
      apiKey: result.apiKey,
      message: "API key created. Copy the secret now because it will not be shown again.",
      secret: result.secret,
    });
  } catch (error) {
    if (error instanceof DatamixApiKeyError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }

    throw error;
  }
});

app.put("/api-keys/:id", requirePermission("settings.update"), async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "API key payload must be valid JSON." }, 400);
  }

  const parsed = parseApiKeyRequest(body);

  if (!parsed) {
    return c.json({ error: "API key label and access level are required." }, 400);
  }

  try {
    const apiKey = await updateDatamixApiKey(c.env, c.req.param("id"), parsed);

    return c.json({
      ...createServiceStatus("api"),
      apiKey,
      message: "API key updated.",
    });
  } catch (error) {
    if (error instanceof DatamixApiKeyError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }

    throw error;
  }
});

app.post("/api-keys/:id/revoke", requirePermission("settings.update"), async (c) => {
  try {
    const apiKey = await revokeDatamixApiKey(c.env, c.req.param("id"));

    return c.json({
      ...createServiceStatus("api"),
      apiKey,
      message: apiKey.revokedAt ? "API key revoked." : "API key update did not complete.",
    });
  } catch (error) {
    if (error instanceof DatamixApiKeyError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }

    throw error;
  }
});

app.get("/media/assets", requirePermission("media.read"), async (c) => {
  try {
    const assets = await listMediaAssets(c.env);

    return c.json({
      ...createServiceStatus("api"),
      assets,
      message: "Media asset metadata is available.",
    });
  } catch (error) {
    if (error instanceof MediaAssetError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }

    throw error;
  }
});

app.post("/media/assets", requirePermission("media.upload"), async (c) => {
  const contentType = c.req.header("content-type") ?? "";

  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return c.json({ error: "Media upload payload must be multipart/form-data." }, 400);
  }

  let formData: FormData;

  try {
    formData = await c.req.formData();
  } catch {
    return c.json({ error: "Media upload payload could not be read." }, 400);
  }

  try {
    const result = await createMediaAsset(c.env, c.get("session"), formData);

    return c.json({
      ...createServiceStatus("api"),
      asset: result.asset,
      message: "Media asset uploaded.",
    });
  } catch (error) {
    if (error instanceof MediaAssetError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }

    throw error;
  }
});

app.get("/media/object/*", async (c) => {
  try {
    const storageKey = c.req.param("*");

    if (!storageKey) {
      return c.json({ error: "Media storage key is required." }, 400);
    }

    const mediaObject = await getMediaObject(c.env, storageKey, new URL(c.req.url));
    const headers = new Headers();

    headers.set("Cache-Control", mediaObject.cacheControl);
    headers.set("Content-Length", String(mediaObject.contentLength));
    headers.set("Content-Type", mediaObject.contentType);
    headers.set("X-Content-Type-Options", "nosniff");

    if (mediaObject.etag) {
      headers.set("ETag", mediaObject.etag);
    }

    return new Response(mediaObject.body, {
      headers,
      status: 200,
    });
  } catch (error) {
    if (error instanceof MediaAssetError) {
      return c.json({ error: error.message }, error.statusCode as 400);
    }

    throw error;
  }
});

app.get("/collection-definitions", requirePermission("collections.read"), async (c) => {
  try {
    const collections = await listCollectionDefinitions(c.env);

    return c.json({
      ...createServiceStatus("api"),
      collections: collections.map((collection) => ({
        createdAt: collection.createdAt,
        definition: collection.definition,
        tableName: collection.tableName,
        updatedAt: collection.updatedAt,
      })),
    });
  } catch (error) {
    if (error instanceof CollectionSchemaError) {
      return c.json(
        {
          error: error.message,
          issues: error.issues,
        },
        error.statusCode as 400,
      );
    }

    throw error;
  }
});

app.get("/collection-definitions/:name", requirePermission("collections.read"), async (c) => {
  try {
    const collection = await getCollectionDefinition(c.env, c.req.param("name"));

    if (!collection) {
      return c.json({ error: "Collection definition not found." }, 404);
    }

    return c.json({
      ...createServiceStatus("api"),
      collection: {
        createdAt: collection.createdAt,
        definition: collection.definition,
        tableName: collection.tableName,
        updatedAt: collection.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof CollectionSchemaError) {
      return c.json(
        {
          error: error.message,
          issues: error.issues,
        },
        error.statusCode as 400,
      );
    }

    throw error;
  }
});

app.put("/collection-definitions/:name", requireSession, async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Collection definition payload must be valid JSON." }, 400);
  }

  if (
    typeof body === "object" &&
    body !== null &&
    "name" in body &&
    typeof body.name === "string" &&
    body.name !== c.req.param("name")
  ) {
    return c.json(
      {
        error: "Route collection name must match the definition name.",
      },
      400,
    );
  }

  try {
    const existingCollection = await getCollectionDefinition(c.env, c.req.param("name"));
    const forbiddenResponse = forbidMissingPermission(
      c,
      existingCollection ? "collections.update" : "collections.create",
    );

    if (forbiddenResponse) {
      return forbiddenResponse;
    }

    const result = await saveCollectionDefinition(c.env, body);

    return c.json({
      ...createServiceStatus("api"),
      ...formatCollectionDefinitionResponse(result),
      message: "Collection definition saved.",
    });
  } catch (error) {
    if (error instanceof CollectionSchemaError) {
      return c.json(
        {
          error: error.message,
          issues: error.issues,
        },
        error.statusCode as 400,
      );
    }

    throw error;
  }
});

app.get("/collections", requirePermission("collections.read"), async (c) => {
  try {
    const collections = await listGeneratedCollectionCrudRoutes(c.env);

    return c.json({
      ...createServiceStatus("api"),
      collections,
      message: "Generated collection CRUD routes are available.",
    });
  } catch (error) {
    if (error instanceof CollectionRecordError) {
      return c.json(
        {
          error: error.message,
          issues: error.issues,
        },
        error.statusCode as 400,
      );
    }

    throw error;
  }
});

app.get("/collections/:name", requirePermission("collections.read"), async (c) => {
  try {
    const collection = await getCollectionDefinition(c.env, c.req.param("name"));

    if (!collection) {
      return c.json({ error: "Collection definition not found." }, 404);
    }

    return c.json({
      ...createServiceStatus("api"),
      collection: {
        createdAt: collection.createdAt,
        definition: collection.definition,
        routes: createGeneratedCollectionCrudRoute(collection.definition.name),
        tableName: collection.tableName,
        updatedAt: collection.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof CollectionSchemaError) {
      return c.json(
        {
          error: error.message,
          issues: error.issues,
        },
        error.statusCode as 400,
      );
    }

    throw error;
  }
});

app.get(
  "/collections/:name/records",
  requireEveryPermission(["collections.read", "records.read"]),
  async (c) => {
    try {
      const result = await listCollectionRecords(c.env, c.req.param("name"));

      return c.json({
        ...createServiceStatus("api"),
        collection: {
          createdAt: result.collection.createdAt,
          definition: result.collection.definition,
          routes: createGeneratedCollectionCrudRoute(result.collection.definition.name),
          tableName: result.collection.tableName,
          updatedAt: result.collection.updatedAt,
        },
        records: result.records,
        supportedFieldNames: result.supportedFieldNames,
      });
    } catch (error) {
      if (error instanceof CollectionRecordError) {
        return c.json(
          {
            error: error.message,
            issues: error.issues,
          },
          error.statusCode as 400,
        );
      }

      throw error;
    }
  },
);

app.post(
  "/collections/:name/records",
  requireEveryPermission(["collections.read", "records.create"]),
  async (c) => {
    let body: unknown;

    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Record payload must be valid JSON." }, 400);
    }

    try {
      const result = await createCollectionRecord(c.env, c.req.param("name"), body);

      return c.json({
        ...createServiceStatus("api"),
        collection: {
          createdAt: result.collection.createdAt,
          definition: result.collection.definition,
          routes: createGeneratedCollectionCrudRoute(result.collection.definition.name),
          tableName: result.collection.tableName,
          updatedAt: result.collection.updatedAt,
        },
        message: "Record created.",
        record: result.record,
        supportedFieldNames: result.supportedFieldNames,
      });
    } catch (error) {
      if (error instanceof CollectionRecordError) {
        return c.json(
          {
            error: error.message,
            issues: error.issues,
          },
          error.statusCode as 400,
        );
      }

      throw error;
    }
  },
);

app.get(
  "/collections/:name/records/:id",
  requireEveryPermission(["collections.read", "records.read"]),
  async (c) => {
    try {
      const result = await getCollectionRecord(c.env, c.req.param("name"), c.req.param("id"));

      return c.json({
        ...createServiceStatus("api"),
        collection: {
          createdAt: result.collection.createdAt,
          definition: result.collection.definition,
          routes: createGeneratedCollectionCrudRoute(result.collection.definition.name),
          tableName: result.collection.tableName,
          updatedAt: result.collection.updatedAt,
        },
        record: result.record,
        supportedFieldNames: result.supportedFieldNames,
      });
    } catch (error) {
      if (error instanceof CollectionRecordError) {
        return c.json(
          {
            error: error.message,
            issues: error.issues,
          },
          error.statusCode as 400,
        );
      }

      throw error;
    }
  },
);

app.put(
  "/collections/:name/records/:id",
  requireEveryPermission(["collections.read", "records.update"]),
  async (c) => {
    let body: unknown;

    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Record payload must be valid JSON." }, 400);
    }

    try {
      const result = await updateCollectionRecord(
        c.env,
        c.req.param("name"),
        c.req.param("id"),
        body,
      );

      return c.json({
        ...createServiceStatus("api"),
        collection: {
          createdAt: result.collection.createdAt,
          definition: result.collection.definition,
          routes: createGeneratedCollectionCrudRoute(result.collection.definition.name),
          tableName: result.collection.tableName,
          updatedAt: result.collection.updatedAt,
        },
        message: "Record updated.",
        record: result.record,
        supportedFieldNames: result.supportedFieldNames,
      });
    } catch (error) {
      if (error instanceof CollectionRecordError) {
        return c.json(
          {
            error: error.message,
            issues: error.issues,
          },
          error.statusCode as 400,
        );
      }

      throw error;
    }
  },
);

app.delete(
  "/collections/:name/records/:id",
  requireEveryPermission(["collections.read", "records.delete"]),
  async (c) => {
    try {
      const result = await deleteCollectionRecord(
        c.env,
        c.req.param("name"),
        c.req.param("id"),
      );

      return c.json({
        ...createServiceStatus("api"),
        collection: {
          createdAt: result.collection.createdAt,
          definition: result.collection.definition,
          routes: createGeneratedCollectionCrudRoute(result.collection.definition.name),
          tableName: result.collection.tableName,
          updatedAt: result.collection.updatedAt,
        },
        deletedRecordId: result.deletedRecordId,
        message: "Record deleted.",
        supportedFieldNames: result.supportedFieldNames,
      });
    } catch (error) {
      if (error instanceof CollectionRecordError) {
        return c.json(
          {
            error: error.message,
            issues: error.issues,
          },
          error.statusCode as 400,
        );
      }

      throw error;
    }
  },
);

app.get(
  "/records/:name",
  requireEveryPermission(["collections.read", "records.read"]),
  async (c) => {
    try {
      const result = await listCollectionRecords(c.env, c.req.param("name"));

      return c.json({
        ...createServiceStatus("api"),
        collection: {
          createdAt: result.collection.createdAt,
          definition: result.collection.definition,
          tableName: result.collection.tableName,
          updatedAt: result.collection.updatedAt,
        },
        records: result.records,
        supportedFieldNames: result.supportedFieldNames,
      });
    } catch (error) {
      if (error instanceof CollectionRecordError) {
        return c.json(
          {
            error: error.message,
            issues: error.issues,
          },
          error.statusCode as 400,
        );
      }

      throw error;
    }
  },
);

app.post(
  "/records/:name",
  requireEveryPermission(["collections.read", "records.create"]),
  async (c) => {
    let body: unknown;

    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Record payload must be valid JSON." }, 400);
    }

    try {
      const result = await createCollectionRecord(c.env, c.req.param("name"), body);

      return c.json({
        ...createServiceStatus("api"),
        collection: {
          createdAt: result.collection.createdAt,
          definition: result.collection.definition,
          tableName: result.collection.tableName,
          updatedAt: result.collection.updatedAt,
        },
        message: "Record created.",
        record: result.record,
        supportedFieldNames: result.supportedFieldNames,
      });
    } catch (error) {
      if (error instanceof CollectionRecordError) {
        return c.json(
          {
            error: error.message,
            issues: error.issues,
          },
          error.statusCode as 400,
        );
      }

      throw error;
    }
  },
);

app.put(
  "/records/:name/:id",
  requireEveryPermission(["collections.read", "records.update"]),
  async (c) => {
    let body: unknown;

    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Record payload must be valid JSON." }, 400);
    }

    try {
      const result = await updateCollectionRecord(
        c.env,
        c.req.param("name"),
        c.req.param("id"),
        body,
      );

      return c.json({
        ...createServiceStatus("api"),
        collection: {
          createdAt: result.collection.createdAt,
          definition: result.collection.definition,
          tableName: result.collection.tableName,
          updatedAt: result.collection.updatedAt,
        },
        message: "Record updated.",
        record: result.record,
        supportedFieldNames: result.supportedFieldNames,
      });
    } catch (error) {
      if (error instanceof CollectionRecordError) {
        return c.json(
          {
            error: error.message,
            issues: error.issues,
          },
          error.statusCode as 400,
        );
      }

      throw error;
    }
  },
);

app.get("/health", (c) => {
  const runtime = readApiRuntime(c.env);

  return c.json({
    ...createServiceStatus("api"),
    runtime,
  });
});
