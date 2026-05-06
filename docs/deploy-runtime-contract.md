# Deploy and Runtime Contract

This document is the current source of truth for how Datamix v0 is expected to run on Cloudflare.

## Topology

- `apps/admin` is a client-rendered SPA deployed to `Cloudflare Pages`.
- `apps/api` is a `Cloudflare Worker` that owns the JSON API and all server-side access to platform resources.
- `D1` is only bound to the API Worker as `DB`.
- `R2` is only bound to the API Worker as `MEDIA_BUCKET`.
- Browsers talk to the admin and API over HTTPS. Browsers do not talk directly to D1 or R2.

## Service boundaries

- Admin:
  Static client assets built from `apps/admin` and served by Pages.
- API:
  Public JSON-first application boundary for auth, content, media, and future transforms.
- Database:
  Structured application data in D1, accessed only from the API Worker.
- Storage:
  Binary media in R2, accessed only from the API Worker.

## Environment model

Datamix uses three runtime modes:

- `development`: local Vinext + local Wrangler dev
- `preview`: Cloudflare preview deployment surfaces
- `production`: live deployment surfaces

## Resource naming

The current contract uses these Cloudflare project/resource names:

- Pages project: `datamix-admin`
- API Worker: `datamix-api` with local top-level config and named `preview` / `production` environments
- D1 binding: `DB`
- R2 binding: `MEDIA_BUCKET`
- Worker compatibility flag: `nodejs_compat` for `better-auth` runtime support on Cloudflare Workers

Suggested remote resource names:

- Preview D1 database: `datamix-preview`
- Production D1 database: `datamix-production`
- Preview R2 bucket: `datamix-media-preview`
- Production R2 bucket: `datamix-media-production`

## Origin contract

- Local admin origin: `http://127.0.0.1:3000`
- Local API origin: `http://127.0.0.1:8787`
- Preview admin origin: replace the placeholder in `apps/api/wrangler.jsonc` with your real Pages preview domain
- Production admin origin: replace the placeholder in `apps/api/wrangler.jsonc` with your real production admin domain
- Admin-to-API browser traffic is configured by `NEXT_PUBLIC_API_ORIGIN` at admin build time
- Auth cookies are issued by the API origin, so deployed admin and API domains should stay on the same parent site when possible (for example `admin.example.com` + `api.example.com`)

## Config files

- Admin Pages config template:
  [apps/admin/wrangler.pages.jsonc.example](/Users/jy/Desktop/projects/datamix/apps/admin/wrangler.pages.jsonc.example:1)
- Admin build-time env examples:
  [apps/admin/.env.example](/Users/jy/Desktop/projects/datamix/apps/admin/.env.example:1),
  [apps/admin/.env.preview.example](/Users/jy/Desktop/projects/datamix/apps/admin/.env.preview.example:1),
  [apps/admin/.env.production.example](/Users/jy/Desktop/projects/datamix/apps/admin/.env.production.example:1)
- API Worker config: [apps/api/wrangler.jsonc](/Users/jy/Desktop/projects/datamix/apps/api/wrangler.jsonc:1)
- API local env example: [apps/api/.dev.vars.example](/Users/jy/Desktop/projects/datamix/apps/api/.dev.vars.example:1)

## Important constraints

- The admin stays browser-first and client-rendered in v0.
- The admin Pages config stays as a checked-in template until we are ready to make Pages configuration the active source of truth for that app directory.
- D1 and R2 are never exposed directly to the browser.
- Media URLs should ultimately resolve through Worker-managed routes, not raw public bucket URLs.
- Preview and production must use separate remote D1 databases and separate remote R2 buckets.
- The placeholder IDs and `.example` domains in config files are intentional and must be replaced before the first real deploy.
- Auth secrets are not checked into `wrangler.jsonc`; set `BETTER_AUTH_SECRET` and `AUTH_SETUP_TOKEN` as Worker secrets per environment.

## Auth contract

- `better-auth` is mounted on the API Worker at `/api/auth/*`.
- Auth sessions persist as cookies on the API origin and are consumed by the SPA with credentialed `fetch`.
- Protected admin pages must verify session state through the API Worker; the Pages app does not read D1 directly.
- The temporary migration seam for this slice is `POST /setup/auth/migrate` with the `x-datamix-setup-token` header.

## Provisioning notes

When the team is ready to attach real remote resources, these are the expected Wrangler commands:

1. `npx wrangler d1 create datamix-preview`
2. `npx wrangler d1 create datamix-production`
3. `npx wrangler r2 bucket create datamix-media-preview`
4. `npx wrangler r2 bucket create datamix-media-production`

After provisioning:

1. Copy the returned D1 IDs into `apps/api/wrangler.jsonc`
2. Replace the placeholder admin domains in `apps/api/wrangler.jsonc`
3. Set the matching `NEXT_PUBLIC_API_ORIGIN` value in the admin Pages build environment
4. Rerun `npm run typegen:api`
5. Set `BETTER_AUTH_SECRET` and `AUTH_SETUP_TOKEN` for the Worker in each environment
