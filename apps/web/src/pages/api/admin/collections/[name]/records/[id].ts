import {
  deleteAdminCollectionRecord,
  getAdminCollectionRecord,
  updateAdminCollectionRecord,
} from "@/server/routes/admin-handlers";
import { defineAstroRoute, defineAstroRequestRoute } from "@/server/routes/astro";
import { adminOptions } from "@/server/routes/http";

export const prerender = false;

export const GET = defineAstroRoute(getAdminCollectionRecord);
export const PUT = defineAstroRoute(updateAdminCollectionRecord);
export const DELETE = defineAstroRoute(deleteAdminCollectionRecord);
export const OPTIONS = defineAstroRequestRoute(adminOptions);
