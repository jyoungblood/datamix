import { listPublicCollections } from "@/server/routes/public-collection-handlers";
import { defineAstroRequestRoute } from "@/server/routes/astro";
import { publicJsonOptions } from "@/server/routes/http";

export const prerender = false;

export const GET = defineAstroRequestRoute(listPublicCollections);
export const OPTIONS = defineAstroRequestRoute(publicJsonOptions);
