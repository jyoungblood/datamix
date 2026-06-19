import { getPublicCollection } from "@/server/routes/public-collection-handlers";
import { defineAstroRoute, defineAstroRequestRoute } from "@/server/routes/astro";
import { publicJsonOptions } from "@/server/routes/http";

export const prerender = false;

export const GET = defineAstroRoute(getPublicCollection);
export const OPTIONS = defineAstroRequestRoute(publicJsonOptions);
