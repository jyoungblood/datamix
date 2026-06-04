import { listAdminCollections } from "@/server/routes/admin-handlers";
import { adminOptions } from "@/server/routes/http";

export const dynamic = "force-dynamic";

export const GET = listAdminCollections;
export const OPTIONS = adminOptions;
