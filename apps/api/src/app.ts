import { createServiceStatus } from "@datamix/core";
import { APIError, z } from "better-auth";
import { cors } from "hono/cors";
import { Hono } from "hono";

import { createAuth, getAuthSetupStatus } from "./auth";
import { requireSession } from "./auth-guard";
import {
  CollectionSchemaError,
  formatCollectionDefinitionResponse,
  getCollectionDefinition,
  listCollectionDefinitions,
  saveCollectionDefinition,
} from "./collections";
import {
  AuthConfigError,
  readApiRuntime,
  type ApiBindings,
} from "./env";
import { createInvite } from "./invite";
import {
  createMediaAsset,
  listMediaAssets,
  MediaAssetError,
} from "./media";
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

export const app = new Hono<{ Bindings: ApiBindings }>();

const inviteRequestSchema = z.object({
  email: z.email(),
  name: z.string().trim().min(1).max(120).optional(),
});

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

app.use("/session", async (c, next) => {
  const corsMiddleware = cors({
    origin: c.env.ADMIN_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  return corsMiddleware(c, next);
});

app.on(["GET", "POST"], "/api/auth/*", (c) => {
  return runWithExecutionContext(c.executionCtx, () => {
    try {
      return createAuth(c.env).handler(c.req.raw);
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
    session: c.get("session"),
  });
});

app.post("/invites", requireSession, async (c) => {
  const body = await c.req.json();
  const parsed = inviteRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "A valid invite email is required." }, 400);
  }

  try {
    const invite = await runWithExecutionContext(c.executionCtx, () =>
      createInvite(c.env, {
        email: parsed.data.email,
        ...(parsed.data.name ? { inviteeName: parsed.data.name } : {}),
        inviterName: c.get("session").user.name || c.get("session").user.email,
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

app.get("/media/assets", requireSession, async (c) => {
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

app.post("/media/assets", requireSession, async (c) => {
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

app.get("/collection-definitions", requireSession, async (c) => {
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

app.get("/collection-definitions/:name", requireSession, async (c) => {
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

app.get("/collections", requireSession, async (c) => {
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

app.get("/collections/:name", requireSession, async (c) => {
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

app.get("/collections/:name/records", requireSession, async (c) => {
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
});

app.post("/collections/:name/records", requireSession, async (c) => {
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
});

app.get("/collections/:name/records/:id", requireSession, async (c) => {
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
});

app.put("/collections/:name/records/:id", requireSession, async (c) => {
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
});

app.delete("/collections/:name/records/:id", requireSession, async (c) => {
  try {
    const result = await deleteCollectionRecord(c.env, c.req.param("name"), c.req.param("id"));

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
});

app.get("/records/:name", requireSession, async (c) => {
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
});

app.post("/records/:name", requireSession, async (c) => {
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
});

app.put("/records/:name/:id", requireSession, async (c) => {
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
});

app.get("/health", (c) => {
  const runtime = readApiRuntime(c.env);

  return c.json({
    ...createServiceStatus("api"),
    runtime,
  });
});
