import { env as workerEnv } from "cloudflare:workers";

import type { DatamixBindings } from "../env";

type CorsPolicy = {
  allowHeaders?: string[];
  allowMethods: string[];
  credentials?: boolean;
  origin: "*" | string;
};

export type RouteContext<TParams extends Record<string, string | string[]>> = {
  params: TParams;
};

export const appBrowserCorsPolicy = (env: DatamixBindings): CorsPolicy => ({
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "OPTIONS"],
  credentials: true,
  origin: env.APP_ORIGIN,
});

export const publicJsonCorsPolicy = {
  allowHeaders: ["Content-Type", "Authorization", "X-API-Key"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  origin: "*",
} satisfies CorsPolicy;

export const publicMediaCorsPolicy = {
  allowMethods: ["GET", "OPTIONS"],
  origin: "*",
} satisfies CorsPolicy;

export function getDatamixEnv() {
  return workerEnv as unknown as DatamixBindings;
}

export function jsonResponse(
  body: unknown,
  status = 200,
  init?: Omit<ResponseInit, "status">,
) {
  const headers = new Headers(init?.headers);

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json; charset=UTF-8");
  }

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
    status,
  });
}

export async function readJsonBody(request: Request, errorMessage: string) {
  try {
    return {
      body: await request.json(),
      success: true as const,
    };
  } catch {
    return {
      response: jsonResponse({ error: errorMessage }, 400),
      success: false as const,
    };
  }
}

function resolveAllowOrigin(request: Request, policy: CorsPolicy) {
  const origin = request.headers.get("origin") ?? "";

  if (policy.origin === "*") {
    return policy.credentials ? origin || null : "*";
  }

  return policy.origin === origin ? origin : null;
}

function appendVary(headers: Headers, value: string) {
  headers.append("Vary", value);
}

function applyCorsHeaders(
  request: Request,
  headers: Headers,
  policy: CorsPolicy,
  options?: {
    preflight?: boolean;
  },
) {
  const allowOrigin = resolveAllowOrigin(request, policy);

  if (allowOrigin) {
    headers.set("Access-Control-Allow-Origin", allowOrigin);
  }

  if (policy.credentials) {
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  if (options?.preflight) {
    if (policy.origin !== "*" || policy.credentials) {
      headers.set("Vary", "Origin");
    }

    if (policy.allowMethods.length > 0) {
      headers.set("Access-Control-Allow-Methods", policy.allowMethods.join(","));
    }

    let allowHeaders = policy.allowHeaders;

    if (!allowHeaders?.length) {
      const requestHeaders = request.headers.get("Access-Control-Request-Headers");

      if (requestHeaders) {
        allowHeaders = requestHeaders.split(/\s*,\s*/);
      }
    }

    if (allowHeaders?.length) {
      headers.set("Access-Control-Allow-Headers", allowHeaders.join(","));
      appendVary(headers, "Access-Control-Request-Headers");
    }

    headers.delete("Content-Length");
    headers.delete("Content-Type");
    return;
  }

  if (policy.origin !== "*" || policy.credentials) {
    appendVary(headers, "Origin");
  }
}

function ensureMutableResponse(response: Response) {
  try {
    response.headers.set("X-Datamix-Mutable-Check", "1");
    response.headers.delete("X-Datamix-Mutable-Check");
    return response;
  } catch {
    return new Response(response.body, {
      headers: new Headers(response.headers),
      status: response.status,
      statusText: response.statusText,
    });
  }
}

export function withCors(request: Request, response: Response, policy: CorsPolicy) {
  const mutableResponse = ensureMutableResponse(response);

  applyCorsHeaders(request, mutableResponse.headers, policy);

  return mutableResponse;
}

export function corsOptionsResponse(request: Request, policy: CorsPolicy) {
  const headers = new Headers();

  applyCorsHeaders(request, headers, policy, { preflight: true });

  return new Response(null, {
    headers,
    status: 204,
    statusText: "No Content",
  });
}

export function adminOptions(request: Request) {
  return corsOptionsResponse(request, appBrowserCorsPolicy(getDatamixEnv()));
}

export function publicJsonOptions(request: Request) {
  return corsOptionsResponse(request, publicJsonCorsPolicy);
}

export function publicMediaOptions(request: Request) {
  return corsOptionsResponse(request, publicMediaCorsPolicy);
}

export function withAdminCors(request: Request, response: Response) {
  return withCors(request, response, appBrowserCorsPolicy(getDatamixEnv()));
}

export function withPublicJsonCors(request: Request, response: Response) {
  return withCors(request, response, publicJsonCorsPolicy);
}

export function withPublicMediaCors(request: Request, response: Response) {
  return withCors(request, response, publicMediaCorsPolicy);
}
