declare global {
  interface Env {
    BETTER_AUTH_SECRET: string;
    AUTH_SETUP_TOKEN?: string;
  }
}

export {};
