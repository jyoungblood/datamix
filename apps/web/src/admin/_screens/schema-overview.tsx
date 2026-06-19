"use client";

import * as React from "react";

import { AdminPageHeader } from "../_components/admin-design";
import {
  AdminLoadingReserve,
  AdminTableSkeleton,
  useDelayedLoadingIndicator,
} from "../_components/admin-skeleton";
import { AdminStateBox } from "../_components/admin-state";
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

function formatSchemaTimestamp(value: string) {
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

function formatSchemaLanguage(value: string) {
  return value
    .replaceAll("Collection definitions", "Schemas")
    .replaceAll("collection definitions", "schemas")
    .replaceAll("Collection definition", "Schema")
    .replaceAll("collection definition", "schema")
    .replaceAll("Collection", "Schema")
    .replaceAll("collection", "schema");
}

export function SchemaOverviewContent({ route }: { route: AdminWorkspaceRoute }) {
  const workspace = useAdminWorkspace();
  const access = useAdminWorkspaceRouteAccess(route);
  const {
    collectionLoadError,
    collections,
    hasLoadedCollections,
    isLoadingCollections,
    loadCollections,
    permissions,
  } = workspace;
  const isInitialCollectionLoad = isLoadingCollections && !hasLoadedCollections;
  const shouldShowCollectionSkeleton =
    permissions.canViewCollections && !hasLoadedCollections && !collectionLoadError;
  const shouldShowSkeleton =
    shouldShowCollectionSkeleton || isInitialCollectionLoad;
  const shouldShowDelayedSkeleton = useDelayedLoadingIndicator(shouldShowSkeleton);

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
    <>
      <AdminPageHeader
        action={
          permissions.canCreateCollections ? (
            <Button asChild>
              <a href={adminRoutes.schema.new().href}>New schema</a>
            </Button>
          ) : (
            <Button disabled type="button">
              New schema
            </Button>
          )
        }
        title="Schema"
      />

      {!access.isAllowed ? (
          <AdminStateBox body={access.body} title={access.title} tone="warning" />
        ) : !permissions.canViewCollections && permissions.canCreateCollections ? (
          <AdminStateBox
            actionLabel="Create new schema"
            body="Your current role can create schemas, but it cannot browse saved schema definitions."
            onAction={() => {
              window.location.href = adminRoutes.schema.new().href;
            }}
            title="Schema list is restricted"
            tone="warning"
          />
        ) : !permissions.canViewCollections ? (
          <AdminStateBox
            body="Your current role cannot browse saved schema definitions."
            title="Schema list is restricted"
            tone="warning"
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-white">
            <div className="grid grid-cols-[minmax(0,1.5fr)_0.8fr_0.8fr_0.8fr_0.9fr] gap-3 border-b px-4 py-3 text-[11px] font-bold text-slate-500">
              <span>Schema</span>
              <span>Fields</span>
              <span>Content</span>
              <span>Status</span>
              <span>Updated</span>
            </div>

            {shouldShowSkeleton ? (
              shouldShowDelayedSkeleton ? (
                <AdminTableSkeleton columns={5} rows={4} />
              ) : (
                <AdminLoadingReserve className="min-h-[180px]" />
              )
            ) : collectionLoadError && collections.length === 0 ? (
              <div className="p-4">
                <AdminStateBox
                  body={formatSchemaLanguage(collectionLoadError)}
                  compact
                  title="Schema list is unavailable"
                  tone="error"
                />
              </div>
            ) : collections.length === 0 && permissions.canCreateCollections ? (
              <div className="p-4">
                <AdminStateBox
                  actionLabel="Create first schema"
                  body="Create the first content model, then add fields in the schema builder."
                  compact
                  onAction={() => {
                    window.location.href = adminRoutes.schema.new().href;
                  }}
                  title="No schemas yet"
                />
              </div>
            ) : collections.length === 0 ? (
              <div className="p-4">
                <AdminStateBox
                  body="No saved schema definitions are available yet."
                  compact
                  title="No schemas yet"
                />
              </div>
            ) : (
              <>
                {collections.map((collection) => {
                  const definition = collection.definition;

                  return (
                    <a
                      className="grid grid-cols-[minmax(0,1.5fr)_0.8fr_0.8fr_0.8fr_0.9fr] gap-3 border-b px-4 py-3 text-xs transition last:border-b-0 hover:bg-muted/60"
                      href={adminRoutes.schema.detail(collection.id).href}
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
                      <span className="text-slate-500">Available in Content</span>
                      <span>
                        <Badge variant="outline">Live</Badge>
                      </span>
                      <span className="text-slate-500">
                        {formatSchemaTimestamp(collection.updatedAt)}
                      </span>
                    </a>
                  );
                })}
                {collectionLoadError ? (
                  <div className="border-t p-4">
                    <AdminStateBox
                      body={`${formatSchemaLanguage(collectionLoadError)} Showing the last schema list that loaded successfully.`}
                      compact
                      title="Schema list may be out of date"
                      tone="error"
                    />
                  </div>
                ) : null}
              </>
            )}
          </div>
      )}
    </>
  );
}

export function SchemaOverviewRoute() {
  const route = adminRoutes.schema.index();

  return <SchemaOverviewContent route={route} />;
}
