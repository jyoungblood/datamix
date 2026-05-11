# Local Development

Datamix is intentionally Cloudflare-only in v0. We do not maintain a separate "generic Node deployment" story and we do not treat Cloudflare support as an adapter layer to add later.

## Current contract

- `npm run dev` starts one local Datamix app on `http://127.0.0.1:8787`
- `apps/admin` is built to static assets and watched in the background
- `apps/api` runs through `wrangler dev` and serves both the admin assets and the API
- Preview and production topology is documented separately in [deploy-runtime-contract.md](/Users/jy/Desktop/projects/datamix/docs/deploy-runtime-contract.md:1)

## First-time setup

1. Run `npm install` from the repo root.
2. Copy `apps/api/.dev.vars.example` to `apps/api/.dev.vars`.
3. Replace `BETTER_AUTH_SECRET` in `apps/api/.dev.vars` with a long random string.
4. Run `npm run typegen:api` after changing `apps/api/wrangler.jsonc`.
5. Start the app and open `http://127.0.0.1:8787/setup` to create the first admin account in-browser.

## Daily workflow

Use one terminal from the repo root:

1. `npm run dev`

Then open `http://127.0.0.1:8787`.

## Verification workflow

Run these from the repo root before handing work back:

1. `npm run check`
2. `npm run build`
3. `npm run smoke`

The smoke harness starts the unified local app on its own, so it does not require a separate `npm run dev` session.

## Why the files live where they do

- `apps/api/.dev.vars` belongs next to `apps/api/wrangler.jsonc` because Wrangler loads local Worker variables from the Worker directory.
- `apps/admin/.env.local` is optional now. The root dev script injects the local single-origin defaults automatically, and same-origin browser requests are resolved at runtime.

## Typed env expectations

- Worker bindings and runtime types are generated into `apps/api/worker-configuration.d.ts` via `wrangler types`.
- Admin public env is typed in `apps/admin/types/env.d.ts`.
- Shared env shapes live in `packages/core` so both surfaces reference the same vocabulary.

## Auth env expectations

- `BETTER_AUTH_SECRET` is required in `apps/api/.dev.vars` and should be a long random string.
- `AUTH_EMAIL_PROVIDER` selects `smtp` or `resend` for auth-only mail delivery.
- `AUTH_EMAIL_FROM_EMAIL` is required for both providers.
- `AUTH_RESEND_API_KEY` is required when `AUTH_EMAIL_PROVIDER=resend`.
- `AUTH_SMTP_HOST`, `AUTH_SMTP_PORT`, `AUTH_SMTP_USERNAME`, `AUTH_SMTP_PASSWORD`, and `AUTH_SMTP_TLS` are required when `AUTH_EMAIL_PROVIDER=smtp`.
- The admin auth client talks back to the current browser origin; there is no separate public auth origin variable in the single-app contract.
- The API Worker prepares auth tables through the public first-run setup status route at `/setup/status`.

For basic local UI and content work, only `BETTER_AUTH_SECRET` must be real. Configure the email provider values when you need to exercise password reset or invite delivery end to end.

## Contributor references

- [docs/contributor-onboarding.md](/Users/jy/Desktop/projects/datamix/docs/contributor-onboarding.md:1)
- [docs/architecture-overview.md](/Users/jy/Desktop/projects/datamix/docs/architecture-overview.md:1)
- [docs/deploy-runtime-contract.md](/Users/jy/Desktop/projects/datamix/docs/deploy-runtime-contract.md:1)

## Auth email flows

- `/forgot-password` requests a password-reset email through `better-auth`.
- `/reset-password` completes both standard password resets and invite acceptance.
- The protected `/admin` screen exposes a minimal invite form that sends an invite email and routes the recipient through password setup.
