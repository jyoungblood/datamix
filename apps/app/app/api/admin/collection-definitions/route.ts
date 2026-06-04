import { listAdminCollectionDefinitions } from "@/server/routes/admin-handlers";
import { adminOptions } from "@/server/routes/http";

export const dynamic = "force-dynamic";

export const GET = listAdminCollectionDefinitions;
export const OPTIONS = adminOptions;
