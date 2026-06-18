import { getSetupStatus } from "@/server/routes/status-handlers";
import { defineAstroRequestRoute } from "@/server/routes/astro";
import { adminOptions } from "@/server/routes/http";

export const prerender = false;

export const GET = defineAstroRequestRoute(getSetupStatus);
export const OPTIONS = defineAstroRequestRoute(adminOptions);
