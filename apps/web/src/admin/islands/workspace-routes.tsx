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

export function AdminHomeIsland({ workspace }: AdminWorkspaceIslandProps) {
  const routeAccess = workspace
    ? resolveAdminWorkspaceRouteAccess(workspace.activeRoute, workspace.permissions)
    : undefined;

  return (
    <AdminWorkspacePage>
      <AdminWorkspaceIslandFrame>
        {routeAccess ? <AdminHomeBody routeAccess={routeAccess} /> : null}
      </AdminWorkspaceIslandFrame>
    </AdminWorkspacePage>
  );
}

export function SchemaOverviewIsland({ workspace }: AdminWorkspaceIslandProps) {
  const routeAccess = workspace
    ? resolveAdminWorkspaceRouteAccess(workspace.activeRoute, workspace.permissions)
    : undefined;

  return (
    <AdminWorkspacePage>
      <AdminWorkspaceIslandFrame>
        {routeAccess ? <SchemaOverviewBody routeAccess={routeAccess} /> : null}
      </AdminWorkspaceIslandFrame>
    </AdminWorkspacePage>
  );
}

export function NewSchemaIsland({ workspace }: AdminWorkspaceIslandProps) {
  const routeAccess = workspace
    ? resolveAdminWorkspaceRouteAccess(workspace.activeRoute, workspace.permissions)
    : undefined;

  return (
    <AdminWorkspacePage>
      <AdminWorkspaceIslandFrame>
        {routeAccess ? <NewSchemaBody routeAccess={routeAccess} /> : null}
      </AdminWorkspaceIslandFrame>
    </AdminWorkspacePage>
  );
}

export function SchemaDetailIsland({
  schemaId,
  workspace,
}: AdminWorkspaceIslandProps & { schemaId: string }) {
  const routeAccess = workspace
    ? resolveAdminWorkspaceRouteAccess(workspace.activeRoute, workspace.permissions)
    : undefined;

  return (
    <AdminWorkspacePage>
      <AdminWorkspaceIslandFrame>
        {routeAccess ? (
          <SchemaDetailBody routeAccess={routeAccess} schemaId={schemaId} />
        ) : null}
      </AdminWorkspaceIslandFrame>
    </AdminWorkspacePage>
  );
}

export function ContentIndexIsland({ workspace }: AdminWorkspaceIslandProps) {
  const routeAccess = workspace
    ? resolveAdminWorkspaceRouteAccess(workspace.activeRoute, workspace.permissions)
    : undefined;

  return (
    <AdminWorkspacePage>
      <AdminWorkspaceIslandFrame>
        {routeAccess ? <ContentIndexBody routeAccess={routeAccess} /> : <ContentIndexBody />}
      </AdminWorkspaceIslandFrame>
    </AdminWorkspacePage>
  );
}

export function NewContentIsland({ workspace }: AdminWorkspaceIslandProps) {
  const routeAccess = workspace
    ? resolveAdminWorkspaceRouteAccess(workspace.activeRoute, workspace.permissions)
    : undefined;

  return (
    <AdminWorkspacePage>
      <AdminWorkspaceIslandFrame>
        {routeAccess ? <NewContentBody routeAccess={routeAccess} /> : <NewContentBody />}
      </AdminWorkspaceIslandFrame>
    </AdminWorkspacePage>
  );
}

export function ContentRecordIsland({
  recordId,
  schemaId,
  workspace,
}: AdminWorkspaceIslandProps & {
  recordId: string;
  schemaId: string;
}) {
  const routeAccess = workspace
    ? resolveAdminWorkspaceRouteAccess(workspace.activeRoute, workspace.permissions)
    : undefined;

  return (
    <AdminWorkspacePage>
      <AdminWorkspaceIslandFrame>
        {routeAccess ? (
          <ContentRecordBody
            routeAccess={routeAccess}
            recordId={recordId}
            schemaId={schemaId}
          />
        ) : (
          <ContentRecordBody recordId={recordId} schemaId={schemaId} />
        )}
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
        {routeAccess ? <MediaBody routeAccess={routeAccess} /> : null}
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
        {routeAccess ? <TeamBody routeAccess={routeAccess} /> : null}
      </AdminWorkspaceIslandFrame>
    </AdminWorkspacePage>
  );
}

export function SettingsIsland({ workspace }: AdminWorkspaceIslandProps) {
  const routeAccess = workspace
    ? resolveAdminWorkspaceRouteAccess(workspace.activeRoute, workspace.permissions)
    : undefined;

  return (
    <AdminWorkspacePage>
      <AdminWorkspaceIslandFrame>
        {routeAccess ? <SettingsBody routeAccess={routeAccess} /> : null}
      </AdminWorkspaceIslandFrame>
    </AdminWorkspacePage>
  );
}

export function AccountIsland({ workspace }: AdminWorkspaceIslandProps) {
  const routeAccess = workspace
    ? resolveAdminWorkspaceRouteAccess(workspace.activeRoute, workspace.permissions)
    : undefined;

  return (
    <AdminWorkspacePage>
      <AdminWorkspaceIslandFrame>
        {routeAccess ? <AccountBody routeAccess={routeAccess} /> : null}
      </AdminWorkspaceIslandFrame>
    </AdminWorkspacePage>
  );
}
