import { AdminHomeRoute } from "@/app/admin/_screens/admin-home";
import { ContentEditorRoute } from "@/app/admin/_screens/content-editor";
import { ContentIndexRoute } from "@/app/admin/_screens/content-index";
import { MediaLibraryRoute } from "@/app/admin/_screens/media-library";
import { SchemaBuilderRoute } from "@/app/admin/_screens/schema-builder";
import { SchemaOverviewRoute } from "@/app/admin/_screens/schema-overview";
import { SettingsApiKeysRoute } from "@/app/admin/_screens/settings-api-keys";
import { TeamAndRolesRoute } from "@/app/admin/_screens/team-and-roles";
import { UserAccountRoute } from "@/app/admin/_screens/user-account";
import { AdminWorkspacePage } from "@/app/admin/_workspace/admin-workspace-page";

export function AdminHomeIsland() {
  return (
    <AdminWorkspacePage>
      <AdminHomeRoute />
    </AdminWorkspacePage>
  );
}

export function SchemaOverviewIsland() {
  return (
    <AdminWorkspacePage>
      <SchemaOverviewRoute />
    </AdminWorkspacePage>
  );
}

export function NewSchemaIsland() {
  return (
    <AdminWorkspacePage>
      <SchemaBuilderRoute mode="create" />
    </AdminWorkspacePage>
  );
}

export function SchemaDetailIsland({ schemaId }: { schemaId: string }) {
  return (
    <AdminWorkspacePage>
      <SchemaBuilderRoute mode="edit" schemaId={schemaId} />
    </AdminWorkspacePage>
  );
}

export function ContentIndexIsland() {
  return (
    <AdminWorkspacePage>
      <ContentIndexRoute />
    </AdminWorkspacePage>
  );
}

export function NewContentIsland() {
  return (
    <AdminWorkspacePage>
      <ContentEditorRoute mode="create" />
    </AdminWorkspacePage>
  );
}

export function ContentRecordIsland({
  recordId,
  schemaId,
}: {
  recordId: string;
  schemaId: string;
}) {
  return (
    <AdminWorkspacePage>
      <ContentEditorRoute mode="edit" recordId={recordId} schemaId={schemaId} />
    </AdminWorkspacePage>
  );
}

export function MediaIsland() {
  return (
    <AdminWorkspacePage>
      <MediaLibraryRoute />
    </AdminWorkspacePage>
  );
}

export function TeamIsland() {
  return (
    <AdminWorkspacePage>
      <TeamAndRolesRoute />
    </AdminWorkspacePage>
  );
}

export function SettingsIsland() {
  return (
    <AdminWorkspacePage>
      <SettingsApiKeysRoute />
    </AdminWorkspacePage>
  );
}

export function AccountIsland() {
  return (
    <AdminWorkspacePage>
      <UserAccountRoute />
    </AdminWorkspacePage>
  );
}
