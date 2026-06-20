"use client";

import { Search } from "lucide-react";
import * as React from "react";

import {
  CommandPaletteDialog,
  filterCommandPaletteItems,
} from "../_components/command-palette-dialog";
import { signOutAdminSession } from "../_state/admin-account-state";
import { createAdminCommandPaletteItems } from "../_state/admin-command-palette-data";
import { useAdminCollectionsState } from "../_state/admin-collections-state";
import { useAdminRecordsState } from "../_state/admin-records-state";
import type { AdminWorkspaceProps } from "./admin-workspace-props";

function navigateTo(href: string) {
  window.location.href = href;
}

function decodeRouteSegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getContentSchemaIdFromRouteHref(href: string) {
  const routeUrl =
    typeof window === "undefined"
      ? new URL(href, "http://localhost")
      : new URL(href, window.location.origin);
  const pathParts = routeUrl.pathname.split("/").filter(Boolean);
  const adminIndex = pathParts.indexOf("admin");
  const contentIndex =
    adminIndex === -1 ? pathParts.indexOf("content") : adminIndex + 1;

  if (pathParts[contentIndex] !== "content") {
    return null;
  }

  const schemaId = pathParts[contentIndex + 1];

  return schemaId && schemaId !== "new" ? decodeRouteSegment(schemaId) : null;
}

type AdminWorkspaceCommandPaletteProps = {
  workspace: AdminWorkspaceProps;
};

export function AdminWorkspaceCommandPalette({
  workspace,
}: AdminWorkspaceCommandPaletteProps) {
  const {
    collections,
    hasLoadedCollections,
    isLoadingCollections,
    loadCollections,
  } = useAdminCollectionsState();
  const {
    hasLoadedRecords,
    isLoadingRecords,
    loadRecords,
    recordCollectionName,
    records,
  } = useAdminRecordsState();
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const deferredQuery = React.useDeferredValue(query);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const activeContentSchemaId = React.useMemo(
    () =>
      workspace.activeRoute.section === "content"
        ? getContentSchemaIdFromRouteHref(workspace.activeRoute.href)
        : null,
    [workspace.activeRoute.href, workspace.activeRoute.section],
  );
  const activeContentCollection = React.useMemo(
    () =>
      activeContentSchemaId
        ? collections.find((collection) => collection.id === activeContentSchemaId) ??
          null
        : null,
    [activeContentSchemaId, collections],
  );

  const loadPaletteCollections = React.useCallback(() => {
    if (
      !workspace.permissions.canViewCollections ||
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
    workspace.permissions.canViewCollections,
  ]);

  const openPalette = React.useCallback(() => {
    loadPaletteCollections();
    setQuery("");
    setActiveIndex(0);
    setIsOpen(true);
  }, [loadPaletteCollections]);

  const closePalette = React.useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  React.useEffect(() => {
    if (
      !isOpen ||
      !workspace.permissions.canViewRecords ||
      !activeContentCollection ||
      isLoadingRecords
    ) {
      return;
    }

    if (
      recordCollectionName === activeContentCollection.definition.name &&
      hasLoadedRecords
    ) {
      return;
    }

    void loadRecords(activeContentCollection);
  }, [
    activeContentCollection,
    hasLoadedRecords,
    isLoadingRecords,
    isOpen,
    loadRecords,
    recordCollectionName,
    workspace.permissions.canViewRecords,
  ]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || (!event.metaKey && !event.ctrlKey)) {
        return;
      }

      event.preventDefault();
      setIsOpen((currentIsOpen) => {
        if (currentIsOpen) {
          setQuery("");
          setActiveIndex(0);
          return false;
        }

        loadPaletteCollections();
        setQuery("");
        setActiveIndex(0);
        return true;
      });
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [loadPaletteCollections]);

  const commandPaletteItems = React.useMemo(() => {
    return createAdminCommandPaletteItems({
      collections,
      onNavigate: navigateTo,
      onSignOut: signOutAdminSession,
      permissions: workspace.permissions,
      recordCollectionName,
      records,
    });
  }, [collections, recordCollectionName, records, workspace.permissions]);
  const filteredCommandPaletteItems = filterCommandPaletteItems(
    commandPaletteItems,
    deferredQuery,
  );

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveIndex((currentIndex) => {
      if (filteredCommandPaletteItems.length === 0) {
        return 0;
      }

      return Math.min(currentIndex, filteredCommandPaletteItems.length - 1);
    });
  }, [filteredCommandPaletteItems.length, isOpen]);

  const moveActive = (direction: -1 | 1) => {
    if (filteredCommandPaletteItems.length === 0) {
      return;
    }

    setActiveIndex((currentIndex) => {
      const nextIndex = currentIndex + direction;

      if (nextIndex < 0) {
        return filteredCommandPaletteItems.length - 1;
      }

      if (nextIndex >= filteredCommandPaletteItems.length) {
        return 0;
      }

      return nextIndex;
    });
  };

  const selectItem = (index: number) => {
    const item = filteredCommandPaletteItems[index];

    if (!item || item.disabled) {
      return;
    }

    closePalette();
    void item.onSelect();
  };

  return (
    <>
      <label className="command-palette-trigger">
        <Search aria-hidden="true" className="command-palette-trigger-icon" />
        <input
          aria-label="Open command palette"
          className="command-palette-trigger-input"
          onClick={openPalette}
          onFocus={openPalette}
          readOnly
          type="text"
          value=""
        />
        <span aria-hidden="true" className="command-palette-trigger-shortcut">
          ⌘ + K
        </span>
      </label>
      {isOpen ? (
        <CommandPaletteDialog
          activeIndex={activeIndex}
          items={filteredCommandPaletteItems}
          onClose={closePalette}
          onMoveActive={moveActive}
          onQueryChange={setQuery}
          onSelectActive={() => selectItem(activeIndex)}
          onSelectItem={selectItem}
          query={query}
        />
      ) : null}
    </>
  );
}
