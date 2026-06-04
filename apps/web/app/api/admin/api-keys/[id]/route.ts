import { updateAdminApiKey } from "@/server/routes/admin-handlers";
import { adminOptions } from "@/server/routes/http";

export const dynamic = "force-dynamic";

export const PUT = updateAdminApiKey;
export const OPTIONS = adminOptions;
