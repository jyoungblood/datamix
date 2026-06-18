import { getApiIndex } from "@/server/routes/status-handlers";
import { defineAstroRequestRoute } from "@/server/routes/astro";

export const prerender = false;

export const GET = defineAstroRequestRoute(getApiIndex);
