# `@datamix/web`

Unified Vinext App Router Worker for Datamix.

This workspace serves the browser-first admin UI and every JSON/auth/media route from
one Cloudflare Worker app. App Router route handlers live under `app/api/**`, shared
server helpers live under `server/**`, routed admin pages live under `app/admin/**`,
and private admin screen components live under `app/admin/_screens/**`.

Use `npm run dev --workspace @datamix/web` for local development on
`http://127.0.0.1:3000`.

Fixed D1 infrastructure tables are defined with Drizzle in `server/db/schema.ts`.
Use the root `db:*` scripts to generate and apply checked-in migrations under
`drizzle/d1`.

## Admin Routes

The authenticated admin workspace is routed through the shared
`AdminWorkspaceProvider` and workspace frame:

| Route | Screen |
| --- | --- |
| `/admin` | Placeholder admin home and route map |
| `/admin/schema` | Schema overview |
| `/admin/schema/new` | New schema builder |
| `/admin/schema/[schemaId]` | Existing schema builder |
| `/admin/content` | Content schema picker |
| `/admin/content/[collection]` | Record browser for a schema |
| `/admin/content/[collection]/new` | New generated record editor |
| `/admin/content/[collection]/[recordId]` | Existing generated record editor |
| `/admin/media` | Media library |
| `/admin/team` | Users, invites, and role assignment |
| `/admin/settings` | API keys, OAuth posture, and role definitions |
| `/admin/account` | Current profile and session actions |
| `/admin/setup` | First-run setup |
| `/admin/login` | Admin sign-in |
| `/admin/forgot-password` | Password reset request |
| `/admin/reset-password` | Password reset completion |

The command palette is mounted by the shared workspace frame. It provides routed
navigation, route-aware refresh actions, dynamic schema/content jumps when data is
loaded, account access, and sign-out.

## Verification

Run these from the repository root before handing off admin workspace changes:

```bash
npm run typecheck --workspace @datamix/web
npm run build --workspace @datamix/web
npm run smoke
git diff --check
```

If local `apps/web/.env` values cause Wrangler type drift, run:

```bash
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false npm run typecheck --workspace @datamix/web
```
