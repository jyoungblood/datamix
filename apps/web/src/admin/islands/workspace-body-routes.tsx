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

export function SchemaOverviewBody() {
  return <SchemaOverviewRoute />;
}

export function NewSchemaBody() {
  return <SchemaBuilderRoute mode="create" />;
}

export function SchemaDetailBody({ schemaId }: { schemaId: string }) {
  return <SchemaBuilderRoute mode="edit" schemaId={schemaId} />;
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

export function TeamBody() {
  return <TeamAndRolesRoute />;
}

export function SettingsBody() {
  return <SettingsApiKeysRoute />;
}

export function AccountBody() {
  return <UserAccountRoute />;
}
