"use client";

import * as React from "react";

import {
  listCollectionDefinitions,
  type StoredCollectionDefinition,
} from "@/lib/collection-definitions";

type AdminCollectionsStateOptions = {
  initialCollectionLoadError?: string | null | undefined;
  initialCollections?: StoredCollectionDefinition[] | undefined;
  initialCollectionsLoaded?: boolean | undefined;
};

export function useAdminCollectionsState(options?: AdminCollectionsStateOptions) {
  const collectionLoadRequestId = React.useRef(0);
  const [collections, setCollections] = React.useState<StoredCollectionDefinition[]>(
    () => options?.initialCollections ?? [],
  );
  const [collectionLoadError, setCollectionLoadError] = React.useState<string | null>(
    () => options?.initialCollectionLoadError ?? null,
  );
  const [hasLoadedCollections, setHasLoadedCollections] = React.useState(
    () => options?.initialCollectionsLoaded ?? false,
  );
  const [isLoadingCollections, setIsLoadingCollections] = React.useState(false);

  const resetCollectionsWorkspace = React.useCallback(() => {
    collectionLoadRequestId.current += 1;
    setCollections([]);
    setCollectionLoadError(null);
    setHasLoadedCollections(false);
    setIsLoadingCollections(false);
  }, []);

  const loadCollections = React.useCallback(async () => {
    const requestId = collectionLoadRequestId.current + 1;

    collectionLoadRequestId.current = requestId;
    setCollectionLoadError(null);
    setIsLoadingCollections(true);

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
      }
    }
  }, []);

  return {
    collectionLoadError,
    collections,
    hasLoadedCollections,
    isLoadingCollections,
    loadCollections,
    resetCollectionsWorkspace,
  };
}
