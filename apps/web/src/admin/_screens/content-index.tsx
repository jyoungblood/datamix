"use client";

import { Plus } from "lucide-react";
import * as React from "react";

import { AdminPageHeader } from "../_components/admin-design";
import {
  AdminLoadingReserve,
  AdminTableSkeleton,
  useDelayedLoadingIndicator,
} from "../_components/admin-skeleton";
import { AdminStateBox } from "../_components/admin-state";
import { formatRecordTimestamp } from "../_lib/media-formatting";
import { summarizeRecord } from "../_lib/record-drafts";
import {
  adminRoutes,
  type AdminWorkspaceRoute,
} from "../_workspace/admin-routes";
import {
  useAdminWorkspace,
  useAdminWorkspaceRouteAccess,
} from "../_workspace/admin-workspace-hooks";

import { Button } from "@/components/ui/button";
import type { StoredCollectionDefinition } from "@/lib/collection-definitions";
import {
  listCollectionRecords,
  type StoredCollectionRecord,
} from "@/lib/records";

type ContentIndexRecordRow = {
  collection: StoredCollectionDefinition;
  record: StoredCollectionRecord;
};

function formatContentRecordError(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load content.";
}

function createCollectionSignature(collections: StoredCollectionDefinition[]) {
  return collections
    .map((collection) => `${collection.id}:${collection.updatedAt}`)
    .join("|");
}

