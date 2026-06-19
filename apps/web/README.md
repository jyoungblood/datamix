# `@datamix/web`

Unified Astro Cloudflare Worker for Datamix.

This workspace serves the browser-first admin UI and every JSON/auth/media route from
one Cloudflare Worker app. Astro API endpoints live under `src/pages/api/**`, shared
server helpers live under `server/**`, Astro admin route wrappers live under
`src/pages/admin/**`; React admin screens remain under `app/admin/_screens/**`.

Use `npm run dev` from the repository root for local development on
`http://127.0.0.1:3000`. The root command delegates to this workspace's Astro dev
server.

Fixed D1 infrastructure tables are defined with Drizzle in `server/db/schema.ts`.
Use the root `db:*` scripts to generate and apply checked-in migrations under
`drizzle/d1`.

## Admin Routes

The authenticated admin workspace is routed through the shared
`AdminWorkspaceProvider` and workspace frame:

| Route | Screen |
| --- | --- |
| `/admin` | Workspace overview and primary route map |
| `/admin/schema` | Schema overview |
| `/admin/schema/new` | New schema builder |
| `/admin/schema/[schemaId]` | Existing schema builder |
| `/admin/content` | All content browser |
| `/admin/content/new` | New generated record editor with schema selection |
| `/admin/content/[schemaId]/[recordId]` | Existing generated record editor |
| `/admin/media` | Media library |
| `/admin/team` | Users, invites, and role assignment |
| `/admin/settings` | API keys, OAuth posture, and role definitions |
| `/admin/account` | Current profile and session actions |
| `/admin/setup` | First-run setup |
| `/admin/login` | Admin sign-in |
| `/admin/forgot-password` | Password reset request |
| `/admin/reset-password` | Password reset completion |

The command palette is mounted by the shared workspace frame. It provides routed
navigation, dynamic schema/content jumps when data is loaded, account access,
and sign-out.

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
