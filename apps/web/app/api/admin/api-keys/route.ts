import {
  createAdminApiKey,
  listAdminApiKeys,
} from "@/server/routes/admin-handlers";
import { adminOptions } from "@/server/routes/http";

export const dynamic = "force-dynamic";

export const GET = listAdminApiKeys;
export const POST = createAdminApiKey;
export const OPTIONS = adminOptions;
