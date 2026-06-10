"use client";

import { ArrowRight, Plus } from "lucide-react";

import {
  AdminDetailList,
  AdminMetric,
  AdminPageHeader,
  AdminSectionCard,
} from "../_components/admin-design";
import { AdminStateBox } from "../_components/admin-state";
import { AdminWorkspaceRouteFrame } from "./admin-route-placeholder";
import { adminRoutes, type AdminWorkspaceRoute } from "../_workspace/admin-routes";
import { useAdminWorkspace } from "../_workspace/admin-workspace-hooks";
import { AdminWorkspaceProvider } from "../_workspace/admin-workspace-provider";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AdminHomeRouteItem = {
  isAllowed: boolean;
  route: AdminWorkspaceRoute;
};

function AdminHomeContent({ route }: { route: AdminWorkspaceRoute }) {
  const workspace = useAdminWorkspace();
  const routeItems: AdminHomeRouteItem[] = [
    {
      isAllowed: workspace.permissions.canAccessCollectionBuilder,
      route: adminRoutes.schema.index(),
    },
    {
      isAllowed: workspace.permissions.canAccessRecordsWorkspace,
      route: adminRoutes.content.index(),
    },
    {
      isAllowed: workspace.permissions.canAccessMediaWorkspace,
      route: adminRoutes.media(),
    },
    {
      isAllowed: workspace.permissions.canAccessTeamAccess,
      route: adminRoutes.team(),
    },
    {
      isAllowed: workspace.permissions.canAccessSettingsWorkspace,
      route: adminRoutes.settings(),
    },
    {
      isAllowed: true,
      route: adminRoutes.account(),
    },
  ];

  return (
    <AdminWorkspaceRouteFrame route={route}>
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <AdminPageHeader
          action={
            workspace.permissions.canCreateCollections ? (
              <Button asChild>
                <a href={adminRoutes.schema.new().href}>
                  <Plus />
                  New schema
                </a>
              </Button>
            ) : (
              <Button disabled type="button">
                <Plus />
                New schema
              </Button>
            )
          }
          description="Use the routed admin workspace for schema, content, media, team, settings, and account work."
          eyebrow="Admin workspace"
          title="Admin home"
        />

        <div className="grid gap-3 md:grid-cols-3">
          <AdminMetric
            description="Role assigned to this admin session."
            label="Current role"
            value={workspace.role.label}
          />
          <AdminMetric
            description="Primary routed workspaces available to this role."
            label="Available routes"
            value={routeItems.filter((item) => item.isAllowed).length}
          />
          <AdminMetric
            description="Profile resolved from the active session."
            label="Signed in as"
            value={workspace.user.displayName}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <AdminSectionCard
            description="Each route owns its own loading, refresh, and permission state."
            title="Route map"
          >
            <div className="overflow-hidden rounded-lg border border-border bg-white">
              {routeItems.map((item) => (
                <a
                  className="grid gap-3 border-b px-4 py-3 text-xs transition last:border-b-0 hover:bg-muted/60 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center"
                  href={item.route.href}
                  key={item.route.id}
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-slate-950">
                      {item.route.label}
                    </span>
                    <span className="mt-1 block text-slate-500">
                      {item.route.description}
                    </span>
                  </span>
                  <Badge variant={item.isAllowed ? "secondary" : "outline"}>
                    {item.isAllowed ? "Available" : "Restricted"}
                  </Badge>
                  <ArrowRight className="hidden h-4 w-4 text-slate-400 md:block" />
                </a>
              ))}
            </div>
          </AdminSectionCard>

          <AdminSectionCard title="Session">
            <AdminDetailList
              items={[
                { label: "User", value: workspace.user.displayName },
                { label: "Email", value: workspace.user.email ?? "Unknown" },
                { label: "Role", value: workspace.role.label },
                {
                  label: "Command palette",
                  value: "Routed navigation and refresh",
                },
              ]}
            />
            <div className="mt-4">
              <AdminStateBox
                body="The legacy all-in-one dashboard has been replaced by routed workspace pages."
                compact
                title="Routed workspace active"
                tone="success"
              />
            </div>
          </AdminSectionCard>
        </div>
      </div>
    </AdminWorkspaceRouteFrame>
  );
}

export function AdminHomeRoute() {
  return (
    <AdminWorkspaceProvider>
      <AdminHomeContent route={adminRoutes.home()} />
    </AdminWorkspaceProvider>
  );
}
