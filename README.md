# Datamix

**The 1-click edge content studio for Cloudflare.**

Datamix is an open-source content modeling studio for teams that want a clean admin UI, structured content, media management, team access, and a JSON API without assembling a custom backend from scratch.

The goal is simple: deploy one Cloudflare app, finish setup in the browser, model your content visually, and use the generated API to power websites, apps, and client projects. Datamix is built for Cloudflare from the start, with one Worker serving the admin, auth, media routes, and content API from a single origin.

## What Datamix Does

- Helps you create custom content collections without writing schema code.
- Turns each collection schema into the matching editor form automatically.
- Lets editors create records, write rich text or markdown, and upload images from the admin.
- Stores structured content in Cloudflare D1 and media assets in Cloudflare R2.
- Exposes predictable REST JSON endpoints for every collection, including API-key record CRUD for external integrations.
- Supports API keys, user roles, invite-based onboarding, and persistent auth.
- Keeps setup browser-first so deployed instances do not require local development.

## Why Use It

Datamix is for people who want the flexibility of a headless content backend without the usual setup overhead. Designers, agency operators, IT teams, and developers can deploy a focused content studio, define the content model they need, and hand editors a calm admin experience that is centered around collections.

The product is intentionally narrow. Datamix is not trying to be a page builder, ecommerce platform, plugin marketplace, or GraphQL server in v0. It focuses on the core workflow: model content, edit content, manage media and access, then deliver JSON from the edge.

## Core Features

- **Browser-first setup:** deploy to Cloudflare and initialize the first admin account from the app.
- **Visual collection builder:** define fields, labels, relationships, ordering, and editor behavior in one place.
- **Generated edit screens:** the schema is the form, so editors get usable record screens automatically.
- **JSON-first delivery:** every collection gets REST-style API routes for structured content reads and API-key record CRUD.
- **Media library:** upload, browse, reuse, and transform R2-backed image assets through Worker-managed routes.
- **Team controls:** manage users, roles, permissions, invites, API keys, and optional OAuth providers.
- **Cloudflare-native architecture:** one deployed Worker app backed by D1 and R2, with no separate admin/API deployment.
- **Contributor-friendly code:** readable, focused implementation choices for an open-source project.

## Start Here

- Contributor walkthrough: [docs/contributor-onboarding.md](/Users/jy/Desktop/projects/datamix/docs/contributor-onboarding.md:1)
- Architecture map: [docs/architecture-overview.md](/Users/jy/Desktop/projects/datamix/docs/architecture-overview.md:1)
- Public marketing site content draft: [marketing-site.md](/Users/jy/Desktop/projects/datamix/marketing-site.md:1)
- Local setup details: [docs/local-development.md](/Users/jy/Desktop/projects/datamix/docs/local-development.md:1)
- Deploy/runtime contract: [docs/deploy-runtime-contract.md](/Users/jy/Desktop/projects/datamix/docs/deploy-runtime-contract.md:1)
- Secondary bootstrap path: [docs/create-datamix-bootstrap.md](/Users/jy/Desktop/projects/datamix/docs/create-datamix-bootstrap.md:1)
- v1 contact form scope: [docs/v1-contact-form-scope.md](/Users/jy/Desktop/projects/datamix/docs/v1-contact-form-scope.md:1)
- v1 deferred epics: [docs/v1-deferred-epics.md](/Users/jy/Desktop/projects/datamix/docs/v1-deferred-epics.md:1)
- Final v0 cut review: [docs/v0-cut-review.md](/Users/jy/Desktop/projects/datamix/docs/v0-cut-review.md:1)
- Product and roadmap references: [Datamix-PRD-revised.md](/Users/jy/Desktop/projects/datamix/_ref/Datamix-PRD-revised.md:1), [datamix-roadmap-tracker.md](/Users/jy/Desktop/projects/datamix/_ref/datamix-roadmap-tracker.md:1)

## Workspace Layout

- `apps/web`: unified Astro Cloudflare Worker that serves the admin UI, JSON API, auth, media routes, and Cloudflare bindings
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
