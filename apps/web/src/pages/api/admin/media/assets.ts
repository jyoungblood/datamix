import {
  listAdminMediaAssets,
  uploadAdminMediaAsset,
} from "@/server/routes/admin-handlers";
import { defineAstroRequestRoute } from "@/server/routes/astro";
import { adminOptions } from "@/server/routes/http";

export const prerender = false;

export const GET = defineAstroRequestRoute(listAdminMediaAssets);
export const POST = defineAstroRequestRoute(uploadAdminMediaAsset);
export const OPTIONS = defineAstroRequestRoute(adminOptions);
