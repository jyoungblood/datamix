import { createServiceStatus } from "@datamix/core";

import { readApiRuntime } from "../env";
import { getAuthSetupStatus } from "../auth";
import { AuthConfigError } from "../env";
import { getDatamixEnv, jsonResponse, withAdminCors } from "./http";

export function getApiIndex() {
  const runtime = readApiRuntime(getDatamixEnv());

  return jsonResponse({
    ...createServiceStatus("api"),
    runtime,
    message: "Datamix API scaffold is ready for Cloudflare runtime wiring.",
  });
}

export function getHealth() {
  const runtime = readApiRuntime(getDatamixEnv());

  return jsonResponse({
    ...createServiceStatus("api"),
    runtime,
  });
}

export async function getSetupStatus(request: Request) {
  const env = getDatamixEnv();

  try {
    const auth = await getAuthSetupStatus(env);

    return withAdminCors(
      request,
      jsonResponse({
        ...createServiceStatus("api"),
        auth,
      }),
    );
  } catch (error) {
    if (error instanceof AuthConfigError) {
      return withAdminCors(request, jsonResponse({ error: error.message }, 503));
    }

    throw error;
  }
}
