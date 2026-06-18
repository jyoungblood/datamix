import { getAdminSession } from "@/server/routes/admin-handlers";
import { defineAstroRequestRoute } from "@/server/routes/astro";
import { adminOptions } from "@/server/routes/http";

export const prerender = false;

export const GET = defineAstroRequestRoute(getAdminSession);
export const OPTIONS = defineAstroRequestRoute(adminOptions);
