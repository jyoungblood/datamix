import { createAuth, getAuthSetupStatus } from "../auth";
import { AuthConfigError, type DatamixBindings } from "../env";
import { getDatamixEnv } from "./http";

export type AuthPageState = {
  oauthProviders: { enabled: boolean; id: string; label: string }[];
  setupError: string | null;
  setupStatusCode: number | null;
  setupRequired: boolean | null;
};

type AuthPageResult = { redirect: string } | { state: AuthPageState };

const adminPath = "/admin";
const loginPath = "/admin/login";
const setupPath = "/admin/setup";

function createErrorState(error: unknown): AuthPageState {
  return {
    oauthProviders: [],
    setupError: error instanceof Error ? error.message : "Unable to read Datamix setup status.",
    setupRequired: null,
    setupStatusCode: error instanceof AuthConfigError ? 503 : null,
  };
}

async function readAuthPageState(env: DatamixBindings): Promise<AuthPageState> {
  try {
    const auth = await getAuthSetupStatus(env);

    return {
      oauthProviders: auth.oauth.providers.map((provider) => ({
        enabled: provider.enabled,
        id: provider.id,
        label: provider.label,
      })),
      setupError: null,
      setupRequired: auth.setup.setupRequired,
      setupStatusCode: null,
    };
  } catch (error) {
    return createErrorState(error);
  }
}

async function readSession(request: Request, env: DatamixBindings) {
  try {
    return await createAuth(env, {
      baseURL: new URL(request.url).origin,
    }).api.getSession({
      headers: request.headers,
    });
  } catch (error) {
    if (error instanceof AuthConfigError) {
      return null;
    }

    throw error;
  }
}

export function readLocalNextPath(url: URL) {
  const nextPath = url.searchParams.get("next");

  return nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : adminPath;
}

export async function resolveLoginPageState(
  request: Request,
  url: URL,
): Promise<AuthPageResult> {
  const env = getDatamixEnv();
  const state = await readAuthPageState(env);

  if (state.setupError) {
    return { state };
  }

  if (state.setupRequired) {
    return { redirect: setupPath };
  }

  const session = await readSession(request, env);

  if (session) {
    return { redirect: readLocalNextPath(url) };
  }

  return { state };
}

export async function resolveSetupPageState(
  request: Request,
): Promise<AuthPageResult> {
  const env = getDatamixEnv();
  const state = await readAuthPageState(env);

  if (state.setupError) {
    return { state };
  }

  const session = await readSession(request, env);

  if (session) {
    return { redirect: adminPath };
  }

  if (state.setupRequired === false) {
    return { redirect: loginPath };
  }

  return { state };
}
