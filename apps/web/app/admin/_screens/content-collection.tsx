"use client";

import { RefreshCcw } from "lucide-react";
import * as React from "react";

import {
  AdminPageHeader,
  AdminSectionCard,
} from "../_components/admin-design";
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
import { formatRecordTimestamp } from "../_lib/media-formatting";
import { summarizeRecord } from "../_lib/record-drafts";
import { formatCollectionSummary } from "../_lib/schema-drafts";

import { Button } from "@/components/ui/button";

type ContentCollectionContentProps = {
  collectionName: string;
  route: AdminWorkspaceRoute;
};

function ContentCollectionContent({
  collectionName,
  route,
}: ContentCollectionContentProps) {
  const workspace = useAdminWorkspace();
  const access = useAdminWorkspaceRouteAccess(route);
  const {
    collectionLoadError,
    collections,
    hasLoadedCollections,
    hasLoadedRecords,
    isLoadingCollections,
    isLoadingRecords,
    isRefreshingRecords,
    loadCollections,
    loadRecords,
    permissions,
    recordCollectionName,
    recordLoadError,
    records,
    recordSupportedFieldNames,
    refreshRecords,
    role,
    selectRecord,
  } = workspace;
  const collection =
    collections.find((item) => item.definition.name === collectionName) ?? null;
  const isInitialCollectionLoad = isLoadingCollections && !hasLoadedCollections;
  const isActiveRecordCollection = recordCollectionName === collectionName;
  const visibleRecords = isActiveRecordCollection ? records : [];
  const isInitialRecordLoad =
    isActiveRecordCollection && isLoadingRecords && !hasLoadedRecords;
  const canRefreshRecords =
    Boolean(collection) &&
    permissions.canViewRecords &&
    !isLoadingRecords &&
    !isRefreshingRecords;

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

  React.useEffect(() => {
    if (!collection || !permissions.canViewRecords) {
      return;
    }

    if (recordCollectionName === collection.definition.name && hasLoadedRecords) {
      return;
    }

    if (recordCollectionName === collection.definition.name && isLoadingRecords) {
      return;
    }

    void loadRecords(collection);
  }, [
    collection,
    hasLoadedRecords,
    isLoadingRecords,
    loadRecords,
    permissions.canViewRecords,
    recordCollectionName,
  ]);

  return (
    <AdminWorkspaceRouteFrame route={route}>
        <AdminPageHeader
          action={
            collection && permissions.canCreateRecords ? (
              <Button asChild>
                <a href={adminRoutes.content.newRecord(collection.definition.name).href}>
                  New content
                </a>
              </Button>
            ) : (
              <Button disabled type="button">
                New content
              </Button>
            )
          }
          title={collection ? collection.definition.label : "Content"}
        />

        {!access.isAllowed ? (
          <AdminStateBox body={access.body} title={access.title} tone="warning" />
        ) : isInitialCollectionLoad ? (
          <AdminStateBox
            body="Loading schemas before opening this content workspace."
            title="Loading content schema"
          />
        ) : collectionLoadError && collections.length === 0 ? (
          <AdminStateBox
            actionLabel="Try again"
            body={collectionLoadError}
            onAction={() => void loadCollections({ refresh: true })}
            title="Content schema is unavailable"
            tone="error"
          />
        ) : !collection ? (
          <AdminStateBox
            actionLabel="Choose content"
            body={`No saved schema named "${collectionName}" was found.`}
            onAction={() => {
              window.location.href = adminRoutes.content.index().href;
            }}
            title="Content schema not found"
            tone="warning"
          />
        ) : !permissions.canViewRecords && permissions.canCreateRecords ? (
          <AdminStateBox
            actionLabel="New content"
            body={`Your ${role.label} role can create content for ${collection.definition.label}, but it cannot browse saved content.`}
            onAction={() => {
              window.location.href = adminRoutes.content.newRecord(
                collection.definition.name,
              ).href;
            }}
            title="Content list is restricted"
            tone="warning"
          />
        ) : !permissions.canViewRecords ? (
          <AdminStateBox
            body={`Your ${role.label} role cannot browse saved content.`}
            title="Content list is restricted"
            tone="warning"
          />
        ) : (
          <AdminSectionCard
            action={
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={!canRefreshRecords}
                  onClick={() => void refreshRecords(collection)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <RefreshCcw />
                  {isRefreshingRecords ? "Refreshing" : "Refresh"}
                </Button>
                {permissions.canCreateRecords ? (
                  <Button asChild size="sm">
                    <a href={adminRoutes.content.newRecord(collection.definition.name).href}>
                      New content
                    </a>
                  </Button>
                ) : (
                  <Button disabled size="sm" type="button">
                    New content
                  </Button>
                )}
              </div>
            }
            description={`${formatCollectionSummary(collection)}. Open an entry to edit it in the generated content editor.`}
            title={`${collection.definition.label} content`}
          >
            <div className="record-browser">
              <div className="record-browser-list">
                {isInitialRecordLoad ? (
                  <AdminStateBox
                    body={`Loading ${collection.definition.label.toLowerCase()} content and storage support details.`}
                    compact
                    title="Loading content"
                  />
                ) : recordLoadError && visibleRecords.length === 0 ? (
                  <AdminStateBox
                    actionLabel="Try again"
                    body={recordLoadError}
                    compact
                    onAction={() => void refreshRecords(collection)}
                    title="Content list is unavailable"
                    tone="error"
                  />
                ) : visibleRecords.length === 0 ? (
                  permissions.canCreateRecords ? (
                    <AdminStateBox
                      actionLabel="Create first content"
                      body="Create a first content entry to exercise this generated editor."
                      compact
                      onAction={() => {
                        window.location.href = adminRoutes.content.newRecord(
                          collection.definition.name,
                        ).href;
                      }}
                      title="No saved content yet"
                    />
                  ) : (
                    <AdminStateBox
                      body="Create a first content entry to exercise this generated editor."
                      compact
                      title="No saved content yet"
                    />
                  )
                ) : (
                  <>
                    {visibleRecords.map((record) => (
                      <a
                        className="mini-list-item"
                        href={
                          adminRoutes.content.record(
                            collection.definition.name,
                            record.id,
                          ).href
                        }
                        key={record.id}
                        onClick={() => selectRecord(collection, record)}
                      >
                        <span>{summarizeRecord(collection.definition, record)}</span>
                        <small>{formatRecordTimestamp(record.updatedAt)}</small>
                      </a>
                    ))}
                    {isRefreshingRecords ? (
                      <p className="px-1 text-xs text-slate-500">
                        Refreshing {collection.definition.label.toLowerCase()} content...
                      </p>
                    ) : null}
                    {recordLoadError ? (
                      <AdminStateBox
                        actionLabel="Retry refresh"
                        body={`${recordLoadError} Showing the last content list that loaded successfully.`}
                        compact
                        onAction={() => void refreshRecords(collection)}
                        title="Content refresh did not finish"
                        tone="error"
                      />
                    ) : null}
                  </>
                )}
              </div>

              <aside className="generated-record-preview">
                <p className="card-eyebrow">Content data</p>
                <h4 className="section-title">Storage support</h4>
                <p className="section-copy">
                  Stored fields: <strong>{recordSupportedFieldNames}</strong>
                </p>
                <p className="section-copy">
                  Table: <strong>{collection.tableName}</strong>
                </p>
                <div className="mt-4">
                  <Button asChild size="sm" variant="outline">
                    <a href={adminRoutes.schema.detail(collection.definition.name).href}>
                      Open schema
                    </a>
                  </Button>
                </div>
              </aside>
            </div>
          </AdminSectionCard>
        )}
    </AdminWorkspaceRouteFrame>
  );
}

export function ContentCollectionRoute({
  collectionName,
}: {
  collectionName: string;
}) {
  const route = adminRoutes.content.collection(collectionName);

  return <ContentCollectionContent collectionName={collectionName} route={route} />;
}
