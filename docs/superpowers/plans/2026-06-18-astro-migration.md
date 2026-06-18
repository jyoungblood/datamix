# Astro Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Vinext/App Router shell in `apps/web` with a working Astro app deployed through the Cloudflare Workers adapter, while preserving current Datamix runtime behavior.

**Architecture:** Astro becomes the file router, renderer, build command, and Cloudflare Workers adapter. Existing React admin screens remain React islands, and existing `apps/web/server/**`, `apps/web/lib/**`, `components/**`, and `packages/core/**` domain code stays in place. API endpoints are thin Astro wrappers around the existing plain `Request`/`Response` route handlers.

**Tech Stack:** Astro, `@astrojs/cloudflare`, `@astrojs/react`, React 19, Tailwind CSS 4 Vite plugin, Cloudflare Workers, D1, R2, Cloudflare Images, Better Auth, Drizzle.

---

## Ground Rules

- Work on branch `astro`. This branch has already been created from `main`.
- Do not use the Browser skill for preview/debugging. Ask the user to verify UI behavior instead.
- Keep the first migration functional and conservative. Do not reorganize the app deeply until after Astro parity is proven.
- Keep the existing admin React code under `apps/web/app/admin/_screens`, `apps/web/app/admin/_components`, `apps/web/app/admin/_workspace`, and `apps/web/app/admin/_lib` during this migration.
- Keep server/domain code under `apps/web/server`, `apps/web/lib`, `apps/web/components`, and `packages/core`.
- Use official Astro docs as the source of truth when Astro and Cloudflare docs conflict. The current Astro Cloudflare adapter docs say Wrangler `main` should use `@astrojs/cloudflare/entrypoints/server`.

## Current Shape

- Current branch before work: `astro`.
- Current deployment shell: Vinext App Router Worker.
- Current Worker entry: `apps/web/worker/index.ts`.
- Current Vite shell: `apps/web/vite.config.ts`.
- Current route wrappers:
  - 17 page wrappers under `apps/web/app/**/page.tsx`.
  - 28 API route wrappers under `apps/web/app/api/**/route.ts`.
- Current actual behavior lives mostly in:
  - `apps/web/server/routes/**`.
  - `apps/web/server/**`.
  - `apps/web/lib/**`.
  - `packages/core/src/**`.
- Current Next-specific usage is small:
  - `next/link` in `apps/web/app/page.tsx`, `apps/web/app/admin/_screens/admin-home.tsx`, and `apps/web/app/admin/_components/admin-frame.tsx`.
  - `vinext/server/app-router-entry` and `vinext/shims/request-context`.
  - `next-env.d.ts`, `types/next-shims.d.ts`, App Router file conventions.

## Target File Structure

Create:

- `apps/web/astro.config.mjs`
  - Astro config, Cloudflare adapter, React integration, Tailwind Vite plugin, `@` alias to `apps/web`.
- `apps/web/src/layouts/DatamixRootLayout.astro`
  - Imports `../../styles/globals.css`.
  - Provides the shared `<html>` and `<body>` shell from the current App Router layout.
- `apps/web/src/pages/index.astro`
  - Replaces `apps/web/app/page.tsx`.
- `apps/web/src/pages/admin/**/*.astro`
  - Replaces App Router admin page wrappers.
  - Mounts existing React screen components using `client:only="react"` for initial parity.
- `apps/web/src/admin-routes/*.tsx`
  - Route-specific React island wrappers used by the Astro admin pages.
  - Keeps React composition inside React instead of passing nested React children through Astro slots.
- `apps/web/src/pages/api/**/*.ts`
  - Replaces App Router route files.
  - Delegates to existing route handlers.
- `apps/web/src/pages/404.astro`
  - Small not-found page for Worker/static asset behavior.
- `apps/web/server/routes/astro.ts`
  - Small adapter helpers that convert Astro endpoint context to the current handler shape.

Modify:

- `apps/web/package.json`
  - Replace Vinext scripts with Astro scripts.
  - Add Astro dependencies.
  - Remove Vinext/RSC dependencies in the final cleanup slice.
- `apps/web/tsconfig.json`
  - Include `.astro/types.d.ts`, `src/**/*.astro`, `src/**/*.ts`, and current shared React/server directories.
  - Exclude obsolete App Router route wrappers after they are deleted.
- `apps/web/wrangler.jsonc`
  - Set `main` to `@astrojs/cloudflare/entrypoints/server`.
  - Change assets directory from `dist/client` to `dist`.
  - Keep D1, R2, Images, vars, secrets typing, `nodejs_compat`, and the current compatibility date for the first migration.
- `apps/web/lib/runtime.ts`
  - Stop using `process.env` in client-imported code.
  - Use `import.meta.env.PUBLIC_DATAMIX_APP_ENV` and `import.meta.env.PUBLIC_DATAMIX_APP_ORIGIN`, with browser-origin fallback.
- `apps/web/server/auth.ts`
  - Remove Vinext request-context dependency.
  - Accept an optional Cloudflare `ExecutionContext` for Better Auth background tasks.
- `apps/web/server/routes/auth-handlers.ts`
  - Pass the endpoint `ExecutionContext` into `createAuth`.
- `apps/web/app/admin/_screens/admin-home.tsx`
  - Replace `next/link` with anchors or a local link component.
- `apps/web/app/admin/_components/admin-frame.tsx`
  - Replace `next/link` with anchors or a local link component.
- `apps/web/README.md`, `docs/architecture-overview.md`, `docs/local-development.md`, `docs/deploy-runtime-contract.md`
  - Update framework/runtime language from Vinext/App Router to Astro.
- `tests/smoke/datamix-smoke.mjs`
  - Keep behavior assertions. Keep the existing HTTP readiness checks as the source of truth for server startup.

Delete in final cleanup:

