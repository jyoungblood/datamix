# Architecture Overview

Datamix v0 is a Cloudflare-only content studio with a browser-first admin, JSON-first API endpoints, D1 for structured data, and R2 for media. The admin UI and API ship together as one Astro Cloudflare Worker on one domain.

## Non-Negotiable Constraints

- Cloudflare-only is the product shape, not a temporary implementation detail.
- `apps/web` is the only app workspace and the only deployed Worker runtime.
- Runtime config has two contexts only: local development and the deployed Cloudflare app.
- The Worker runtime is the only code allowed to touch `D1` and `R2`.
- Auth and session state live on the app origin and are consumed by same-origin browser requests.
- Collection schema definition and record edit form generation are the same system.
- Runtime contracts should stay stable unless a small enabling change is clearly worth it.

## Workspace Map

- `apps/web`
  Unified Astro Cloudflare Worker. App source lives under `src/**`: Astro pages and API endpoints live under `src/pages/**`, retained React admin workspace code lives under `src/admin/**`, shared server logic lives under `src/server/**`, and client request helpers live under `src/lib/**`.
- `packages/core`
  Shared domain vocabulary for collections, RBAC, media, API keys, and runtime helpers. This package exists to keep contracts consistent, not to centralize everything by default.
- `packages/create-datamix`
  Secondary bootstrap CLI. It assembles a clean local template from this repo and helps contributors start a new Datamix workspace without changing the primary browser-first deployment story.
- `tests/smoke`
  End-to-end smoke harness that exercises first-run setup, login, collection CRUD, record CRUD, media, and public JSON routes against the unified app on port `3000`.
- `docs`
  Contributor-facing documentation. Update these docs when a runtime or onboarding contract changes.

## Runtime Shape

1. The browser loads Astro pages from `apps/web/src/pages/**`.
2. The admin talks back to the same origin for auth, content, media, setup, users, roles, invites, and API keys.
3. Astro endpoint wrappers under `src/pages/api/**` call shared helpers under `src/server/routes/**`.
4. Server modules under `src/server/**` persist structured data in D1 and binary media in R2.
5. Public content routes and media object routes still flow through the Worker so the browser never talks directly to D1 or R2.

## Where To Start Reading

- App entrypoints:
  [apps/web/src/pages/index.astro](/Users/jy/Desktop/projects/datamix/apps/web/src/pages/index.astro:1),
  [apps/web/src/pages/admin/setup.astro](/Users/jy/Desktop/projects/datamix/apps/web/src/pages/admin/setup.astro:1),
  [apps/web/src/pages/admin/index.astro](/Users/jy/Desktop/projects/datamix/apps/web/src/pages/admin/index.astro:1),
  [apps/web/src/admin/_screens/admin-home.tsx](/Users/jy/Desktop/projects/datamix/apps/web/src/admin/_screens/admin-home.tsx:1)
- Admin client helpers:
  [apps/web/src/lib/session.ts](/Users/jy/Desktop/projects/datamix/apps/web/src/lib/session.ts:1),
  [apps/web/src/lib/collection-definitions.ts](/Users/jy/Desktop/projects/datamix/apps/web/src/lib/collection-definitions.ts:1),
  [apps/web/src/lib/records.ts](/Users/jy/Desktop/projects/datamix/apps/web/src/lib/records.ts:1),
  [apps/web/src/lib/media.ts](/Users/jy/Desktop/projects/datamix/apps/web/src/lib/media.ts:1)
- API route handlers:
  [apps/web/src/pages/api/index.ts](/Users/jy/Desktop/projects/datamix/apps/web/src/pages/api/index.ts:1),
  [apps/web/src/pages/api/health.ts](/Users/jy/Desktop/projects/datamix/apps/web/src/pages/api/health.ts:1),
  [apps/web/src/pages/api/auth/[...auth].ts](/Users/jy/Desktop/projects/datamix/apps/web/src/pages/api/auth/[...auth].ts:1),
  [apps/web/src/pages/api/collections.ts](/Users/jy/Desktop/projects/datamix/apps/web/src/pages/api/collections.ts:1)
- Server route helpers:
  [apps/web/src/server/routes/http.ts](/Users/jy/Desktop/projects/datamix/apps/web/src/server/routes/http.ts:1),
  [apps/web/src/server/routes/admin-handlers.ts](/Users/jy/Desktop/projects/datamix/apps/web/src/server/routes/admin-handlers.ts:1),
  [apps/web/src/server/routes/public-collection-handlers.ts](/Users/jy/Desktop/projects/datamix/apps/web/src/server/routes/public-collection-handlers.ts:1),
  [apps/web/src/server/routes/media-handlers.ts](/Users/jy/Desktop/projects/datamix/apps/web/src/server/routes/media-handlers.ts:1)
