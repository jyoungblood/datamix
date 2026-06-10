"use client";

import { Database, FileText, Image, SlidersHorizontal, Users } from "lucide-react";

import {
  AdminDetailList,
  AdminPageHeader,
  AdminSectionCard,
} from "../_components/admin-design";
import { AdminFrame, DatamixSidebar } from "../_components/admin-frame";
import { AdminStateBox } from "../_components/admin-state";
import {
  adminRoutes,
  adminWorkspaceSidebarRoutes,
  type AdminWorkspaceRoute,
} from "../_workspace/admin-routes";
import {
  useAdminWorkspace,
  useAdminWorkspaceRouteAccess,
} from "../_workspace/admin-workspace-hooks";
import { AdminWorkspaceProvider } from "../_workspace/admin-workspace-provider";

import { Button } from "@/components/ui/button";
import { buildDatamixAdminPath } from "@/lib/runtime";

type AdminRoutePlaceholderProps = {
  route: AdminWorkspaceRoute;
};

type AdminWorkspaceRouteFrameProps = AdminRoutePlaceholderProps & {
  children: React.ReactNode;
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
          brandHref={adminRoutes.schema.index().href}
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
      {children}
    </AdminFrame>
  );
}

function AdminRoutePlaceholderContent({ route }: AdminRoutePlaceholderProps) {
  const workspace = useAdminWorkspace();
  const access = useAdminWorkspaceRouteAccess(route);
  const accountRoute = adminRoutes.account();

  return (
    <AdminWorkspaceRouteFrame route={route}>
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <AdminPageHeader
          description={route.description}
          eyebrow="Admin workspace"
          title={route.title}
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <AdminSectionCard
            action={
              route.section === "account" ? (
                <Button onClick={() => void workspace.signOut()} type="button">
                  Sign out
                </Button>
              ) : null
            }
            description="This page keeps the new routed workspace reachable while later slices move full behavior out of the legacy dashboard."
            title={route.label}
          >
            <AdminStateBox
              body={access.body}
              title={access.title}
              tone={access.isAllowed ? "success" : "warning"}
            />
          </AdminSectionCard>

          <AdminSectionCard title="Route details">
            <AdminDetailList
              items={[
                { code: true, label: "Path", value: route.href },
                { label: "Section", value: route.section },
                { label: "Role", value: workspace.role.label },
                {
                  label: "Access",
                  value: access.isAllowed ? "Allowed" : "Restricted",
                },
              ]}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <a href={buildDatamixAdminPath()}>Open current dashboard</a>
              </Button>
              {route.section !== "account" ? (
                <Button asChild size="sm" variant="ghost">
                  <a href={accountRoute.href}>Account</a>
                </Button>
              ) : null}
            </div>
          </AdminSectionCard>
        </div>
      </div>
    </AdminWorkspaceRouteFrame>
  );
}

export function AdminRoutePlaceholder({ route }: AdminRoutePlaceholderProps) {
  return (
    <AdminWorkspaceProvider>
      <AdminRoutePlaceholderContent route={route} />
    </AdminWorkspaceProvider>
  );
}
