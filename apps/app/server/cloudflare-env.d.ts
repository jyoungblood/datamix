declare global {
  interface Env {
    BETTER_AUTH_SECRET: string;
    PUBLIC_API_READ_KEY?: string;
    PUBLIC_API_WRITE_KEY?: string;
    AUTH_GITHUB_CLIENT_ID?: string;
    AUTH_GITHUB_CLIENT_SECRET?: string;
    AUTH_GOOGLE_CLIENT_ID?: string;
    AUTH_GOOGLE_CLIENT_SECRET?: string;
    AUTH_RESEND_API_KEY?: string;
    AUTH_SMTP_USERNAME?: string;
    AUTH_SMTP_PASSWORD?: string;
  }
}

export {};