export function ContentIndexContent({ route }: { route: AdminWorkspaceRoute }) {
  const workspace = useAdminWorkspace();
  const access = useAdminWorkspaceRouteAccess(route);
  const {
    collectionLoadError,
    collections,
    hasLoadedCollections,
    isLoadingCollections,
    loadCollections,
    permissions,
    role,
    selectRecord,
  } = workspace;
  const [recordRows, setRecordRows] = React.useState<ContentIndexRecordRow[]>([]);
  const [recordLoadError, setRecordLoadError] = React.useState<string | null>(null);
  const [hasLoadedContentRecords, setHasLoadedContentRecords] =
    React.useState(false);
  const [loadedCollectionSignature, setLoadedCollectionSignature] = React.useState<
    string | null
  >(null);
  const [isLoadingContentRecords, setIsLoadingContentRecords] =
    React.useState(false);
  const recordsLoadRequestId = React.useRef(0);
  const collectionSignature = createCollectionSignature(collections);
  const hasCurrentContentRecords =
    hasLoadedContentRecords && loadedCollectionSignature === collectionSignature;
  const shouldShowCollectionSkeleton =
    permissions.canViewCollections && !hasLoadedCollections && !collectionLoadError;
  const shouldShowContentRecordsSkeleton =
    permissions.canViewCollections &&
    permissions.canViewRecords &&
    hasLoadedCollections &&
    collections.length > 0 &&
    !hasCurrentContentRecords &&
    !recordLoadError;
  const shouldShowSkeleton =
    shouldShowCollectionSkeleton || shouldShowContentRecordsSkeleton;
  const shouldShowDelayedSkeleton =
    useDelayedLoadingIndicator(shouldShowSkeleton);

  const loadContentRecords = React.useCallback(
    async () => {
      if (
        !permissions.canViewCollections ||
        !permissions.canViewRecords ||
        collections.length === 0
      ) {
        setRecordRows([]);
        setRecordLoadError(null);
        setHasLoadedContentRecords(false);
        setLoadedCollectionSignature(null);
        return;
      }

      const requestId = recordsLoadRequestId.current + 1;

      recordsLoadRequestId.current = requestId;
      setIsLoadingContentRecords(true);
      setHasLoadedContentRecords(false);
      setRecordRows([]);
      setRecordLoadError(null);

      const results = await Promise.all(
        collections.map(async (collection) => {
          try {
            const result = await listCollectionRecords(collection.definition.name);

            return {
              collection,
              error: null,
              records: result.records,
            };
          } catch (error) {
            return {
              collection,
              error: formatContentRecordError(error),
              records: [] as StoredCollectionRecord[],
            };
          }
        }),
      );

      if (recordsLoadRequestId.current !== requestId) {
        return;
      }

      const nextRows = results
        .flatMap((result) =>
          result.records.map((record) => ({
            collection: result.collection,
            record,
          })),
        )
        .sort(
          (left, right) =>
            new Date(right.record.updatedAt).getTime() -
            new Date(left.record.updatedAt).getTime(),
        );
      const failedLoads = results.filter((result) => result.error);

      setRecordRows(nextRows);
      setHasLoadedContentRecords(true);
      setLoadedCollectionSignature(collectionSignature);
      setRecordLoadError(
        failedLoads.length > 0
          ? `${failedLoads.length} schema${failedLoads.length === 1 ? "" : "s"} could not load content.`
          : null,
      );
      setIsLoadingContentRecords(false);
    },
    [
      collectionSignature,
      collections,
      permissions.canViewCollections,
      permissions.canViewRecords,
    ],
  );

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
    if (
      !permissions.canViewCollections ||
      !permissions.canViewRecords ||
      !hasLoadedCollections ||
      collections.length === 0 ||
      hasCurrentContentRecords ||
      isLoadingContentRecords
    ) {
      return;
    }

    void loadContentRecords();
  }, [
    collections.length,
    hasCurrentContentRecords,
    hasLoadedCollections,
    isLoadingContentRecords,
    loadContentRecords,
    permissions.canViewCollections,
    permissions.canViewRecords,
  ]);

  return (
    <>
      <AdminPageHeader
        action={
          permissions.canCreateRecords ? (
            <Button asChild>
              <a href={adminRoutes.content.newRecord().href}>
                <Plus />
                New content
              </a>
            </Button>
          ) : (
            <Button disabled type="button">
              <Plus />
              New content
            </Button>
          )
        }
        title="Content"
      />

      {!access.isAllowed ? (
        <AdminStateBox body={access.body} title={access.title} tone="warning" />
      ) : !permissions.canViewCollections ? (
        <AdminStateBox
          body="Your current role can access content, but it cannot browse saved schema definitions."
          title="Content list is restricted"
          tone="warning"
        />
      ) : !permissions.canViewRecords && permissions.canCreateRecords ? (
        <AdminStateBox
          actionLabel="New content"
          body={`Your ${role.label} role can create content, but it cannot browse saved content.`}
          onAction={() => {
            window.location.href = adminRoutes.content.newRecord().href;
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
        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_0.8fr_0.8fr_0.9fr] gap-3 border-b px-4 py-3 text-[11px] font-bold text-slate-500">
            <span>Content</span>
            <span>Schema</span>
            <span>Updated</span>
            <span>Created</span>
            <span>Record ID</span>
          </div>

          {shouldShowSkeleton ? (
            shouldShowDelayedSkeleton ? (
              <AdminTableSkeleton columns={5} rows={5} />
            ) : (
              <AdminLoadingReserve className="min-h-[220px]" />
            )
          ) : collectionLoadError && collections.length === 0 ? (
            <div className="p-4">
              <AdminStateBox
                body={collectionLoadError}
                compact
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
          ) : recordLoadError && recordRows.length === 0 ? (
            <div className="p-4">
              <AdminStateBox
                body={recordLoadError}
                compact
                title="Content list is unavailable"
                tone="error"
              />
            </div>
          ) : recordRows.length === 0 ? (
            <div className="p-4">
              {permissions.canCreateRecords ? (
                <AdminStateBox
                  actionLabel="Create first content"
                  body="Create a first content entry from any saved schema."
                  compact
                  onAction={() => {
                    window.location.href = adminRoutes.content.newRecord().href;
                  }}
                  title="No saved content yet"
                />
              ) : (
                <AdminStateBox
                  body="No saved content entries are available yet."
                  compact
                  title="No saved content yet"
                />
              )}
            </div>
          ) : (
            <>
              {recordRows.map(({ collection, record }) => {
                const definition = collection.definition;

                return (
                  <div
                    className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_0.8fr_0.8fr_0.9fr] gap-3 border-b px-4 py-3 text-xs last:border-b-0 hover:bg-muted/60"
                    key={`${collection.id}:${record.id}`}
                  >
                    <a
                      className="min-w-0 font-medium text-slate-950 transition hover:text-slate-700"
                      href={adminRoutes.content.record(collection.id, record.id).href}
                      onClick={() => selectRecord(collection, record)}
                    >
                      <span className="block truncate">
                        {summarizeRecord(definition, record)}
                      </span>
                    </a>
                    <a
                      className="min-w-0 transition hover:text-slate-700"
                      href={adminRoutes.schema.detail(collection.id).href}
                    >
                      <span className="block truncate font-medium text-slate-950">
                        {definition.label}
                      </span>
                      <span className="block truncate font-data text-[10px] text-slate-500">
                        {definition.name}
                      </span>
                    </a>
                    <span className="text-slate-500">
                      {formatRecordTimestamp(record.updatedAt)}
                    </span>
                    <span className="text-slate-500">
                      {formatRecordTimestamp(record.createdAt)}
                    </span>
                    <span className="truncate font-data text-[10px] text-slate-500">
                      {record.id}
                    </span>
                  </div>
                );
              })}
              {recordLoadError ? (
                <div className="border-t p-4">
                  <AdminStateBox
                    body={`${recordLoadError} Showing the content that loaded successfully.`}
                    compact
                    title="Content list may be out of date"
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

export function ContentIndexRoute() {
  const route = adminRoutes.content.index();

  return <ContentIndexContent route={route} />;
}
