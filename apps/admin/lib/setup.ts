import type { AuthSetupStatus } from "@datamix/core";
import { useEffect, useState } from "react";

import { adminPublicEnv } from "./runtime";

type SetupStatusResponse = {
  auth: {
    setup: AuthSetupStatus;
  };
};

type SetupStatusState = {
  data: AuthSetupStatus | null;
  errorMessage: string | null;
  isPending: boolean;
};

export async function fetchSetupStatus() {
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

  return body.auth.setup;
}

export function useSetupStatus() {
  const [state, setState] = useState<SetupStatusState>({
    data: null,
    errorMessage: null,
    isPending: true,
  });

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      try {
        const data = await fetchSetupStatus();

        if (isCancelled) {
          return;
        }

        setState({
          data,
          errorMessage: null,
          isPending: false,
        });
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setState({
          data: null,
          errorMessage: error instanceof Error ? error.message : "Unable to load setup status.",
          isPending: false,
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
