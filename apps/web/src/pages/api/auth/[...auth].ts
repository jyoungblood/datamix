import type { APIRoute } from "astro";

import { handleAuth } from "@/server/routes/auth-handlers";
import { adminOptions } from "@/server/routes/http";

export const prerender = false;

export const GET = (async (context) => {
  return handleAuth(context.request, {
    executionContext: context.locals.cfContext,
  });
}) satisfies APIRoute;

export const POST = GET;

export const OPTIONS = (async ({ request }) => {
  return adminOptions(request);
}) satisfies APIRoute;
