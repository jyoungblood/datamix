import { createMiddleware } from "hono/factory";
import type { HTTPException } from "hono/http-exception";

import { createAuth, type DatamixSession } from "./auth";
import { AuthConfigError, type ApiBindings } from "./env";

type AuthVariables = {
  session: DatamixSession;
};

export type ApiAuthContext = {
  Bindings: ApiBindings;
  Variables: AuthVariables;
};

function isBetterAuthError(error: unknown): error is HTTPException {
  return typeof error === "object" && error !== null && "getResponse" in error;
}

export const requireSession = createMiddleware<ApiAuthContext>(async (c, next) => {
  try {
    const session = await createAuth(c.env).api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    c.set("session", session);

    await next();
  } catch (error) {
    if (isBetterAuthError(error)) {
      return error.getResponse();
    }

    if (error instanceof AuthConfigError) {
      return c.json({ error: error.message }, 503);
    }

    throw error;
  }
});
