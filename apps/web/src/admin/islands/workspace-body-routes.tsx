import { AdminHomeRoute } from "@/admin/_screens/admin-home";
import { ContentEditorRoute } from "@/admin/_screens/content-editor";
import { ContentIndexRoute } from "@/admin/_screens/content-index";
import { MediaLibraryRoute } from "@/admin/_screens/media-library";
import { SchemaBuilderRoute } from "@/admin/_screens/schema-builder";
import { SchemaOverviewRoute } from "@/admin/_screens/schema-overview";
import { SettingsApiKeysRoute } from "@/admin/_screens/settings-api-keys";
import { TeamAndRolesRoute } from "@/admin/_screens/team-and-roles";
import { UserAccountRoute } from "@/admin/_screens/user-account";
import type { AdminWorkspaceRouteAccessState } from "@/admin/_workspace/admin-permissions";

export function AdminHomeBody() {
  return <AdminHomeRoute />;
}

export function SchemaOverviewBody({
  routeAccess,
}: {
  routeAccess?: AdminWorkspaceRouteAccessState;
}) {
  return routeAccess ? (
    <SchemaOverviewRoute routeAccess={routeAccess} />
  ) : (
    <SchemaOverviewRoute />
  );
}

export function NewSchemaBody({
  routeAccess,
}: {
  routeAccess?: AdminWorkspaceRouteAccessState;
}) {
  return routeAccess ? (
    <SchemaBuilderRoute mode="create" routeAccess={routeAccess} />
  ) : (
    <SchemaBuilderRoute mode="create" />
  );
}

export function SchemaDetailBody({
  routeAccess,
  schemaId,
}: {
  routeAccess?: AdminWorkspaceRouteAccessState;
  schemaId: string;
}) {
  return routeAccess ? (
    <SchemaBuilderRoute mode="edit" routeAccess={routeAccess} schemaId={schemaId} />
  ) : (
    <SchemaBuilderRoute mode="edit" schemaId={schemaId} />
  );
}

export function ContentIndexBody() {
  return <ContentIndexRoute />;
}

export function NewContentBody() {
  return <ContentEditorRoute mode="create" />;
}

export function ContentRecordBody({
  recordId,
  schemaId,
}: {
  recordId: string;
  schemaId: string;
}) {
  return (
    <ContentEditorRoute mode="edit" recordId={recordId} schemaId={schemaId} />
  );
}

export function MediaBody({
  routeAccess,
}: {
  routeAccess?: AdminWorkspaceRouteAccessState;
}) {
  return routeAccess ? (
    <MediaLibraryRoute routeAccess={routeAccess} />
  ) : (
    <MediaLibraryRoute />
  );
}

export function TeamBody({
  routeAccess,
}: {
  routeAccess?: AdminWorkspaceRouteAccessState;
}) {
  return routeAccess ? (
    <TeamAndRolesRoute routeAccess={routeAccess} />
  ) : (
    <TeamAndRolesRoute />
  );
}

export function SettingsBody({
  routeAccess,
}: {
  routeAccess?: AdminWorkspaceRouteAccessState;
}) {
  return routeAccess ? (
    <SettingsApiKeysRoute routeAccess={routeAccess} />
  ) : (
    <SettingsApiKeysRoute />
  );
}

export function AccountBody({
  routeAccess,
}: {
  routeAccess?: AdminWorkspaceRouteAccessState;
}) {
  return routeAccess ? (
    <UserAccountRoute routeAccess={routeAccess} />
  ) : (
    <UserAccountRoute />
  );
}
