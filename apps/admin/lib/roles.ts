import type {
  DatamixRoleDefinition,
  DatamixSchemaValidationIssue,
} from "@datamix/core";

import { adminPublicEnv } from "./runtime";

type RolesApiBody = {
  error?: string;
  issues?: DatamixSchemaValidationIssue[];
  message?: string;
  role?: DatamixRoleDefinition;
  roles?: DatamixRoleDefinition[];
};

export class RoleRequestError extends Error {
  readonly issues: DatamixSchemaValidationIssue[] | undefined;

  constructor(message: string, issues?: DatamixSchemaValidationIssue[]) {
    super(message);
    this.name = "RoleRequestError";
    this.issues = issues;
  }
}

async function readApiBody<TValue>(response: Response) {
  return (await response.json().catch(() => null)) as TValue | null;
}

function buildRolesUrl(roleId?: string) {
  const pathname = roleId ? `/roles/${encodeURIComponent(roleId)}` : "/roles";

  return `${adminPublicEnv.NEXT_PUBLIC_API_ORIGIN}${pathname}`;
}

export async function listRoles() {
  const response = await fetch(buildRolesUrl(), {
    credentials: "include",
  });
  const body = await readApiBody<RolesApiBody>(response);

  if (!response.ok) {
    throw new RoleRequestError(body?.error ?? "Unable to load roles.", body?.issues);
  }

  return body?.roles ?? [];
}

export async function saveRole(role: {
  description: string;
  id: string;
  label: string;
  permissions: string[];
}) {
  const response = await fetch(buildRolesUrl(role.id), {
    body: JSON.stringify(role),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
  });
  const body = await readApiBody<RolesApiBody>(response);

  if (!response.ok) {
    throw new RoleRequestError(body?.error ?? "Unable to save role.", body?.issues);
  }

  if (!body?.role || !body.message) {
    throw new RoleRequestError("Role save response was incomplete.");
  }

  return {
    message: body.message,
    role: body.role,
  };
}
