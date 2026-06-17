"use client";

import Link from "next/link";
import {
  ArrowRight,
  Database,
  FileText,
  Image,
  KeyRound,
  Settings,
  ShieldCheck,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
import * as React from "react";

import {
  AdminPageHeader,
  AdminSectionCard,
} from "../_components/admin-design";
import { AdminStateBox } from "../_components/admin-state";
import { AdminWorkspaceRouteFrame } from "../_workspace/admin-workspace-route-frame";
import { adminRoutes, type AdminWorkspaceRoute } from "../_workspace/admin-routes";
import { useAdminWorkspace } from "../_workspace/admin-workspace-hooks";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type OverviewStatus = {
  body: string;
  label: string;
  variant: React.ComponentProps<typeof Badge>["variant"];
};

type AdminHomeRouteItem = {
  detail: string;
  icon: LucideIcon;
  isAllowed: boolean;
  route: AdminWorkspaceRoute;
  status: OverviewStatus;
  value: string;
};

type AdminHomeStatusRow = {
  detail: string;
  label: string;
  status: OverviewStatus;
};

type DatasetStatusInput = {
  error?: string | null;
  hasLoaded: boolean;
  isAllowed: boolean;
  isLoading: boolean;
  loadedBody: string;
  loadingBody: string;
  restrictedBody: string;
};

function formatCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatHomeTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatMetricValue({
  hasLoaded,
  isAllowed,
  isLoading,
  restrictedValue = "Restricted",
  value,
}: {
  hasLoaded: boolean;
  isAllowed: boolean;
  isLoading: boolean;
  restrictedValue?: string;
  value: React.ReactNode;
}) {
  if (!isAllowed) {
    return restrictedValue;
  }

  if (isLoading && !hasLoaded) {
    return "Loading";
  }

  return value;
}

function createDatasetStatus({
  error,
  hasLoaded,
  isAllowed,
  isLoading,
  loadedBody,
  loadingBody,
  restrictedBody,
}: DatasetStatusInput): OverviewStatus {
  if (!isAllowed) {
    return {
      body: restrictedBody,
      label: "Restricted",
      variant: "outline",
    };
  }

  if (error) {
    return {
      body: error,
      label: "Needs attention",
      variant: "destructive",
    };
  }

  if (isLoading && !hasLoaded) {
    return {
      body: loadingBody,
      label: "Loading",
      variant: "secondary",
    };
  }

  if (!hasLoaded) {
    return {
      body: loadingBody,
      label: "Queued",
      variant: "outline",
    };
  }

  return {
    body: loadedBody,
    label: "Ready",
    variant: "secondary",
  };
}

function AdminHomeContent({ route }: { route: AdminWorkspaceRoute }) {
  const workspace = useAdminWorkspace();
  const {
    apiKeys,
    apiKeysLoadError,
    availableRoles,
    collectionLoadError,
    collections,
    hasLoadedApiKeys,
    hasLoadedCollections,
    hasLoadedMediaAssets,
    hasLoadedRoles,
    hasLoadedUsers,
    isLoadingApiKeys,
    isLoadingCollections,
    isLoadingMediaAssets,
    isLoadingRoles,
    isLoadingUsers,
    mediaAssets,
    mediaLoadError,
    permissions,
    prefetchAdminRoute,
    rolesLoadError,
    users,
    usersLoadError,
  } = workspace;
  const { contentReadyCount, recentSchemas, totalFieldCount } = React.useMemo(() => {
    const nextRecentSchemas = [...collections]
      .sort((firstCollection, secondCollection) => {
        const firstTime = Date.parse(firstCollection.updatedAt);
        const secondTime = Date.parse(secondCollection.updatedAt);

        return (
          (Number.isNaN(secondTime) ? 0 : secondTime) -
          (Number.isNaN(firstTime) ? 0 : firstTime)
        );
      })
      .slice(0, 4);

    return {
      contentReadyCount: collections.filter(
        (collection) => collection.definition.fields.length > 0,
      ).length,
      recentSchemas: nextRecentSchemas,
      totalFieldCount: collections.reduce(
        (count, collection) => count + collection.definition.fields.length,
        0,
      ),
    };
  }, [collections]);
  const activeApiKeyCount = React.useMemo(
    () => apiKeys.filter((apiKey) => !apiKey.revokedAt).length,
    [apiKeys],
  );
  const roleDataIsAllowed =
    permissions.canAccessTeamAccess || permissions.canAccessSettingsWorkspace;
  const collectionStatus = createDatasetStatus({
    error: collectionLoadError,
    hasLoaded: hasLoadedCollections,
    isAllowed: permissions.canViewCollections,
    isLoading: isLoadingCollections,
    loadedBody: `${formatCount(collections.length, "schema")} and ${formatCount(
      totalFieldCount,
      "field",
    )} loaded from the schema workspace.`,
    loadingBody: "Loading saved schemas for the overview.",
    restrictedBody: "This role cannot browse saved schemas.",
  });
  const mediaStatus = createDatasetStatus({
    error: mediaLoadError,
    hasLoaded: hasLoadedMediaAssets,
    isAllowed: permissions.canViewMedia,
    isLoading: isLoadingMediaAssets,
    loadedBody: `${formatCount(mediaAssets.length, "asset")} loaded from the media workspace.`,
    loadingBody: "Loading media assets for the overview.",
    restrictedBody: permissions.canUploadMedia
      ? "This role can upload media, but it cannot browse assets."
      : "This role cannot access media assets.",
  });
  const usersStatus = createDatasetStatus({
    error: usersLoadError,
    hasLoaded: hasLoadedUsers,
    isAllowed: permissions.canViewUsers,
    isLoading: isLoadingUsers,
    loadedBody: `${formatCount(users.length, "user")} loaded from the team workspace.`,
    loadingBody: "Loading users for the overview.",
    restrictedBody: permissions.canAccessTeamAccess
      ? "This role can access team tools, but it cannot browse users."
      : "This role cannot access team data.",
  });
  const rolesStatus = createDatasetStatus({
    error: rolesLoadError,
    hasLoaded: hasLoadedRoles,
    isAllowed: roleDataIsAllowed,
    isLoading: isLoadingRoles,
    loadedBody: `${formatCount(availableRoles.length, "role")} available for access review.`,
    loadingBody: "Loading roles for the overview.",
    restrictedBody: "This role cannot access role data.",
  });
  const apiKeysStatus = createDatasetStatus({
    error: apiKeysLoadError,
    hasLoaded: hasLoadedApiKeys,
    isAllowed: permissions.canAccessSettingsWorkspace,
    isLoading: isLoadingApiKeys,
    loadedBody: `${formatCount(
      activeApiKeyCount,
      "active API key",
      "active API keys",
    )} available in settings.`,
    loadingBody: "Loading API key posture for the overview.",
    restrictedBody: "This role cannot access settings data.",
  });
  const accountStatus: OverviewStatus = {
    body: `${workspace.user.displayName} is signed in with the ${workspace.role.label} role.`,
    label: "Ready",
    variant: "secondary",
  };
  const teamStatus: OverviewStatus = permissions.canAccessTeamAccess
    ? permissions.canViewUsers
      ? usersStatus
      : rolesStatus
    : {
        body: "This role cannot access team data.",
        label: "Restricted",
        variant: "outline",
      };

  const routeItems: AdminHomeRouteItem[] = [
    {
      detail: permissions.canViewCollections
        ? `${formatCount(collections.length, "schema")} visible`
        : "Schema tools",
      icon: Database,
      isAllowed: permissions.canAccessCollectionBuilder,
      route: adminRoutes.schema.index(),
      status: collectionStatus,
      value: permissions.canViewCollections ? String(collections.length) : "Limited",
    },
    {
      detail: permissions.canViewCollections
        ? `${formatCount(contentReadyCount, "content-ready schema", "content-ready schemas")}`
        : "Generated content editors",
      icon: FileText,
      isAllowed: permissions.canAccessRecordsWorkspace,
      route: adminRoutes.content.index(),
      status: permissions.canViewCollections
        ? collectionStatus
        : {
            body: permissions.canAccessRecordsWorkspace
              ? "Open Content to work from schemas available to this role."
              : "This role cannot access content routes.",
            label: permissions.canAccessRecordsWorkspace ? "Available" : "Restricted",
            variant: permissions.canAccessRecordsWorkspace ? "secondary" : "outline",
          },
      value: permissions.canViewCollections ? String(contentReadyCount) : "Open",
    },
    {
      detail: permissions.canViewMedia
        ? `${formatCount(mediaAssets.length, "asset")} visible`
        : "Asset library",
      icon: Image,
      isAllowed: permissions.canAccessMediaWorkspace,
      route: adminRoutes.media(),
      status: mediaStatus,
      value: permissions.canViewMedia ? String(mediaAssets.length) : "Limited",
    },
    {
      detail: permissions.canViewUsers
        ? `${formatCount(users.length, "user")} visible`
        : "Users and invites",
      icon: Users,
      isAllowed: permissions.canAccessTeamAccess,
      route: adminRoutes.team(),
      status: teamStatus,
      value: permissions.canViewUsers ? String(users.length) : "Limited",
    },
    {
      detail: permissions.canAccessSettingsWorkspace
        ? `${formatCount(activeApiKeyCount, "active key", "active keys")}`
        : "API keys and roles",
      icon: Settings,
      isAllowed: permissions.canAccessSettingsWorkspace,
      route: adminRoutes.settings(),
      status: apiKeysStatus,
      value: permissions.canAccessSettingsWorkspace ? String(activeApiKeyCount) : "Restricted",
    },
    {
      detail: workspace.user.email ?? "Current session",
      icon: UserCircle,
      isAllowed: true,
      route: adminRoutes.account(),
      status: accountStatus,
      value: workspace.role.label,
    },
  ];
  const statusRows: AdminHomeStatusRow[] = [
    {
      detail: accountStatus.body,
      label: "Session",
      status: accountStatus,
    },
    {
      detail: collectionStatus.body,
      label: "Schema",
      status: collectionStatus,
    },
    {
      detail: `${collectionStatus.body} Content counts load inside each schema workspace.`,
      label: "Content",
      status: permissions.canAccessRecordsWorkspace
        ? collectionStatus
        : {
            body: "This role cannot access content data.",
            label: "Restricted",
            variant: "outline",
          },
    },
    {
      detail: mediaStatus.body,
      label: "Media",
      status: mediaStatus,
    },
    {
      detail: teamStatus.body,
      label: "Team",
      status: teamStatus,
    },
    {
      detail: apiKeysStatus.body,
      label: "Settings",
      status: apiKeysStatus,
    },
  ];
  React.useEffect(() => {
    void prefetchAdminRoute({ section: "home" });
  }, [prefetchAdminRoute]);

  return (
    <AdminWorkspaceRouteFrame route={route}>
      <AdminPageHeader title="Workspace overview" />

        <div>
          <Button asChild><a href="/api">Open API root</a></Button>
          <Button asChild><a href="/api/health">Check health</a></Button>
          <Button asChild><a href="/api/collections">Browse public collections</a></Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <AdminSectionCard
            description="Open a routed workspace with its current availability and live overview count."
            title="Primary workspaces"
          >
            <div className="grid gap-2">
              {routeItems.map((item) => (
                <Link
                  className="group grid gap-3 rounded-lg border border-border bg-white px-4 py-3 text-xs transition hover:bg-muted/60 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
                  href={item.route.href}
                  key={item.route.id}
                  prefetch={item.route.section !== route.section}
                >
                  <span className="flex size-9 items-center justify-center rounded-md border border-border bg-slate-50 text-slate-600">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium text-slate-950">
                      {item.route.label}
                    </span>
                    <span className="mt-1 block text-slate-500">{item.detail}</span>
                  </span>
                  <span className="flex items-center gap-2 sm:justify-end">
                    <span className="hidden font-data text-lg text-slate-950 md:block">
                      {item.value}
                    </span>
                    <Badge variant={item.isAllowed ? item.status.variant : "outline"}>
                      {item.isAllowed ? item.status.label : "Restricted"}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:text-slate-600" />
                  </span>
                </Link>
              ))}
            </div>
          </AdminSectionCard>

          <div className="flex min-w-0 flex-col gap-4">
            <AdminSectionCard
              description="Overview status uses the same provider state as each routed screen."
              title="Operational status"
            >
              <div className="divide-y rounded-lg border border-border bg-white">
                {statusRows.map((statusRow) => (
                  <div
                    className="grid gap-2 px-4 py-3 text-xs sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    key={statusRow.label}
                  >
                    <span className="min-w-0">
                      <span className="block font-medium text-slate-950">
                        {statusRow.label}
                      </span>
                      <span className="mt-1 block text-slate-500">
                        {statusRow.detail}
                      </span>
                    </span>
                    <Badge variant={statusRow.status.variant}>
                      {statusRow.status.label}
                    </Badge>
                  </div>
                ))}
              </div>
            </AdminSectionCard>

            <AdminSectionCard
              action={
                permissions.canCreateCollections ? (
                  <Button asChild size="sm">
                    <Link href={adminRoutes.schema.new().href} prefetch={true}>
                      New schema
                    </Link>
                  </Button>
                ) : null
              }
              title="Recent schemas"
            >
              {!permissions.canViewCollections ? (
                <AdminStateBox
                  body="Schema recency is hidden for the current role."
                  compact
                  title="Schema list is restricted"
                  tone="warning"
                />
              ) : isLoadingCollections && !hasLoadedCollections ? (
                <AdminStateBox
                  body="Loading saved schemas for this overview."
                  compact
                  title="Loading schemas"
                />
              ) : collectionLoadError && collections.length === 0 ? (
                <AdminStateBox
                  body={collectionLoadError}
                  compact
                  title="Schemas are unavailable"
                  tone="error"
                />
              ) : recentSchemas.length === 0 && permissions.canCreateCollections ? (
                <AdminStateBox
                  actionLabel="Create first schema"
                  body="Create a schema before adding content."
                  compact
                  onAction={() => {
                    window.location.href = adminRoutes.schema.new().href;
                  }}
                  title="No schemas yet"
                />
              ) : recentSchemas.length === 0 ? (
                <AdminStateBox
                  body="Create a schema before adding content."
                  compact
                  title="No schemas yet"
                />
              ) : (
                <div className="divide-y rounded-lg border border-border bg-white">
                  {recentSchemas.map((collection) => (
                    <Link
                      className="grid gap-2 px-4 py-3 text-xs transition hover:bg-muted/60"
                      href={adminRoutes.schema.detail(collection.id).href}
                      key={collection.definition.name}
                      prefetch={true}
                    >
                      <span className="flex min-w-0 items-center justify-between gap-3">
                        <span className="truncate font-medium text-slate-950">
                          {collection.definition.label}
                        </span>
                        <Badge variant="outline">
                          {formatCount(collection.definition.fields.length, "field")}
                        </Badge>
                      </span>
                      <span className="flex min-w-0 items-center gap-2 text-slate-500">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate font-data text-[10px]">
                          {collection.definition.name}
                        </span>
                        <span className="shrink-0">
                          Updated {formatHomeTimestamp(collection.updatedAt)}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </AdminSectionCard>
          </div>
        </div>

        {permissions.canAccessSettingsWorkspace ? (
          <AdminSectionCard title="Access posture">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-white p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-950">
                  <ShieldCheck className="h-4 w-4 text-slate-500" />
                  Current role
                </div>
                <p className="mt-2 font-data text-xl text-slate-950">
                  {workspace.role.label}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">
                  {workspace.authorization.permissions.length} permissions granted.
                </p>
              </div>
              <Link
                className="rounded-lg border border-border bg-white p-4 transition hover:bg-muted/60"
                href={adminRoutes.settings().href}
                prefetch={true}
              >
                <div className="flex items-center gap-2 text-xs font-medium text-slate-950">
                  <KeyRound className="h-4 w-4 text-slate-500" />
                  API key posture
                </div>
                <p className="mt-2 font-data text-xl text-slate-950">
                  {formatMetricValue({
                    hasLoaded: hasLoadedApiKeys,
                    isAllowed: permissions.canAccessSettingsWorkspace,
                    isLoading: isLoadingApiKeys,
                    value: activeApiKeyCount,
                  })}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">
                  Active public API keys.
                </p>
              </Link>
              <Link
                className="rounded-lg border border-border bg-white p-4 transition hover:bg-muted/60"
                href={adminRoutes.team().href}
                prefetch={true}
              >
                <div className="flex items-center gap-2 text-xs font-medium text-slate-950">
                  <Users className="h-4 w-4 text-slate-500" />
                  Team access
                </div>
                <p className="mt-2 font-data text-xl text-slate-950">
                  {formatMetricValue({
                    hasLoaded: hasLoadedUsers,
                    isAllowed: permissions.canViewUsers,
                    isLoading: isLoadingUsers,
                    restrictedValue: permissions.canAccessTeamAccess
                      ? "Limited"
                      : "Restricted",
                    value: users.length,
                  })}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">
                  Users visible to this role.
                </p>
              </Link>
            </div>
          </AdminSectionCard>
        ) : null}
    </AdminWorkspaceRouteFrame>
  );
}

export function AdminHomeRoute() {
  return <AdminHomeContent route={adminRoutes.home()} />;
}
