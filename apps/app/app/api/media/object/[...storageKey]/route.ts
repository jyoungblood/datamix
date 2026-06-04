import { publicMediaOptions } from "@/server/routes/http";
import { getPublicMediaObject } from "@/server/routes/media-handlers";

export const dynamic = "force-dynamic";

export const GET = getPublicMediaObject;
export const OPTIONS = publicMediaOptions;
