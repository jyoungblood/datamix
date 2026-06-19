import {
  datamixEnvironments,
  defaultAdminPublicEnv,
  normalizeDatamixOrigin,
  type AdminPublicEnv,
  type DatamixEnvironment,
} from "@datamix/core";

type DatamixPublicImportMetaEnv = {
  PUBLIC_DATAMIX_APP_ENV?: string;
  PUBLIC_DATAMIX_APP_ORIGIN?: string;
};

function isDatamixEnvironment(value: string): value is DatamixEnvironment {
  return datamixEnvironments.includes(value as DatamixEnvironment);
}

function readPublicImportMetaEnv(): DatamixPublicImportMetaEnv {
  return import.meta.env as DatamixPublicImportMetaEnv;
}

export function readAdminPublicEnv(env: DatamixPublicImportMetaEnv): AdminPublicEnv {
  const appEnv = env.PUBLIC_DATAMIX_APP_ENV;
  const appOrigin = normalizeDatamixOrigin(
    env.PUBLIC_DATAMIX_APP_ORIGIN ?? defaultAdminPublicEnv.NEXT_PUBLIC_APP_ORIGIN,
    "PUBLIC_DATAMIX_APP_ORIGIN",
  );

  return {
    NEXT_PUBLIC_APP_ORIGIN: appOrigin,
    NEXT_PUBLIC_APP_ENV:
      appEnv && isDatamixEnvironment(appEnv)
        ? appEnv
        : defaultAdminPublicEnv.NEXT_PUBLIC_APP_ENV,
  };
}

export const adminPublicEnv = readAdminPublicEnv(readPublicImportMetaEnv());
export const datamixAdminBasePath = "/admin";
export const datamixAdminApiBasePath = "/api/admin";

export function getAdminAppOrigin() {
  if (typeof window !== "undefined" && window.location.origin) {
    return normalizeDatamixOrigin(window.location.origin, "window.location.origin");
  }

  return adminPublicEnv.NEXT_PUBLIC_APP_ORIGIN;
}

export function buildDatamixAppUrl(pathname: string) {
  return new URL(pathname, getAdminAppOrigin()).toString();
}

export function buildDatamixAdminPath(pathname = "") {
  if (!pathname || pathname === "/") {
    return datamixAdminBasePath;
  }

  return `${datamixAdminBasePath}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

export function buildDatamixAdminApiUrl(pathname = "") {
  if (!pathname || pathname === "/") {
    return buildDatamixAppUrl(datamixAdminApiBasePath);
  }

  const normalizedPathname = pathname.startsWith("/") ? pathname : `/${pathname}`;

  return buildDatamixAppUrl(`${datamixAdminApiBasePath}${normalizedPathname}`);
}