- `apps/web/worker/index.ts`
- `apps/web/vite.config.ts`
- `apps/web/next-env.d.ts`
- `apps/web/types/next-shims.d.ts`
- `apps/web/app/layout.tsx`
- `apps/web/app/page.tsx`
- App Router page wrappers under `apps/web/app/admin/**/page.tsx`
- App Router route wrappers under `apps/web/app/api/**/route.ts`

Keep during this migration:

- `apps/web/app/admin/_screens/**`
- `apps/web/app/admin/_components/**`
- `apps/web/app/admin/_workspace/**`
- `apps/web/app/admin/_lib/**`

---

## Slice 0: Branch And Baseline

**Goal:** Ensure the migration is isolated and the starting state is known.

**Files:**

- Modify: none
- Test: existing repo commands

- [x] **Step 1: Create the branch**

Run:

```bash
git switch -c astro
```

Expected:

```text
Switched to a new branch 'astro'
```

- [x] **Step 2: Confirm clean starting state**

Run:

```bash
git status --short --branch
```

Expected:

```text
## astro
```

or:

```text
## astro...origin/astro
```

- [x] **Step 3: Run current baseline checks**

Run:

```bash
npm run typecheck --workspace @datamix/web
npm run build --workspace @datamix/web
```

Expected:

```text
0 errors
```

The exact output can vary. The pass condition is exit code `0` for both commands.

- [ ] **Step 4: Record any pre-existing failure**

If a baseline command fails, stop and add a short note to this plan under this slice with:

```text
Baseline failure:
- Command:
- Exit code:
- First relevant error:
```

Do not fix unrelated baseline failures inside the Astro migration slice unless the user approves.

---

## Slice 1: Astro Foundation

**Goal:** Add Astro as a parallel shell and make the root route build through Astro without porting the full app yet.

**Files:**

- Create: `apps/web/astro.config.mjs`
- Create: `apps/web/src/layouts/DatamixRootLayout.astro`
- Create: `apps/web/src/pages/index.astro`
- Create: `apps/web/src/pages/404.astro`
- Modify: `apps/web/package.json`
- Modify: `apps/web/tsconfig.json`
- Modify: `apps/web/wrangler.jsonc`
- Test: `npm run build --workspace @datamix/web`

- [x] **Step 1: Install Astro dependencies**

Run:

```bash
npm install --workspace @datamix/web astro @astrojs/cloudflare @astrojs/react
npm install --workspace @datamix/web --save-dev @astrojs/check
```

Expected:

```text
added
```

The exact package count can vary. The pass condition is exit code `0` and updates to `package-lock.json`.

- [x] **Step 2: Replace web scripts**

Edit `apps/web/package.json` scripts to:

```json
{
  "dev": "WRANGLER_LOG_PATH=.wrangler/logs astro dev --host 127.0.0.1 --port 3000",
  "build": "astro build",
  "start": "astro preview --host 127.0.0.1 --port 3000",
  "deploy": "npm run build && wrangler deploy --config wrangler.jsonc",
  "typegen": "WRANGLER_LOG_PATH=.wrangler/logs wrangler types ./worker-configuration.d.ts --config wrangler.jsonc --env-file .dev.vars.example",
  "typecheck": "WRANGLER_LOG_PATH=.wrangler/logs wrangler types ./worker-configuration.d.ts --config wrangler.jsonc --env-file .dev.vars.example --check && astro check && tsc -p tsconfig.json --noEmit"
}
```

Keep existing dependencies in place for now. Vinext and RSC dependencies are removed in Slice 7 after parity is verified.

- [x] **Step 3: Create Astro config**

Create `apps/web/astro.config.mjs`:

```js
import { fileURLToPath } from "node:url";

import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

const persistStatePath = process.env.DATAMIX_PERSIST_TO?.trim();

export default defineConfig({
  adapter: cloudflare({
    imageService: "cloudflare-binding",
    imagesBindingName: "IMAGES",
    persistState: persistStatePath ? { path: persistStatePath } : undefined,
  }),
  integrations: [react()],
  output: "server",
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL(".", import.meta.url)),
      },
    },
  },
});
```

- [x] **Step 4: Create the root layout**

Create `apps/web/src/layouts/DatamixRootLayout.astro`:

```astro
---
import "../../styles/globals.css";

const initialPageCanvasStyle = "background-color: var(--page-canvas, #080f1f)";
---

<!doctype html>
<html lang="en" style={initialPageCanvasStyle}>
  <body style={initialPageCanvasStyle}>
    <slot />
  </body>
</html>
```

- [x] **Step 5: Create the root splash page**

Create `apps/web/src/pages/index.astro`:

```astro
---
import { datamixProduct } from "@datamix/core";
import { Blocks } from "lucide-react";

import DatamixRootLayout from "../layouts/DatamixRootLayout.astro";
---

<DatamixRootLayout>
  <main
    class="flex min-h-svh items-center justify-center bg-[var(--sidebar)] px-6 py-8"
    data-page-canvas="sidebar"
  >
    <a
      aria-label={`Open ${datamixProduct.name} admin`}
      class="flex items-center gap-4 text-white opacity-85 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-300/50"
      href="/admin"
    >
      <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]">
        <Blocks aria-hidden="true" className="h-7 w-7 text-blue-100" />
      </span>
      <span class="font-heading text-xl font-extrabold tracking-wide text-white">
        {datamixProduct.name.toUpperCase()}
      </span>
    </a>
  </main>
</DatamixRootLayout>
```

- [x] **Step 6: Create the not-found page**

Create `apps/web/src/pages/404.astro`:

```astro
---
import { datamixProduct } from "@datamix/core";

import DatamixRootLayout from "../layouts/DatamixRootLayout.astro";
---

<DatamixRootLayout>
  <main class="flex min-h-svh items-center justify-center bg-[var(--muted)] px-6 py-8" data-page-canvas="muted">
    <div class="text-center">
      <p class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {datamixProduct.name}
      </p>
      <h1 class="mt-3 text-3xl font-bold text-foreground">Page not found</h1>
      <a class="mt-6 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline" href="/admin">
        Open admin
      </a>
    </div>
  </main>
</DatamixRootLayout>
```

