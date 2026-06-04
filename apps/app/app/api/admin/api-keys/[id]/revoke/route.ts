import { revokeAdminApiKey } from "@/server/routes/admin-handlers";
import { adminOptions } from "@/server/routes/http";

export const dynamic = "force-dynamic";

export const POST = revokeAdminApiKey;
export const OPTIONS = adminOptions;
