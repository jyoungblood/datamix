import { AuthConfigError } from "../env";
import { createAuth } from "../auth";
import { getDatamixEnv, jsonResponse, withAdminCors } from "./http";

export async function handleAuth(
  request: Request,
  options?: {
    executionContext?: ExecutionContext;
  },
) {
  const env = getDatamixEnv();
  const authOptions = {
    baseURL: new URL(request.url).origin,
    ...(options?.executionContext
      ? { executionContext: options.executionContext }
      : {}),
  };

  try {
    const response = await createAuth(env, authOptions).handler(request);

    return withAdminCors(request, response);
  } catch (error) {
    if (error instanceof AuthConfigError) {
      return withAdminCors(request, jsonResponse({ error: error.message }, 503));
    }

    throw error;
  }
}
