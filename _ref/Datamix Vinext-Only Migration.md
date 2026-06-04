# Datamix Vinext-Only Migration Plan And Session Tracker

## Summary

Migrate Datamix carefully over **six implementation sessions** from the current split `@datamix/admin` Vinext Pages app plus `@datamix/api` Hono Worker into one `@datamix/app` Vinext App Router Worker. Preserve the current public URL contract and response shapes while removing Hono only after parity is proven.

Default strategy: keep each session shippable, with checks at the end of every session. Do not delete the old API workspace until the new Vinext app passes equivalent smoke coverage.

## Session Tracker

| Session | Goal | Done When | Status |
|---|---|---|---|
| 1 | Create the new Vinext App Router shell | `apps/app` exists, admin pages render through App Router, no backend migration yet | Not started |
| 2 | Configure Cloudflare Worker runtime for Vinext | `apps/app` has Worker/Vite/Wrangler config, bindings type path, and local dev starts on `127.0.0.1:3000` | Not started |
| 3 | Move backend service modules without changing behavior | non-Hono service code is under `apps/app/server`, types compile, old Hono routes still present as reference | Not started |
| 4 | Port API route handlers by category | auth, admin, public collections, media, and health routes work from Vinext route handlers | Not started |
| 5 | Update smoke/dev/build/deploy scripts | root scripts target `@datamix/app`, smoke runs against port `3000`, `.dev.vars` moves to `apps/app` | Not started |
| 6 | Remove old architecture and update docs | Hono and `apps/api` are removed, docs describe one Vinext Worker app, final check/build/smoke pass | Not started |

## Key Changes

- Create `apps/app` from the current admin app, rename package to `@datamix/app`, and convert Pages Router files into App Router equivalents.
- Move hook-heavy admin views into client components; keep `/admin/setup`, `/admin/login`, `/admin/reset-password`, `/admin/forgot-password`, and `/admin` behavior unchanged.
- Configure Vinext App Router for Cloudflare Workers using the Cloudflare Vite plugin, Worker entrypoint, D1/R2/Images bindings, and `cloudflare:workers` env access.
- Move reusable backend modules from the Hono API into `apps/app/server`; replace Hono context usage with plain request/env/session helpers.
- Port routes to App Router handlers while preserving:
  - `/api/auth/*`
  - `/api/admin/*`
  - `/api/collections/*`
  - `/api/media/object/*`
  - `/api/health`
  - `/api`
- Keep Better Auth mounted at `/api/auth`, preserve same-origin admin browser requests, and keep public CORS behavior for public JSON and media routes.
- Remove the custom SPA shell generator and Vinext hydration patch only after the App Router Worker path is verified.

## Session Details

**Session 1: App Router Shell**

- Copy the current admin workspace into `apps/app` and update package identity.
- Convert `pages/_app.tsx` into `app/layout.tsx` with global CSS imports.
- Convert public splash page and admin route wrappers into App Router pages.
- Mark only hook/browser-dependent admin screens as `"use client"`.
- Keep current admin client helpers using relative API paths where possible.
- Run typecheck/build for the frontend portion before touching API behavior.

**Session 2: Worker Runtime**

- Replace the current admin Vite config with Vinext App Router plus Cloudflare Vite plugin config.
- Add `wrangler.jsonc` for the unified app with existing `DB`, `MEDIA_BUCKET`, `IMAGES`, auth/email/public API vars, and `nodejs_compat`.
- Add the Vinext Worker entrypoint under `apps/app/worker`.
- Set local defaults to `http://127.0.0.1:3000`.
- Verify the app starts locally and serves `/`, `/admin/setup`, and static/client assets.

**Session 3: Server Module Move**

- Move backend service modules into `apps/app/server` while keeping the old `apps/api/src/app.ts` as the behavioral reference.
- Introduce a `DatamixBindings` type generated from Wrangler output.
- Replace global/Hono env access with explicit env passing.
- Replace `request-context` with `vinext/shims/request-context`.
- Keep business functions intact unless a Hono dependency forces a small adapter change.

**Session 4: Route Handler Port**

- Build shared route helpers for JSON responses, errors, CORS/preflight, request body parsing, auth/session resolution, public API-key resolution, and permission checks.
- Port Better Auth first: `app/api/auth/[...auth]/route.ts`.
- Port low-risk health/index routes next.
- Port admin setup/session/authenticated routes.
- Port public collections routes with read/write API-key rules.
- Port media upload/list/object routes, preserving content headers and object key behavior.
- Compare route status codes and response bodies against the old Hono implementation while porting.

**Session 5: Scripts And Smoke**

- Update root scripts so `dev`, `build`, `check`, `smoke`, deploy, and typegen target `@datamix/app`.
- Update smoke harness to write `apps/app/.dev.vars`, start the unified app on port `3000`, and hit the same public paths.
- Keep the smoke scenario coverage equivalent: setup, login/session, roles/users, API keys, collection definitions, records, public collections, media upload/object, and health.
- Run `npm run check`, `npm run build`, and `npm run smoke`.

**Session 6: Cleanup And Docs**

- Remove `apps/api`, Hono dependencies, SPA shell generation, and old dual-app dev flow.
- Update architecture, local development, contributor onboarding, deploy runtime contract, README, and create-datamix docs to describe one Vinext Worker app.
- Confirm `package-lock.json` no longer includes Hono as an app dependency.
- Final verification: clean install assumptions, check/build/smoke, and manual URLs.

## Public Interfaces And Compatibility

- No intentional product behavior changes.
- Local app origin becomes `http://127.0.0.1:3000`.
- Public paths and JSON response shapes remain stable.
- Worker binding names remain `DB`, `MEDIA_BUCKET`, and `IMAGES`.
- Better Auth base path remains `/api/auth`.
- Admin API remains same-origin browser-focused.
- Public collections and media routes keep CORS support.

## Test Plan

- End of every session: run the narrowest relevant typecheck/build.
- End of Sessions 2, 4, 5, and 6: manually verify `/`, `/admin/setup`, `/admin/login`, `/admin`, `/api/health`, and `/api/collections`.
- End of Session 4: verify auth cookies, admin session, permission failures, public API-key access, media object headers, and CORS/preflight behavior.
- End of Session 5: run full smoke against the unified app.
- End of Session 6: run `npm run check`, `npm run build`, `npm run smoke`, and confirm Hono/API workspace removal.

## Assumptions

- App Router is the target architecture.
- No database schema migration is required.
- No production deploy exists, so workspace/package rename is acceptable.
- The old Hono app remains available as a reference until Session 6.
- Any Vinext/Cloudflare plugin incompatibility discovered during Session 2 pauses deletion work; the fallback is to keep the current split app until the Worker runtime is proven.
- First implementation action should be creating a repo tracker document from this plan, then updating its status after each session.
