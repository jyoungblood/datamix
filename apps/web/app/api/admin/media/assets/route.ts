import {
  listAdminMediaAssets,
  uploadAdminMediaAsset,
} from "@/server/routes/admin-handlers";
import { adminOptions } from "@/server/routes/http";

export const dynamic = "force-dynamic";

export const GET = listAdminMediaAssets;
export const POST = uploadAdminMediaAsset;
export const OPTIONS = adminOptions;
