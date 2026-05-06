import {
  datamixEnvironments,
  defaultApiRuntimeEnv,
  type ApiRuntimeEnv,
  type DatamixEnvironment,
} from "@datamix/core";

export type ApiBindings = Pick<Env, "ADMIN_ORIGIN" | "APP_ENV">;

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
