# `@datamix/web`

Unified Astro Cloudflare Worker for Datamix.

This workspace serves the browser-first admin UI and every JSON/auth/media route from
one Cloudflare Worker app. Astro API endpoints live under `src/pages/api/**`, shared
server helpers live under `src/server/**`, Astro admin route templates live under
`src/pages/admin/**`, Astro-native admin body templates live under
`src/components/admin/**`, and retained React workspace bodies live under
`src/admin/**`.

Use `npm run dev` from the repository root for local development on
`http://127.0.0.1:3000`. The root command delegates to this workspace's Astro dev
server.

Fixed D1 infrastructure tables are defined with Drizzle in `src/server/db/schema.ts`.
Use the root `db:*` scripts to generate and apply checked-in migrations under
`drizzle/d1`.

## Admin Routes

The authenticated admin workspace is routed through the shared Astro workspace
shell. Astro resolves setup, session, authorization, permissions, and active
route access before rendering each Astro route body. Client-only interactions
hydrate targeted React islands that receive explicit serialized `workspace`
props and use route-scoped state hooks from `src/admin/_state/**`; there is no
global admin workspace React provider.

| Route | Screen | Rendering mode |
| --- | --- | --- |
| `/admin` | Workspace overview and primary route map | Astro body with command palette island |
| `/admin/schema` | Schema overview | Astro body with command palette island |
| `/admin/schema/new` | New schema builder | Astro body with form/save islands |
| `/admin/schema/[schemaId]` | Existing schema builder | Astro body with form/save islands |
| `/admin/content` | All content browser | Astro body with command palette island |
| `/admin/content/new` | New generated record editor with schema selection | Astro body with editor island |
| `/admin/content/[schemaId]/[recordId]` | Existing generated record editor | Astro body with editor island |
| `/admin/media` | Media library | Astro body with media interaction island |
| `/admin/team` | Users, invites, and role assignment | Astro body with team/roles interaction island |
| `/admin/settings` | API keys, OAuth posture, and role definitions | Astro body with settings interaction island |
| `/admin/account` | Current profile and session actions | Astro-native body with targeted React islands |
| `/admin/setup` | First-run setup | Astro auth template |
| `/admin/login` | Admin sign-in | Astro auth template |
| `/admin/forgot-password` | Password reset request | Astro auth template |
| `/admin/reset-password` | Password reset completion | Astro auth template |

The command palette remains a targeted React island inside workspace route
bodies. It provides routed navigation, dynamic schema/content jumps when data is
loaded, account access, and sign-out.

## Verification

Run these from the repository root before handing off admin workspace changes:

```bash
npm run typecheck --workspace @datamix/web
npm run build --workspace @datamix/web
npm run smoke
git diff --check
```

The typecheck script pins Wrangler's generated environment shape to
`apps/web/.dev.vars.example`, so private local values in `apps/web/.dev.vars`
should not change the checked-in type expectations. Do not use
`CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false` for this check; that makes
Wrangler ignore the explicit env file and compare against the smaller
`wrangler.jsonc`-only shape.

```bash
npm run typecheck --workspace @datamix/web
```
