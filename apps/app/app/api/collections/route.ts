import { publicJsonOptions } from "@/server/routes/http";
import { listPublicCollections } from "@/server/routes/public-collection-handlers";

export const dynamic = "force-dynamic";

export const GET = listPublicCollections;
export const OPTIONS = publicJsonOptions;
