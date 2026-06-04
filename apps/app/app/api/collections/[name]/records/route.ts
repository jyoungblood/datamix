import { publicJsonOptions } from "@/server/routes/http";
import {
  createPublicCollectionRecord,
  listPublicCollectionRecords,
} from "@/server/routes/public-collection-handlers";

export const dynamic = "force-dynamic";

export const GET = listPublicCollectionRecords;
export const POST = createPublicCollectionRecord;
export const OPTIONS = publicJsonOptions;
