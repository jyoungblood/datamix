import { updateAdminApiKey } from "@/server/routes/admin-handlers";
import { defineAstroRoute, defineAstroRequestRoute } from "@/server/routes/astro";
import { adminOptions } from "@/server/routes/http";

export const prerender = false;

export const PUT = defineAstroRoute(updateAdminApiKey);
export const OPTIONS = defineAstroRequestRoute(adminOptions);
