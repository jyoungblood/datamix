# Datamix

Initial monorepo bootstrap for the Datamix v0 build.

## Workspace layout

- `apps/admin`: future Vinext admin SPA
- `apps/api`: future Hono + Cloudflare Workers API
- `packages/core`: shared domain types and business logic
- `_ref`: product and roadmap reference material

## Root commands

- `npm install`
- `npm run check`
- `npm run typecheck`
- `npm run build`
- `npm run clean`

This repo is intentionally thin right now. `M0-S1` sets the workspace boundaries and shared TypeScript conventions without pulling real app code forward from later slices.
