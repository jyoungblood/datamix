export const datamixProduct = {
  name: "Datamix",
  tagline: "The 1-click Edge Content Studio designed specifically for Cloudflare.",
} as const;

export const datamixAuthPath = "/api/auth";

export const datamixEnvironments = ["development", "preview", "production"] as const;

export const datamixSurfaces = [
  {
    id: "admin",
    label: "Admin",
    description: "Client-rendered authoring surface built with Vinext.",
    status: "in_progress",
  },
  {
    id: "api",
    label: "API",
    description: "JSON-first backend surface built with Hono.",
    status: "in_progress",
  },
  {
    id: "core",
    label: "Core",
    description: "Shared types and helpers used across Datamix surfaces.",
    status: "in_progress",
  },
] as const;

export type DatamixEnvironment = (typeof datamixEnvironments)[number];
export type DatamixSurfaceId = (typeof datamixSurfaces)[number]["id"];

export type AdminPublicEnv = {
  NEXT_PUBLIC_API_ORIGIN: string;
  NEXT_PUBLIC_APP_ENV: DatamixEnvironment;
};

export type ApiRuntimeEnv = {
  ADMIN_ORIGIN: string;
  APP_ENV: DatamixEnvironment;
};

export type AuthSetupStatus = {
  canCreateFirstUser: boolean;
  canLogin: boolean;
  setupRequired: boolean;
  userCount: number;
};

export const authEmailProviders = ["smtp", "resend"] as const;
export const authEmailTemplates = ["invite", "reset-password"] as const;

export type AuthEmailProvider = (typeof authEmailProviders)[number];
export type AuthEmailTemplate = (typeof authEmailTemplates)[number];

export const defaultAdminPublicEnv: AdminPublicEnv = {
  NEXT_PUBLIC_API_ORIGIN: "http://127.0.0.1:8787",
  NEXT_PUBLIC_APP_ENV: "development",
};

export const defaultApiRuntimeEnv: ApiRuntimeEnv = {
  ADMIN_ORIGIN: "http://127.0.0.1:3000",
  APP_ENV: "development",
};

export function createAuthBaseUrl(apiOrigin: string) {
  return new URL(datamixAuthPath, apiOrigin).toString();
}

export function createAuthSetupStatus(userCount: number): AuthSetupStatus {
  return {
    canCreateFirstUser: userCount === 0,
    canLogin: userCount > 0,
    setupRequired: userCount === 0,
    userCount,
  };
}

export function createServiceStatus(surface: DatamixSurfaceId) {
  return {
    product: datamixProduct.name,
    surface,
    status: "ok" as const,
  };
}
