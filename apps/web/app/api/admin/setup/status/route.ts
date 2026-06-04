import { adminOptions } from "@/server/routes/http";
import { getSetupStatus } from "@/server/routes/status-handlers";

export const dynamic = "force-dynamic";

export const GET = getSetupStatus;
export const OPTIONS = adminOptions;
