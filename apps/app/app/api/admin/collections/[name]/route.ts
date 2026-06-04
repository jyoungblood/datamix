import { getAdminCollection } from "@/server/routes/admin-handlers";
import { adminOptions } from "@/server/routes/http";

export const dynamic = "force-dynamic";

export const GET = getAdminCollection;
export const OPTIONS = adminOptions;