- [x] **Step 7: Update Wrangler for Astro Workers**

Modify `apps/web/wrangler.jsonc`:

```jsonc
{
  "$schema": "../../node_modules/wrangler/config-schema.json",
  "name": "datamix-app",
  "main": "@astrojs/cloudflare/entrypoints/server",
  "compatibility_date": "2026-05-06",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": "dist",
    "binding": "ASSETS"
  }
}
```

Keep the existing `vars`, `images`, `d1_databases`, and `r2_buckets` blocks exactly as they are.

- [x] **Step 8: Update TypeScript include paths**

Modify `apps/web/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "lib": ["DOM", "DOM.Iterable", "ES2023"],
    "paths": {
      "@/*": ["./*"]
    },
    "rootDir": ".",
    "types": ["node"],
    "tsBuildInfoFile": "./tsconfig.tsbuildinfo"
  },
  "include": [
    ".astro/types.d.ts",
    "src/**/*.astro",
    "src/**/*.ts",
    "src/**/*.tsx",
    "app/admin/_components/**/*.tsx",
    "app/admin/_lib/**/*.ts",
    "app/admin/_screens/**/*.tsx",
    "app/admin/_workspace/**/*.ts",
    "app/admin/_workspace/**/*.tsx",
    "components/**/*.tsx",
    "lib/**/*.ts",
    "server/**/*.d.ts",
    "server/**/*.ts",
    "styles/**/*.css",
    "types/**/*.d.ts",
    "worker-configuration.d.ts"
  ],
  "exclude": [
    "dist",
    "app/api/**",
    "app/**/page.tsx",
    "app/layout.tsx",
    "worker/index.ts",
    "vite.config.ts"
  ]
}
```

- [x] **Step 9: Build the foundation**

Run:

```bash
npm run build --workspace @datamix/web
```

Expected:

```text
astro
```

The exact output can vary. The pass condition is exit code `0`.

- [x] **Step 10: Commit Slice 1**

Run:

```bash
git add package.json package-lock.json apps/web/package.json apps/web/astro.config.mjs apps/web/src apps/web/tsconfig.json apps/web/wrangler.jsonc
git commit -m "chore: add astro worker foundation"
```

---

## Slice 2: Core Runtime Adapter And Auth Context

**Goal:** Add adapter helpers and migrate the smallest API set needed for health, auth, setup, and admin session behavior.

**Files:**

- Create: `apps/web/server/routes/astro.ts`
- Create: `apps/web/src/pages/api/health.ts`
- Create: `apps/web/src/pages/api/index.ts`
- Create: `apps/web/src/pages/api/auth/[...auth].ts`
- Create: `apps/web/src/pages/api/admin/session.ts`
- Create: `apps/web/src/pages/api/admin/setup/status.ts`
- Modify: `apps/web/server/auth.ts`
- Modify: `apps/web/server/routes/auth-handlers.ts`
- Test: build and targeted curl requests

- [x] **Step 1: Create Astro route adapter helpers**

Create `apps/web/server/routes/astro.ts`:

```ts
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
```

- [x] **Step 2: Refactor auth to accept `ExecutionContext`**

Modify `apps/web/server/auth.ts` by removing:

```ts
import { getRequestExecutionContext } from "vinext/shims/request-context";
```

Change the options type in `createAuthOptions`:

```ts
export function createAuthOptions(
  env: DatamixBindings,
  options?: {
    baseURL?: string;
    executionContext?: ExecutionContext;
  },
): BetterAuthOptions {
```

Change the background task handler:

```ts
    advanced: {
      backgroundTasks: {
        handler(promise) {
          if (options?.executionContext) {
            options.executionContext.waitUntil(promise);
            return;
          }

          void promise;
        },
      },
    },
```

Change `createAuth` options:

```ts
export function createAuth(
  env: DatamixBindings,
  options?: {
    baseURL?: string;
    executionContext?: ExecutionContext;
  },
) {
  return betterAuth(createAuthOptions(env, options));
}
```

- [x] **Step 3: Pass execution context from auth handler**

Modify `apps/web/server/routes/auth-handlers.ts`:

```ts
import { AuthConfigError } from "../env";
import { createAuth } from "../auth";
import { getDatamixEnv, jsonResponse, withAdminCors } from "./http";

export async function handleAuth(
  request: Request,
  options?: {
    executionContext?: ExecutionContext;
  },
) {
  const env = getDatamixEnv();

  try {
    const response = await createAuth(env, {
      baseURL: new URL(request.url).origin,
      executionContext: options?.executionContext,
    }).handler(request);

    return withAdminCors(request, response);
  } catch (error) {
    if (error instanceof AuthConfigError) {
      return withAdminCors(request, jsonResponse({ error: error.message }, 503));
    }

    throw error;
  }
}
```

- [x] **Step 4: Port core API endpoints**

Create `apps/web/src/pages/api/health.ts`:

```ts
import { getHealth } from "@/server/routes/status-handlers";
import { defineAstroRequestRoute } from "@/server/routes/astro";

export const prerender = false;

export const GET = defineAstroRequestRoute(getHealth);
```

Create `apps/web/src/pages/api/index.ts`:

```ts
import { getApiIndex } from "@/server/routes/status-handlers";
import { defineAstroRequestRoute } from "@/server/routes/astro";

export const prerender = false;

export const GET = defineAstroRequestRoute(getApiIndex);
```

Create `apps/web/src/pages/api/auth/[...auth].ts`:

```ts
import type { APIRoute } from "astro";

import { handleAuth } from "@/server/routes/auth-handlers";
import { adminOptions } from "@/server/routes/http";

export const prerender = false;

export const GET = (async (context) => {
  return handleAuth(context.request, {
    executionContext: context.locals.cfContext,
  });
}) satisfies APIRoute;

export const POST = GET;

export const OPTIONS = (async ({ request }) => {
  return adminOptions(request);
}) satisfies APIRoute;
```

