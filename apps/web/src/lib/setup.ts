import type { AuthSetupStatus, DatamixAuthRuntimeSummary } from "@datamix/core";
import { useEffect, useRef, useState } from "react";

import { buildDatamixAdminApiUrl } from "./runtime";

export type AuthSetupRuntime = {
  oauth: DatamixAuthRuntimeSummary;
  setup: AuthSetupStatus;
};

type SetupStatusResponse = {
  auth: AuthSetupRuntime;
};

export type SetupStatusState = {
  data: AuthSetupStatus | null;
  errorMessage: string | null;
  isPending: boolean;
  oauth: DatamixAuthRuntimeSummary | null;
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
  const response = await fetch(buildDatamixAdminApiUrl("/setup/status"), {
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

export function useSetupStatus(initialState?: SetupStatusState) {
  const [reloadToken, setReloadToken] = useState(0);
  const shouldUseInitialState = useRef(Boolean(initialState));
  const [state, setState] = useState<SetupStatusState>(() => initialState ?? {
    data: null,
    errorMessage: null,
    isPending: true,
    oauth: null,
    statusCode: null,
  });

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      if (shouldUseInitialState.current) {
        shouldUseInitialState.current = false;
        return;
      }

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
