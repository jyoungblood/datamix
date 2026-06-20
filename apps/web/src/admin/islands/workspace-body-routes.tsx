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
import type { AdminWorkspaceProps } from "@/admin/_workspace/admin-workspace-props";

export function AdminHomeBody({
  routeAccess,
}: {
  routeAccess: AdminWorkspaceRouteAccessState;
}) {
  return <AdminHomeRoute routeAccess={routeAccess} />;
}

export function SchemaOverviewBody({
  routeAccess,
}: {
  routeAccess: AdminWorkspaceRouteAccessState;
}) {
  return <SchemaOverviewRoute routeAccess={routeAccess} />;
}

export function NewSchemaBody({
  routeAccess,
}: {
  routeAccess: AdminWorkspaceRouteAccessState;
}) {
  return <SchemaBuilderRoute mode="create" routeAccess={routeAccess} />;
}

export function SchemaDetailBody({
  routeAccess,
  schemaId,
}: {
  routeAccess: AdminWorkspaceRouteAccessState;
  schemaId: string;
}) {
  return (
    <SchemaBuilderRoute mode="edit" routeAccess={routeAccess} schemaId={schemaId} />
  );
}

export function ContentIndexBody({
  routeAccess,
}: {
  routeAccess: AdminWorkspaceRouteAccessState;
}) {
  return <ContentIndexRoute routeAccess={routeAccess} />;
}

export function NewContentBody({
  routeAccess,
}: {
  routeAccess: AdminWorkspaceRouteAccessState;
}) {
  return <ContentEditorRoute mode="create" routeAccess={routeAccess} />;
}

export function ContentRecordBody({
  recordId,
  routeAccess,
  schemaId,
}: {
  recordId: string;
  routeAccess: AdminWorkspaceRouteAccessState;
  schemaId: string;
}) {
  return (
    <ContentEditorRoute
      mode="edit"
      recordId={recordId}
      routeAccess={routeAccess}
      schemaId={schemaId}
    />
  );
}

export function MediaBody({
  routeAccess,
  workspace,
}: {
  routeAccess: AdminWorkspaceRouteAccessState;
  workspace: AdminWorkspaceProps;
}) {
  return <MediaLibraryRoute routeAccess={routeAccess} workspace={workspace} />;
}

export function TeamBody({
  routeAccess,
  workspace,
}: {
  routeAccess: AdminWorkspaceRouteAccessState;
  workspace: AdminWorkspaceProps;
}) {
  return <TeamAndRolesRoute routeAccess={routeAccess} workspace={workspace} />;
}

export function SettingsBody({
  routeAccess,
  workspace,
}: {
  routeAccess: AdminWorkspaceRouteAccessState;
  workspace: AdminWorkspaceProps;
}) {
  return <SettingsApiKeysRoute routeAccess={routeAccess} workspace={workspace} />;
}

export function AccountBody({
  routeAccess,
  workspace,
}: {
  routeAccess: AdminWorkspaceRouteAccessState;
  workspace: AdminWorkspaceProps;
}) {
  return <UserAccountRoute routeAccess={routeAccess} workspace={workspace} />;
}