Create `apps/web/src/pages/api/admin/session.ts`:

```ts
import { getAdminSession } from "@/server/routes/admin-handlers";
import { defineAstroRequestRoute } from "@/server/routes/astro";
import { adminOptions } from "@/server/routes/http";

export const prerender = false;

export const GET = defineAstroRequestRoute(getAdminSession);
export const OPTIONS = defineAstroRequestRoute(adminOptions);
```

Create `apps/web/src/pages/api/admin/setup/status.ts`:

```ts
import { getSetupStatus } from "@/server/routes/status-handlers";
import { defineAstroRequestRoute } from "@/server/routes/astro";
import { adminOptions } from "@/server/routes/http";

export const prerender = false;

export const GET = defineAstroRequestRoute(getSetupStatus);
export const OPTIONS = defineAstroRequestRoute(adminOptions);
```

- [x] **Step 5: Build and typecheck the core adapter**

Run:

```bash
npm run typecheck --workspace @datamix/web
npm run build --workspace @datamix/web
```

Expected: both commands exit `0`.

- [x] **Step 6: Commit Slice 2**

Run:

```bash
git add apps/web/server/auth.ts apps/web/server/routes/auth-handlers.ts apps/web/server/routes/astro.ts apps/web/src/pages/api apps/web/tsconfig.json
git commit -m "feat: add astro api adapter"
```

---

## Slice 3: Full API Route Parity

**Goal:** Port every App Router API route to Astro endpoints while keeping existing route handler behavior unchanged.

**Files:**

- Create: `apps/web/src/pages/api/**`
- Test: build, typecheck, smoke API coverage

**Route Mapping:**

| App Router route | Astro endpoint | Methods |
| --- | --- | --- |
| `app/api/media/object/[...storageKey]/route.ts` | `src/pages/api/media/object/[...storageKey].ts` | `GET`, `OPTIONS` |
| `app/api/collections/route.ts` | `src/pages/api/collections.ts` | `GET`, `OPTIONS` |
| `app/api/collections/[name]/route.ts` | `src/pages/api/collections/[name].ts` | `GET`, `OPTIONS` |
| `app/api/collections/[name]/records/route.ts` | `src/pages/api/collections/[name]/records.ts` | `GET`, `POST`, `OPTIONS` |
| `app/api/collections/[name]/records/[id]/route.ts` | `src/pages/api/collections/[name]/records/[id].ts` | `GET`, `PUT`, `DELETE`, `OPTIONS` |
| `app/api/admin/collections/route.ts` | `src/pages/api/admin/collections.ts` | `GET`, `OPTIONS` |
| `app/api/admin/collections/[name]/route.ts` | `src/pages/api/admin/collections/[name].ts` | `GET`, `OPTIONS` |
| `app/api/admin/collections/[name]/records/route.ts` | `src/pages/api/admin/collections/[name]/records.ts` | `GET`, `POST`, `OPTIONS` |
| `app/api/admin/collections/[name]/records/[id]/route.ts` | `src/pages/api/admin/collections/[name]/records/[id].ts` | `GET`, `PUT`, `DELETE`, `OPTIONS` |
| `app/api/admin/collection-definitions/route.ts` | `src/pages/api/admin/collection-definitions.ts` | `GET`, `OPTIONS` |
| `app/api/admin/collection-definitions/[name]/route.ts` | `src/pages/api/admin/collection-definitions/[name].ts` | `GET`, `PUT`, `OPTIONS` |
| `app/api/admin/records/[name]/route.ts` | `src/pages/api/admin/records/[name].ts` | `GET`, `POST`, `OPTIONS` |
| `app/api/admin/records/[name]/[id]/route.ts` | `src/pages/api/admin/records/[name]/[id].ts` | `PUT`, `OPTIONS` |
| `app/api/admin/media/assets/route.ts` | `src/pages/api/admin/media/assets.ts` | `GET`, `POST`, `OPTIONS` |
| `app/api/admin/users/route.ts` | `src/pages/api/admin/users.ts` | `GET`, `OPTIONS` |
| `app/api/admin/users/[id]/role/route.ts` | `src/pages/api/admin/users/[id]/role.ts` | `PUT`, `OPTIONS` |
| `app/api/admin/roles/route.ts` | `src/pages/api/admin/roles.ts` | `GET`, `OPTIONS` |
| `app/api/admin/roles/[id]/route.ts` | `src/pages/api/admin/roles/[id].ts` | `PUT`, `OPTIONS` |
| `app/api/admin/api-keys/route.ts` | `src/pages/api/admin/api-keys.ts` | `GET`, `POST`, `OPTIONS` |
| `app/api/admin/api-keys/[id]/route.ts` | `src/pages/api/admin/api-keys/[id].ts` | `PUT`, `OPTIONS` |
| `app/api/admin/api-keys/[id]/revoke/route.ts` | `src/pages/api/admin/api-keys/[id]/revoke.ts` | `POST`, `OPTIONS` |
| `app/api/admin/invites/route.ts` | `src/pages/api/admin/invites.ts` | `POST`, `OPTIONS` |
| `app/api/admin/account/route.ts` | `src/pages/api/admin/account.ts` | `PUT`, `OPTIONS` |

- [ ] **Step 1: Port public collection endpoints**

Use this exact pattern for dynamic handlers:

```ts
import {
  createPublicCollectionRecord,
  listPublicCollectionRecords,
} from "@/server/routes/public-collection-handlers";
import { defineAstroRoute, defineAstroRequestRoute } from "@/server/routes/astro";
import { publicJsonOptions } from "@/server/routes/http";

export const prerender = false;

export const GET = defineAstroRoute(listPublicCollectionRecords);
export const POST = defineAstroRoute(createPublicCollectionRecord);
export const OPTIONS = defineAstroRequestRoute(publicJsonOptions);
```

Use `defineAstroRequestRoute` for routes with no params and `defineAstroRoute` for routes with params.

- [ ] **Step 2: Port admin collection and record endpoints**

