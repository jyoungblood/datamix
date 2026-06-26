import { defineMiddleware } from "astro:middleware";

const unsafeMethods = new Set(["DELETE", "PATCH", "POST", "PUT"]);
const sameOriginProtectedApiPrefixes = ["/api/admin/", "/api/auth/"] as const;

function shouldProtectRequest(pathname: string) {
  return sameOriginProtectedApiPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export const onRequest = defineMiddleware((context, next) => {
  if (
    !unsafeMethods.has(context.request.method.toUpperCase()) ||
    !shouldProtectRequest(context.url.pathname)
  ) {
    return next();
  }

  if (context.request.headers.get("origin") === context.url.origin) {
    return next();
  }

  return new Response("Cross-site admin and auth requests are forbidden.", {
    headers: {
      "Content-Type": "text/plain; charset=UTF-8",
    },
    status: 403,
  });
});
