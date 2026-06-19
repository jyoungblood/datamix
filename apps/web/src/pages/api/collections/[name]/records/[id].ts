import {
  deletePublicCollectionRecord,
  getPublicCollectionRecord,
  updatePublicCollectionRecord,
} from "@/server/routes/public-collection-handlers";
import { defineAstroRoute, defineAstroRequestRoute } from "@/server/routes/astro";
import { publicJsonOptions } from "@/server/routes/http";

export const prerender = false;

export const GET = defineAstroRoute(getPublicCollectionRecord);
export const PUT = defineAstroRoute(updatePublicCollectionRecord);
export const DELETE = defineAstroRoute(deletePublicCollectionRecord);
export const OPTIONS = defineAstroRequestRoute(publicJsonOptions);
