"use client";

import { Search } from "lucide-react";
import * as React from "react";

import {
  CommandPaletteDialog,
  filterCommandPaletteItems,
  type CommandPaletteItem,
} from "../_components/command-palette-dialog";
import { summarizeRecord } from "../_lib/record-drafts";
import { adminRoutes, type AdminWorkspaceRoute } from "./admin-routes";
import { useAdminWorkspace } from "./admin-workspace-hooks";

type AdminWorkspaceCommandPaletteProps = {
  route: AdminWorkspaceRoute;
};

function navigateTo(href: string) {
  window.location.href = href;
}

function createNavigationCommand(route: AdminWorkspaceRoute): CommandPaletteItem {
  return {
    group: "navigation",
    id: `navigate-${route.id}`,
    keywords: [route.id, route.section, route.label],
    onSelect: () => navigateTo(route.href),
    subtitle: route.description,
    title: `Open ${route.label}`,
  };
}

export function AdminWorkspaceCommandPalette({
  route,
}: AdminWorkspaceCommandPaletteProps) {
  const workspace = useAdminWorkspace();
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const deferredQuery = React.useDeferredValue(query);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const currentCollection = workspace.recordCollectionName
    ? workspace.collections.find(
        (collection) =>
          collection.definition.name === workspace.recordCollectionName,
      ) ?? null
    : null;

  const openPalette = React.useCallback(() => {
    setQuery("");
    setActiveIndex(0);
    setIsOpen(true);
  }, []);

  const closePalette = React.useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

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

        setQuery("");
        setActiveIndex(0);
        return true;
      });
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const routeRefreshLabel =
    route.section === "home"
      ? "Refresh access"
      : route.section === "content" && currentCollection
        ? `Refresh ${currentCollection.definition.label} records`
        : `Refresh ${route.label}`;
  const isRouteRefreshDisabled =
    route.section === "home"
      ? false
      : route.section === "schema"
        ? !workspace.permissions.canViewCollections ||
          workspace.isLoadingCollections ||
          workspace.isRefreshingCollections
        : route.section === "content"
          ? currentCollection
            ? !workspace.permissions.canViewRecords ||
              workspace.isLoadingRecords ||
              workspace.isRefreshingRecords
            : !workspace.permissions.canViewCollections ||
              workspace.isLoadingCollections ||
              workspace.isRefreshingCollections
          : route.section === "media"
            ? !workspace.permissions.canViewMedia ||
              workspace.isLoadingMediaAssets ||
              workspace.isRefreshingMediaAssets
            : route.section === "team"
              ? !workspace.permissions.canAccessTeamAccess ||
                workspace.isLoadingRoles ||
                workspace.isLoadingUsers ||
                workspace.updatingUserRoleId !== null
              : route.section === "settings"
                ? !workspace.permissions.canAccessSettingsWorkspace ||
                  workspace.isLoadingApiKeys ||
                  workspace.isLoadingRoles ||
                  workspace.isCreatingApiKey ||
                  workspace.isSavingRole ||
                  workspace.savingApiKeyId !== null ||
                  workspace.revokingApiKeyId !== null
                : false;

  const refreshCurrentRoute = React.useCallback(async () => {
    if (route.section === "home" || route.section === "account") {
      await workspace.refreshAccess();
      return;
    }

    if (route.section === "schema") {
      await workspace.refreshCollections();
      return;
    }

    if (route.section === "content") {
      if (currentCollection) {
        await workspace.refreshRecords(currentCollection, {
          selectedRecordId: workspace.selectedRecord?.id ?? null,
        });
        return;
      }

      await workspace.refreshCollections();
      return;
    }

    if (route.section === "media") {
      await workspace.refreshMediaAssets();
      return;
    }

    if (route.section === "team") {
      await Promise.all([
        workspace.permissions.canViewUsers
          ? workspace.refreshUserList()
          : Promise.resolve(),
        workspace.refreshAvailableRoles(),
      ]);
      return;
    }

    await Promise.all([
      workspace.refreshApiKeyData(),
      workspace.refreshAvailableRoles(),
    ]);
  }, [currentCollection, route.section, workspace]);

  const commandPaletteItems = React.useMemo(() => {
    const routeCommands = [
      adminRoutes.home(),
      adminRoutes.schema.index(),
      adminRoutes.content.index(),
      adminRoutes.media(),
      adminRoutes.team(),
      adminRoutes.settings(),
      adminRoutes.account(),
    ].map(createNavigationCommand);
    const createCommands: CommandPaletteItem[] = [
      {
        disabled: !workspace.permissions.canCreateCollections,
        group: "create",
        id: "create-schema",
        keywords: ["new", "create", "schema", "collection", "model"],
        onSelect: () => navigateTo(adminRoutes.schema.new().href),
        subtitle: workspace.permissions.canCreateCollections
          ? "Create a schema in the routed builder."
          : "Schema creation is restricted for the current role.",
        title: "New schema",
      },
    ];

    if (workspace.permissions.canCreateRecords) {
      createCommands.push(
        ...workspace.collections.map((collection) => ({
          group: "create" as const,
          id: `create-record-${collection.definition.name}`,
          keywords: [
            "new",
            "create",
            "record",
            "content",
            collection.definition.name,
            collection.definition.label,
          ],
          onSelect: () =>
            navigateTo(adminRoutes.content.newRecord(collection.definition.name).href),
          subtitle: `Create content in ${collection.definition.label}.`,
          title: `New ${collection.definition.label} record`,
        })),
      );
    }

    const collectionCommands = workspace.collections.flatMap((collection) => [
      {
        group: "collections" as const,
        id: `open-schema-${collection.definition.name}`,
        keywords: [
          "schema",
          "collection",
          "model",
          collection.definition.name,
          collection.definition.label,
        ],
        onSelect: () =>
          navigateTo(adminRoutes.schema.detail(collection.definition.name).href),
        subtitle: `Edit ${collection.definition.fields.length} schema fields.`,
        title: `Schema: ${collection.definition.label}`,
      },
      {
        group: "collections" as const,
        id: `open-content-${collection.definition.name}`,
        keywords: [
          "content",
          "records",
          collection.definition.name,
          collection.definition.label,
        ],
        onSelect: () =>
          navigateTo(adminRoutes.content.collection(collection.definition.name).href),
        subtitle: `Browse records for ${collection.definition.label}.`,
        title: `Content: ${collection.definition.label}`,
      },
    ]);
    const recordCommands: CommandPaletteItem[] = currentCollection
      ? workspace.records.map((record) => ({
          group: "records",
          id: `open-record-${currentCollection.definition.name}-${record.id}`,
          keywords: [
            "record",
            "content",
            currentCollection.definition.name,
            currentCollection.definition.label,
            record.id,
          ],
          onSelect: () =>
            navigateTo(
              adminRoutes.content.record(
                currentCollection.definition.name,
                record.id,
              ).href,
            ),
          subtitle: `Open ${currentCollection.definition.label} record ${record.id}.`,
          title: summarizeRecord(currentCollection.definition, record),
        }))
      : [];
    const refreshCommand: CommandPaletteItem = {
      disabled: isRouteRefreshDisabled,
      group: "refresh",
      id: `refresh-${route.id}`,
      keywords: ["refresh", "reload", route.id, route.section, route.label],
      onSelect: refreshCurrentRoute,
      subtitle: isRouteRefreshDisabled
        ? "Refresh is unavailable for the current route state."
        : "Reload the data used by the current route.",
      title: routeRefreshLabel,
    };
    const accountCommands: CommandPaletteItem[] = [
      {
        group: "account",
        id: "account-profile",
        keywords: ["account", "profile", "session"],
        onSelect: () => navigateTo(adminRoutes.account().href),
        subtitle: "Open profile and session controls.",
        title: "Open account",
      },
      {
        group: "account",
        id: "sign-out",
        keywords: ["logout", "log out", "sign out", "session"],
        onSelect: workspace.signOut,
        subtitle: "End the current admin session.",
        title: "Sign out",
      },
    ];

    return [
      refreshCommand,
      ...routeCommands,
      ...createCommands,
      ...collectionCommands,
      ...recordCommands,
      ...accountCommands,
    ];
  }, [
    currentCollection,
    isRouteRefreshDisabled,
    refreshCurrentRoute,
    route.id,
    route.label,
    route.section,
    routeRefreshLabel,
    workspace.collections,
    workspace.permissions.canCreateCollections,
    workspace.permissions.canCreateRecords,
    workspace.records,
    workspace.signOut,
  ]);
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
