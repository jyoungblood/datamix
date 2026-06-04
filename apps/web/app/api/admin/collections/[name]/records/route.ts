import {
  createAdminCollectionRecord,
  listAdminCollectionRecords,
} from "@/server/routes/admin-handlers";
import { adminOptions } from "@/server/routes/http";

export const dynamic = "force-dynamic";

export const GET = listAdminCollectionRecords;
export const POST = createAdminCollectionRecord;
export const OPTIONS = adminOptions;
