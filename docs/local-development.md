# Local Development

Datamix is intentionally Cloudflare-only in v0. We do not maintain a separate "generic Node deployment" story and we do not treat Cloudflare support as an adapter layer to add later.

## Current contract

- `apps/api` runs through `wrangler dev` on `http://127.0.0.1:8787`
- `apps/admin` runs through `vinext dev --port 3000` on `http://127.0.0.1:3000`
- The admin talks to the API through `NEXT_PUBLIC_API_ORIGIN`
- Preview and production topology is documented separately in [deploy-runtime-contract.md](/Users/jy/Desktop/projects/datamix/docs/deploy-runtime-contract.md:1)

## First-time setup

1. Run `npm install` from the repo root.
2. Copy `apps/api/.dev.vars.example` to `apps/api/.dev.vars`.
3. Copy `apps/admin/.env.example` to `apps/admin/.env.local`.
4. Run `npm run typegen:api` once after changing `apps/api/wrangler.jsonc`.
5. Start the apps and open `http://127.0.0.1:3000/setup` to create the first admin account in-browser.

## Daily workflow

Use two terminals from the repo root:

1. `npm run dev:api`
2. `npm run dev:admin`

Then open `http://127.0.0.1:3000`.

## Why the files live where they do

- `apps/api/.dev.vars` belongs next to `apps/api/wrangler.jsonc` because Wrangler loads local Worker variables from the Worker directory.
- `apps/admin/.env.local` belongs next to the Vinext app because the admin reads public browser-facing variables at build/dev time.

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
- The admin auth client reuses `NEXT_PUBLIC_API_ORIGIN`; there is no separate public auth origin variable.
- The API Worker prepares auth tables through the public first-run setup status route at `/setup/status`.

## Auth email flows

- `/forgot-password` requests a password-reset email through `better-auth`.
- `/reset-password` completes both standard password resets and invite acceptance.
- The protected `/admin` screen exposes a minimal invite form that sends an invite email and routes the recipient through password setup.
