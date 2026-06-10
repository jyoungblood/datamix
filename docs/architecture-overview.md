# Architecture Overview

Datamix v0 is a Cloudflare-only content studio with a browser-first admin, JSON-first API routes, D1 for structured data, and R2 for media. The admin UI and API now ship together as one Vinext App Router Worker on one domain.

## Non-Negotiable Constraints

- Cloudflare-only is the product shape, not a temporary implementation detail.
- `apps/web` is the only app workspace and the only deployed Worker runtime.
- The Worker runtime is the only code allowed to touch `D1` and `R2`.
- Auth and session state live on the app origin and are consumed by same-origin browser requests.
- Collection schema definition and record edit form generation are the same system.
- Runtime contracts should stay stable unless a small enabling change is clearly worth it.

## Workspace Map

- `apps/web`
  Unified Vinext App Router Worker. UI routes live under `app/**`, API route handlers live under `app/api/**`, private admin screens live under `app/admin/_screens/**`, shared server logic lives under `server/**`, and client request helpers live under `lib/**`.
- `packages/core`
  Shared domain vocabulary for collections, RBAC, media, API keys, and runtime helpers. This package exists to keep contracts consistent, not to centralize everything by default.
- `packages/create-datamix`
  Secondary bootstrap CLI. It assembles a clean local template from this repo and helps contributors start a new Datamix workspace without changing the primary browser-first deployment story.
- `tests/smoke`
  End-to-end smoke harness that exercises first-run setup, login, collection CRUD, record CRUD, media, and public JSON routes against the unified app on port `3000`.
- `docs`
  Contributor-facing documentation. Update these docs when a runtime or onboarding contract changes.

## Runtime Shape

1. The browser loads Vinext App Router pages from `apps/web`.
2. The admin talks back to the same origin for auth, content, media, setup, users, roles, invites, and API keys.
3. App Router route handlers under `app/api/**` call shared helpers under `server/routes/**`.
4. Server modules under `server/**` persist structured data in D1 and binary media in R2.
5. Public content routes and media object routes still flow through the Worker so the browser never talks directly to D1 or R2.

## Where To Start Reading

- App entrypoints:
  [apps/web/app/page.tsx](/Users/jy/Desktop/projects/datamix/apps/web/app/page.tsx:1),
  [apps/web/app/admin/setup/page.tsx](/Users/jy/Desktop/projects/datamix/apps/web/app/admin/setup/page.tsx:1),
  [apps/web/app/admin/page.tsx](/Users/jy/Desktop/projects/datamix/apps/web/app/admin/page.tsx:1),
  [apps/web/app/admin/_screens/admin-home.tsx](/Users/jy/Desktop/projects/datamix/apps/web/app/admin/_screens/admin-home.tsx:1)
- Admin client helpers:
  [apps/web/lib/session.ts](/Users/jy/Desktop/projects/datamix/apps/web/lib/session.ts:1),
  [apps/web/lib/collection-definitions.ts](/Users/jy/Desktop/projects/datamix/apps/web/lib/collection-definitions.ts:1),
  [apps/web/lib/records.ts](/Users/jy/Desktop/projects/datamix/apps/web/lib/records.ts:1),
  [apps/web/lib/media.ts](/Users/jy/Desktop/projects/datamix/apps/web/lib/media.ts:1)
- API route handlers:
  [apps/web/app/api/route.ts](/Users/jy/Desktop/projects/datamix/apps/web/app/api/route.ts:1),
  [apps/web/app/api/health/route.ts](/Users/jy/Desktop/projects/datamix/apps/web/app/api/health/route.ts:1),
  [apps/web/app/api/auth/[...auth]/route.ts](/Users/jy/Desktop/projects/datamix/apps/web/app/api/auth/[...auth]/route.ts:1),
  [apps/web/app/api/collections/route.ts](/Users/jy/Desktop/projects/datamix/apps/web/app/api/collections/route.ts:1)
