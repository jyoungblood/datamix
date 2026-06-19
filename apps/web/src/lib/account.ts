import type { DatamixUserSummary } from "./users";

import { buildDatamixAdminApiUrl } from "./runtime";

type AccountApiBody = {
  error?: string;
  message?: string;
  user?: DatamixUserSummary;
};

export class AccountRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountRequestError";
  }
}

async function readApiBody<TValue>(response: Response) {
  return (await response.json().catch(() => null)) as TValue | null;
}

export async function updateAccountProfile(input: {
  image: string | null;
  name: string;
}) {
  const response = await fetch(buildDatamixAdminApiUrl("/account"), {
    body: JSON.stringify(input),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
  });
  const body = await readApiBody<AccountApiBody>(response);

  if (!response.ok) {
    throw new AccountRequestError(body?.error ?? "Unable to update profile.");
  }

  if (!body?.user || !body.message) {
    throw new AccountRequestError("Profile update response was incomplete.");
  }

  return {
    message: body.message,
    user: body.user,
  };
}
