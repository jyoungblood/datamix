"use client";

import * as React from "react";

import {
  AdminMetric,
  AdminPageHeader,
  AdminSectionCard,
} from "../_components/admin-design";
import { AdminMetricSkeleton, AdminTableSkeleton } from "../_components/admin-skeleton";
import { AdminStateBox } from "../_components/admin-state";
import { AdminWorkspaceRouteFrame } from "../_workspace/admin-workspace-route-frame";
import {
  adminRoutes,
  type AdminWorkspaceRoute,
} from "../_workspace/admin-routes";
import {
  useAdminWorkspace,
  useAdminWorkspaceRouteAccess,
} from "../_workspace/admin-workspace-hooks";
import { formatCollectionSummary } from "../_lib/schema-drafts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function formatContentTimestamp(value: string) {
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

function ContentIndexContent({ route }: { route: AdminWorkspaceRoute }) {
  const workspace = useAdminWorkspace();
  const access = useAdminWorkspaceRouteAccess(route);
  const {
    collectionLoadError,
    collections,
    hasLoadedCollections,
    isLoadingCollections,
    isRefreshingCollections,
    loadCollections,
    permissions,
    refreshCollections,
  } = workspace;
  const isInitialCollectionLoad = isLoadingCollections && !hasLoadedCollections;
  const shouldShowCollectionSkeleton =
    permissions.canViewCollections && !hasLoadedCollections && !collectionLoadError;
  const totalFieldCount = collections.reduce(
    (count, collection) => count + collection.definition.fields.length,
    0,
  );
  const contentReadyCount = collections.filter(
    (collection) => collection.definition.fields.length > 0,
  ).length;

  React.useEffect(() => {
    if (
      !permissions.canViewCollections ||
      hasLoadedCollections ||
      isLoadingCollections
    ) {
      return;
    }

    void loadCollections();
  }, [
    hasLoadedCollections,
    isLoadingCollections,
    loadCollections,
    permissions.canViewCollections,
  ]);

  return (
    <AdminWorkspaceRouteFrame route={route}>
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <AdminPageHeader
          action={
            permissions.canCreateRecords ? (
              <Button asChild>
                <a href={adminRoutes.schema.index().href}>Choose schema</a>
              </Button>
            ) : (
              <Button disabled type="button">
                Choose schema
              </Button>
            )
          }
          description="Choose a saved schema before browsing, creating, or editing content."
          eyebrow="Content"
          title="Content"
        />

        {shouldShowCollectionSkeleton ? (
          <div className="grid gap-3 md:grid-cols-3">
            <AdminMetricSkeleton />
            <AdminMetricSkeleton />
            <AdminMetricSkeleton />
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            <AdminMetric
              description={
                permissions.canViewCollections
                  ? "Schemas that can generate content editors."
                  : "Schema list is hidden for this role."
              }
              label="Schemas"
              value={permissions.canViewCollections ? collections.length : "Restricted"}
            />
            <AdminMetric
              description="Schemas with at least one generated field."
              label="Content-ready"
              value={permissions.canViewCollections ? contentReadyCount : "Restricted"}
            />
            <AdminMetric
              description="Stored fields across visible schemas."
              label="Fields"
              value={permissions.canViewCollections ? totalFieldCount : "Restricted"}
            />
          </div>
        )}

        {!access.isAllowed ? (
          <AdminStateBox body={access.body} title={access.title} tone="warning" />
        ) : !permissions.canViewCollections ? (
          <AdminStateBox
            body="Your current role can access content, but it cannot browse saved schema definitions."
            title="Content picker is restricted"
            tone="warning"
          />
        ) : (
          <AdminSectionCard
            description="Each row opens the generated content workspace for that schema."
            title="Choose content schema"
          >
            <div className="overflow-hidden rounded-lg border border-border bg-white">
              <div className="grid grid-cols-[minmax(0,1.4fr)_0.8fr_0.9fr_0.8fr_0.9fr] gap-3 border-b px-4 py-3 text-[11px] font-bold text-slate-500">
                <span>Schema</span>
                <span>Fields</span>
                <span>Storage</span>
                <span>Status</span>
                <span>Updated</span>
              </div>

              {shouldShowCollectionSkeleton || isInitialCollectionLoad ? (
                <AdminTableSkeleton columns={5} rows={4} />
              ) : collectionLoadError && collections.length === 0 ? (
                <div className="p-4">
                  <AdminStateBox
                    actionLabel="Try again"
                    body={collectionLoadError}
                    compact
                    onAction={() => void refreshCollections()}
                    title="Content schemas are unavailable"
                    tone="error"
                  />
                </div>
              ) : collections.length === 0 ? (
                <div className="p-4">
                  {permissions.canCreateCollections ? (
                    <AdminStateBox
                      actionLabel="Create first schema"
                      body="Create a schema before adding content."
                      compact
                      onAction={() => {
                        window.location.href = adminRoutes.schema.new().href;
                      }}
                      title="No content schemas yet"
                    />
                  ) : (
                    <AdminStateBox
                      body="Create a schema before adding content."
                      compact
                      title="No content schemas yet"
                    />
                  )}
                </div>
              ) : (
                <>
                  {collections.map((collection) => {
                    const definition = collection.definition;

                    return (
                      <a
                        className="grid grid-cols-[minmax(0,1.4fr)_0.8fr_0.9fr_0.8fr_0.9fr] gap-3 border-b px-4 py-3 text-xs transition last:border-b-0 hover:bg-muted/60"
                        href={adminRoutes.content.collection(definition.name).href}
                        key={definition.name}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-slate-950">
                            {definition.label}
                          </span>
                          <span className="block truncate font-data text-[10px] text-slate-500">
                            {definition.name}
                          </span>
                        </span>
                        <span className="text-slate-500">
                          {formatCollectionSummary(collection)}
                        </span>
                        <span className="truncate font-data text-[10px] text-slate-500">
                          {collection.tableName}
                        </span>
                        <span>
                          <Badge variant="outline">
                            {definition.fields.length > 0 ? "Ready" : "No fields"}
                          </Badge>
                        </span>
                        <span className="text-slate-500">
                          {formatContentTimestamp(collection.updatedAt)}
                        </span>
                      </a>
                    );
                  })}
                  {isRefreshingCollections ? (
                    <p className="border-t px-4 py-3 text-xs text-slate-500">
                      Refreshing content schemas...
                    </p>
                  ) : null}
                  {collectionLoadError ? (
                    <div className="border-t p-4">
                      <AdminStateBox
                        actionLabel="Retry refresh"
                        body={`${collectionLoadError} Showing the last content schema list that loaded successfully.`}
                        compact
                        onAction={() => void refreshCollections()}
                        title="Content schema refresh did not finish"
                        tone="error"
                      />
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </AdminSectionCard>
        )}
      </div>
    </AdminWorkspaceRouteFrame>
  );
}

export function ContentIndexRoute() {
  const route = adminRoutes.content.index();

  return <ContentIndexContent route={route} />;
}
