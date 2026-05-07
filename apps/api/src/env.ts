import {
  datamixAuthProviderDefinitions,
  datamixEnvironments,
  defaultApiRuntimeEnv,
  normalizeDatamixOrigin,
  type DatamixAuthProviderSummary,
  type DatamixAuthRuntimeSummary,
  type ApiRuntimeEnv,
  type DatamixEnvironment,
} from "@datamix/core";

export type ApiBindings = Pick<
  Env,
  | "ADMIN_ORIGIN"
  | "APP_ENV"
  | "BETTER_AUTH_SECRET"
  | "DB"
  | "MEDIA_PUBLIC_ORIGIN"
  | "PUBLIC_API_READ_ACCESS"
  | "PUBLIC_API_WRITE_ACCESS"
  | "PUBLIC_API_READ_KEY"
  | "PUBLIC_API_WRITE_KEY"
  | "AUTH_EMAIL_PROVIDER"
  | "AUTH_EMAIL_FROM_EMAIL"
  | "AUTH_EMAIL_FROM_NAME"
  | "AUTH_EMAIL_REPLY_TO_EMAIL"
  | "AUTH_GITHUB_CLIENT_ID"
  | "AUTH_GITHUB_CLIENT_SECRET"
  | "AUTH_GOOGLE_CLIENT_ID"
  | "AUTH_GOOGLE_CLIENT_SECRET"
  | "AUTH_RESEND_API_KEY"
  | "AUTH_SMTP_HOST"
  | "AUTH_SMTP_PORT"
  | "AUTH_SMTP_USERNAME"
  | "AUTH_SMTP_PASSWORD"
  | "AUTH_SMTP_TLS"
  | "MEDIA_BUCKET"
>;

export type ApiAuthRuntimeEnv = {
  BETTER_AUTH_SECRET: string;
  oauth: DatamixAuthRuntimeSummary;
  socialProviders: {
    github: {
      clientId: string;
      clientSecret: string;
    } | null;
    google: {
      clientId: string;
      clientSecret: string;
    } | null;
  };
};

export const publicApiReadAccessModes = ["public", "api-key", "disabled"] as const;
export const publicApiWriteAccessModes = ["disabled", "api-key"] as const;

export type PublicApiReadAccessMode = (typeof publicApiReadAccessModes)[number];
export type PublicApiWriteAccessMode = (typeof publicApiWriteAccessModes)[number];

export type PublicApiRuntimeEnv = {
  readAccess: PublicApiReadAccessMode;
  readKey: string | null;
  writeAccess: PublicApiWriteAccessMode;
  writeKey: string | null;
};

export type PublicApiRuntimeSummary = {
  hasConfiguredReadKey: boolean;
  hasConfiguredWriteKey: boolean;
  readAccess: PublicApiReadAccessMode;
  writeAccess: PublicApiWriteAccessMode;
};

export class AuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthConfigError";
  }
}

export class PublicApiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicApiConfigError";
  }
}

function isDatamixEnvironment(value: string): value is DatamixEnvironment {
  return datamixEnvironments.includes(value as DatamixEnvironment);
}

function readOptionalValue(value: string | undefined) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

function readOptionalOrigin(value: string | undefined, envName: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return normalizeDatamixOrigin(trimmed, envName);
}

function createOAuthProviderSummary(
  provider: (typeof datamixAuthProviderDefinitions)[number],
  clientId: string | null,
  clientSecret: string | null,
): DatamixAuthProviderSummary {
  if (clientId && clientSecret) {
    return {
      enabled: true,
      id: provider.id,
      label: provider.label,
      message: `${provider.label} sign-in is available on the Datamix login screen.`,
      status: "enabled",
    };
  }

  if (!clientId && !clientSecret) {
    return {
      enabled: false,
      id: provider.id,
      label: provider.label,
      message: `Add both ${provider.label} OAuth credentials to enable this provider.`,
      status: "disabled",
    };
  }

  return {
    enabled: false,
    id: provider.id,
    label: provider.label,
    message: clientId
      ? `${provider.label} client ID is set, but the client secret is still missing.`
      : `${provider.label} client secret is set, but the client ID is still missing.`,
    status: "incomplete",
  };
}

