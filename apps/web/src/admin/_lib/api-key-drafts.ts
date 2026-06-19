import type {
  DatamixApiKeyAccessLevel,
  DatamixApiKeySummary,
  DatamixAuthProviderStatus,
} from "@datamix/core";

import type { PublicApiRuntimeSummary } from "@/lib/api-keys";

export type ApiKeyDraft = {
  accessLevel: DatamixApiKeyAccessLevel;
  label: string;
};

export function createApiKeyDraftFromApiKey(
  apiKey: DatamixApiKeySummary,
): ApiKeyDraft {
  return {
    accessLevel: apiKey.accessLevel,
    label: apiKey.label,
  };
}

export function createEmptyApiKeyDraft(): ApiKeyDraft {
  return {
    accessLevel: "read",
    label: "",
  };
}

export function formatApiKeyAccessLevel(accessLevel: DatamixApiKeyAccessLevel) {
  return accessLevel === "write" ? "Read and write" : "Read only";
}

export function formatPublicApiAccessMode(
  value:
    | PublicApiRuntimeSummary["readAccess"]
    | PublicApiRuntimeSummary["writeAccess"],
) {
  switch (value) {
    case "public":
      return "Public";
    case "api-key":
      return "API key";
    case "disabled":
      return "Disabled";
  }
}

export function formatAuthProviderStatus(status: DatamixAuthProviderStatus) {
  switch (status) {
    case "enabled":
      return "Enabled";
    case "disabled":
      return "Not configured";
    case "incomplete":
      return "Needs both values";
  }
}