- Server route helpers:
  [apps/web/server/routes/http.ts](/Users/jy/Desktop/projects/datamix/apps/web/server/routes/http.ts:1),
  [apps/web/server/routes/admin-handlers.ts](/Users/jy/Desktop/projects/datamix/apps/web/server/routes/admin-handlers.ts:1),
  [apps/web/server/routes/public-collection-handlers.ts](/Users/jy/Desktop/projects/datamix/apps/web/server/routes/public-collection-handlers.ts:1),
  [apps/web/server/routes/media-handlers.ts](/Users/jy/Desktop/projects/datamix/apps/web/server/routes/media-handlers.ts:1)
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
  Collection definitions are persisted once, then used to generate record editing and CRUD behavior. If a schema change affects stored shape, expect to touch `packages/core`, `apps/web/server/collections.ts`, `apps/web/server/records.ts`, and the admin request/render path together.
- Media:
  Uploads create D1 metadata and store bytes in R2. Object reads and image transform requests stay behind Worker routes.
- RBAC and API keys:
  Permissions are defined in `packages/core` and enforced in the app server layer. The admin reflects those capabilities rather than re-implementing policy on its own.

## Common Change Paths

- Changing public or session auth behavior:
  Start in [apps/web/server/auth.ts](/Users/jy/Desktop/projects/datamix/apps/web/server/auth.ts:1), [apps/web/server/routes/auth-handlers.ts](/Users/jy/Desktop/projects/datamix/apps/web/server/routes/auth-handlers.ts:1), [apps/web/server/routes/admin-auth.ts](/Users/jy/Desktop/projects/datamix/apps/web/server/routes/admin-auth.ts:1), and [apps/web/lib/session.ts](/Users/jy/Desktop/projects/datamix/apps/web/lib/session.ts:1).
- Changing collection schema or generated record behavior:
  Start in [packages/core/src/collections.ts](/Users/jy/Desktop/projects/datamix/packages/core/src/collections.ts:1), [apps/web/server/collections.ts](/Users/jy/Desktop/projects/datamix/apps/web/server/collections.ts:1), [apps/web/server/records.ts](/Users/jy/Desktop/projects/datamix/apps/web/server/records.ts:1), [apps/web/app/admin/_screens/schema-builder.tsx](/Users/jy/Desktop/projects/datamix/apps/web/app/admin/_screens/schema-builder.tsx:1), and [apps/web/app/admin/_screens/content-editor.tsx](/Users/jy/Desktop/projects/datamix/apps/web/app/admin/_screens/content-editor.tsx:1).
- Changing media behavior:
  Start in [packages/core/src/media.ts](/Users/jy/Desktop/projects/datamix/packages/core/src/media.ts:1), [apps/web/server/media.ts](/Users/jy/Desktop/projects/datamix/apps/web/server/media.ts:1), [apps/web/server/routes/media-handlers.ts](/Users/jy/Desktop/projects/datamix/apps/web/server/routes/media-handlers.ts:1), and [apps/web/lib/media.ts](/Users/jy/Desktop/projects/datamix/apps/web/lib/media.ts:1).
- Changing roles, invites, users, or API keys:
  Start in [packages/core/src/rbac.ts](/Users/jy/Desktop/projects/datamix/packages/core/src/rbac.ts:1), [packages/core/src/api-keys.ts](/Users/jy/Desktop/projects/datamix/packages/core/src/api-keys.ts:1), and the matching `apps/web/server/*` plus `apps/web/lib/*` modules.

## Code Shape Guidance

- Routed admin screens share `apps/web/app/admin/_workspace/admin-workspace-provider.tsx` and `apps/web/app/admin/_screens/admin-route-placeholder.tsx`; keep shared session, permission, refresh, and navigation behavior there instead of duplicating it in individual screens.
- `apps/web/server/routes/**` is the route assembly layer. Keep HTTP concerns there, and keep feature-specific data behavior in neighboring `apps/web/server/*.ts` modules.
- `packages/core` should stay deliberately lean. Add shared code only when multiple surfaces genuinely benefit from the same contract.

## Verification Expectations

- `npm run check`
- `npm run build`
- `npm run smoke`

If a change affects contributor setup, runtime boundaries, or route contracts, update the matching doc in `docs/` during the same slice.
