import type { DatamixRoleDefinition } from "@datamix/core";

import { adminPublicEnv } from "./runtime";

export type DatamixUserSummary = {
  createdAt: string;
  email: string;
  emailVerified: boolean;
  id: string;
  name: string;
  roleId: string | null;
  updatedAt: string;
};

type UsersApiBody = {
  error?: string;
  message?: string;
  role?: DatamixRoleDefinition;
  user?: DatamixUserSummary;
  users?: DatamixUserSummary[];
};

export class UserRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserRequestError";
  }
}

async function readApiBody<TValue>(response: Response) {
  return (await response.json().catch(() => null)) as TValue | null;
}

function buildUsersUrl(userId?: string) {
  const pathname = userId ? `/users/${encodeURIComponent(userId)}/role` : "/users";

  return `${adminPublicEnv.NEXT_PUBLIC_API_ORIGIN}${pathname}`;
}

export async function listUsers() {
  const response = await fetch(buildUsersUrl(), {
    credentials: "include",
  });
  const body = await readApiBody<UsersApiBody>(response);

  if (!response.ok) {
    throw new UserRequestError(body?.error ?? "Unable to load users.");
  }

  return body?.users ?? [];
}

export async function updateUserRole(userId: string, roleId: string) {
  const response = await fetch(buildUsersUrl(userId), {
    body: JSON.stringify({ roleId }),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
  });
  const body = await readApiBody<UsersApiBody>(response);

  if (!response.ok) {
    throw new UserRequestError(body?.error ?? "Unable to update user role.");
  }

  if (!body?.user || !body.message) {
    throw new UserRequestError("User role update response was incomplete.");
  }

  return {
    message: body.message,
    role: body.role ?? null,
    user: body.user,
  };
}
