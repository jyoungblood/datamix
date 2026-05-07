import {
  datamixEnvironments,
  defaultApiRuntimeEnv,
  normalizeDatamixOrigin,
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

function readOptionalSecret(value: string | undefined) {
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

  if (!secret) {
    throw new AuthConfigError(
      "BETTER_AUTH_SECRET is missing. Set it in the Worker environment before using auth routes.",
    );
  }

  return {
    BETTER_AUTH_SECRET: secret,
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
  const readKey = readOptionalSecret(env.PUBLIC_API_READ_KEY);
  const writeKey = readOptionalSecret(env.PUBLIC_API_WRITE_KEY);

  if (readAccess === "api-key" && !readKey && !writeKey) {
    throw new PublicApiConfigError(
      "PUBLIC_API_READ_ACCESS is set to api-key, but no PUBLIC_API_READ_KEY or PUBLIC_API_WRITE_KEY is configured.",
    );
  }

  if (writeAccess === "api-key" && !writeKey) {
    throw new PublicApiConfigError(
      "PUBLIC_API_WRITE_ACCESS is set to api-key, but PUBLIC_API_WRITE_KEY is missing.",
    );
  }

  return {
    readAccess,
    readKey,
    writeAccess,
    writeKey,
  };
}
