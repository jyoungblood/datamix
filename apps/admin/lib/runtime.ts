import {
  datamixEnvironments,
  defaultAdminPublicEnv,
  normalizeDatamixOrigin,
  type AdminPublicEnv,
  type DatamixEnvironment,
} from "@datamix/core";

function isDatamixEnvironment(value: string): value is DatamixEnvironment {
  return datamixEnvironments.includes(value as DatamixEnvironment);
}

export function readAdminPublicEnv(env: NodeJS.ProcessEnv): AdminPublicEnv {
  const appEnv = env.NEXT_PUBLIC_APP_ENV;
  const appOrigin = normalizeDatamixOrigin(
    env.NEXT_PUBLIC_APP_ORIGIN ?? defaultAdminPublicEnv.NEXT_PUBLIC_APP_ORIGIN,
    "NEXT_PUBLIC_APP_ORIGIN",
  );

  return {
    NEXT_PUBLIC_APP_ORIGIN: appOrigin,
    NEXT_PUBLIC_APP_ENV:
      appEnv && isDatamixEnvironment(appEnv)
        ? appEnv
        : defaultAdminPublicEnv.NEXT_PUBLIC_APP_ENV,
  };
}

export const adminPublicEnv = readAdminPublicEnv(process.env);

export function getAdminAppOrigin() {
  if (typeof window !== "undefined" && window.location.origin) {
    return normalizeDatamixOrigin(window.location.origin, "window.location.origin");
  }

  return adminPublicEnv.NEXT_PUBLIC_APP_ORIGIN;
}

export function buildDatamixAppUrl(pathname: string) {
  return new URL(pathname, getAdminAppOrigin()).toString();
}
