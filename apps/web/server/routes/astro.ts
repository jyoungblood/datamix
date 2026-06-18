import type { APIContext, APIRoute } from "astro";

import type { RouteContext } from "./http";

type HandlerContext = RouteContext<Record<string, string | string[]>>;

type DatamixRouteHandler = (
  request: Request,
  context: HandlerContext,
) => Response | Promise<Response>;

type DatamixRequestHandler = (request: Request) => Response | Promise<Response>;

function normalizeParams(params: APIContext["params"]) {
  return params as Record<string, string | string[]>;
}

export function defineAstroRoute(handler: DatamixRouteHandler): APIRoute {
  return async ({ params, request }) => {
    return handler(request, {
      params: normalizeParams(params),
    });
  };
}

export function defineAstroRequestRoute(handler: DatamixRequestHandler): APIRoute {
  return async ({ request }) => {
    return handler(request);
  };
}

export function getAstroExecutionContext(context: APIContext) {
  return context.locals.cfContext;
}
