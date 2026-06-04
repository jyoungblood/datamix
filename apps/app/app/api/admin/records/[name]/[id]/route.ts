import { updateAdminRecord } from "@/server/routes/admin-handlers";
import { adminOptions } from "@/server/routes/http";

export const dynamic = "force-dynamic";

export const PUT = updateAdminRecord;
export const OPTIONS = adminOptions;
