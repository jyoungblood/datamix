declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_API_ORIGIN?: string;
    NEXT_PUBLIC_APP_ENV?: import("@datamix/core").DatamixEnvironment;
    NEXT_PUBLIC_MEDIA_ORIGIN?: string;
  }
}
