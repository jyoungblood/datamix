import type { ReactNode } from "react";

import { AdminWorkspaceCommandPalette } from "@/admin/_workspace/admin-command-palette";
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

function AdminWorkspaceIslandFrame({
  children,
  workspace,
}: {
  children: ReactNode;
  workspace: AdminWorkspaceProps | null;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <div className="flex justify-end">
        {workspace ? <AdminWorkspaceCommandPalette workspace={workspace} /> : null}
      </div>
      {children}
    </div>
  );
}

export function AdminHomeIsland({ workspace }: AdminWorkspaceIslandProps) {
  const routeAccess = workspace?.routeAccess;

  return (
    <AdminWorkspaceIslandFrame workspace={workspace}>
      {routeAccess && workspace ? (
        <AdminHomeBody routeAccess={routeAccess} workspace={workspace} />
      ) : null}
    </AdminWorkspaceIslandFrame>
  );
}

export function SchemaOverviewIsland({ workspace }: AdminWorkspaceIslandProps) {
  const routeAccess = workspace?.routeAccess;

  return (
    <AdminWorkspaceIslandFrame workspace={workspace}>
      {routeAccess && workspace ? (
        <SchemaOverviewBody routeAccess={routeAccess} workspace={workspace} />
      ) : null}
    </AdminWorkspaceIslandFrame>
  );
}

export function NewSchemaIsland({ workspace }: AdminWorkspaceIslandProps) {
  const routeAccess = workspace?.routeAccess;

  return (
    <AdminWorkspaceIslandFrame workspace={workspace}>
      {routeAccess && workspace ? (
        <NewSchemaBody routeAccess={routeAccess} workspace={workspace} />
      ) : null}
    </AdminWorkspaceIslandFrame>
  );
}

export function SchemaDetailIsland({
  schemaId,
  workspace,
}: AdminWorkspaceIslandProps & { schemaId: string }) {
  const routeAccess = workspace?.routeAccess;

  return (
    <AdminWorkspaceIslandFrame workspace={workspace}>
      {routeAccess && workspace ? (
        <SchemaDetailBody
          routeAccess={routeAccess}
          schemaId={schemaId}
          workspace={workspace}
        />
      ) : null}
    </AdminWorkspaceIslandFrame>
  );
}

export function ContentIndexIsland({ workspace }: AdminWorkspaceIslandProps) {
  const routeAccess = workspace?.routeAccess;

  return (
    <AdminWorkspaceIslandFrame workspace={workspace}>
      {routeAccess && workspace ? (
        <ContentIndexBody routeAccess={routeAccess} workspace={workspace} />
      ) : null}
    </AdminWorkspaceIslandFrame>
  );
}

export function NewContentIsland({ workspace }: AdminWorkspaceIslandProps) {
  const routeAccess = workspace?.routeAccess;

  return (
    <AdminWorkspaceIslandFrame workspace={workspace}>
      {routeAccess && workspace ? (
        <NewContentBody routeAccess={routeAccess} workspace={workspace} />
      ) : null}
    </AdminWorkspaceIslandFrame>
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
  const routeAccess = workspace?.routeAccess;

  return (
    <AdminWorkspaceIslandFrame workspace={workspace}>
      {routeAccess && workspace ? (
        <ContentRecordBody
          routeAccess={routeAccess}
          recordId={recordId}
          schemaId={schemaId}
          workspace={workspace}
        />
      ) : null}
    </AdminWorkspaceIslandFrame>
  );
}

export function MediaIsland({ workspace }: AdminWorkspaceIslandProps) {
  const routeAccess = workspace?.routeAccess;

  return (
    <AdminWorkspaceIslandFrame workspace={workspace}>
      {routeAccess && workspace ? (
        <MediaBody routeAccess={routeAccess} workspace={workspace} />
      ) : null}
    </AdminWorkspaceIslandFrame>
  );
}

export function TeamIsland({ workspace }: AdminWorkspaceIslandProps) {
  const routeAccess = workspace?.routeAccess;

  return (
    <AdminWorkspaceIslandFrame workspace={workspace}>
      {routeAccess && workspace ? (
        <TeamBody routeAccess={routeAccess} workspace={workspace} />
      ) : null}
    </AdminWorkspaceIslandFrame>
  );
}

export function SettingsIsland({ workspace }: AdminWorkspaceIslandProps) {
  const routeAccess = workspace?.routeAccess;

  return (
    <AdminWorkspaceIslandFrame workspace={workspace}>
      {routeAccess && workspace ? (
        <SettingsBody routeAccess={routeAccess} workspace={workspace} />
      ) : null}
    </AdminWorkspaceIslandFrame>
  );
}

export function AccountIsland({ workspace }: AdminWorkspaceIslandProps) {
  const routeAccess = workspace?.routeAccess;

  return (
    <AdminWorkspaceIslandFrame workspace={workspace}>
      {routeAccess && workspace ? (
        <AccountBody routeAccess={routeAccess} workspace={workspace} />
      ) : null}
    </AdminWorkspaceIslandFrame>
  );
}
