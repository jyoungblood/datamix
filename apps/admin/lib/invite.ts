import { adminPublicEnv } from "./runtime";

export async function sendInvite(input: { email: string; name?: string; roleId?: string }) {
  const response = await fetch(`${adminPublicEnv.NEXT_PUBLIC_API_ORIGIN}/invites`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const body = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | null;

  if (!response.ok) {
    throw new Error(body?.error ?? "Unable to send invite email.");
  }

  return body?.message ?? "Invite email queued.";
}
