import type {
  DatamixApiKeyAccessLevel,
  DatamixApiKeySummary,
} from "@datamix/core";

import { adminPublicEnv } from "./runtime";

export type PublicApiRuntimeSummary = {
  hasConfiguredReadKey: boolean;
  hasConfiguredWriteKey: boolean;
  readAccess: "public" | "api-key" | "disabled";
  writeAccess: "disabled" | "api-key";
};

type ApiKeysApiBody = {
  apiKey?: DatamixApiKeySummary;
  apiKeys?: DatamixApiKeySummary[];
  error?: string;
  message?: string;
  runtime?: PublicApiRuntimeSummary;
  secret?: string;
};

export class ApiKeyRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiKeyRequestError";
  }
}

async function readApiBody<TValue>(response: Response) {
  return (await response.json().catch(() => null)) as TValue | null;
}

function buildApiKeysUrl(apiKeyId?: string, action?: "revoke") {
  const pathname = apiKeyId
    ? action === "revoke"
      ? `/api-keys/${encodeURIComponent(apiKeyId)}/revoke`
      : `/api-keys/${encodeURIComponent(apiKeyId)}`
    : "/api-keys";

  return `${adminPublicEnv.NEXT_PUBLIC_API_ORIGIN}${pathname}`;
}

export async function listApiKeys() {
  const response = await fetch(buildApiKeysUrl(), {
    credentials: "include",
  });
  const body = await readApiBody<ApiKeysApiBody>(response);

  if (!response.ok || !body?.runtime) {
    throw new ApiKeyRequestError(body?.error ?? "Unable to load API keys.");
  }

  return {
    apiKeys: body.apiKeys ?? [],
    runtime: body.runtime,
  };
}

export async function createApiKey(input: {
  accessLevel: DatamixApiKeyAccessLevel;
  label: string;
}) {
  const response = await fetch(buildApiKeysUrl(), {
    body: JSON.stringify(input),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const body = await readApiBody<ApiKeysApiBody>(response);

  if (!response.ok) {
    throw new ApiKeyRequestError(body?.error ?? "Unable to create API key.");
  }

  if (!body?.apiKey || !body.message || !body.secret) {
    throw new ApiKeyRequestError("API key creation response was incomplete.");
  }

  return {
    apiKey: body.apiKey,
    message: body.message,
    secret: body.secret,
  };
}

export async function updateApiKey(
  apiKeyId: string,
  input: {
    accessLevel: DatamixApiKeyAccessLevel;
    label: string;
  },
) {
  const response = await fetch(buildApiKeysUrl(apiKeyId), {
    body: JSON.stringify(input),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
  });
  const body = await readApiBody<ApiKeysApiBody>(response);

  if (!response.ok) {
    throw new ApiKeyRequestError(body?.error ?? "Unable to update API key.");
  }

  if (!body?.apiKey || !body.message) {
    throw new ApiKeyRequestError("API key update response was incomplete.");
  }

  return {
    apiKey: body.apiKey,
    message: body.message,
  };
}

export async function revokeApiKey(apiKeyId: string) {
  const response = await fetch(buildApiKeysUrl(apiKeyId, "revoke"), {
    credentials: "include",
    method: "POST",
  });
  const body = await readApiBody<ApiKeysApiBody>(response);

  if (!response.ok) {
    throw new ApiKeyRequestError(body?.error ?? "Unable to revoke API key.");
  }

  if (!body?.apiKey || !body.message) {
    throw new ApiKeyRequestError("API key revoke response was incomplete.");
  }

  return {
    apiKey: body.apiKey,
    message: body.message,
  };
}
