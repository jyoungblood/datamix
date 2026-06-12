"use client";

import {
  Blocks,
  Database,
  FileText,
  Image,
  SlidersHorizontal,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
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

const adminWorkspaceSidebarIcons: Record<
  AdminWorkspaceRoute["section"],
  LucideIcon
> = {
  account: UserCircle,
  content: FileText,
  home: Blocks,
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
  const prefetchSidebarRoute = (sidebarRoute: { section?: AdminWorkspaceRoute["section"] }) => {
    if (sidebarRoute.section) {
      void workspace.prefetchAdminRoute({ section: sidebarRoute.section });
    }
  };
  const accountRoute = adminRoutes.account();
  const sidebarAccount = {
    emailRole: workspace.role.label,
    href: accountRoute.href,
    initials: workspace.user.initials,
    name: workspace.user.displayName,
    section: accountRoute.section,
    ...(workspace.user.image ? { avatarSrc: workspace.user.image } : {}),
  };

  return (
    <AdminFrame
      sidebar={
        <DatamixSidebar
          account={sidebarAccount}
          activeItem={route.section}
          brandRoute={adminRoutes.home()}
          brandHref={adminRoutes.home().href}
          items={adminWorkspaceSidebarRoutes.map((sidebarRoute) => ({
            ...sidebarRoute,
            icon: adminWorkspaceSidebarIcons[sidebarRoute.section],
          }))}
          onPrefetch={prefetchSidebarRoute}
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
