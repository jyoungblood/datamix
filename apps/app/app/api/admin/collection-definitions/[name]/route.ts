import {
  getAdminCollectionDefinition,
  saveAdminCollectionDefinition,
} from "@/server/routes/admin-handlers";
import { adminOptions } from "@/server/routes/http";

export const dynamic = "force-dynamic";

export const GET = getAdminCollectionDefinition;
export const PUT = saveAdminCollectionDefinition;
export const OPTIONS = adminOptions;
