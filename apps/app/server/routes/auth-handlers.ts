import { AuthConfigError } from "../env";
import { createAuth } from "../auth";
import { getDatamixEnv, jsonResponse, withAdminCors } from "./http";

export async function handleAuth(request: Request) {
  const env = getDatamixEnv();

  try {
    const response = await createAuth(env, {
      baseURL: new URL(request.url).origin,
    }).handler(request);

    return withAdminCors(request, response);
  } catch (error) {
    if (error instanceof AuthConfigError) {
      return withAdminCors(request, jsonResponse({ error: error.message }, 503));
    }

    throw error;
  }
}
