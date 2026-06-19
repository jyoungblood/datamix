import type { ReactNode } from "react";

import { AdminWorkspaceCommandPalette } from "@/admin/_workspace/admin-command-palette";
import { resolveAdminWorkspaceRouteAccess } from "@/admin/_workspace/admin-permissions";
import { AdminWorkspacePage } from "@/admin/_workspace/admin-workspace-page";
import type { AdminWorkspaceProps } from "@/admin/_workspace/admin-workspace-props";
import {
  AccountBody,
  AdminHomeBody,
  ContentIndexBody,
  ContentRecordBody,
  MediaBody,
  NewContentBody,
  NewSchemaBody,
  SchemaDetailBody,
  SchemaOverviewBody,
  SettingsBody,
  TeamBody,
} from "./workspace-body-routes";

type AdminWorkspaceIslandProps = {
  workspace: AdminWorkspaceProps | null;
};

function AdminWorkspaceIslandFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <div className="flex justify-end">
        <AdminWorkspaceCommandPalette />
      </div>
      {children}
    </div>
  );
}

export function AdminHomeIsland({ workspace: _workspace }: AdminWorkspaceIslandProps) {
  return (
    <AdminWorkspacePage>
      <AdminWorkspaceIslandFrame>
        <AdminHomeBody />
      </AdminWorkspaceIslandFrame>
    </AdminWorkspacePage>
  );
}

export function SchemaOverviewIsland({ workspace: _workspace }: AdminWorkspaceIslandProps) {
  return (
    <AdminWorkspacePage>
      <AdminWorkspaceIslandFrame>
        <SchemaOverviewBody />
      </AdminWorkspaceIslandFrame>
    </AdminWorkspacePage>
  );
}

export function NewSchemaIsland({ workspace: _workspace }: AdminWorkspaceIslandProps) {
  return (
    <AdminWorkspacePage>
      <AdminWorkspaceIslandFrame>
        <NewSchemaBody />
      </AdminWorkspaceIslandFrame>
    </AdminWorkspacePage>
  );
}

export function SchemaDetailIsland({
  schemaId,
  workspace: _workspace,
}: AdminWorkspaceIslandProps & { schemaId: string }) {
  return (
    <AdminWorkspacePage>
      <AdminWorkspaceIslandFrame>
        <SchemaDetailBody schemaId={schemaId} />
      </AdminWorkspaceIslandFrame>
    </AdminWorkspacePage>
  );
}

export function ContentIndexIsland({ workspace: _workspace }: AdminWorkspaceIslandProps) {
  return (
    <AdminWorkspacePage>
      <AdminWorkspaceIslandFrame>
        <ContentIndexBody />
      </AdminWorkspaceIslandFrame>
    </AdminWorkspacePage>
  );
}

export function NewContentIsland({ workspace: _workspace }: AdminWorkspaceIslandProps) {
  return (
    <AdminWorkspacePage>
      <AdminWorkspaceIslandFrame>
        <NewContentBody />
      </AdminWorkspaceIslandFrame>
    </AdminWorkspacePage>
  );
}

export function ContentRecordIsland({
  recordId,
  schemaId,
  workspace: _workspace,
}: AdminWorkspaceIslandProps & {
  recordId: string;
  schemaId: string;
}) {
  return (
    <AdminWorkspacePage>
      <AdminWorkspaceIslandFrame>
        <ContentRecordBody recordId={recordId} schemaId={schemaId} />
      </AdminWorkspaceIslandFrame>
    </AdminWorkspacePage>
  );
}

export function MediaIsland({ workspace }: AdminWorkspaceIslandProps) {
  const routeAccess = workspace
    ? resolveAdminWorkspaceRouteAccess(workspace.activeRoute, workspace.permissions)
    : undefined;

  return (
    <AdminWorkspacePage>
      <AdminWorkspaceIslandFrame>
        {routeAccess ? <MediaBody routeAccess={routeAccess} /> : <MediaBody />}
      </AdminWorkspaceIslandFrame>
    </AdminWorkspacePage>
  );
}

export function TeamIsland({ workspace }: AdminWorkspaceIslandProps) {
  const routeAccess = workspace
    ? resolveAdminWorkspaceRouteAccess(workspace.activeRoute, workspace.permissions)
    : undefined;

  return (
    <AdminWorkspacePage>
      <AdminWorkspaceIslandFrame>
        {routeAccess ? <TeamBody routeAccess={routeAccess} /> : <TeamBody />}
      </AdminWorkspaceIslandFrame>
    </AdminWorkspacePage>
  );
}

export function SettingsIsland({ workspace: _workspace }: AdminWorkspaceIslandProps) {
  return (
    <AdminWorkspacePage>
      <AdminWorkspaceIslandFrame>
        <SettingsBody />
      </AdminWorkspaceIslandFrame>
    </AdminWorkspacePage>
  );
}

export function AccountIsland({ workspace: _workspace }: AdminWorkspaceIslandProps) {
  return (
    <AdminWorkspacePage>
      <AdminWorkspaceIslandFrame>
        <AccountBody />
      </AdminWorkspaceIslandFrame>
    </AdminWorkspacePage>
  );
}
