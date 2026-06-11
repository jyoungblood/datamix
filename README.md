# Datamix

Datamix is an edge-native, Cloudflare-only content modeling studio that ships as a single Cloudflare Worker app: one deployed domain that serves a browser-first admin and a JSON-first API.

## Start Here

- Contributor walkthrough: [docs/contributor-onboarding.md](/Users/jy/Desktop/projects/datamix/docs/contributor-onboarding.md:1)
- Architecture map: [docs/architecture-overview.md](/Users/jy/Desktop/projects/datamix/docs/architecture-overview.md:1)
- Local setup details: [docs/local-development.md](/Users/jy/Desktop/projects/datamix/docs/local-development.md:1)
- Deploy/runtime contract: [docs/deploy-runtime-contract.md](/Users/jy/Desktop/projects/datamix/docs/deploy-runtime-contract.md:1)
- Secondary bootstrap path: [docs/create-datamix-bootstrap.md](/Users/jy/Desktop/projects/datamix/docs/create-datamix-bootstrap.md:1)
- v1 contact form scope: [docs/v1-contact-form-scope.md](/Users/jy/Desktop/projects/datamix/docs/v1-contact-form-scope.md:1)
- v1 deferred epics: [docs/v1-deferred-epics.md](/Users/jy/Desktop/projects/datamix/docs/v1-deferred-epics.md:1)
- Final v0 cut review: [docs/v0-cut-review.md](/Users/jy/Desktop/projects/datamix/docs/v0-cut-review.md:1)
- Product and roadmap references: [Datamix-PRD-revised.md](/Users/jy/Desktop/projects/datamix/_ref/Datamix-PRD-revised.md:1), [datamix-roadmap-tracker.md](/Users/jy/Desktop/projects/datamix/_ref/datamix-roadmap-tracker.md:1)

## Workspace Layout

- `apps/web`: unified Vinext App Router Worker that serves the admin UI, JSON API, auth, media routes, and Cloudflare bindings
- `packages/core`: shared schema, RBAC, media, and API-key types/helpers
- `packages/create-datamix`: secondary local-first scaffolder for new Datamix workspaces
- `tests/smoke`: end-to-end smoke coverage for must-not-break flows
- `docs`: contributor and runtime documentation
- `_ref`: PRD and roadmap source material

## Root Commands

- `npm install`
- `npm run check`
- `npm run build`
- `npm run smoke`
- `npm run dev`
- `npm run typegen`
- `npm run db:generate`
- `npm run db:migrate:local`
- `npm run db:migrate:remote`
- `npm run deploy`
- `npm run clean`

## Secondary Bootstrap

The primary v0 onboarding flow is still browser-first Cloudflare deploy plus in-browser admin setup. The local scaffolder is a secondary path for contributors who want a working repository shape first:

```bash
npx create-datamix@latest my-project --deploy
```

## Contributor Principles

- Preserve the Cloudflare-only deployment model in v0.
- Keep the public surface JSON-first and session-aware.
- Treat the Worker app as the only deployed process and the only runtime that talks to D1 and R2.
- Prefer direct, readable code over extra layers or policy engines.
