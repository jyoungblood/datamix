"use client";

import type { CommandPaletteItem } from "../_components/command-palette-dialog";
import { summarizeRecord } from "../_lib/record-drafts";
import type { AdminWorkspacePermissions } from "../_workspace/admin-permissions";
import { adminRoutes, type AdminWorkspaceRoute } from "../_workspace/admin-routes";

import type { StoredCollectionDefinition } from "@/lib/collection-definitions";
import type { StoredCollectionRecord } from "@/lib/records";

type AdminCommandPaletteDataInput = {
  collections: StoredCollectionDefinition[];
  onNavigate: (href: string) => void;
  onSignOut: () => Promise<void> | void;
  permissions: Pick<
    AdminWorkspacePermissions,
    "canCreateCollections" | "canCreateRecords"
  >;
  recordCollectionName: string | null;
  records: StoredCollectionRecord[];
};

function createNavigationCommand(
  route: AdminWorkspaceRoute,
  onNavigate: (href: string) => void,
): CommandPaletteItem {
  return {
    group: "navigation",
    id: `navigate-${route.id}`,
    keywords: [route.id, route.section, route.label],
    onSelect: () => onNavigate(route.href),
    subtitle: route.description,
    title: `Open ${route.label}`,
  };
}

export function createAdminCommandPaletteItems({
  collections,
  onNavigate,
  onSignOut,
  permissions,
  recordCollectionName,
  records,
}: AdminCommandPaletteDataInput): CommandPaletteItem[] {
  const currentCollection = recordCollectionName
    ? collections.find(
        (collection) => collection.definition.name === recordCollectionName,
      ) ?? null
    : null;
  const routeCommands = [
    adminRoutes.home(),
    adminRoutes.schema.index(),
    adminRoutes.content.index(),
    adminRoutes.media(),
    adminRoutes.team(),
    adminRoutes.settings(),
    adminRoutes.account(),
  ].map((route) => createNavigationCommand(route, onNavigate));
  const createCommands: CommandPaletteItem[] = [
    {
      disabled: !permissions.canCreateCollections,
      group: "create",
      id: "create-schema",
      keywords: ["new", "create", "schema", "collection", "model"],
      onSelect: () => onNavigate(adminRoutes.schema.new().href),
      subtitle: permissions.canCreateCollections
        ? "Create a schema in the routed builder."
        : "Schema creation is restricted for the current role.",
      title: "New schema",
    },
    {
      disabled: !permissions.canCreateRecords,
      group: "create",
      id: "create-record",
      keywords: ["new", "create", "record", "content"],
      onSelect: () => onNavigate(adminRoutes.content.newRecord().href),
      subtitle: permissions.canCreateRecords
        ? "Choose a schema and create content."
        : "Content creation is restricted for the current role.",
      title: "New content",
    },
  ];
  const collectionCommands = collections.map((collection) => ({
    group: "collections" as const,
    id: `open-schema-${collection.id}`,
    keywords: [
      "schema",
      "collection",
      "model",
      collection.definition.name,
      collection.definition.label,
    ],
    onSelect: () => onNavigate(adminRoutes.schema.detail(collection.id).href),
    subtitle: `Edit ${collection.definition.fields.length} schema fields.`,
    title: `Schema: ${collection.definition.label}`,
  }));
  const recordCommands: CommandPaletteItem[] = currentCollection
    ? records.map((record) => ({
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
          onNavigate(adminRoutes.content.record(currentCollection.id, record.id).href),
        subtitle: `Open ${currentCollection.definition.label} record ${record.id}.`,
        title: summarizeRecord(currentCollection.definition, record),
      }))
    : [];
  const accountCommands: CommandPaletteItem[] = [
    {
      group: "account",
      id: "account-profile",
      keywords: ["account", "profile", "session"],
      onSelect: () => onNavigate(adminRoutes.account().href),
      subtitle: "Open profile and session controls.",
      title: "Open account",
    },
    {
      group: "account",
      id: "sign-out",
      keywords: ["logout", "log out", "sign out", "session"],
      onSelect: onSignOut,
      subtitle: "End the current admin session.",
      title: "Sign out",
    },
  ];

  return [
    ...routeCommands,
    ...createCommands,
    ...collectionCommands,
    ...recordCommands,
    ...accountCommands,
  ];
}
