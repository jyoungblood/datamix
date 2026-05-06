import { createServiceStatus } from "@datamix/core";
import { APIError, z } from "better-auth";
import { cors } from "hono/cors";
import { Hono } from "hono";

import { createAuth, getAuthSetupStatus } from "./auth";
import { requireSession } from "./auth-guard";
import {
  AuthConfigError,
  readApiRuntime,
  type ApiBindings,
} from "./env";
import { createInvite } from "./invite";
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

app.use("/api/auth/*", async (c, next) => {
  return allowAdminBrowser(c.env.ADMIN_ORIGIN)(c, next);
});

app.use("/setup/*", async (c, next) => {
  return allowAdminBrowser(c.env.ADMIN_ORIGIN)(c, next);
});

app.use("/invites", async (c, next) => {
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

app.get("/health", (c) => {
  const runtime = readApiRuntime(c.env);

  return c.json({
    ...createServiceStatus("api"),
    runtime,
  });
});