Use this exact pattern for admin dynamic handlers:

```ts
import {
  createAdminCollectionRecord,
  listAdminCollectionRecords,
} from "@/server/routes/admin-handlers";
import { defineAstroRoute, defineAstroRequestRoute } from "@/server/routes/astro";
import { adminOptions } from "@/server/routes/http";

export const prerender = false;

export const GET = defineAstroRoute(listAdminCollectionRecords);
export const POST = defineAstroRoute(createAdminCollectionRecord);
export const OPTIONS = defineAstroRequestRoute(adminOptions);
```

- [ ] **Step 3: Port admin singleton endpoints**

Use this exact pattern for admin routes with no params:

```ts
import { listAdminUsers } from "@/server/routes/admin-handlers";
import { defineAstroRequestRoute } from "@/server/routes/astro";
import { adminOptions } from "@/server/routes/http";

export const prerender = false;

export const GET = defineAstroRequestRoute(listAdminUsers);
export const OPTIONS = defineAstroRequestRoute(adminOptions);
```

- [ ] **Step 4: Port media object endpoint**

Create `apps/web/src/pages/api/media/object/[...storageKey].ts`:

```ts
import { getPublicMediaObject } from "@/server/routes/media-handlers";
import { defineAstroRequestRoute } from "@/server/routes/astro";
import { publicMediaOptions } from "@/server/routes/http";

export const prerender = false;

export const GET = defineAstroRequestRoute(getPublicMediaObject);
export const OPTIONS = defineAstroRequestRoute(publicMediaOptions);
```

- [ ] **Step 5: Verify route inventory**

Run:

```bash
rg --files apps/web/src/pages/api | sort
```

Expected: every Astro endpoint in the route mapping table is present.

- [ ] **Step 6: Build and typecheck full API parity**

Run:

```bash
npm run typecheck --workspace @datamix/web
npm run build --workspace @datamix/web
```

Expected: both commands exit `0`.

- [ ] **Step 7: Commit Slice 3**

Run:

```bash
git add apps/web/src/pages/api
git commit -m "feat: port api routes to astro"
```

---

## Slice 4: Admin React Islands And Page Routes

**Goal:** Recreate all current admin URLs as Astro pages that mount existing React screens client-only.

**Files:**

- Create: `apps/web/src/pages/admin/**/*.astro`
- Create: `apps/web/src/admin-routes/*.tsx`
- Modify: `apps/web/app/admin/_screens/admin-home.tsx`
- Modify: `apps/web/app/admin/_components/admin-frame.tsx`
- Test: build and user preview verification

**Admin Route Mapping:**

| Current URL | Astro file | React screen |
| --- | --- | --- |
| `/admin` | `src/pages/admin/index.astro` | `AdminHomeRoute` |
| `/admin/schema` | `src/pages/admin/schema/index.astro` | `SchemaOverviewRoute` |
| `/admin/schema/new` | `src/pages/admin/schema/new.astro` | `SchemaBuilderRoute` with `mode="new"` |
| `/admin/schema/[schemaId]` | `src/pages/admin/schema/[schemaId].astro` | `SchemaBuilderRoute` with `mode="edit"` |
| `/admin/content` | `src/pages/admin/content/index.astro` | `ContentIndexRoute` |
| `/admin/content/new` | `src/pages/admin/content/new.astro` | `ContentEditorRoute` with `mode="new"` |
| `/admin/content/[schemaId]/[recordId]` | `src/pages/admin/content/[schemaId]/[recordId].astro` | `ContentEditorRoute` with `mode="edit"` |
| `/admin/media` | `src/pages/admin/media.astro` | `MediaLibraryRoute` |
| `/admin/team` | `src/pages/admin/team.astro` | `TeamAndRolesRoute` |
| `/admin/settings` | `src/pages/admin/settings.astro` | `SettingsApiKeysRoute` |
| `/admin/account` | `src/pages/admin/account.astro` | `UserAccountRoute` |
| `/admin/setup` | `src/pages/admin/setup.astro` | `SetupRoute` |
| `/admin/login` | `src/pages/admin/login.astro` | `LoginRoute` |
| `/admin/forgot-password` | `src/pages/admin/forgot-password.astro` | `ForgotPasswordRoute` |
| `/admin/reset-password` | `src/pages/admin/reset-password.astro` | `ResetPasswordRoute` |

- [ ] **Step 1: Replace `next/link` in retained React components**

In `apps/web/app/admin/_screens/admin-home.tsx`, replace:

```ts
import Link from "next/link";
```

with no import, and replace each `<Link href={value} prefetch={true}>...</Link>` with:

```tsx
<a href={value}>...</a>
```

Keep the existing `className`, `aria-*`, and child content on the anchor.

In `apps/web/app/admin/_components/admin-frame.tsx`, make the same replacement.

- [ ] **Step 2: Create admin React island wrappers**

Create `apps/web/src/admin-routes/workspace-routes.tsx`:

