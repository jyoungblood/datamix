import {
  getAdminCollectionDefinition,
  saveAdminCollectionDefinition,
} from "@/server/routes/admin-handlers";
import { defineAstroRoute, defineAstroRequestRoute } from "@/server/routes/astro";
import { adminOptions } from "@/server/routes/http";

export const prerender = false;

export const GET = defineAstroRoute(getAdminCollectionDefinition);
export const PUT = defineAstroRoute(saveAdminCollectionDefinition);
export const OPTIONS = defineAstroRequestRoute(adminOptions);
