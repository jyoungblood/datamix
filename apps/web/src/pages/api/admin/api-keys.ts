import {
  createAdminApiKey,
  listAdminApiKeys,
} from "@/server/routes/admin-handlers";
import { defineAstroRequestRoute } from "@/server/routes/astro";
import { adminOptions } from "@/server/routes/http";

export const prerender = false;

export const GET = defineAstroRequestRoute(listAdminApiKeys);
export const POST = defineAstroRequestRoute(createAdminApiKey);
export const OPTIONS = defineAstroRequestRoute(adminOptions);
