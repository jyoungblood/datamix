import { getPublicMediaObject } from "@/server/routes/media-handlers";
import { defineAstroRequestRoute } from "@/server/routes/astro";
import { publicMediaOptions } from "@/server/routes/http";

export const prerender = false;

export const GET = defineAstroRequestRoute(getPublicMediaObject);
export const OPTIONS = defineAstroRequestRoute(publicMediaOptions);
