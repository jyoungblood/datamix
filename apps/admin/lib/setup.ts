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
  reload: () => void;
  statusCode: number | null;
};

export class SetupStatusError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "SetupStatusError";
    this.statusCode = statusCode;
  }
}

export async function fetchSetupRuntime() {
  const response = await fetch(`${adminPublicEnv.NEXT_PUBLIC_API_ORIGIN}/setup/status`, {
    credentials: "include",
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    throw new SetupStatusError(
      errorBody?.error ?? "Unable to read Datamix setup status.",
      response.status,
    );
  }

  const body = (await response.json()) as SetupStatusResponse;

  return body.auth;
}

export async function fetchSetupStatus() {
  return (await fetchSetupRuntime()).setup;
}

export function useSetupStatus() {
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<SetupStatusState>({
    data: null,
    errorMessage: null,
    isPending: true,
    oauth: null,
    reload: () => {
      setReloadToken((currentValue) => currentValue + 1);
    },
    statusCode: null,
  });

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      if (!isCancelled) {
        setState((currentState) => ({
          ...currentState,
          errorMessage: null,
          isPending: true,
          statusCode: null,
        }));
      }

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
          reload: () => {
            setReloadToken((currentValue) => currentValue + 1);
          },
          statusCode: null,
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
          reload: () => {
            setReloadToken((currentValue) => currentValue + 1);
          },
          statusCode: error instanceof SetupStatusError ? error.statusCode : null,
        });
      }
    }

    void load();

    return () => {
      isCancelled = true;
    };
  }, [reloadToken]);

  useEffect(() => {
    if (state.isPending || !state.errorMessage) {
      return;
    }

    const reload = () => {
      setReloadToken((currentValue) => currentValue + 1);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        reload();
      }
    };

    window.addEventListener("online", reload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("online", reload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [state.errorMessage, state.isPending]);

  return state;
}
