import {
  deleteAdminCollectionRecord,
  getAdminCollectionRecord,
  updateAdminCollectionRecord,
} from "@/server/routes/admin-handlers";
import { adminOptions } from "@/server/routes/http";

export const dynamic = "force-dynamic";

export const GET = getAdminCollectionRecord;
export const PUT = updateAdminCollectionRecord;
export const DELETE = deleteAdminCollectionRecord;
export const OPTIONS = adminOptions;
