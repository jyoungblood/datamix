# Datamix

Initial monorepo bootstrap for the Datamix v0 build.

## Workspace layout

- `apps/admin`: Vinext admin SPA scaffold
- `apps/api`: Hono API scaffold
- `packages/core`: shared domain types and helpers
- `_ref`: product and roadmap reference material

## Root commands

- `npm install`
- `npm run check`
- `npm run typecheck`
- `npm run build`
- `npm run dev:admin`
- `npm run dev:api`
- `npm run typegen:api`
- `npm run clean`

## Local development

Datamix is Cloudflare-only in v0. The current local contract is:

1. Run `npm run dev:api` for the Worker API on `http://127.0.0.1:8787`
2. Run `npm run dev:admin` for the Vinext admin on `http://127.0.0.1:3000`

Environment files live beside the app that consumes them:

- `apps/api/.dev.vars`
- `apps/admin/.env.local`

Example files and the detailed contributor notes live in [docs/local-development.md](/Users/jy/Desktop/projects/datamix/docs/local-development.md:1).

This repo is intentionally thin right now. `M0-S3` adds Cloudflare runtime conventions and typed env contracts without pulling deployment topology or product features forward from later slices.
