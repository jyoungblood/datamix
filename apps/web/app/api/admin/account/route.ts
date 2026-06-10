import { updateAdminCurrentUserProfile } from "@/server/routes/admin-handlers";
import { adminOptions } from "@/server/routes/http";

export const dynamic = "force-dynamic";

export const PUT = updateAdminCurrentUserProfile;
export const OPTIONS = adminOptions;
