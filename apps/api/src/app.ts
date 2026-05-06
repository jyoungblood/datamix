import { createServiceStatus } from "@datamix/core";
import { cors } from "hono/cors";
import { Hono } from "hono";

import { createAuth, getAuthSetupStatus } from "./auth";
import { requireSession } from "./auth-guard";
import {
  AuthConfigError,
  readApiRuntime,
  type ApiBindings,
} from "./env";

export const app = new Hono<{ Bindings: ApiBindings }>();

function allowAdminBrowser(origin: string) {
  return cors({
    origin,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });
}

app.use("/api/auth/*", async (c, next) => {
  return allowAdminBrowser(c.env.ADMIN_ORIGIN)(c, next);
});

app.use("/setup/*", async (c, next) => {
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

app.get("/health", (c) => {
  const runtime = readApiRuntime(c.env);

  return c.json({
    ...createServiceStatus("api"),
    runtime,
  });
});
