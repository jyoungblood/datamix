import { updateAdminRole } from "@/server/routes/admin-handlers";
import { adminOptions } from "@/server/routes/http";

export const dynamic = "force-dynamic";

export const PUT = updateAdminRole;
export const OPTIONS = adminOptions;
