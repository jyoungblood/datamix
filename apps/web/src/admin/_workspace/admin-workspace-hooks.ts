"use client";

import * as React from "react";

import type { AdminWorkspaceRoute } from "./admin-routes";
import {
  resolveAdminWorkspaceRouteAccess,
  type AdminWorkspaceRouteAccessState,
} from "./admin-permissions";
import {
  AdminWorkspaceContext,
  type AdminWorkspaceContextValue,
} from "./admin-workspace-provider";

export function useAdminWorkspace(): AdminWorkspaceContextValue {
  const context = React.useContext(AdminWorkspaceContext);

  if (!context) {
    throw new Error("useAdminWorkspace must be used inside AdminWorkspaceProvider.");
  }

  return context;
}

export function useAdminWorkspaceRouteAccess(
  route: Pick<AdminWorkspaceRoute, "access">,
): AdminWorkspaceRouteAccessState {
  const { permissions } = useAdminWorkspace();

  return resolveAdminWorkspaceRouteAccess(route, permissions);
}
