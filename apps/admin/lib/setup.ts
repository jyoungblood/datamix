import type { AuthSetupStatus, DatamixAuthRuntimeSummary } from "@datamix/core";
import { useEffect, useState } from "react";

import { adminPublicEnv } from "./runtime";

export type AuthSetupRuntime = {
  oauth: DatamixAuthRuntimeSummary;
  setup: AuthSetupStatus;
};

type SetupStatusResponse = {
  auth: AuthSetupRuntime;
};

type SetupStatusState = {
  data: AuthSetupStatus | null;
  errorMessage: string | null;
  isPending: boolean;
  oauth: DatamixAuthRuntimeSummary | null;
};

export async function fetchSetupRuntime() {
  const response = await fetch(`${adminPublicEnv.NEXT_PUBLIC_API_ORIGIN}/setup/status`, {
    credentials: "include",
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    throw new Error(errorBody?.error ?? "Unable to read Datamix setup status.");
  }

  const body = (await response.json()) as SetupStatusResponse;

  return body.auth;
}

export async function fetchSetupStatus() {
  return (await fetchSetupRuntime()).setup;
}

export function useSetupStatus() {
  const [state, setState] = useState<SetupStatusState>({
    data: null,
    errorMessage: null,
    isPending: true,
    oauth: null,
  });

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      try {
        const auth = await fetchSetupRuntime();

        if (isCancelled) {
          return;
        }

        setState({
          data: auth.setup,
          errorMessage: null,
          isPending: false,
          oauth: auth.oauth,
        });
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setState({
          data: null,
          errorMessage: error instanceof Error ? error.message : "Unable to load setup status.",
          isPending: false,
          oauth: null,
        });
      }
    }

    void load();

    return () => {
      isCancelled = true;
    };
  }, []);

  return state;
}