```tsx
import { AdminHomeRoute } from "@/app/admin/_screens/admin-home";
import { ContentEditorRoute } from "@/app/admin/_screens/content-editor";
import { ContentIndexRoute } from "@/app/admin/_screens/content-index";
import { MediaLibraryRoute } from "@/app/admin/_screens/media-library";
import { SchemaBuilderRoute } from "@/app/admin/_screens/schema-builder";
import { SchemaOverviewRoute } from "@/app/admin/_screens/schema-overview";
import { SettingsApiKeysRoute } from "@/app/admin/_screens/settings-api-keys";
import { TeamAndRolesRoute } from "@/app/admin/_screens/team-and-roles";
import { UserAccountRoute } from "@/app/admin/_screens/user-account";
import { AdminWorkspacePage } from "@/app/admin/_workspace/admin-workspace-page";

export function AdminHomeIsland() {
  return (
    <AdminWorkspacePage>
      <AdminHomeRoute />
    </AdminWorkspacePage>
  );
}

export function SchemaOverviewIsland() {
  return (
    <AdminWorkspacePage>
      <SchemaOverviewRoute />
    </AdminWorkspacePage>
  );
}

export function NewSchemaIsland() {
  return (
    <AdminWorkspacePage>
      <SchemaBuilderRoute mode="new" />
    </AdminWorkspacePage>
  );
}

export function SchemaDetailIsland({ schemaId }: { schemaId: string }) {
  return (
    <AdminWorkspacePage>
      <SchemaBuilderRoute mode="edit" schemaId={schemaId} />
    </AdminWorkspacePage>
  );
}

export function ContentIndexIsland() {
  return (
    <AdminWorkspacePage>
      <ContentIndexRoute />
    </AdminWorkspacePage>
  );
}

export function NewContentIsland() {
  return (
    <AdminWorkspacePage>
      <ContentEditorRoute mode="new" />
    </AdminWorkspacePage>
  );
}

export function ContentRecordIsland({
  recordId,
  schemaId,
}: {
  recordId: string;
  schemaId: string;
}) {
  return (
    <AdminWorkspacePage>
      <ContentEditorRoute mode="edit" recordId={recordId} schemaId={schemaId} />
    </AdminWorkspacePage>
  );
}

export function MediaIsland() {
  return (
    <AdminWorkspacePage>
      <MediaLibraryRoute />
    </AdminWorkspacePage>
  );
}

export function TeamIsland() {
  return (
    <AdminWorkspacePage>
      <TeamAndRolesRoute />
    </AdminWorkspacePage>
  );
}

export function SettingsIsland() {
  return (
    <AdminWorkspacePage>
      <SettingsApiKeysRoute />
    </AdminWorkspacePage>
  );
}

export function AccountIsland() {
  return (
    <AdminWorkspacePage>
      <UserAccountRoute />
    </AdminWorkspacePage>
  );
}
```

Create `apps/web/src/admin-routes/auth-routes.tsx`:

```tsx
import { ForgotPasswordRoute } from "@/app/admin/_screens/forgot-password";
import { LoginRoute } from "@/app/admin/_screens/login";
import { ResetPasswordRoute } from "@/app/admin/_screens/reset-password";
import { SetupRoute } from "@/app/admin/_screens/setup";

export function LoginIsland() {
  return <LoginRoute />;
}

export function SetupIsland() {
  return <SetupRoute />;
}

export function ForgotPasswordIsland() {
  return <ForgotPasswordRoute />;
}

export function ResetPasswordIsland() {
  return <ResetPasswordRoute />;
}
```

- [ ] **Step 3: Create `/admin` page**

Create `apps/web/src/pages/admin/index.astro`:

```astro
---
import { AdminHomeIsland } from "@/src/admin-routes/workspace-routes";

import DatamixRootLayout from "../../layouts/DatamixRootLayout.astro";
---

<DatamixRootLayout>
  <AdminHomeIsland client:only="react" />
</DatamixRootLayout>
```

- [ ] **Step 4: Create static admin route pages**

Use this pattern for static workspace routes:

```astro
---
import { MediaIsland } from "@/src/admin-routes/workspace-routes";

import DatamixRootLayout from "../layouts/DatamixRootLayout.astro";
---

<DatamixRootLayout>
  <MediaIsland client:only="react" />
</DatamixRootLayout>
```

Adjust the relative layout import for each file:

- `src/pages/admin/media.astro`: `../layouts/DatamixRootLayout.astro`
- `src/pages/admin/team.astro`: `../layouts/DatamixRootLayout.astro`
- `src/pages/admin/settings.astro`: `../layouts/DatamixRootLayout.astro`
- `src/pages/admin/account.astro`: `../layouts/DatamixRootLayout.astro`
- `src/pages/admin/schema/index.astro`: `../../layouts/DatamixRootLayout.astro`
- `src/pages/admin/content/index.astro`: `../../layouts/DatamixRootLayout.astro`

- [ ] **Step 5: Create auth/setup pages**

Use this pattern for auth pages:

```astro
---
import { LoginIsland } from "@/src/admin-routes/auth-routes";

import DatamixRootLayout from "../layouts/DatamixRootLayout.astro";
---

<DatamixRootLayout>
  <LoginIsland client:only="react" />
</DatamixRootLayout>
```

Create:

- `src/pages/admin/login.astro`
- `src/pages/admin/setup.astro`
- `src/pages/admin/forgot-password.astro`
- `src/pages/admin/reset-password.astro`

- [ ] **Step 6: Create dynamic schema page**

Create `apps/web/src/pages/admin/schema/[schemaId].astro`:

```astro
---
import { SchemaDetailIsland } from "@/src/admin-routes/workspace-routes";

import DatamixRootLayout from "../../layouts/DatamixRootLayout.astro";

const { schemaId } = Astro.params;
---

<DatamixRootLayout>
  <SchemaDetailIsland client:only="react" schemaId={schemaId ?? ""} />
</DatamixRootLayout>
```

- [ ] **Step 7: Create new schema page**

Create `apps/web/src/pages/admin/schema/new.astro`:

```astro
---
import { NewSchemaIsland } from "@/src/admin-routes/workspace-routes";

import DatamixRootLayout from "../../layouts/DatamixRootLayout.astro";
---

<DatamixRootLayout>
  <NewSchemaIsland client:only="react" />
</DatamixRootLayout>
```

- [ ] **Step 8: Create content record pages**

Create `apps/web/src/pages/admin/content/new.astro`:

```astro
---
import { NewContentIsland } from "@/src/admin-routes/workspace-routes";

import DatamixRootLayout from "../../layouts/DatamixRootLayout.astro";
---

<DatamixRootLayout>
  <NewContentIsland client:only="react" />
</DatamixRootLayout>
```

Create `apps/web/src/pages/admin/content/[schemaId]/[recordId].astro`:

