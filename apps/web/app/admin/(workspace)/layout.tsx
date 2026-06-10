import type { ReactNode } from "react";

import { AdminWorkspaceProvider } from "../_workspace/admin-workspace-provider";

type AdminWorkspaceLayoutProps = {
  children: ReactNode;
};

export default function AdminWorkspaceLayout({
  children,
}: AdminWorkspaceLayoutProps) {
  return <AdminWorkspaceProvider>{children}</AdminWorkspaceProvider>;
}
