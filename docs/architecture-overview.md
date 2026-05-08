# Architecture Overview

Datamix v0 is a Cloudflare-only content studio with a client-rendered admin, a JSON-first API Worker, D1 for structured data, and R2 for media. This document is the contributor map for how those parts fit together today.

## Non-Negotiable Constraints

- Cloudflare-only is the product shape, not a temporary implementation detail.
- The admin is a browser-first SPA served from Cloudflare Pages.
- The API Worker is the only runtime allowed to touch `D1` and `R2`.
- Auth and session state live on the API origin and are consumed from the SPA with credentialed `fetch`.
- Collection schema definition and record edit form generation are the same system.
- Runtime contracts should stay stable unless a small enabling change is clearly worth it.

## Workspace Map

- `apps/admin`
  Client-rendered Vinext app. Route files live in `pages/`, request helpers in `lib/`, and shared UI styles in `styles/`.
- `apps/api`
  Hono Worker. `src/app.ts` wires middleware and routes, while focused modules such as `auth.ts`, `collections.ts`, `records.ts`, `media.ts`, and `roles.ts` own feature logic.
- `packages/core`
  Shared domain vocabulary for collections, RBAC, media, API keys, and runtime helpers. This package exists to keep app boundaries honest, not to centralize everything by default.
- `tests/smoke`
  End-to-end smoke harness that exercises first-run setup, login, collection CRUD, record CRUD, media, and public JSON routes.
- `docs`
  Contributor-facing documentation. Update these docs when a runtime or onboarding contract changes.

## Runtime Shape

1. The browser loads the admin SPA from `apps/admin`.
2. The admin uses `NEXT_PUBLIC_API_ORIGIN` to talk to the API Worker over HTTP.
3. The API Worker handles auth, collection definitions, record CRUD, media, users, roles, invites, and API keys.
4. The Worker persists structured data in D1 and binary media in R2.
5. Public content routes and media object routes still flow through the Worker so the browser never talks directly to D1 or R2.

## Where To Start Reading

- Admin entrypoint:
  [apps/admin/pages/index.tsx](/Users/jy/Desktop/projects/datamix/apps/admin/pages/index.tsx:1),
  [apps/admin/pages/setup.tsx](/Users/jy/Desktop/projects/datamix/apps/admin/pages/setup.tsx:1),
  [apps/admin/pages/admin.tsx](/Users/jy/Desktop/projects/datamix/apps/admin/pages/admin.tsx:1)
- Admin client helpers:
  [apps/admin/lib/session.ts](/Users/jy/Desktop/projects/datamix/apps/admin/lib/session.ts:1),
  [apps/admin/lib/collection-definitions.ts](/Users/jy/Desktop/projects/datamix/apps/admin/lib/collection-definitions.ts:1),
  [apps/admin/lib/records.ts](/Users/jy/Desktop/projects/datamix/apps/admin/lib/records.ts:1),
  [apps/admin/lib/media.ts](/Users/jy/Desktop/projects/datamix/apps/admin/lib/media.ts:1)
- API assembly:
  [apps/api/src/index.ts](/Users/jy/Desktop/projects/datamix/apps/api/src/index.ts:1),
  [apps/api/src/app.ts](/Users/jy/Desktop/projects/datamix/apps/api/src/app.ts:1)
- API feature seams:
  [apps/api/src/auth.ts](/Users/jy/Desktop/projects/datamix/apps/api/src/auth.ts:1),
  [apps/api/src/auth-guard.ts](/Users/jy/Desktop/projects/datamix/apps/api/src/auth-guard.ts:1),
  [apps/api/src/collections.ts](/Users/jy/Desktop/projects/datamix/apps/api/src/collections.ts:1),
  [apps/api/src/records.ts](/Users/jy/Desktop/projects/datamix/apps/api/src/records.ts:1),
  [apps/api/src/media.ts](/Users/jy/Desktop/projects/datamix/apps/api/src/media.ts:1)
- Shared contracts:
  [packages/core/src/index.ts](/Users/jy/Desktop/projects/datamix/packages/core/src/index.ts:1),
  [packages/core/src/collections.ts](/Users/jy/Desktop/projects/datamix/packages/core/src/collections.ts:1),
  [packages/core/src/rbac.ts](/Users/jy/Desktop/projects/datamix/packages/core/src/rbac.ts:1)
- Smoke coverage:
  [tests/smoke/datamix-smoke.mjs](/Users/jy/Desktop/projects/datamix/tests/smoke/datamix-smoke.mjs:1)

## Feature Ownership Today

- Auth and session flow:
  The API Worker mounts `better-auth` under `/api/auth/*`. The SPA checks session state through API routes and redirects between `/setup`, `/login`, and `/admin` based on that response.
- Collections and records:
  Collection definitions are persisted once, then used to generate record editing and CRUD behavior. If a schema change affects stored shape, expect to touch `packages/core`, `apps/api`, and the admin request/render path together.
- Media:
  Uploads create D1 metadata and store bytes in R2. Object reads and image transform requests stay behind Worker routes.
- RBAC and API keys:
  Permissions are defined in `packages/core` and enforced in the API layer. The admin reflects those capabilities rather than re-implementing policy on its own.

## Common Change Paths

- Changing public or session auth behavior:
  Start in [apps/api/src/app.ts](/Users/jy/Desktop/projects/datamix/apps/api/src/app.ts:1), [apps/api/src/auth.ts](/Users/jy/Desktop/projects/datamix/apps/api/src/auth.ts:1), and [apps/admin/lib/session.ts](/Users/jy/Desktop/projects/datamix/apps/admin/lib/session.ts:1).
- Changing collection schema or generated record behavior:
  Start in [packages/core/src/collections.ts](/Users/jy/Desktop/projects/datamix/packages/core/src/collections.ts:1), [apps/api/src/collections.ts](/Users/jy/Desktop/projects/datamix/apps/api/src/collections.ts:1), [apps/api/src/records.ts](/Users/jy/Desktop/projects/datamix/apps/api/src/records.ts:1), and [apps/admin/pages/admin.tsx](/Users/jy/Desktop/projects/datamix/apps/admin/pages/admin.tsx:1).
- Changing media behavior:
  Start in [packages/core/src/media.ts](/Users/jy/Desktop/projects/datamix/packages/core/src/media.ts:1), [apps/api/src/media.ts](/Users/jy/Desktop/projects/datamix/apps/api/src/media.ts:1), and [apps/admin/lib/media.ts](/Users/jy/Desktop/projects/datamix/apps/admin/lib/media.ts:1).
- Changing roles, invites, or API keys:
  Start in [packages/core/src/rbac.ts](/Users/jy/Desktop/projects/datamix/packages/core/src/rbac.ts:1), [packages/core/src/api-keys.ts](/Users/jy/Desktop/projects/datamix/packages/core/src/api-keys.ts:1), and the matching `apps/api/src/*` plus `apps/admin/lib/*` modules.

## Code Shape Guidance

- `apps/admin/pages/admin.tsx` is currently a large, direct composition point for the authenticated shell. Prefer extracting a seam only when it becomes clearer, not simply because the file is long.
- `apps/api/src/app.ts` is the route assembly layer. Keep route wiring readable there, and keep feature-specific logic in neighboring modules.
- `packages/core` should stay deliberately lean. Add shared code only when both surfaces genuinely benefit from the same contract.

## Verification Expectations

- `npm run check`
- `npm run build`
- `npm run smoke`

If a change affects contributor setup, runtime boundaries, or route contracts, update the matching doc in `docs/` during the same slice.
