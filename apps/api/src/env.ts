import {
  datamixEnvironments,
  defaultApiRuntimeEnv,
  type ApiRuntimeEnv,
  type DatamixEnvironment,
} from "@datamix/core";

export type ApiBindings = Pick<
  Env,
  | "ADMIN_ORIGIN"
  | "APP_ENV"
  | "BETTER_AUTH_SECRET"
  | "DB"
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
>;

export type ApiAuthRuntimeEnv = {
  BETTER_AUTH_SECRET: string;
};

export class AuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthConfigError";
  }
}

function isDatamixEnvironment(value: string): value is DatamixEnvironment {
  return datamixEnvironments.includes(value as DatamixEnvironment);
}

export function readApiRuntime(env: ApiBindings): ApiRuntimeEnv {
  return {
    ADMIN_ORIGIN: env.ADMIN_ORIGIN,
    APP_ENV: isDatamixEnvironment(env.APP_ENV)
      ? env.APP_ENV
      : defaultApiRuntimeEnv.APP_ENV,
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