```astro
---
import { ContentRecordIsland } from "@/src/admin-routes/workspace-routes";

import DatamixRootLayout from "../../../layouts/DatamixRootLayout.astro";

const { recordId, schemaId } = Astro.params;
---

<DatamixRootLayout>
  <ContentRecordIsland
    client:only="react"
    recordId={recordId ?? ""}
    schemaId={schemaId ?? ""}
  />
</DatamixRootLayout>
```

- [ ] **Step 9: Build admin pages**

Run:

```bash
npm run typecheck --workspace @datamix/web
npm run build --workspace @datamix/web
```

Expected: both commands exit `0`.

- [ ] **Step 10: Ask user to verify**

Do not use Browser. Ask the user to verify these URLs after starting the dev server:

```text
http://127.0.0.1:3000/
http://127.0.0.1:3000/admin
http://127.0.0.1:3000/admin/login
http://127.0.0.1:3000/admin/setup
```

- [ ] **Step 11: Commit Slice 4**

Run:

```bash
git add apps/web/src/admin-routes apps/web/src/pages/admin apps/web/app/admin/_screens/admin-home.tsx apps/web/app/admin/_components/admin-frame.tsx
git commit -m "feat: port admin pages to astro"
```

---

## Slice 5: Client Runtime Environment Cleanup

**Goal:** Remove client reliance on `process.env` and align public config with Astro/Vite.

**Files:**

- Modify: `apps/web/lib/runtime.ts`
- Modify: `apps/web/wrangler.jsonc`
- Modify: `apps/web/.dev.vars.example` if present
- Test: typecheck, build, smoke

- [ ] **Step 1: Add public Astro env vars**

In `apps/web/wrangler.jsonc`, add these vars next to the current `NEXT_PUBLIC_*` vars:

```jsonc
"PUBLIC_DATAMIX_APP_ENV": "production",
"PUBLIC_DATAMIX_APP_ORIGIN": "https://datamix.example",
```

Keep `NEXT_PUBLIC_APP_ENV` and `NEXT_PUBLIC_APP_ORIGIN` for one slice to avoid mixing env cleanup with route parity.

- [ ] **Step 2: Refactor client runtime env reader**

Replace `apps/web/lib/runtime.ts` with:

```ts
import {
  datamixEnvironments,
  defaultAdminPublicEnv,
  normalizeDatamixOrigin,
  type AdminPublicEnv,
  type DatamixEnvironment,
} from "@datamix/core";

type DatamixPublicImportMetaEnv = {
  PUBLIC_DATAMIX_APP_ENV?: string;
  PUBLIC_DATAMIX_APP_ORIGIN?: string;
};

function isDatamixEnvironment(value: string): value is DatamixEnvironment {
  return datamixEnvironments.includes(value as DatamixEnvironment);
}

function readPublicImportMetaEnv(): DatamixPublicImportMetaEnv {
  return import.meta.env as DatamixPublicImportMetaEnv;
}

export function readAdminPublicEnv(env: DatamixPublicImportMetaEnv): AdminPublicEnv {
  const appEnv = env.PUBLIC_DATAMIX_APP_ENV;
  const appOrigin = normalizeDatamixOrigin(
    env.PUBLIC_DATAMIX_APP_ORIGIN ?? defaultAdminPublicEnv.NEXT_PUBLIC_APP_ORIGIN,
    "PUBLIC_DATAMIX_APP_ORIGIN",
  );

  return {
    NEXT_PUBLIC_APP_ORIGIN: appOrigin,
    NEXT_PUBLIC_APP_ENV:
      appEnv && isDatamixEnvironment(appEnv)
        ? appEnv
        : defaultAdminPublicEnv.NEXT_PUBLIC_APP_ENV,
  };
}

export const adminPublicEnv = readAdminPublicEnv(readPublicImportMetaEnv());
export const datamixAdminBasePath = "/admin";
export const datamixAdminApiBasePath = "/api/admin";

export function getAdminAppOrigin() {
  if (typeof window !== "undefined" && window.location.origin) {
    return normalizeDatamixOrigin(window.location.origin, "window.location.origin");
  }

  return adminPublicEnv.NEXT_PUBLIC_APP_ORIGIN;
}

export function buildDatamixAppUrl(pathname: string) {
  return new URL(pathname, getAdminAppOrigin()).toString();
}

export function buildDatamixAdminPath(pathname = "") {
  if (!pathname || pathname === "/") {
    return datamixAdminBasePath;
  }

  return `${datamixAdminBasePath}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

