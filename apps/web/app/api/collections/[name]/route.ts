import { publicJsonOptions } from "@/server/routes/http";
import { getPublicCollection } from "@/server/routes/public-collection-handlers";

export const dynamic = "force-dynamic";

export const GET = getPublicCollection;
export const OPTIONS = publicJsonOptions;
