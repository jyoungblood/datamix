import { datamixDefaultRoleAssignments } from "@datamix/core";
import { APIError } from "better-auth";

import { createAuth } from "./auth";
import type { ApiBindings } from "./env";
import { getAvailableRoleDefinition } from "./roles";

type CreateInviteInput = {
  email: string;
  inviteeName?: string;
  inviterName?: string;
  roleId?: string;
};

function createInviteDisplayName(email: string, inviteeName?: string) {
  const trimmedName = inviteeName?.trim();

  if (trimmedName) {
    return trimmedName;
  }

  const localPart = email.split("@")[0]?.trim();

  return localPart || email;
}

function createTemporaryPassword() {
  return `dmx-invite-${crypto.randomUUID()}-${crypto.randomUUID()}`;
}

async function resolveInviteRoleId(env: ApiBindings, roleId?: string) {
  const normalizedRoleId = roleId?.trim() || datamixDefaultRoleAssignments.invitedUser;
  const role = await getAvailableRoleDefinition(env, normalizedRoleId);

  if (!role) {
    throw new APIError("BAD_REQUEST", {
      message: `Role "${normalizedRoleId}" does not exist.`,
    });
  }

  return role.id;
}

async function ensureCredentialAccount(
  context: Awaited<ReturnType<typeof createAuth>["$context"]>,
  userId: string,
) {
  const existingCredentialAccount = (await context.internalAdapter.findAccounts(userId)).find(
    (account) => account.providerId === "credential",
  );

  if (existingCredentialAccount) {
    return;
  }

  const passwordHash = await context.password.hash(createTemporaryPassword());

  await context.internalAdapter.linkAccount({
    userId,
    providerId: "credential",
    accountId: userId,
    password: passwordHash,
  });
}

export async function createInvite(env: ApiBindings, input: CreateInviteInput) {
  const auth = createAuth(env);
  const context = await auth.$context;
  const normalizedEmail = input.email.trim().toLowerCase();
  const roleId = await resolveInviteRoleId(env, input.roleId);
  const inviteDisplayName = createInviteDisplayName(normalizedEmail, input.inviteeName);

  const existingUser = await context.internalAdapter.findUserByEmail(normalizedEmail, {
    includeAccounts: true,
  });

  if (existingUser?.user && existingUser.user.emailVerified) {
    throw new APIError("CONFLICT", {
      message: "A Datamix user with that email already exists.",
    });
  }

  const invitedUser = existingUser?.user
    ? await context.internalAdapter.updateUser(existingUser.user.id, {
        name: inviteDisplayName,
        role: roleId,
      })
    : await context.internalAdapter.createUser({
        email: normalizedEmail,
        name: inviteDisplayName,
        emailVerified: false,
        role: roleId,
      });

  if (!invitedUser) {
    throw new APIError("BAD_REQUEST", {
      message: "Failed to create the invited Datamix user.",
    });
  }

  await ensureCredentialAccount(context, invitedUser.id);

  await auth.api.requestPasswordReset({
    body: {
      email: normalizedEmail,
      redirectTo: `${env.ADMIN_ORIGIN}/reset-password?mode=invite&email=${encodeURIComponent(
        normalizedEmail,
      )}`,
    },
    headers: new Headers({
      origin: env.ADMIN_ORIGIN,
      "x-datamix-email-template": "invite",
      "x-datamix-inviter-name": input.inviterName?.trim() || "",
      "x-datamix-invitee-name": invitedUser.name || "",
    }),
  });

  return {
    email: invitedUser.email,
    id: invitedUser.id,
    name: invitedUser.name,
    roleId,
  };
}
