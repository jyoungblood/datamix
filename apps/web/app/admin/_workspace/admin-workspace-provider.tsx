"use client";

import type { DatamixAuthorizationSummary } from "@datamix/core";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import {
  listCollectionDefinitions,
  type StoredCollectionDefinition,
} from "@/lib/collection-definitions";
import { buildDatamixAdminPath } from "@/lib/runtime";
import { loadSessionAccess, SessionAccessError } from "@/lib/session";
import { useSetupStatus } from "@/lib/setup";

type AdminWorkspaceUser = {
  displayName: string;
  email: string | null;
  image: string | null;
  initials: string;
};

export type AdminWorkspacePermissions = {
  canAccessCollectionBuilder: boolean;
  canAccessMediaWorkspace: boolean;
  canAccessRecordsWorkspace: boolean;
  canAccessSettingsWorkspace: boolean;
  canAccessTeamAccess: boolean;
  canCreateCollections: boolean;
  canCreateRecords: boolean;
  canDeleteUsers: boolean;
  canInviteUsers: boolean;
  canUpdateCollections: boolean;
  canUpdateRecords: boolean;
  canUpdateSettings: boolean;
  canUpdateUsers: boolean;
  canUploadMedia: boolean;
  canViewCollections: boolean;
  canViewMedia: boolean;
  canViewRecords: boolean;
  canViewSettings: boolean;
  canViewUsers: boolean;
};

export type AdminWorkspaceContextValue = {
  authorization: DatamixAuthorizationSummary;
  collectionLoadError: string | null;
  collections: StoredCollectionDefinition[];
  hasLoadedCollections: boolean;
  isLoadingCollections: boolean;
  isRefreshingCollections: boolean;
  loadCollections: (options?: { refresh?: boolean }) => Promise<void>;
  permissions: AdminWorkspacePermissions;
  refreshAccess: () => Promise<void>;
  refreshCollections: () => Promise<void>;
  role: DatamixAuthorizationSummary["role"];
  signOut: () => Promise<void>;
  user: AdminWorkspaceUser;
};

type AdminWorkspaceProviderProps = {
  children: React.ReactNode;
};

type AdminWorkspaceGateShellProps = {
  action?: React.ReactNode;
  body: React.ReactNode;
  eyebrow?: string;
  title: string;
};

export const AdminWorkspaceContext =
  React.createContext<AdminWorkspaceContextValue | null>(null);

function createCurrentAdminPath() {
  if (typeof window === "undefined") {
    return buildDatamixAdminPath();
  }

  return `${window.location.pathname}${window.location.search}`;
}

function createLoginHref() {
  return `${buildDatamixAdminPath("/login")}?next=${encodeURIComponent(
    createCurrentAdminPath(),
  )}`;
}

