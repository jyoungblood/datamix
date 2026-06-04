import {
  createAdminRecord,
  listAdminRecords,
} from "@/server/routes/admin-handlers";
import { adminOptions } from "@/server/routes/http";

export const dynamic = "force-dynamic";

export const GET = listAdminRecords;
export const POST = createAdminRecord;
export const OPTIONS = adminOptions;
