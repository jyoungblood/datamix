import { publicJsonOptions } from "@/server/routes/http";
import {
  deletePublicCollectionRecord,
  getPublicCollectionRecord,
  updatePublicCollectionRecord,
} from "@/server/routes/public-collection-handlers";

export const dynamic = "force-dynamic";

export const GET = getPublicCollectionRecord;
export const PUT = updatePublicCollectionRecord;
export const DELETE = deletePublicCollectionRecord;
export const OPTIONS = publicJsonOptions;
