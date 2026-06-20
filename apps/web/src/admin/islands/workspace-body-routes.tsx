import { AdminHomeRoute } from "@/admin/_screens/admin-home";
import { ContentEditorRoute } from "@/admin/_screens/content-editor";
import { ContentIndexRoute } from "@/admin/_screens/content-index";
import { MediaLibraryRoute } from "@/admin/_screens/media-library";
import { SchemaBuilderRoute } from "@/admin/_screens/schema-builder";
import { SettingsApiKeysRoute } from "@/admin/_screens/settings-api-keys";
import { TeamAndRolesRoute } from "@/admin/_screens/team-and-roles";
import type { AdminWorkspaceRouteAccessState } from "@/admin/_workspace/admin-permissions";
import type { AdminWorkspaceProps } from "@/admin/_workspace/admin-workspace-props";

export function AdminHomeBody({
  routeAccess,
  workspace,
}: {
  routeAccess: AdminWorkspaceRouteAccessState;
  workspace: AdminWorkspaceProps;
}) {
  return <AdminHomeRoute routeAccess={routeAccess} workspace={workspace} />;
}

export function NewSchemaBody({
  routeAccess,
  workspace,
}: {
  routeAccess: AdminWorkspaceRouteAccessState;
  workspace: AdminWorkspaceProps;
}) {
  return (
    <SchemaBuilderRoute
      mode="create"
      routeAccess={routeAccess}
      workspace={workspace}
    />
  );
}

export function SchemaDetailBody({
  routeAccess,
  schemaId,
  workspace,
}: {
  routeAccess: AdminWorkspaceRouteAccessState;
  schemaId: string;
  workspace: AdminWorkspaceProps;
}) {
  return (
    <SchemaBuilderRoute
      mode="edit"
      routeAccess={routeAccess}
      schemaId={schemaId}
      workspace={workspace}
    />
  );
}

export function ContentIndexBody({
  routeAccess,
  workspace,
}: {
  routeAccess: AdminWorkspaceRouteAccessState;
  workspace: AdminWorkspaceProps;
}) {
  return <ContentIndexRoute routeAccess={routeAccess} workspace={workspace} />;
}

export function NewContentBody({
  routeAccess,
  workspace,
}: {
  routeAccess: AdminWorkspaceRouteAccessState;
  workspace: AdminWorkspaceProps;
}) {
  return (
    <ContentEditorRoute
      mode="create"
      routeAccess={routeAccess}
      workspace={workspace}
    />
  );
}

export function ContentRecordBody({
  recordId,
  routeAccess,
  schemaId,
  workspace,
}: {
  recordId: string;
  routeAccess: AdminWorkspaceRouteAccessState;
  schemaId: string;
  workspace: AdminWorkspaceProps;
}) {
  return (
    <ContentEditorRoute
      mode="edit"
      recordId={recordId}
      routeAccess={routeAccess}
      schemaId={schemaId}
      workspace={workspace}
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
