import { buildDatamixAdminPath } from "@/lib/runtime";

export type AdminWorkspaceRouteSection =
  | "account"
  | "content"
  | "media"
  | "schema"
  | "settings"
  | "team";

export type AdminWorkspaceRouteAccess = AdminWorkspaceRouteSection;

export type AdminWorkspaceRoute = {
  access: AdminWorkspaceRouteAccess;
  description: string;
  href: string;
  id: string;
  label: string;
  section: AdminWorkspaceRouteSection;
  title: string;
};

type AdminRouteInput = Omit<AdminWorkspaceRoute, "href"> & {
  pathname: string;
};

function encodeRouteSegment(value: string) {
  return encodeURIComponent(value);
}

function formatRouteSegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function createAdminRoute({ pathname, ...route }: AdminRouteInput) {
  return {
    ...route,
    href: buildDatamixAdminPath(pathname),
  };
}

export const adminRoutes = {
  schema: {
    index: () =>
      createAdminRoute({
        access: "schema",
        description: "Review schemas and open the schema builder.",
        id: "schema",
        label: "Schema",
        pathname: "/schema",
        section: "schema",
        title: "Schema",
      }),
    new: () =>
      createAdminRoute({
        access: "schema",
        description: "Create a new schema with the routed schema builder.",
        id: "schema-new",
        label: "New schema",
        pathname: "/schema/new",
        section: "schema",
        title: "New schema",
      }),
    detail: (schemaId: string) => {
      const label = formatRouteSegment(schemaId);

      return createAdminRoute({
        access: "schema",
        description: "Edit an existing schema with the routed schema builder.",
        id: "schema-detail",
        label,
        pathname: `/schema/${encodeRouteSegment(schemaId)}`,
        section: "schema",
        title: label ? `Schema: ${label}` : "Schema detail",
      });
    },
  },
  content: {
    index: () =>
      createAdminRoute({
        access: "content",
        description: "Choose a schema before browsing or editing content.",
        id: "content",
        label: "Content",
        pathname: "/content",
        section: "content",
        title: "Content",
      }),
    collection: (collection: string) => {
      const label = formatRouteSegment(collection);

      return createAdminRoute({
        access: "content",
        description: "Browse records for a schema and open content editors.",
        id: "content-collection",
        label,
        pathname: `/content/${encodeRouteSegment(collection)}`,
        section: "content",
        title: label ? `Content: ${label}` : "Content collection",
      });
    },
    newRecord: (collection: string) => {
      const label = formatRouteSegment(collection);

      return createAdminRoute({
        access: "content",
        description: "Create a new content record for the selected schema.",
        id: "content-new-record",
        label: "New content",
        pathname: `/content/${encodeRouteSegment(collection)}/new`,
        section: "content",
        title: label ? `New ${label} content` : "New content",
      });
    },
    record: (collection: string, recordId: string) => {
      const collectionLabel = formatRouteSegment(collection);
      const recordLabel = formatRouteSegment(recordId);

      return createAdminRoute({
        access: "content",
        description: "Edit an existing content record.",
        id: "content-record",
        label: recordLabel,
        pathname: `/content/${encodeRouteSegment(collection)}/${encodeRouteSegment(
          recordId,
        )}`,
        section: "content",
        title:
          collectionLabel && recordLabel
            ? `${collectionLabel}: ${recordLabel}`
            : "Content record",
      });
    },
  },
  media: () =>
    createAdminRoute({
      access: "media",
      description: "Upload, browse, and select media assets.",
      id: "media",
      label: "Media",
      pathname: "/media",
      section: "media",
      title: "Media",
    }),
  team: () =>
    createAdminRoute({
      access: "team",
      description: "Manage users, invitations, roles, and access previews.",
      id: "team",
      label: "Team",
      pathname: "/team",
      section: "team",
      title: "Team",
    }),
  settings: () =>
    createAdminRoute({
      access: "settings",
      description: "Review OAuth posture, public API keys, and role settings.",
      id: "settings",
      label: "Settings",
      pathname: "/settings",
      section: "settings",
      title: "Settings",
    }),
  account: () =>
    createAdminRoute({
      access: "account",
      description: "Review the current admin profile and session actions.",
      id: "account",
      label: "Account",
      pathname: "/account",
      section: "account",
      title: "Account",
    }),
} as const;

export const adminWorkspaceSidebarRoutes = [
  adminRoutes.schema.index(),
  adminRoutes.content.index(),
  adminRoutes.media(),
  adminRoutes.team(),
  adminRoutes.settings(),
] as const satisfies readonly AdminWorkspaceRoute[];
