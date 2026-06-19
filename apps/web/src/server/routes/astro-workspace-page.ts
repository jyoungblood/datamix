import {
  adminRoutes,
  adminWorkspaceSidebarRoutes,
  type AdminWorkspaceRoute,
  type AdminWorkspaceRouteSection,
} from "@/admin/_workspace/admin-routes";

import { getAuthSetupStatus } from "../auth";
import { AuthConfigError, type DatamixBindings } from "../env";
import { resolveAuthorizedSession } from "./admin-auth";
import { getDatamixEnv } from "./http";

export type WorkspaceShellAccount = {
  email: string | null;
  href: string;
  image: string;
  initials: string;
  name: string;
  roleLabel: string;
};

export type WorkspaceShellRoute = Pick<
  AdminWorkspaceRoute,
  "href" | "id" | "label" | "section"
>;

export type WorkspaceShellError = {
  body: string;
  statusCode: number | null;
  title: string;
};

export type WorkspaceShellProps = {
  account: WorkspaceShellAccount;
  activeSection: AdminWorkspaceRouteSection;
  error?: WorkspaceShellError;
  routes: WorkspaceShellRoute[];
  title: string;
};

type WorkspacePageResult =
  | {
      kind: "redirect";
      location: string;
    }
  | {
      kind: "shell";
      shell: WorkspaceShellProps;
    };

const loginPath = "/admin/login";
const setupPath = "/admin/setup";

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

function createLoginRedirect(request: Request) {
  const url = new URL(request.url);
  const next = `${url.pathname}${url.search}`;

  return `${loginPath}?next=${encodeURIComponent(next)}`;
}

function createFallbackAccount(): WorkspaceShellAccount {
  return {
    email: null,
    href: adminRoutes.account().href,
    image: "",
    initials: "DM",
    name: "Datamix Admin",
    roleLabel: "Admin",
  };
}

function createWorkspaceShellProps(
  route: AdminWorkspaceRoute,
  account: WorkspaceShellAccount,
  error?: WorkspaceShellError,
): WorkspaceShellProps {
  return {
    account,
    activeSection: route.section,
    ...(error ? { error } : {}),
    routes: [...adminWorkspaceSidebarRoutes],
    title: route.title,
  };
}

function createAuthConfigErrorShell(
  route: AdminWorkspaceRoute,
  error: unknown,
): WorkspaceShellProps {
  return createWorkspaceShellProps(route, createFallbackAccount(), {
    body:
      error instanceof Error
        ? error.message
        : "Datamix admin cannot read its authentication configuration.",
    statusCode: error instanceof AuthConfigError ? 503 : null,
    title:
      error instanceof AuthConfigError
        ? "Datamix setup is missing required configuration"
        : "Datamix admin is temporarily unavailable",
  });
}

async function readAccessError(response: Response): Promise<string> {
  try {
    const body = (await response.clone().json()) as { error?: unknown };

    if (typeof body.error === "string" && body.error.trim()) {
      return body.error;
    }
  } catch {
    // Fall through to the status text below.
  }

  return response.statusText || "Unable to authorize the current admin session.";
}

function createAccountSummary(
  access: Awaited<ReturnType<typeof resolveAuthorizedSession>> & { success: true },
): WorkspaceShellAccount {
  const email = access.session.user.email ?? null;
  const image = access.session.user.image ?? "";
  const name = access.session.user.name || email || "Datamix Admin";

  return {
    email,
    href: adminRoutes.account().href,
    image,
    initials: createInitials({ email, name }),
    name,
    roleLabel: access.authorization.role.label,
  };
}

async function resolveSetupGate(
  env: DatamixBindings,
  route: AdminWorkspaceRoute,
): Promise<WorkspacePageResult | null> {
  try {
    const setup = await getAuthSetupStatus(env);

    if (setup.setup.setupRequired) {
      return {
        kind: "redirect",
        location: setupPath,
      };
    }

    return null;
  } catch (error) {
    return {
      kind: "shell",
      shell: createAuthConfigErrorShell(route, error),
    };
  }
}

export async function resolveWorkspacePage(
  request: Request,
  route: AdminWorkspaceRoute,
): Promise<WorkspacePageResult> {
  const env = getDatamixEnv();
  const setupResult = await resolveSetupGate(env, route);

  if (setupResult) {
    return setupResult;
  }

  const access = await resolveAuthorizedSession(request, env);

  if (!access.success) {
    if (access.response.status === 401) {
      return {
        kind: "redirect",
        location: createLoginRedirect(request),
      };
    }

    return {
      kind: "shell",
      shell: createWorkspaceShellProps(route, createFallbackAccount(), {
        body: await readAccessError(access.response),
        statusCode: access.response.status || null,
        title:
          access.response.status === 503
            ? "Datamix setup is missing required configuration"
            : "Unable to authorize this workspace",
      }),
    };
  }

  return {
    kind: "shell",
    shell: createWorkspaceShellProps(route, createAccountSummary(access)),
  };
}
