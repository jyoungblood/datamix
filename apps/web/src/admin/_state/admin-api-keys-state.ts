"use client";

import type {
  DatamixApiKeyAccessLevel,
  DatamixApiKeySummary,
} from "@datamix/core";
import * as React from "react";

import {
  createApiKeyDraftFromApiKey,
  createEmptyApiKeyDraft,
  type ApiKeyDraft,
} from "../_lib/api-key-drafts";
import type { AdminWorkspacePermissions } from "../_workspace/admin-permissions";

import {
  createApiKey as createApiKeyRequest,
  listApiKeys,
  revokeApiKey as revokeApiKeyRequest,
  updateApiKey as updateApiKeyRequest,
  type PublicApiRuntimeSummary,
} from "@/lib/api-keys";

type AdminApiKeysStateOptions = {
  initialApiKeys?: DatamixApiKeySummary[] | undefined;
  initialApiKeysLoadError?: string | null | undefined;
  initialApiKeysLoaded?: boolean | undefined;
  initialPublicApiRuntime?: PublicApiRuntimeSummary | null | undefined;
  permissions: Pick<AdminWorkspacePermissions, "canUpdateSettings">;
};

export function useAdminApiKeysState({
  initialApiKeys,
  initialApiKeysLoadError,
  initialApiKeysLoaded,
  initialPublicApiRuntime,
  permissions,
}: AdminApiKeysStateOptions) {
  const apiKeysLoadRequestId = React.useRef(0);
  const [apiKeys, setApiKeys] = React.useState<DatamixApiKeySummary[]>(
    () => initialApiKeys ?? [],
  );
  const [apiKeyDraft, setApiKeyDraft] = React.useState<ApiKeyDraft>(
    createEmptyApiKeyDraft,
  );
  const [apiKeyDrafts, setApiKeyDrafts] = React.useState<
    Record<string, ApiKeyDraft>
  >(() => {
    const drafts: Record<string, ApiKeyDraft> = {};

    (initialApiKeys ?? []).forEach((apiKey) => {
      drafts[apiKey.id] = createApiKeyDraftFromApiKey(apiKey);
    });

    return drafts;
  });
  const [apiKeysLoadError, setApiKeysLoadError] = React.useState<string | null>(
    () => initialApiKeysLoadError ?? null,
  );
  const [apiKeysMessage, setApiKeysMessage] = React.useState<string | null>(null);
  const [apiKeySecret, setApiKeySecret] = React.useState<string | null>(null);
  const [apiKeySecretMessage, setApiKeySecretMessage] = React.useState<string | null>(
    null,
  );
  const [publicApiRuntime, setPublicApiRuntime] =
    React.useState<PublicApiRuntimeSummary | null>(() => initialPublicApiRuntime ?? null);
  const [hasLoadedApiKeys, setHasLoadedApiKeys] = React.useState(
    () => initialApiKeysLoaded ?? false,
  );
  const [isLoadingApiKeys, setIsLoadingApiKeys] = React.useState(false);
  const [isCreatingApiKey, setIsCreatingApiKey] = React.useState(false);
  const [savingApiKeyId, setSavingApiKeyId] = React.useState<string | null>(null);
  const [revokingApiKeyId, setRevokingApiKeyId] = React.useState<string | null>(null);

  const resetApiKeyWorkspace = React.useCallback(() => {
    apiKeysLoadRequestId.current += 1;
    setApiKeys([]);
    setApiKeyDraft(createEmptyApiKeyDraft());
    setApiKeyDrafts({});
    setApiKeysLoadError(null);
    setApiKeysMessage(null);
    setApiKeySecret(null);
    setApiKeySecretMessage(null);
    setPublicApiRuntime(null);
    setHasLoadedApiKeys(false);
    setIsLoadingApiKeys(false);
    setIsCreatingApiKey(false);
    setSavingApiKeyId(null);
    setRevokingApiKeyId(null);
  }, []);

  const loadApiKeyData = React.useCallback(async () => {
    const requestId = apiKeysLoadRequestId.current + 1;

    apiKeysLoadRequestId.current = requestId;
    setApiKeysLoadError(null);
    setIsLoadingApiKeys(true);

    try {
      const result = await listApiKeys();

      if (apiKeysLoadRequestId.current !== requestId) {
        return;
      }

      setApiKeys(result.apiKeys);
      setPublicApiRuntime(result.runtime);
      setHasLoadedApiKeys(true);
      setApiKeyDrafts((currentDrafts) => {
        const nextDrafts: Record<string, ApiKeyDraft> = {};

        result.apiKeys.forEach((apiKey) => {
          nextDrafts[apiKey.id] =
            currentDrafts[apiKey.id] ?? createApiKeyDraftFromApiKey(apiKey);
        });

        return nextDrafts;
      });
    } catch (error) {
      if (apiKeysLoadRequestId.current !== requestId) {
        return;
      }

      setApiKeysLoadError(
        error instanceof Error ? error.message : "Unable to load API keys.",
      );
      setPublicApiRuntime(null);
    } finally {
      if (apiKeysLoadRequestId.current === requestId) {
        setIsLoadingApiKeys(false);
      }
    }
  }, []);

  const setApiKeyDraftField = React.useCallback(
    (field: keyof ApiKeyDraft, value: string) => {
      setApiKeyDraft((currentDraft) => ({
        ...currentDraft,
        [field]: field === "accessLevel" ? (value as DatamixApiKeyAccessLevel) : value,
      }));
      setApiKeysMessage(null);
      setApiKeySecret(null);
      setApiKeySecretMessage(null);
    },
    [],
  );

  const setApiKeyField = React.useCallback(
    (apiKeyId: string, field: keyof ApiKeyDraft, value: string) => {
      setApiKeyDrafts((currentDrafts) => ({
        ...currentDrafts,
        [apiKeyId]: {
          accessLevel:
            field === "accessLevel"
              ? (value as DatamixApiKeyAccessLevel)
              : currentDrafts[apiKeyId]?.accessLevel ?? "read",
          label:
            field === "label" ? value : currentDrafts[apiKeyId]?.label ?? "",
        },
      }));
      setApiKeysMessage(null);
    },
    [],
  );

  const createApiKey = React.useCallback(async () => {
    if (!permissions.canUpdateSettings) {
      return null;
    }

    setIsCreatingApiKey(true);
    setApiKeysLoadError(null);
    setApiKeysMessage(null);
    setApiKeySecret(null);
    setApiKeySecretMessage(null);

    try {
      const result = await createApiKeyRequest(apiKeyDraft);

      setApiKeys((currentApiKeys) => [result.apiKey, ...currentApiKeys]);
      setApiKeyDrafts((currentDrafts) => ({
        ...currentDrafts,
        [result.apiKey.id]: createApiKeyDraftFromApiKey(result.apiKey),
      }));
      setApiKeyDraft(createEmptyApiKeyDraft());
      setApiKeysMessage(result.message);
      setApiKeySecret(result.secret);
      setHasLoadedApiKeys(true);

      return result.apiKey;
    } catch (error) {
      setApiKeysLoadError(
        error instanceof Error ? error.message : "Unable to create API key.",
      );
      return null;
    } finally {
      setIsCreatingApiKey(false);
    }
  }, [apiKeyDraft, permissions.canUpdateSettings]);

  const saveApiKey = React.useCallback(
    async (apiKey: DatamixApiKeySummary) => {
      const nextDraft = apiKeyDrafts[apiKey.id];

      if (
        !permissions.canUpdateSettings ||
        !nextDraft ||
        apiKey.revokedAt ||
        (nextDraft.label === apiKey.label &&
          nextDraft.accessLevel === apiKey.accessLevel)
      ) {
        return null;
      }

      setSavingApiKeyId(apiKey.id);
      setApiKeysLoadError(null);
      setApiKeysMessage(null);

      try {
        const result = await updateApiKeyRequest(apiKey.id, nextDraft);

        setApiKeys((currentApiKeys) =>
          currentApiKeys.map((currentApiKey) =>
            currentApiKey.id === result.apiKey.id ? result.apiKey : currentApiKey,
          ),
        );
        setApiKeyDrafts((currentDrafts) => ({
          ...currentDrafts,
          [result.apiKey.id]: createApiKeyDraftFromApiKey(result.apiKey),
        }));
        setApiKeysMessage(result.message);

        return result.apiKey;
      } catch (error) {
        setApiKeysLoadError(
          error instanceof Error ? error.message : "Unable to update API key.",
        );
        return null;
      } finally {
        setSavingApiKeyId(null);
      }
    },
    [apiKeyDrafts, permissions.canUpdateSettings],
  );

  const revokeApiKey = React.useCallback(
    async (apiKey: DatamixApiKeySummary) => {
      if (!permissions.canUpdateSettings || apiKey.revokedAt) {
        return null;
      }

      setRevokingApiKeyId(apiKey.id);
      setApiKeysLoadError(null);
      setApiKeysMessage(null);

      try {
        const result = await revokeApiKeyRequest(apiKey.id);

        setApiKeys((currentApiKeys) =>
          currentApiKeys.map((currentApiKey) =>
            currentApiKey.id === result.apiKey.id ? result.apiKey : currentApiKey,
          ),
        );
        setApiKeyDrafts((currentDrafts) => ({
          ...currentDrafts,
          [result.apiKey.id]: createApiKeyDraftFromApiKey(result.apiKey),
        }));
        setApiKeysMessage(result.message);

        return result.apiKey;
      } catch (error) {
        setApiKeysLoadError(
          error instanceof Error ? error.message : "Unable to revoke API key.",
        );
        return null;
      } finally {
        setRevokingApiKeyId(null);
      }
    },
    [permissions.canUpdateSettings],
  );

  const copyApiKeySecret = React.useCallback(async () => {
    if (!apiKeySecret) {
      return;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.clipboard ||
      typeof navigator.clipboard.writeText !== "function"
    ) {
      setApiKeySecretMessage("Clipboard access is unavailable in this browser.");
      return;
    }

    try {
      await navigator.clipboard.writeText(apiKeySecret);
      setApiKeySecretMessage("API key secret copied. This is the only time Datamix will show it.");
    } catch {
      setApiKeySecretMessage("Clipboard access failed. Copy the API key secret manually.");
    }
  }, [apiKeySecret]);

  return {
    apiKeyDraft,
    apiKeyDrafts,
    apiKeys,
    apiKeysLoadError,
    apiKeysMessage,
    apiKeySecret,
    apiKeySecretMessage,
    copyApiKeySecret,
    createApiKey,
    hasLoadedApiKeys,
    isCreatingApiKey,
    isLoadingApiKeys,
    loadApiKeyData,
    publicApiRuntime,
    resetApiKeyWorkspace,
    revokeApiKey,
    revokingApiKeyId,
    saveApiKey,
    savingApiKeyId,
    setApiKeyDraftField,
    setApiKeyField,
  };
}
