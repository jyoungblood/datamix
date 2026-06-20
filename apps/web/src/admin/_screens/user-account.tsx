"use client";

import { LogOut, Save } from "lucide-react";
import type { SubmitEvent } from "react";
import * as React from "react";

import {
  AdminDetailList,
  AdminSectionCard,
} from "../_components/admin-design";
import { AdminStateBox } from "../_components/admin-state";
import {
  createAdminAccountUserFromWorkspaceAccount,
  signOutAdminSession,
  useAdminAccountState,
} from "../_state/admin-account-state";
import type { AdminWorkspaceProps } from "../_workspace/admin-workspace-props";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type AccountProfileSettingsIslandProps = {
  workspace: AdminWorkspaceProps;
};

export function AccountSignOutButton() {
  return (
    <Button onClick={() => void signOutAdminSession()} type="button" variant="outline">
      <LogOut />
      Sign out
    </Button>
  );
}

export function AccountProfileSettingsIsland({
  workspace,
}: AccountProfileSettingsIslandProps) {
  const initialUser = React.useMemo(
    () => createAdminAccountUserFromWorkspaceAccount(workspace.account),
    [
      workspace.account.email,
      workspace.account.id,
      workspace.account.image,
      workspace.account.initials,
      workspace.account.name,
    ],
  );
  const {
    accountError,
    accountImage,
    accountMessage,
    accountName,
    isSavingAccountProfile,
    setAccountImage,
    setAccountName,
    updateAccountProfile,
    user,
  } = useAdminAccountState({ initialUser });
  const role = workspace.role;

  const handleSaveProfile = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    void updateAccountProfile();
  };

  return (
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
              {
                label: "Avatar",
                value: accountImage.trim() ? "Custom URL" : "Initials",
              },
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
  );
}
