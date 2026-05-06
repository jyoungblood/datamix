import { createServiceStatus } from "@datamix/core";
import { cors } from "hono/cors";
import { Hono } from "hono";

import { createAuth, runAuthMigrations } from "./auth";
import { requireSession } from "./auth-guard";
import {
  AuthConfigError,
  readApiAuthRuntime,
  readApiRuntime,
  type ApiBindings,
} from "./env";

export const app = new Hono<{ Bindings: ApiBindings }>();

app.use("/api/auth/*", async (c, next) => {
  const corsMiddleware = cors({
    origin: c.env.ADMIN_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  return corsMiddleware(c, next);
});

app.on(["GET", "POST"], "/api/auth/*", (c) => {
  try {
    return createAuth(c.env).handler(c.req.raw);
  } catch (error) {
    if (error instanceof AuthConfigError) {
      return c.json({ error: error.message }, 503);
    }

    throw error;
  }
});

app.get("/", (c) => {
  const runtime = readApiRuntime(c.env);

  return c.json({
    ...createServiceStatus("api"),
    runtime,
    message: "Datamix API scaffold is ready for Cloudflare runtime wiring.",
  });
});

app.post("/setup/auth/migrate", async (c) => {
  let authRuntime;

  try {
    authRuntime = readApiAuthRuntime(c.env);
  } catch (error) {
    if (error instanceof AuthConfigError) {
      return c.json({ error: error.message }, 503);
    }

    throw error;
  }

  const requestToken = c.req.header("x-datamix-setup-token")?.trim();

  if (!authRuntime.AUTH_SETUP_TOKEN) {
    return c.json(
      {
        error:
          "AUTH_SETUP_TOKEN is not configured. Set it before running auth migrations through the API.",
      },
      503,
    );
  }

  if (!requestToken || requestToken !== authRuntime.AUTH_SETUP_TOKEN) {
    return c.json({ error: "Unauthorized setup token." }, 401);
  }

  const result = await runAuthMigrations(c.env);

  return c.json({
    ...createServiceStatus("api"),
    auth: {
      migrated: true,
      ...result,
    },
  });
});

app.get("/session", requireSession, (c) => {
  return c.json({
    ...createServiceStatus("api"),
    session: c.get("session"),
  });
});

app.get("/health", (c) => {
  const runtime = readApiRuntime(c.env);

  return c.json({
    ...createServiceStatus("api"),
    runtime,
  });
});
