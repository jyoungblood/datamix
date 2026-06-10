"use client";

import { Database, FileText, Image, SlidersHorizontal, Users } from "lucide-react";
import type { ReactNode } from "react";

import { AdminFrame, DatamixSidebar } from "../_components/admin-frame";
import {
  adminRoutes,
  adminWorkspaceSidebarRoutes,
  type AdminWorkspaceRoute,
} from "./admin-routes";
import { AdminWorkspaceCommandPalette } from "./admin-command-palette";
import { useAdminWorkspace } from "./admin-workspace-hooks";

type AdminWorkspaceRouteFrameProps = {
  children: ReactNode;
  route: AdminWorkspaceRoute;
};

const adminWorkspaceSidebarIcons = {
  content: FileText,
  media: Image,
  schema: Database,
  settings: SlidersHorizontal,
  team: Users,
};

export function AdminWorkspaceRouteFrame({
  children,
  route,
}: AdminWorkspaceRouteFrameProps) {
  const workspace = useAdminWorkspace();
  const accountRoute = adminRoutes.account();
  const sidebarAccount = {
    emailRole: workspace.role.label,
    href: accountRoute.href,
    initials: workspace.user.initials,
    name: workspace.user.displayName,
    ...(workspace.user.image ? { avatarSrc: workspace.user.image } : {}),
  };

  return (
    <AdminFrame
      sidebar={
        <DatamixSidebar
          account={sidebarAccount}
          activeItem={route.section}
          brandHref={adminRoutes.home().href}
          items={adminWorkspaceSidebarRoutes.map((sidebarRoute) => ({
            ...sidebarRoute,
            icon:
              sidebarRoute.section === "schema"
                ? adminWorkspaceSidebarIcons.schema
                : sidebarRoute.section === "content"
                  ? adminWorkspaceSidebarIcons.content
                  : sidebarRoute.section === "media"
                    ? adminWorkspaceSidebarIcons.media
                    : sidebarRoute.section === "team"
                      ? adminWorkspaceSidebarIcons.team
                      : adminWorkspaceSidebarIcons.settings,
          }))}
        />
      }
    >
      <div className="mx-auto mb-4 flex max-w-6xl justify-end">
        <AdminWorkspaceCommandPalette route={route} />
      </div>
      {children}
    </AdminFrame>
  );
}
