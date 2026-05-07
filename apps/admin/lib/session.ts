import type { DatamixAuthorizationSummary } from "@datamix/core";

import { adminPublicEnv } from "./runtime";

type SessionAccessApiBody = {
  authorization?: DatamixAuthorizationSummary;
  error?: string;
};

export class SessionAccessError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "SessionAccessError";
    this.statusCode = statusCode;
  }
}

async function readApiBody<TValue>(response: Response) {
  return (await response.json().catch(() => null)) as TValue | null;
}

export async function loadSessionAccess() {
  const response = await fetch(`${adminPublicEnv.NEXT_PUBLIC_API_ORIGIN}/session`, {
    credentials: "include",
  });
  const body = await readApiBody<SessionAccessApiBody>(response);

  if (!response.ok || !body?.authorization) {
    throw new SessionAccessError(
      body?.error ?? "Unable to load session authorization.",
      response.status,
    );
  }

  return body.authorization;
}
