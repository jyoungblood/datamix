import { listAdminUsers } from "@/server/routes/admin-handlers";
import { adminOptions } from "@/server/routes/http";

export const dynamic = "force-dynamic";

export const GET = listAdminUsers;
export const OPTIONS = adminOptions;