- Shared contracts:
  [packages/core/src/index.ts](/Users/jy/Desktop/projects/datamix/packages/core/src/index.ts:1),
  [packages/core/src/collections.ts](/Users/jy/Desktop/projects/datamix/packages/core/src/collections.ts:1),
  [packages/core/src/rbac.ts](/Users/jy/Desktop/projects/datamix/packages/core/src/rbac.ts:1)
- Smoke coverage:
  [tests/smoke/datamix-smoke.mjs](/Users/jy/Desktop/projects/datamix/tests/smoke/datamix-smoke.mjs:1)

## Feature Ownership Today

- Auth and session flow:
  Better Auth is mounted under `/api/auth/*`. The admin checks session state through `/api/admin/*` routes and redirects between `/admin/setup`, `/admin/login`, and `/admin` based on those responses.
- Collections and records:
  Collection definitions are persisted once, then used to generate record editing and CRUD behavior. If a schema change affects stored shape, expect to touch `packages/core`, `apps/web/src/server/collections.ts`, `apps/web/src/server/records.ts`, and the admin request/render path together.
- Media:
  Uploads create D1 metadata and store bytes in R2. Object reads and image transform requests stay behind Worker routes.
- RBAC and API keys:
  Permissions are defined in `packages/core` and enforced in the app server layer. The admin reflects those capabilities rather than re-implementing policy on its own.

## Common Change Paths

- Changing public or session auth behavior:
  Start in [apps/web/src/server/auth.ts](/Users/jy/Desktop/projects/datamix/apps/web/src/server/auth.ts:1), [apps/web/src/server/routes/auth-handlers.ts](/Users/jy/Desktop/projects/datamix/apps/web/src/server/routes/auth-handlers.ts:1), [apps/web/src/server/routes/admin-auth.ts](/Users/jy/Desktop/projects/datamix/apps/web/src/server/routes/admin-auth.ts:1), and [apps/web/src/lib/session.ts](/Users/jy/Desktop/projects/datamix/apps/web/src/lib/session.ts:1).
- Changing collection schema or generated record behavior:
  Start in [packages/core/src/collections.ts](/Users/jy/Desktop/projects/datamix/packages/core/src/collections.ts:1), [apps/web/src/server/collections.ts](/Users/jy/Desktop/projects/datamix/apps/web/src/server/collections.ts:1), [apps/web/src/server/records.ts](/Users/jy/Desktop/projects/datamix/apps/web/src/server/records.ts:1), [apps/web/src/admin/_screens/schema-builder.tsx](/Users/jy/Desktop/projects/datamix/apps/web/src/admin/_screens/schema-builder.tsx:1), and [apps/web/src/admin/_screens/content-editor.tsx](/Users/jy/Desktop/projects/datamix/apps/web/src/admin/_screens/content-editor.tsx:1).
- Changing media behavior:
  Start in [packages/core/src/media.ts](/Users/jy/Desktop/projects/datamix/packages/core/src/media.ts:1), [apps/web/src/server/media.ts](/Users/jy/Desktop/projects/datamix/apps/web/src/server/media.ts:1), [apps/web/src/server/routes/media-handlers.ts](/Users/jy/Desktop/projects/datamix/apps/web/src/server/routes/media-handlers.ts:1), and [apps/web/src/lib/media.ts](/Users/jy/Desktop/projects/datamix/apps/web/src/lib/media.ts:1).
- Changing roles, invites, users, or API keys:
  Start in [packages/core/src/rbac.ts](/Users/jy/Desktop/projects/datamix/packages/core/src/rbac.ts:1), [packages/core/src/api-keys.ts](/Users/jy/Desktop/projects/datamix/packages/core/src/api-keys.ts:1), and the matching `apps/web/src/server/*` plus `apps/web/src/lib/*` modules.

## Code Shape Guidance

- Auth pages are Astro templates under `apps/web/src/pages/admin/**` using the shared auth card template and small DOM scripts.
- Authenticated admin pages render `apps/web/src/components/admin/AdminWorkspaceShell.astro`; retained React route bodies live under `apps/web/src/admin/**` and mount `apps/web/src/admin/_workspace/admin-workspace-provider.tsx` inside the workspace island.
- `apps/web/src/server/routes/**` is the route assembly layer. Keep HTTP concerns there, and keep feature-specific data behavior in neighboring `apps/web/src/server/*.ts` modules.
- `packages/core` should stay deliberately lean. Add shared code only when multiple surfaces genuinely benefit from the same contract.

## Verification Expectations

- `npm run check`
- `npm run build`
- `npm run smoke`

If a change affects contributor setup, runtime boundaries, or route contracts, update the matching doc in `docs/` during the same slice.
