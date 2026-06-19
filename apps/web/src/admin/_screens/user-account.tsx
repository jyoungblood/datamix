"use client";

import { LogOut, Save, UserRound } from "lucide-react";
import * as React from "react";

import {
  AdminDetailList,
  AdminPageHeader,
  AdminSectionCard,
} from "../_components/admin-design";
import { AdminStateBox } from "../_components/admin-state";
import { adminRoutes, type AdminWorkspaceRoute } from "../_workspace/admin-routes";
import {
  useAdminWorkspace,
  useAdminWorkspaceRouteAccess,
} from "../_workspace/admin-workspace-hooks";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function AccountContent({ route }: { route: AdminWorkspaceRoute }) {
  const workspace = useAdminWorkspace();
  const access = useAdminWorkspaceRouteAccess(route);
  const {
    accountError,
    accountImage,
    accountMessage,
    accountName,
    isSavingAccountProfile,
    role,
    setAccountImage,
    setAccountName,
    signOut,
    updateAccountProfile,
    user,
  } = workspace;

  const handleSaveProfile = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void updateAccountProfile();
  };

  return (
    <>
        <AdminPageHeader
          action={
            <Button onClick={() => void signOut()} type="button" variant="outline">
              <LogOut />
              Sign out
            </Button>
          }
          title="Account"
        />

        {!access.isAllowed ? (
          <AdminStateBox body={access.body} title={access.title} tone="warning" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <AdminSectionCard title="Profile preview">
              <div className="flex items-center gap-3">
                <Avatar className="h-16 w-16 bg-[var(--primary)]">
                  {accountImage.trim() ? (
                    <AvatarImage alt={accountName || "Admin user"} src={accountImage} />
                  ) : null}
                  <AvatarFallback className="bg-[var(--primary)] text-sm font-bold text-white">
                    {user.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-950">
                    {accountName || user.displayName}
                  </p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                  <p className="mt-1 text-xs text-slate-500">{role.label}</p>
                </div>
              </div>

              <div className="mt-4">
                <AdminDetailList
                  items={[
                    { label: "User id", value: user.id ?? "Unknown", code: true },
                    { label: "Email", value: user.email ?? "Unknown" },
                    { label: "Role", value: role.label },
                    { label: "Avatar", value: accountImage.trim() ? "Custom URL" : "Initials" },
                  ]}
                />
              </div>
            </AdminSectionCard>

            <AdminSectionCard
              description="Name and avatar updates apply to the current authenticated user only."
              title="Profile"
            >
              <form className="auth-form" onSubmit={handleSaveProfile}>
                <label className="field">
                  <span>Name</span>
                  <input
                    disabled={isSavingAccountProfile}
                    onChange={(event) => setAccountName(event.target.value)}
                    required
                    type="text"
                    value={accountName}
                  />
                </label>

                <label className="field">
                  <span>Email</span>
                  <input readOnly type="email" value={user.email ?? ""} />
                </label>

                <label className="field">
                  <span>Avatar image URL</span>
                  <input
                    disabled={isSavingAccountProfile}
                    onChange={(event) => setAccountImage(event.target.value)}
                    placeholder="https://example.com/avatar.png"
                    type="url"
                    value={accountImage}
                  />
                </label>

                {accountMessage ? (
                  <AdminStateBox
                    body={accountMessage}
                    compact
                    title="Profile updated"
                    tone="success"
                  />
                ) : null}
                {accountError ? (
                  <AdminStateBox
                    body={accountError}
                    compact
                    title="Profile update failed"
                    tone="error"
                  />
                ) : null}

                <div className="actions">
                  <Button disabled={isSavingAccountProfile} type="submit">
                    <Save />
                    {isSavingAccountProfile ? "Saving profile" : "Save profile"}
                  </Button>
                </div>
              </form>
            </AdminSectionCard>
          </div>
        )}

        <AdminSectionCard title="Account scope">
          <AdminStateBox
            body="This route updates only the active session user's profile. Email remains read-only because changing email safely requires a verified email-change flow."
            compact
            title="Current user only"
          />
          <div className="mt-4">
            <Button asChild size="sm" variant="outline">
              <a href={adminRoutes.settings().href}>
                <UserRound />
                Open settings
              </a>
            </Button>
          </div>
        </AdminSectionCard>
    </>
  );
}

export function UserAccountRoute() {
  return <AccountContent route={adminRoutes.account()} />;
}
