export const datamixApiKeysTableName = "dmx_api_keys";
export const datamixApiKeyAccessLevels = ["read", "write"] as const;

export type DatamixApiKeyAccessLevel = (typeof datamixApiKeyAccessLevels)[number];
export type DatamixApiKeyPermission = "read" | "write";

export type DatamixApiKeySummary = {
  accessLevel: DatamixApiKeyAccessLevel;
  createdAt: string;
  id: string;
  label: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  secretPreview: string;
  updatedAt: string;
};

export type DatamixCreatedApiKey = {
  apiKey: DatamixApiKeySummary;
  secret: string;
};

export function canDatamixApiKeyAccess(
  accessLevel: DatamixApiKeyAccessLevel,
  permission: DatamixApiKeyPermission,
) {
  return accessLevel === "write" || permission === "read";
}
