declare global {
  interface Env {
    BETTER_AUTH_SECRET: string;
    MEDIA_PUBLIC_ORIGIN?: string;
    PUBLIC_API_READ_ACCESS?: "public" | "api-key" | "disabled";
    PUBLIC_API_WRITE_ACCESS?: "disabled" | "api-key";
    PUBLIC_API_READ_KEY?: string;
    PUBLIC_API_WRITE_KEY?: string;
    AUTH_EMAIL_PROVIDER?: import("@datamix/core").AuthEmailProvider;
    AUTH_EMAIL_FROM_EMAIL?: string;
    AUTH_EMAIL_FROM_NAME?: string;
    AUTH_EMAIL_REPLY_TO_EMAIL?: string;
    AUTH_GITHUB_CLIENT_ID?: string;
    AUTH_GITHUB_CLIENT_SECRET?: string;
    AUTH_GOOGLE_CLIENT_ID?: string;
    AUTH_GOOGLE_CLIENT_SECRET?: string;
    AUTH_RESEND_API_KEY?: string;
    AUTH_SMTP_HOST?: string;
    AUTH_SMTP_PORT?: string;
    AUTH_SMTP_USERNAME?: string;
    AUTH_SMTP_PASSWORD?: string;
    AUTH_SMTP_TLS?: "implicit" | "starttls";
  }
}

export {};
