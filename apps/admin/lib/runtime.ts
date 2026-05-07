import {
  datamixEnvironments,
  defaultAdminPublicEnv,
  normalizeDatamixOrigin,
  resolveDatamixMediaOrigin,
  type AdminPublicEnv,
  type DatamixEnvironment,
} from "@datamix/core";

function isDatamixEnvironment(value: string): value is DatamixEnvironment {
  return datamixEnvironments.includes(value as DatamixEnvironment);
}

export function readAdminPublicEnv(env: NodeJS.ProcessEnv): AdminPublicEnv {
  const appEnv = env.NEXT_PUBLIC_APP_ENV;
  const apiOrigin = normalizeDatamixOrigin(
    env.NEXT_PUBLIC_API_ORIGIN ?? defaultAdminPublicEnv.NEXT_PUBLIC_API_ORIGIN,
    "NEXT_PUBLIC_API_ORIGIN",
  );

  return {
    NEXT_PUBLIC_API_ORIGIN: apiOrigin,
    NEXT_PUBLIC_APP_ENV:
      appEnv && isDatamixEnvironment(appEnv)
        ? appEnv
        : defaultAdminPublicEnv.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_MEDIA_ORIGIN: resolveDatamixMediaOrigin(
      apiOrigin,
      env.NEXT_PUBLIC_MEDIA_ORIGIN,
    ),
  };
}

export const adminPublicEnv = readAdminPublicEnv(process.env);
