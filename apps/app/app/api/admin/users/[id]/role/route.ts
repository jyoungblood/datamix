import { updateAdminUserRole } from "@/server/routes/admin-handlers";
import { adminOptions } from "@/server/routes/http";

export const dynamic = "force-dynamic";

export const PUT = updateAdminUserRole;
export const OPTIONS = adminOptions;
