import { createAdminInvite } from "@/server/routes/admin-handlers";
import { adminOptions } from "@/server/routes/http";

export const dynamic = "force-dynamic";

export const POST = createAdminInvite;
export const OPTIONS = adminOptions;