export function buildDatamixAdminApiUrl(pathname = "") {
  if (!pathname || pathname === "/") {
    return buildDatamixAppUrl(datamixAdminApiBasePath);
  }

  const normalizedPathname = pathname.startsWith("/") ? pathname : `/${pathname}`;

  return buildDatamixAppUrl(`${datamixAdminApiBasePath}${normalizedPathname}`);
}
```

- [ ] **Step 3: Build after env cleanup**

Run:

```bash
npm run typecheck --workspace @datamix/web
npm run build --workspace @datamix/web
```

Expected: both commands exit `0`.

- [ ] **Step 4: Commit Slice 5**

Run:

```bash
git add apps/web/lib/runtime.ts apps/web/wrangler.jsonc apps/web/.dev.vars.example
git commit -m "fix: align public runtime env with astro"
```

If `apps/web/.dev.vars.example` does not exist or does not contain public env vars, omit it from `git add`.

---

## Slice 6: Smoke Harness And Local Development Parity

**Goal:** Make existing smoke coverage start the Astro dev server and verify the migrated app from a clean local Worker state.

**Files:**

- Modify: `tests/smoke/datamix-smoke.mjs`
- Modify: `apps/web/README.md`
- Modify: `docs/local-development.md`
- Test: `npm run smoke`

- [ ] **Step 1: Inspect smoke server startup**

Run:

```bash
rg -n "vinext|npm run dev|Ready|Local|127.0.0.1|3000" tests/smoke/datamix-smoke.mjs apps/web/README.md docs/local-development.md
```

Expected: locations that mention Vinext or dev server assumptions.

- [ ] **Step 2: Update smoke command only where needed**

In `tests/smoke/datamix-smoke.mjs`, keep the existing `npm run dev --workspace @datamix/web` process model if present. The root command now delegates to Astro through `apps/web/package.json`.

If the smoke test waits for a Vinext-specific log line, replace that wait with the existing HTTP readiness check against:

```text
http://127.0.0.1:3000/api/health
```

Do not add Playwright or Browser checks in this slice.

- [ ] **Step 3: Update local docs**

In `apps/web/README.md` and `docs/local-development.md`, replace framework-specific wording:

```text
Unified Vinext App Router Worker
```

with:

```text
Unified Astro Cloudflare Worker
```

Replace:

```text
App Router route handlers live under `app/api/**`
```

with:

```text
Astro API endpoints live under `src/pages/api/**`
```

Replace:

```text
routed admin pages live under `app/admin/**`
```

with:

```text
Astro admin route wrappers live under `src/pages/admin/**`; React admin screens remain under `app/admin/_screens/**`.
```

- [ ] **Step 4: Run full smoke**

Run:

```bash
npm run smoke
```

Expected: exit code `0`.

- [ ] **Step 5: Commit Slice 6**

Run:

```bash
git add tests/smoke/datamix-smoke.mjs apps/web/README.md docs/local-development.md
git commit -m "test: verify astro local runtime"
```

---

## Slice 7: Remove Vinext And App Router Shell

**Goal:** Remove obsolete framework files and dependencies after Astro parity works.

**Files:**

- Delete: `apps/web/worker/index.ts`
- Delete: `apps/web/vite.config.ts`
- Delete: `apps/web/next-env.d.ts`
- Delete: `apps/web/types/next-shims.d.ts`
- Delete: `apps/web/app/layout.tsx`
- Delete: `apps/web/app/page.tsx`
- Delete: `apps/web/app/api/**/route.ts`
- Delete: `apps/web/app/admin/**/page.tsx`
- Modify: `apps/web/package.json`
- Modify: `package-lock.json`
- Modify: `docs/architecture-overview.md`
- Modify: `docs/deploy-runtime-contract.md`
- Test: typecheck, build, smoke, git diff check

- [ ] **Step 1: Remove obsolete dependencies**

Run:

```bash
npm uninstall --workspace @datamix/web vinext @vitejs/plugin-rsc react-server-dom-webpack @cloudflare/vite-plugin
```

Expected: exit code `0` and `package-lock.json` updated.

- [ ] **Step 2: Delete obsolete shell files**

Run:

```bash
rm -f apps/web/worker/index.ts
rm -f apps/web/vite.config.ts
rm -f apps/web/next-env.d.ts
rm -f apps/web/types/next-shims.d.ts
rm -f apps/web/app/layout.tsx
rm -f apps/web/app/page.tsx
```

- [ ] **Step 3: Delete App Router API wrappers**

Run:

```bash
find apps/web/app/api -name route.ts -delete
find apps/web/app/api -type d -empty -delete
```

- [ ] **Step 4: Delete App Router page wrappers**

Run:

```bash
find apps/web/app/admin -name page.tsx -delete
find apps/web/app/admin -type d -empty -delete
```

Do not delete directories beginning with `_`.

- [ ] **Step 5: Verify no Vinext or Next shell imports remain**

Run:

```bash
rg -n "vinext|next/link|next/server|next/navigation|next/headers|react-server-dom-webpack|@vitejs/plugin-rsc|@cloudflare/vite-plugin" apps/web package.json package-lock.json
```

Expected: no matches except historical docs that are intentionally updated in the next step.

- [ ] **Step 6: Update architecture docs**

In `docs/architecture-overview.md`, replace the runtime shape with:

```markdown
Datamix v0 is a Cloudflare-only content studio with a browser-first admin, JSON-first API endpoints, D1 for structured data, and R2 for media. The admin UI and API ship together as one Astro Cloudflare Worker on one domain.
```

Update the workspace map entry for `apps/web`:

```markdown
Unified Astro Cloudflare Worker. Astro route wrappers live under `src/pages/**`, private admin screens live under `app/admin/_screens/**`, shared server logic lives under `server/**`, and client request helpers live under `lib/**`.
```

In `docs/deploy-runtime-contract.md`, replace Vinext/App Router references with Astro Cloudflare Worker references and update build output references from `dist/client` to `dist`.

- [ ] **Step 7: Final verification**

Run:

```bash
npm run typecheck --workspace @datamix/web
npm run build --workspace @datamix/web
npm run smoke
git diff --check
```

Expected: every command exits `0`.

- [ ] **Step 8: Commit Slice 7**

Run:

```bash
git add package.json package-lock.json apps/web docs tests
git commit -m "chore: remove vinext app router shell"
```

---

## Final Acceptance Checklist

- [ ] `git branch --show-current` returns `astro`.
- [ ] `rg -n "vinext|next/link|next/server|next/navigation|react-server-dom-webpack|@vitejs/plugin-rsc" apps/web package.json package-lock.json` returns no active runtime references.
- [ ] `npm run typecheck --workspace @datamix/web` exits `0`.
- [ ] `npm run build --workspace @datamix/web` exits `0`.
- [ ] `npm run smoke` exits `0`.
- [ ] User manually verifies:
  - `/`
  - `/admin`
  - `/admin/login`
  - `/admin/setup`
  - One schema route
  - One content route
  - Media library upload/read if local test data allows it
- [ ] Docs describe Astro, not Vinext/App Router, as the app shell.

## Source Notes

- Astro Cloudflare adapter docs: `https://docs.astro.build/en/guides/integrations-guide/cloudflare/`
- Astro endpoints docs: `https://docs.astro.build/en/guides/endpoints/`
- Astro routing docs: `https://docs.astro.build/en/guides/routing/`
- Astro React integration docs: `https://docs.astro.build/en/guides/integrations-guide/react/`
- Astro directives docs for `client:only`: `https://docs.astro.build/en/reference/directives-reference/`
- Cloudflare Astro framework guide: `https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/`
