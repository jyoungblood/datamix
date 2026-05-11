# Deploy and Runtime Contract

This document is the current source of truth for how Datamix v0 is expected to run on Cloudflare.

## Topology

- Datamix deploys as one `Cloudflare Worker` on one domain.
- `apps/admin` builds the client-rendered SPA assets that the Worker serves.
- `apps/api` provides the Worker code for auth, content, media, setup, and public JSON routes.
- `D1` is only bound to the Worker as `DB`.
- `R2` is only bound to the Worker as `MEDIA_BUCKET`.
- Browsers talk to one HTTPS origin. Browsers do not talk directly to D1 or R2.

## Service boundaries

- Admin:
  Static client assets built from `apps/admin` and bundled into the Worker as static assets.
- API:
  Public JSON-first application boundary for auth, content, media, and future transforms.
- Database:
  Structured application data in D1, accessed only from the Worker.
- Storage:
  Binary media in R2, accessed only from the Worker.

## Environment model

Datamix uses three runtime modes:

- `development`: local admin asset build + local Wrangler dev on one origin
- `preview`: Cloudflare preview deployment on one origin
- `production`: live deployment on one origin

## Resource naming

The current contract uses these Cloudflare resource names:

- App Worker: `datamix-api` with local top-level config and named `preview` / `production` environments
- D1 binding: `DB`
- R2 binding: `MEDIA_BUCKET`
- Worker compatibility flag: `nodejs_compat` for `better-auth` runtime support on Cloudflare Workers

Suggested remote resource names:

- Preview D1 database: `datamix-preview`
- Production D1 database: `datamix-production`
- Preview R2 bucket: `datamix-media-preview`
- Production R2 bucket: `datamix-media-production`

## Origin contract

- Local app origin: `http://127.0.0.1:8787`
- Preview app origin: replace the placeholder in `apps/api/wrangler.jsonc` with your real preview domain
- Production app origin: replace the placeholder in `apps/api/wrangler.jsonc` with your real production domain
- The admin talks back to the current browser origin at runtime; it no longer relies on a separate API origin variable for the single-app contract
- `APP_ORIGIN` is still configured in Worker env because invite/reset emails need absolute URLs and `better-auth` trusted origins must match the deployed domain

## Config files

- Worker config and static asset routing:
  [apps/api/wrangler.jsonc](/Users/jy/Desktop/projects/datamix/apps/api/wrangler.jsonc:1)
- Worker local env example:
  [apps/api/.dev.vars.example](/Users/jy/Desktop/projects/datamix/apps/api/.dev.vars.example:1)
- Optional admin env examples:
  [apps/admin/.env.example](/Users/jy/Desktop/projects/datamix/apps/admin/.env.example:1),
  [apps/admin/.env.preview.example](/Users/jy/Desktop/projects/datamix/apps/admin/.env.preview.example:1),
  [apps/admin/.env.production.example](/Users/jy/Desktop/projects/datamix/apps/admin/.env.production.example:1)

## Important constraints

- The admin stays browser-first and client-rendered in v0.
- The Worker is the only deployed runtime. We do not deploy a separate Pages app.
- D1 and R2 are never exposed directly to the browser.
- Media URLs should resolve through Worker-managed routes, not raw public bucket URLs.
- Preview and production must use separate remote D1 databases and separate remote R2 buckets.
- The placeholder IDs and `.example` domains in config files are intentional and must be replaced before the first real deploy.
- Auth secrets are not checked into `wrangler.jsonc`; set `BETTER_AUTH_SECRET` and the chosen auth-email provider credentials as Worker secrets per environment.

## Asset routing contract

- `apps/api/wrangler.jsonc` points `assets.directory` at `../admin/dist/client`.
- `assets.not_found_handling` is set to `single-page-application` so client-side routes resolve to the SPA shell.
- `assets.run_worker_first` is configured for dynamic app routes such as `/api/*`, `/setup/*`, `/session`, `/collections/*`, `/media/*`, and `/health`.
- The practical result is:
  static asset requests are served directly from the asset bundle,
  dynamic JSON/auth/media routes hit the Worker first,
  client-side navigation still falls back to `index.html`.

## Auth contract

- `better-auth` is mounted on the Worker at `/api/auth/*`.
- Auth sessions persist as cookies on the same app origin and are consumed by the SPA with credentialed `fetch`.
- Protected admin pages must verify session state through Worker routes; the SPA does not read D1 directly.
- `GET /setup/status` is the browser-first bootstrap seam. It prepares auth tables if needed and reports whether the instance still needs its first admin user.
- Public email/password sign-up is only permitted for the very first account. After that, the sign-up route is blocked until a later invite/user-management slice expands it intentionally.
- Auth email delivery is provider-swappable through env-only configuration:
  `AUTH_EMAIL_PROVIDER=resend` uses the Resend HTTPS API.
  `AUTH_EMAIL_PROVIDER=smtp` uses outbound Worker TCP sockets to an SMTP server on ports such as `465` or `587`.
- Password reset and invite emails share the same provider abstraction and template layer.

## Content API contract

- Admin-facing collection management and record editing routes stay session-protected at `/collections/*` and `/records/*`.
- Public content delivery routes live at `/api/collections/*`.
- Public read access is controlled by `PUBLIC_API_READ_ACCESS`:
  `public` allows anonymous reads,
  `api-key` requires either `X-API-Key` or `Authorization: Bearer <key>`,
  `disabled` rejects reads.
- Public write access is controlled by `PUBLIC_API_WRITE_ACCESS`:
  `disabled` rejects writes,
  `api-key` requires a configured write key.
- Temporary v0 key configuration is env-backed:
  `PUBLIC_API_READ_KEY` grants read access when read mode is `api-key`.
  `PUBLIC_API_WRITE_KEY` grants write access and also satisfies read access.
- This env-backed key check is intentionally the pre-M5 seam; managed key lifecycle and UI land later without changing the public route family.

## Provisioning notes

When the team is ready to attach real remote resources, these are the expected Wrangler commands:

1. `npx wrangler d1 create datamix-preview`
2. `npx wrangler d1 create datamix-production`
3. `npx wrangler r2 bucket create datamix-media-preview`
4. `npx wrangler r2 bucket create datamix-media-production`

After provisioning:

1. Copy the returned D1 IDs into `apps/api/wrangler.jsonc`
2. Replace the placeholder app domains in `apps/api/wrangler.jsonc`
3. Build the admin assets with `npm run build --workspace @datamix/admin`
4. Rerun `npm run typegen:api`
5. Set `BETTER_AUTH_SECRET` for the Worker in each environment
6. Set the auth email provider secrets and sender identity vars for the chosen delivery mode
