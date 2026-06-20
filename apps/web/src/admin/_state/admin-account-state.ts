"use client";

import * as React from "react";

import {
  AccountRequestError,
  updateAccountProfile as updateAccountProfileRequest,
} from "@/lib/account";
import { authClient } from "@/lib/auth-client";
import { buildDatamixAdminPath } from "@/lib/runtime";
import type { DatamixUserSummary } from "@/lib/users";

import type { AdminWorkspaceAccountProps } from "../_workspace/admin-workspace-props";

export type AdminAccountUser = {
  displayName: string;
  email: string | null;
  id: string | null;
  image: string | null;
  initials: string;
};

export type AdminAccountProfileOverride = {
  image: string | null;
  name: string;
};

type AdminAccountStateOptions = {
  initialUser: AdminAccountUser | null;
};

function createInitials(input: { email: string | null; name: string | null }) {
  const source = input.name || input.email || "Datamix Admin";
  const parts = source
    .split(/[\s@._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "DM";
}

export function createAdminAccountUser(input?: {
  email?: string | null;
  id?: string | null;
  image?: string | null;
  name?: string | null;
} | null): AdminAccountUser {
  const email = input?.email ?? null;
  const id = input?.id ?? null;
  const image = input?.image ?? null;
  const name = input?.name ?? null;

  return {
    displayName: name || email || "Datamix Admin",
    email,
    id,
    image,
    initials: createInitials({ email, name }),
  };
}

export function createAdminAccountUserFromSession(
  sessionData: unknown,
): AdminAccountUser | null {
  const user =
    typeof sessionData === "object" && sessionData !== null && "user" in sessionData
      ? (sessionData as {
          user?: {
            email?: string | null;
            id?: string | null;
            image?: string | null;
            name?: string | null;
          };
        }).user
      : undefined;

  return user ? createAdminAccountUser(user) : null;
}

export function createAdminAccountUserFromWorkspaceAccount(
  account: AdminWorkspaceAccountProps,
): AdminAccountUser {
  return {
    displayName: account.name || account.email || "Datamix Admin",
    email: account.email,
    id: account.id,
    image: account.image || null,
    initials: account.initials,
  };
}

export async function signOutAdminSession() {
  await authClient.signOut();
  window.location.replace(buildDatamixAdminPath("/login"));
}

function applyAccountProfileOverride(
  initialUser: AdminAccountUser | null,
  profileOverride: AdminAccountProfileOverride | null,
) {
  if (!profileOverride) {
    return initialUser ?? createAdminAccountUser(null);
  }

  const email = initialUser?.email ?? null;
  const name = profileOverride.name;

  return {
    displayName: name || email || "Datamix Admin",
    email,
    id: initialUser?.id ?? null,
    image: profileOverride.image,
    initials: createInitials({ email, name }),
  };
}

export function useAdminAccountState({ initialUser }: AdminAccountStateOptions) {
  const [accountName, setAccountName] = React.useState("");
  const [accountImage, setAccountImage] = React.useState("");
  const [accountMessage, setAccountMessage] = React.useState<string | null>(null);
  const [accountError, setAccountError] = React.useState<string | null>(null);
  const [accountProfileOverride, setAccountProfileOverride] =
    React.useState<AdminAccountProfileOverride | null>(null);
  const [isSavingAccountProfile, setIsSavingAccountProfile] = React.useState(false);

  React.useEffect(() => {
    if (!initialUser) {
      setAccountName("");
      setAccountImage("");
      setAccountMessage(null);
      setAccountError(null);
      setAccountProfileOverride(null);
      setIsSavingAccountProfile(false);
      return;
    }

    setAccountName(initialUser.displayName);
    setAccountImage(initialUser.image ?? "");
    setAccountMessage(null);
    setAccountError(null);
    setAccountProfileOverride(null);
    setIsSavingAccountProfile(false);
  }, [
    initialUser?.displayName,
    initialUser?.email,
    initialUser?.id,
    initialUser?.image,
  ]);

  const updateAccountProfile = React.useCallback(async () => {
    setIsSavingAccountProfile(true);
    setAccountError(null);
    setAccountMessage(null);

    try {
      const result = await updateAccountProfileRequest({
        image: accountImage.trim() || null,
        name: accountName,
      });

      setAccountName(result.user.name);
      setAccountImage(result.user.image ?? "");
      setAccountProfileOverride({
        image: result.user.image,
        name: result.user.name,
      });
      setAccountMessage(result.message);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("datamix:account-profile-updated", {
            detail: {
              image: result.user.image ?? "",
              name: result.user.name || result.user.email,
            },
          }),
        );
      }

      return result.user;
    } catch (error) {
      setAccountError(
        error instanceof AccountRequestError || error instanceof Error
          ? error.message
          : "Unable to update profile.",
      );
      return null;
    } finally {
      setIsSavingAccountProfile(false);
    }
  }, [accountImage, accountName]);

  const signOut = React.useCallback(signOutAdminSession, []);

  const user = React.useMemo(
    () => applyAccountProfileOverride(initialUser, accountProfileOverride),
    [accountProfileOverride, initialUser],
  );

  return {
    accountError,
    accountImage,
    accountMessage,
    accountName,
    accountProfileOverride,
    isSavingAccountProfile,
    setAccountImage,
    setAccountName,
    signOut,
    updateAccountProfile: updateAccountProfile as () => Promise<DatamixUserSummary | null>,
    user,
  };
}
