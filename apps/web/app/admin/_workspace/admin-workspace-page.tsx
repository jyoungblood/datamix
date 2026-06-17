"use client";

import type { ReactNode } from "react";

import { AdminWorkspaceProvider } from "./admin-workspace-provider";

type AdminWorkspacePageProps = {
  children: ReactNode;
};

export function AdminWorkspacePage({ children }: AdminWorkspacePageProps) {
  return <AdminWorkspaceProvider>{children}</AdminWorkspaceProvider>;
}
