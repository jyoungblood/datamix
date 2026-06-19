import { revokeAdminApiKey } from "@/server/routes/admin-handlers";
import { defineAstroRoute, defineAstroRequestRoute } from "@/server/routes/astro";
import { adminOptions } from "@/server/routes/http";

export const prerender = false;

export const POST = defineAstroRoute(revokeAdminApiKey);
export const OPTIONS = defineAstroRequestRoute(adminOptions);
