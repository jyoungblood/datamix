import { getAdminSession } from "@/server/routes/admin-handlers";
import { adminOptions } from "@/server/routes/http";

export const dynamic = "force-dynamic";

export const GET = getAdminSession;
export const OPTIONS = adminOptions;