function readConfiguredOAuthProvider(clientId: string | null, clientSecret: string | null) {
  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
  };
}

function readEnumValue<TValue extends string>(
  value: string | undefined,
  allowedValues: readonly TValue[],
  envName: string,
  fallback: TValue,
) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return fallback;
  }

  if (allowedValues.includes(trimmed as TValue)) {
    return trimmed as TValue;
  }

  throw new PublicApiConfigError(
    `${envName} must be one of: ${allowedValues.join(", ")}.`,
  );
}

export function readApiRuntime(env: ApiBindings): ApiRuntimeEnv {
  return {
    ADMIN_ORIGIN: normalizeDatamixOrigin(env.ADMIN_ORIGIN, "ADMIN_ORIGIN"),
    APP_ENV: isDatamixEnvironment(env.APP_ENV)
      ? env.APP_ENV
      : defaultApiRuntimeEnv.APP_ENV,
    MEDIA_PUBLIC_ORIGIN: readOptionalOrigin(
      env.MEDIA_PUBLIC_ORIGIN,
      "MEDIA_PUBLIC_ORIGIN",
    ),
  };
}

export function readApiAuthRuntime(env: ApiBindings): ApiAuthRuntimeEnv {
  const secret = env.BETTER_AUTH_SECRET?.trim();
  const githubClientId = readOptionalValue(env.AUTH_GITHUB_CLIENT_ID);
  const githubClientSecret = readOptionalValue(env.AUTH_GITHUB_CLIENT_SECRET);
  const googleClientId = readOptionalValue(env.AUTH_GOOGLE_CLIENT_ID);
  const googleClientSecret = readOptionalValue(env.AUTH_GOOGLE_CLIENT_SECRET);

  if (!secret) {
    throw new AuthConfigError(
      "BETTER_AUTH_SECRET is missing. Set it in the Worker environment before using auth routes.",
    );
  }

  return {
    BETTER_AUTH_SECRET: secret,
    oauth: {
      providers: [
        createOAuthProviderSummary(
          datamixAuthProviderDefinitions[0],
          githubClientId,
          githubClientSecret,
        ),
        createOAuthProviderSummary(
          datamixAuthProviderDefinitions[1],
          googleClientId,
          googleClientSecret,
        ),
      ],
    },
    socialProviders: {
      github: readConfiguredOAuthProvider(githubClientId, githubClientSecret),
      google: readConfiguredOAuthProvider(googleClientId, googleClientSecret),
    },
  };
}

export function readPublicApiRuntime(env: ApiBindings): PublicApiRuntimeEnv {
  const readAccess = readEnumValue(
    env.PUBLIC_API_READ_ACCESS,
    publicApiReadAccessModes,
    "PUBLIC_API_READ_ACCESS",
    "public",
  );
  const writeAccess = readEnumValue(
    env.PUBLIC_API_WRITE_ACCESS,
    publicApiWriteAccessModes,
    "PUBLIC_API_WRITE_ACCESS",
    "disabled",
  );
  const readKey = readOptionalValue(env.PUBLIC_API_READ_KEY);
  const writeKey = readOptionalValue(env.PUBLIC_API_WRITE_KEY);

  return {
    readAccess,
    readKey,
    writeAccess,
    writeKey,
  };
}

export function createPublicApiRuntimeSummary(
  runtime: PublicApiRuntimeEnv,
): PublicApiRuntimeSummary {
  return {
    hasConfiguredReadKey: Boolean(runtime.readKey),
    hasConfiguredWriteKey: Boolean(runtime.writeKey),
    readAccess: runtime.readAccess,
    writeAccess: runtime.writeAccess,
  };
}
