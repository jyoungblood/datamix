"use client";

import * as React from "react";

import type {
  AdminWorkspaceRoute,
  AdminWorkspaceRouteAccess,
} from "./admin-routes";
import {
  AdminWorkspaceContext,
  type AdminWorkspaceContextValue,
} from "./admin-workspace-provider";

type AdminWorkspaceRouteAccessState = {
  body: string;
  isAllowed: boolean;
  title: string;
};

const routeAccessLabels = {
  account: "an active admin session",
  content: "content permissions",
  home: "an active admin session",
  media: "media permissions",
  schema: "schema permissions",
  settings: "settings permissions",
  team: "team permissions",
} as const satisfies Record<AdminWorkspaceRouteAccess, string>;

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
  const isAllowed =
    route.access === "account" || route.access === "home"
      ? true
      : route.access === "schema"
        ? permissions.canAccessCollectionBuilder
        : route.access === "content"
          ? permissions.canAccessRecordsWorkspace
          : route.access === "media"
            ? permissions.canAccessMediaWorkspace
            : route.access === "team"
              ? permissions.canAccessTeamAccess
              : permissions.canAccessSettingsWorkspace;

  if (isAllowed) {
    return {
      body: "This route is scaffolded and ready for the next implementation slice.",
      isAllowed: true,
      title: "Route scaffold is ready",
    };
  }

  return {
    body: `Your current role does not include ${routeAccessLabels[route.access]}.`,
    isAllowed: false,
    title: "This route is restricted",
  };
}
