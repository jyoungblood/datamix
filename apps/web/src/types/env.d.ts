declare namespace NodeJS {
  interface ProcessEnv {
    PUBLIC_DATAMIX_APP_ORIGIN?: string;
    PUBLIC_DATAMIX_APP_ENV?: import("@datamix/core").DatamixEnvironment;
  }
}
