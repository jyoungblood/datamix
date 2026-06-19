import type { APIContext, APIRoute } from "astro";

import type { RouteContext } from "./http";

type HandlerParams = Record<string, string | string[]>;

type DatamixRouteHandler<TParams extends HandlerParams> = (
  request: Request,
  context: RouteContext<TParams>,
) => Response | Promise<Response>;

type DatamixRequestHandler = (request: Request) => Response | Promise<Response>;

function normalizeParams<TParams extends HandlerParams>(params: APIContext["params"]) {
  return params as TParams;
}

export function defineAstroRoute<TParams extends HandlerParams>(
  handler: DatamixRouteHandler<TParams>,
): APIRoute {
  return async ({ params, request }) => {
    return handler(request, {
      params: normalizeParams<TParams>(params),
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