function createInitials(input: { email: string | null; name: string | null }) {
  const source = input.name || input.email || "Datamix Admin";
  const parts = source
    .split(/[\s@._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "DM";
}

function createWorkspaceUser(sessionData: unknown): AdminWorkspaceUser {
  const user =
    typeof sessionData === "object" && sessionData !== null && "user" in sessionData
      ? (sessionData as {
          user?: {
            email?: string | null;
            image?: string | null;
            name?: string | null;
          };
        }).user
      : undefined;
  const email = user?.email ?? null;
  const image = user?.image ?? null;
  const name = user?.name ?? null;

  return {
    displayName: name || email || "Datamix Admin",
    email,
    image,
    initials: createInitials({ email, name }),
  };
}

export function createAdminWorkspacePermissions(
  authorization: DatamixAuthorizationSummary,
): AdminWorkspacePermissions {
  const permissionMap = authorization.permissionMap;
  const canViewCollections = permissionMap["collections.read"] ?? false;
  const canCreateCollections = permissionMap["collections.create"] ?? false;
  const canUpdateCollections = permissionMap["collections.update"] ?? false;
  const canViewRecords = permissionMap["records.read"] ?? false;
  const canCreateRecords = permissionMap["records.create"] ?? false;
  const canUpdateRecords = permissionMap["records.update"] ?? false;
  const canViewMedia = permissionMap["media.read"] ?? false;
  const canUploadMedia = permissionMap["media.upload"] ?? false;
  const canViewUsers = permissionMap["users.read"] ?? false;
  const canInviteUsers = permissionMap["users.invite"] ?? false;
  const canUpdateUsers = permissionMap["users.update"] ?? false;
  const canDeleteUsers = permissionMap["users.delete"] ?? false;
  const canViewSettings = permissionMap["settings.read"] ?? false;
  const canUpdateSettings = permissionMap["settings.update"] ?? false;

  return {
    canAccessCollectionBuilder:
      canViewCollections || canCreateCollections || canUpdateCollections,
    canAccessMediaWorkspace: canViewMedia || canUploadMedia,
    canAccessRecordsWorkspace: canViewRecords || canCreateRecords || canUpdateRecords,
    canAccessSettingsWorkspace: canViewSettings || canUpdateSettings,
    canAccessTeamAccess: canViewUsers || canInviteUsers || canUpdateUsers || canDeleteUsers,
    canCreateCollections,
    canCreateRecords,
    canDeleteUsers,
    canInviteUsers,
    canUpdateCollections,
    canUpdateRecords,
    canUpdateSettings,
    canUpdateUsers,
    canUploadMedia,
    canViewCollections,
    canViewMedia,
    canViewRecords,
    canViewSettings,
    canViewUsers,
  };
}

function AdminWorkspaceGateShell({
  action,
  body,
  eyebrow = "Admin",
  title,
}: AdminWorkspaceGateShellProps) {
  return (
    <main className="shell">
      <div className="panel stack">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="page-title">{title}</h1>
        <div className="body">{body}</div>
        {action ? <div className="actions">{action}</div> : null}
      </div>
    </main>
  );
}

export function AdminWorkspaceProvider({ children }: AdminWorkspaceProviderProps) {
  const session = authClient.useSession();
  const setupStatus = useSetupStatus();
  const collectionLoadRequestId = React.useRef(0);
  const [authorization, setAuthorization] =
    React.useState<DatamixAuthorizationSummary | null>(null);
  const [authorizationError, setAuthorizationError] = React.useState<string | null>(null);
  const [authorizationStatusCode, setAuthorizationStatusCode] = React.useState<number | null>(
    null,
  );
  const [isLoadingAuthorization, setIsLoadingAuthorization] = React.useState(false);
  const [collections, setCollections] = React.useState<StoredCollectionDefinition[]>([]);
  const [collectionLoadError, setCollectionLoadError] = React.useState<string | null>(null);
  const [hasLoadedCollections, setHasLoadedCollections] = React.useState(false);
  const [isLoadingCollections, setIsLoadingCollections] = React.useState(false);
  const [isRefreshingCollections, setIsRefreshingCollections] = React.useState(false);

  const loginHref = createLoginHref();
  const setupStatusHeading =
    setupStatus.statusCode === 503
      ? "Datamix setup is missing required configuration"
      : "Datamix setup status is temporarily unavailable";

  const loadSessionAuthorizationData = React.useCallback(async () => {
    setAuthorizationError(null);
    setAuthorizationStatusCode(null);
    setIsLoadingAuthorization(true);

    try {
      const nextAuthorization = await loadSessionAccess();

      setAuthorization(nextAuthorization);
    } catch (error) {
      if (error instanceof SessionAccessError && error.statusCode === 401) {
        window.location.replace(createLoginHref());
        return;
      }

      setAuthorization(null);
      setAuthorizationError(
        error instanceof Error
          ? error.message
          : "Unable to load the current access profile.",
      );
      setAuthorizationStatusCode(
        error instanceof SessionAccessError ? error.statusCode : null,
      );
    } finally {
      setIsLoadingAuthorization(false);
    }
  }, []);

  const loadCollections = React.useCallback(
    async (options?: { refresh?: boolean }) => {
      const requestId = collectionLoadRequestId.current + 1;
      const isRefresh = options?.refresh === true && hasLoadedCollections;

      collectionLoadRequestId.current = requestId;
      setCollectionLoadError(null);

      if (isRefresh) {
        setIsRefreshingCollections(true);
      } else {
        setIsLoadingCollections(true);
      }

      try {
        const nextCollections = await listCollectionDefinitions();

        if (collectionLoadRequestId.current !== requestId) {
          return;
        }

        setCollections(nextCollections);
        setHasLoadedCollections(true);
      } catch (error) {
        if (collectionLoadRequestId.current !== requestId) {
          return;
        }

        setCollectionLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load collection definitions.",
        );
      } finally {
        if (collectionLoadRequestId.current === requestId) {
          setIsLoadingCollections(false);
          setIsRefreshingCollections(false);
        }
      }
    },
    [hasLoadedCollections],
  );

  const refreshCollections = React.useCallback(
    () => loadCollections({ refresh: true }),
    [loadCollections],
  );

  const signOut = React.useCallback(async () => {
    await authClient.signOut();
    window.location.replace(buildDatamixAdminPath("/login"));
  }, []);

  React.useEffect(() => {
    if (session.isPending || setupStatus.isPending || session.data) {
      return;
    }

    if (setupStatus.data?.setupRequired) {
      window.location.replace(buildDatamixAdminPath("/setup"));
      return;
    }

    window.location.replace(createLoginHref());
  }, [session.data, session.isPending, setupStatus.data, setupStatus.isPending]);

  React.useEffect(() => {
    if (!session.data) {
      setAuthorization(null);
      setAuthorizationError(null);
      setAuthorizationStatusCode(null);
      setIsLoadingAuthorization(false);
      collectionLoadRequestId.current += 1;
      setCollections([]);
      setCollectionLoadError(null);
      setHasLoadedCollections(false);
      setIsLoadingCollections(false);
      setIsRefreshingCollections(false);
      return;
    }

    void loadSessionAuthorizationData();
  }, [loadSessionAuthorizationData, session.data]);

  React.useEffect(() => {
    if (!session.data || !authorizationError) {
      return;
    }

    const reload = () => {
      void loadSessionAuthorizationData();
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
  }, [authorizationError, loadSessionAuthorizationData, session.data]);

  if (session.isPending || setupStatus.isPending || (session.data && isLoadingAuthorization)) {
    return (
      <AdminWorkspaceGateShell
        body={
          session.data
            ? "Loading your role and permissions."
            : "Checking for an active admin session."
        }
        title={session.data ? "Loading access profile" : "Checking your session"}
      />
    );
  }

  if (setupStatus.errorMessage) {
    return (
      <AdminWorkspaceGateShell
        action={
          <>
            <Button asChild variant="outline">
              <a href={buildDatamixAdminPath("/login")}>Back home</a>
            </Button>
            <Button onClick={setupStatus.reload} type="button">
              Retry status
            </Button>
          </>
        }
        body={
          <>
            <p>{setupStatus.errorMessage}</p>
            <p>
              {setupStatus.statusCode === 503
                ? "Set `BETTER_AUTH_SECRET` on the Datamix Worker, then reload this page."
                : "Datamix will retry automatically when the network comes back or this tab regains focus. You can also retry now."}
            </p>
          </>
        }
        title={setupStatusHeading}
      />
    );
  }

  if (!session.data) {
    const authRedirectHref = setupStatus.data?.setupRequired
      ? buildDatamixAdminPath("/setup")
      : loginHref;

    return (
      <AdminWorkspaceGateShell
        action={
          <Button asChild>
            <a href={authRedirectHref}>Continue</a>
          </Button>
        }
        body="Datamix did not find an active admin session in this browser. Use the link below if the redirect does not start automatically."
        title={setupStatus.data?.setupRequired ? "Redirecting to setup" : "Redirecting to sign in"}
      />
    );
  }

  if (authorizationError || !authorization) {
    return (
      <AdminWorkspaceGateShell
        action={
          <>
            <Button asChild variant="outline">
              <a href={buildDatamixAdminPath("/login")}>Back home</a>
            </Button>
            <Button onClick={() => void loadSessionAuthorizationData()} type="button">
              Retry access profile
            </Button>
          </>
        }
        body={
          <>
            <p>
              {authorizationError ??
                "Datamix could not resolve the current role and permission summary."}
            </p>
            <p>
              {authorizationStatusCode && authorizationStatusCode >= 500
                ? "The protected session route is reachable, but it could not finish resolving your role just now. Retry in a moment."
                : "Datamix will retry automatically when the session stabilizes, and you can manually retry without losing your browser state."}
            </p>
          </>
        }
        title="Access profile is unavailable"
      />
    );
  }

  const value: AdminWorkspaceContextValue = {
    authorization,
    collectionLoadError,
    collections,
    hasLoadedCollections,
    isLoadingCollections,
    isRefreshingCollections,
    loadCollections,
    permissions: createAdminWorkspacePermissions(authorization),
    refreshAccess: loadSessionAuthorizationData,
    refreshCollections,
    role: authorization.role,
    signOut,
    user: createWorkspaceUser(session.data),
  };

  return (
    <AdminWorkspaceContext.Provider value={value}>
      {children}
    </AdminWorkspaceContext.Provider>
  );
}
