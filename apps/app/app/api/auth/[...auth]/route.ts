import { handleAuth } from "@/server/routes/auth-handlers";
import { adminOptions } from "@/server/routes/http";

export const dynamic = "force-dynamic";

export const GET = handleAuth;
export const POST = handleAuth;
export const OPTIONS = adminOptions;
