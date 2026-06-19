import type { ReactNode } from "react";

import { AdminWorkspaceCommandPalette } from "@/admin/_workspace/admin-command-palette";
import { AdminWorkspacePage } from "@/admin/_workspace/admin-workspace-page";
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

export function AdminHomeIsland() {
  return (
    <AdminWorkspacePage>
      <AdminWorkspaceIslandFrame>
        <AdminHomeBody />
      </AdminWorkspaceIslandFrame>
    </AdminWorkspacePage>
  );
}

export function SchemaOverviewIsland() {
  return (
    <AdminWorkspacePage>
      <AdminWorkspaceIslandFrame>
        <SchemaOverviewBody />
      </AdminWorkspaceIslandFrame>
    </AdminWorkspacePage>
  );
}

export function NewSchemaIsland() {
  return (
    <AdminWorkspacePage>
      <AdminWorkspaceIslandFrame>
        <NewSchemaBody />
      </AdminWorkspaceIslandFrame>
    </AdminWorkspacePage>
  );
}

export function SchemaDetailIsland({ schemaId }: { schemaId: string }) {
  return (
    <AdminWorkspacePage>
      <AdminWorkspaceIslandFrame>
        <SchemaDetailBody schemaId={schemaId} />
      </AdminWorkspaceIslandFrame>
    </AdminWorkspacePage>
  );
}

export function ContentIndexIsland() {
  return (
    <AdminWorkspacePage>
      <AdminWorkspaceIslandFrame>
        <ContentIndexBody />
      </AdminWorkspaceIslandFrame>
    </AdminWorkspacePage>
  );
}

export function NewContentIsland() {
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
}: {
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

export function MediaIsland() {
  return (
    <AdminWorkspacePage>
      <AdminWorkspaceIslandFrame>
        <MediaBody />
      </AdminWorkspaceIslandFrame>
    </AdminWorkspacePage>
  );
}

export function TeamIsland() {
  return (
    <AdminWorkspacePage>
      <AdminWorkspaceIslandFrame>
        <TeamBody />
      </AdminWorkspaceIslandFrame>
    </AdminWorkspacePage>
  );
}

export function SettingsIsland() {
  return (
    <AdminWorkspacePage>
      <AdminWorkspaceIslandFrame>
        <SettingsBody />
      </AdminWorkspaceIslandFrame>
    </AdminWorkspacePage>
  );
}

export function AccountIsland() {
  return (
    <AdminWorkspacePage>
      <AdminWorkspaceIslandFrame>
        <AccountBody />
      </AdminWorkspaceIslandFrame>
    </AdminWorkspacePage>
  );
}
