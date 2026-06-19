# Local Development

Datamix is intentionally Cloudflare-only in v0. We do not maintain a separate generic Node deployment story, and we do not treat Cloudflare support as an adapter layer to add later.

## Current Contract

- `npm run dev` starts one local Datamix app on `http://127.0.0.1:3000`.
- `apps/web` runs through Astro and the Cloudflare Workers adapter as the unified Worker app.
- The same app serves `/admin/*`, `/api/*`, auth, media object routes, D1, R2, and Cloudflare Images bindings.
- Astro API endpoints live under `apps/web/src/pages/api/**`.
- Astro admin route wrappers live under `apps/web/src/pages/admin/**`; React admin screens remain under `apps/web/src/admin/_screens/**`.
- The single deployed-app topology is documented separately in [deploy-runtime-contract.md](/Users/jy/Desktop/projects/datamix/docs/deploy-runtime-contract.md:1).

## First-Time Setup

1. Run `npm install` from the repo root.
2. Copy `apps/web/.dev.vars.example` to `apps/web/.dev.vars`.
3. Replace `BETTER_AUTH_SECRET` in `apps/web/.dev.vars` with a long random string.
4. Run `npm run typegen` after changing `apps/web/wrangler.jsonc`.
5. Run `npm run db:migrate:local` after changing checked-in fixed-schema migrations.
6. Start the app and open `http://127.0.0.1:3000/admin/setup` to create the first admin account in-browser.

## Daily Workflow

Use one terminal from the repo root:

1. `npm run dev`

Then open `http://127.0.0.1:3000`.

`npm --workspace @datamix/web` means "run this command in the `apps/web` package" inside
the npm monorepo. It is still one app, not a separate deployment mode. The root `npm run dev`
command delegates to that workspace command so contributors can start the app from the repo root.

## D1 Schema Workflow

- Fixed Datamix infrastructure tables and `better-auth` tables are defined in Drizzle under `apps/web/src/server/db/schema.ts`.
- Generate checked-in D1 migration SQL with `npm run db:generate`.
- Apply checked-in migrations to the local D1 database with `npm run db:migrate:local`.
- Generated collection record tables still use raw SQL at runtime because collection fields and table names are admin-defined.
- `/api/admin/setup/status` keeps a conservative fixed-schema bootstrap for browser-first local setup and smoke coverage, but checked-in migrations are the source of truth for schema changes.

## Verification Workflow

Run these from the repo root before handing work back:

1. `npm run check`
2. `npm run build`
3. `npm run smoke`

The smoke harness starts the unified local app on its own, so it does not require a separate `npm run dev` session.

## Why The Files Live Where They Do

- `apps/web/wrangler.jsonc` is the single deployed Worker runtime config. Local development uses the same app with local-only overrides from `apps/web/.dev.vars`.
- `apps/web/.dev.vars` belongs next to `apps/web/wrangler.jsonc` because Wrangler loads local Worker variables from the Worker directory.
- Do not add separate `.env` files for deployed origins; keep local Worker values in `apps/web/.dev.vars`.

## Typed Env Expectations

- Worker bindings and runtime types are generated into `apps/web/worker-configuration.d.ts` via `wrangler types`.
- Public app env is typed in `apps/web/src/types/env.d.ts`.
- Shared env shapes live in `packages/core` so server and client helpers reference the same vocabulary.

## Auth Env Expectations

- `BETTER_AUTH_SECRET` is required in `apps/web/.dev.vars` and should be a long random string.
- `AUTH_EMAIL_PROVIDER` selects `smtp` or `resend` for auth-only mail delivery.
- `AUTH_EMAIL_FROM_EMAIL` is required for both providers.
- `AUTH_RESEND_API_KEY` is required when `AUTH_EMAIL_PROVIDER=resend`.
- `AUTH_SMTP_HOST`, `AUTH_SMTP_PORT`, `AUTH_SMTP_USERNAME`, `AUTH_SMTP_PASSWORD`, and `AUTH_SMTP_TLS` are required when `AUTH_EMAIL_PROVIDER=smtp`.
- The admin auth client talks back to the current browser origin; there is no separate public auth origin variable in the single-app contract.
- The app uses Better Auth's Drizzle adapter against the D1 `DB` binding. The first-run admin status route at `/api/admin/setup/status` verifies the fixed schema bootstrap before reporting setup state.

For basic local UI and content work, only `BETTER_AUTH_SECRET` must be real. Configure the email provider values when you need to exercise password reset or invite delivery end to end.

## Contributor References

- [docs/contributor-onboarding.md](/Users/jy/Desktop/projects/datamix/docs/contributor-onboarding.md:1)
- [docs/architecture-overview.md](/Users/jy/Desktop/projects/datamix/docs/architecture-overview.md:1)
- [docs/deploy-runtime-contract.md](/Users/jy/Desktop/projects/datamix/docs/deploy-runtime-contract.md:1)

## Auth Email Flows

- `/admin/forgot-password` requests a password-reset email through `better-auth`.
- `/admin/reset-password` completes both standard password resets and invite acceptance.
- The protected `/admin` screen exposes a minimal invite form that sends an invite email and routes the recipient through password setup.
