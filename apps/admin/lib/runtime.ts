import {
  datamixEnvironments,
  defaultAdminPublicEnv,
  type AdminPublicEnv,
  type DatamixEnvironment,
} from "@datamix/core";

function isDatamixEnvironment(value: string): value is DatamixEnvironment {
  return datamixEnvironments.includes(value as DatamixEnvironment);
}

export function readAdminPublicEnv(env: NodeJS.ProcessEnv): AdminPublicEnv {
  const appEnv = env.NEXT_PUBLIC_APP_ENV;

  return {
    NEXT_PUBLIC_API_ORIGIN:
      env.NEXT_PUBLIC_API_ORIGIN ?? defaultAdminPublicEnv.NEXT_PUBLIC_API_ORIGIN,
    NEXT_PUBLIC_APP_ENV:
      appEnv && isDatamixEnvironment(appEnv)
        ? appEnv
        : defaultAdminPublicEnv.NEXT_PUBLIC_APP_ENV,
  };
}

export const adminPublicEnv = readAdminPublicEnv(process.env);
