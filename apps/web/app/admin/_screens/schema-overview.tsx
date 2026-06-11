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

function SchemaOverviewContent({ route }: { route: AdminWorkspaceRoute }) {
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
  const schemaState = collectionLoadError
    ? "Error"
    : isInitialCollectionLoad
      ? "Loading"
      : "Ready";

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
          description="Manage schema definitions, fields, generated content readiness, and publishing status."
          eyebrow="Schema"
          title="Schema"
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
                  ? "Saved schema definitions."
                  : "Schema list is hidden for this role."
              }
              label="Schemas"
              value={permissions.canViewCollections ? collections.length : "Restricted"}
            />
            <AdminMetric
              description="Stored fields across visible schemas."
              label="Fields"
              value={permissions.canViewCollections ? totalFieldCount : "Restricted"}
            />
            <AdminMetric
              description="Draft schema persistence is not enabled in this slice."
              label="Drafts"
              value={permissions.canViewCollections ? 0 : "Restricted"}
            />
          </div>
        )}

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
          <AdminSectionCard
            description="Saved schemas drive generated content editors. Open a schema to edit fields and storage details."
            title="Saved schemas"
          >
            <div className="overflow-hidden rounded-lg border border-border bg-white">
              <div className="grid grid-cols-[minmax(0,1.5fr)_0.8fr_0.8fr_0.8fr_0.9fr] gap-3 border-b px-4 py-3 text-[11px] font-bold text-slate-500">
                <span>Schema</span>
                <span>Fields</span>
                <span>Content</span>
                <span>Status</span>
                <span>Updated</span>
              </div>

              {shouldShowCollectionSkeleton || isInitialCollectionLoad ? (
                <AdminTableSkeleton columns={5} rows={4} />
              ) : collectionLoadError && collections.length === 0 ? (
                <div className="p-4">
                  <AdminStateBox
                    actionLabel="Try again"
                    body={formatSchemaLanguage(collectionLoadError)}
                    compact
                    onAction={() => void refreshCollections()}
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
                        href={adminRoutes.schema.detail(definition.name).href}
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
                  {isRefreshingCollections ? (
                    <p className="border-t px-4 py-3 text-xs text-slate-500">
                      Refreshing the saved schema list...
                    </p>
                  ) : null}
                  {collectionLoadError ? (
                    <div className="border-t p-4">
                      <AdminStateBox
                        actionLabel="Retry refresh"
                        body={`${formatSchemaLanguage(collectionLoadError)} Showing the last schema list that loaded successfully.`}
                        compact
                        onAction={() => void refreshCollections()}
                        title="Schema refresh did not finish"
                        tone="error"
                      />
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <div className="mt-4">
              <AdminStateBox
                body={`Schema workspace state: ${schemaState}. Open a collection from this list to manage its records in the Content workspace.`}
                compact
                title="Schema overview scope"
                tone={collectionLoadError ? "warning" : "neutral"}
              />
            </div>
          </AdminSectionCard>
        )}
      </div>
    </AdminWorkspaceRouteFrame>
  );
}

export function SchemaOverviewRoute() {
  const route = adminRoutes.schema.index();

  return <SchemaOverviewContent route={route} />;
}
