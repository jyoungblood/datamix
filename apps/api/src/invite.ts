import type { DatamixRolePresetId } from "@datamix/core";
import { APIError } from "better-auth";

import { createAuth } from "./auth";
import type { ApiBindings } from "./env";

type CreateInviteInput = {
  email: string;
  inviteeName?: string;
  inviterName?: string;
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

const defaultInvitedUserRole: DatamixRolePresetId = "contributor";

export async function createInvite(env: ApiBindings, input: CreateInviteInput) {
  const auth = createAuth(env);
  const context = await auth.$context;
  const normalizedEmail = input.email.trim().toLowerCase();

  const existingUser = await context.internalAdapter.findUserByEmail(normalizedEmail, {
    includeAccounts: true,
  });

  if (existingUser?.user) {
    throw new APIError("CONFLICT", {
      message: "A Datamix user with that email already exists.",
    });
  }

  const createdUser = await context.internalAdapter.createUser({
    email: normalizedEmail,
    name: createInviteDisplayName(normalizedEmail, input.inviteeName),
    emailVerified: false,
    role: defaultInvitedUserRole,
  });

  if (!createdUser) {
    throw new APIError("BAD_REQUEST", {
      message: "Failed to create the invited Datamix user.",
    });
  }

  const passwordHash = await context.password.hash(createTemporaryPassword());

  await context.internalAdapter.linkAccount({
    userId: createdUser.id,
    providerId: "credential",
    accountId: createdUser.id,
    password: passwordHash,
  });

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
      "x-datamix-invitee-name": createdUser.name || "",
    }),
  });

  return {
    email: createdUser.email,
    id: createdUser.id,
    name: createdUser.name,
  };
}
