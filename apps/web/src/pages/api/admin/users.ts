import { listAdminUsers } from "@/server/routes/admin-handlers";
import { defineAstroRequestRoute } from "@/server/routes/astro";
import { adminOptions } from "@/server/routes/http";

export const prerender = false;

export const GET = defineAstroRequestRoute(listAdminUsers);
export const OPTIONS = defineAstroRequestRoute(adminOptions);
