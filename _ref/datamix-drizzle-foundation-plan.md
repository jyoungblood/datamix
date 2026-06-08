# Datamix Drizzle Foundation Plan

Last updated: 2026-06-08

Implementation status: Complete for the D1-first Drizzle foundation pass.

## Summary

Move Datamix's reusable fixed-schema database foundation to Drizzle while keeping the app D1-first for v0. This is primarily a starter-kit architecture decision: Better Auth, fixed Datamix tables, schema source files, and migration conventions should use a pattern that can be reused in future Cloudflare apps, including a later Hyperdrive/Postgres profile.

This is not a mandate to force Drizzle into Datamix's user-defined collection record tables. Collection record tables are generated from admin-defined schemas at runtime, so raw SQL remains the right tool for dynamic DDL and dynamic column CRUD.

## Goals

- Use Drizzle for reusable fixed-schema infrastructure.
- Switch Better Auth to its Drizzle adapter for runtime auth database operations.
- Establish a clear database module shape that future starter-kit apps can copy.
- Replace Better Auth's current runtime Kysely migration helper with an explicit Drizzle schema and migration/bootstrap workflow.
- Keep Datamix v0 Cloudflare D1-first.
- Design the structure so a future Hyperdrive/Postgres option is a database profile change, not a broad service rewrite.
- Preserve current API behavior, auth behavior, and smoke coverage.

## Non-Goals

- Do not convert generated collection record tables to static Drizzle tables.
- Do not add Hyperdrive/Postgres support in this implementation pass.
- Do not make Datamix v0 a generic multi-database product.
- Do not rewrite unrelated admin UI, public API routing, media handling, or RBAC behavior.
- Do not chase package tree removal of `kysely` if Better Auth still ships it as a transitive dependency. The goal is Drizzle as the app/runtime DB pattern, not arbitrary dependency pruning.

## Current Findings

- The app has no first-party Kysely query code.
- `kysely` is pulled in by `better-auth` and its Kysely adapter.
- `apps/web/server/auth.ts` currently passes `database: env.DB` directly to Better Auth.
- `apps/web/server/auth.ts` currently calls `getMigrations(createAuthOptions(env))`; the installed Better Auth migration helper is Kysely-oriented.
- There is no repo-owned migration directory, Drizzle config, or SQL migration set today.
- Fixed Datamix tables are currently lazily created through raw D1 SQL:
  - `dmx_roles`
  - `dmx_api_keys`
  - `dmx_media_assets`
  - `dmx_collections`
- Generated collection record tables use dynamic names and dynamic fields:
  - table prefix: `dmx_records_`
  - system columns: `id`, `created_at`, `updated_at`
  - field columns derived from saved collection schemas
- The smoke test already covers the critical DB flows: first-run setup, Better Auth signup/signin/session, collection save, generated record CRUD, media metadata, media object routes, and public collection reads.

## Implemented State

- `drizzle-orm` is installed for `@datamix/web`; `drizzle-kit` is installed as a root dev dependency.
- `apps/web/server/db/schema.ts` defines Better Auth tables and fixed Datamix tables for D1/SQLite.
- `apps/web/server/db/index.ts` exposes the D1 Drizzle DB factory and keeps a small profile seam for future database profiles.
- `apps/web/server/db/auth.ts` wires Better Auth through `drizzleAdapter(db, { provider: "sqlite", schema })`.
- `apps/web/server/db/migrate.ts` owns the conservative fixed-schema bootstrap used by the browser-first setup status route.
- `drizzle.config.ts` and `drizzle/d1` provide the checked-in D1 migration source and generated SQL.
- Root `db:*` scripts generate and apply local/preview/production D1 migrations.
- Fixed-table DB access modules now live under `apps/web/server/db`:
  - `api-keys.ts`
  - `roles.ts`
  - `media-assets.ts`
  - `collection-definitions.ts`
  - `users.ts`
- Fixed-table service paths now use Drizzle for API keys, roles, media metadata, collection-definition list/get, and Better Auth user list/role updates.
- `apps/web/server/db/d1-dialect.ts` centralizes the narrow D1 raw-SQL utilities used by dynamic collection storage.
- Generated collection record table DDL/CRUD remains raw SQL.
- Collection-definition save still keeps its metadata upsert in the same D1 batch as generated-table DDL, preserving the current dynamic schema mutation behavior.

## Target Architecture

### D1-First Runtime Profile

The initial implementation should create a D1/SQLite Drizzle profile.

Expected shape:

- `apps/web/server/db/index.ts`
  - exports `createDb(env)` or `getDb(env)`
  - uses `drizzle-orm/d1`
  - accepts the Cloudflare `DB` binding
  - attaches the fixed Drizzle schema object

- `apps/web/server/db/schema.ts`
  - exports the D1/SQLite schema for fixed tables
  - uses `sqliteTable` and SQLite column builders
  - includes Better Auth tables and Datamix fixed tables

- `apps/web/server/db/auth.ts`
  - owns Better Auth database adapter creation
  - wires `drizzleAdapter(db, { provider: "sqlite", schema })`
  - keeps adapter details out of auth option assembly

- `apps/web/server/db/migrate.ts`
  - owns bootstrap/migration behavior for fixed tables
  - replaces `better-auth/db/migration`
  - should be explicit about whether it is applying checked-in SQL, ensuring known tables, or delegating to a command-driven migration flow

- `drizzle.config.ts`
  - points at the fixed schema file
  - uses SQLite/D1 migration settings for the D1 profile
  - writes migrations to a stable folder such as `drizzle/d1`

### Future Hyperdrive/Postgres Profile

Do not implement this now, but keep seams ready.

Future expected shape:

- `apps/web/server/db/schema.sqlite.ts`
  - D1 schema using `sqliteTable`

- `apps/web/server/db/schema.pg.ts`
  - Postgres schema using `pgTable`

- `apps/web/server/db/index.ts`
  - chooses the active runtime profile from environment or build-time configuration
  - D1 path uses `drizzle-orm/d1`
  - Hyperdrive path uses a Postgres driver such as `pg` or Postgres.js with the Hyperdrive connection string

- `drizzle.d1.config.ts`
  - SQLite/D1 migrations

- `drizzle.pg.config.ts`
  - Postgres migrations

The future target is "swap database profile" rather than "swap one driver only." D1 and Postgres use different SQL dialects, schema builders, migration outputs, and some runtime capabilities.

## Dialect Boundary Rules

Reusable app modules should not directly depend on D1-specific details.

Avoid spreading these through service code:

- `env.DB.prepare(...)`
- `D1DatabaseSession`
- `withSession("first-primary")`
- `PRAGMA table_info(...)`
- D1 `batch` result shapes
- SQLite-specific boolean or JSON assumptions

Prefer:

- `getDb(env)` for fixed-table Drizzle operations
- small repository functions for fixed tables
- a focused raw-SQL dialect helper for dynamic collection storage

Dynamic collection storage may still use raw SQL, but it should gradually be isolated behind a dialect utility:

- `quoteIdentifier(identifier)`
- `createTextColumn()`
- `createIntegerColumn()`
- `createRealColumn()`
- `readTableColumns(database, tableName)`
- `batchStatements(...)`
- `runStatement(...)`

That gives a future Postgres profile one contained place to implement catalog introspection and DDL differences.

## Schema Scope

### Better Auth Tables

Define Drizzle schema for Better Auth tables used by this app. Include the additional Datamix user field:

- `user.role`

The schema must match Better Auth's expected table and field names. Current app code directly queries Better Auth's `user` table and camel-case fields:

- `user`
- `emailVerified`
- `createdAt`
- `updatedAt`

The implementation must preserve those names unless all dependent code is migrated together.

### Fixed Datamix Tables

Define Drizzle schema for:

- `dmx_roles`
- `dmx_api_keys`
- `dmx_media_assets`
- `dmx_collections`

The first implementation does not have to convert every fixed-table query in the same pass, but the schema should exist so later work can migrate service modules incrementally.

### Generated Collection Record Tables

Keep dynamic collection record tables raw SQL in this pass.

Reason:

- table names are admin-defined at runtime
- field columns are admin-defined at runtime
- schema changes include runtime `CREATE TABLE`, `ALTER TABLE ADD COLUMN`, `DROP TABLE`, and introspection
- Drizzle's static schema model does not naturally simplify this slice

## Migration Strategy

The current app bootstraps auth tables through `GET /api/admin/setup/status`. That route is part of the browser-first setup contract.

After moving Better Auth to Drizzle, do not keep using `better-auth/db/migration` for runtime table preparation.

Recommended migration approach for this pass:

1. Add Drizzle schema and checked-in generated SQL migrations for fixed tables.
2. Add package scripts for generating and applying D1 migrations.
3. Update docs so local/preview/production setup includes applying fixed-schema migrations.
4. Keep a minimal runtime guard for first-run setup only if required for the browser-first v0 experience.

The runtime guard should be conservative. It may ensure the fixed schema exists in development/local smoke, but production should prefer explicit checked-in migrations over opaque runtime schema mutation.

Open implementation choice for the agent:

- If keeping fully browser-first setup is still mandatory for production v0, implement an explicit internal bootstrap that applies known checked-in SQL statements from the migration folder or equivalent static SQL constants.
- If command-driven migrations are acceptable before first deploy, update the setup contract and docs accordingly.

Do not silently drop the first-run setup behavior without updating:

- `docs/local-development.md`
- `docs/deploy-runtime-contract.md`
- `README.md` if needed
- smoke harness expectations

## Implementation Sessions

| Session | Goal | Done When | Status |
| --- | --- | --- | --- |
| 1 | Add Drizzle dependencies and schema foundation | Drizzle packages, schema files, DB factory, and config exist without behavior changes | Done |
| 2 | Switch Better Auth to Drizzle adapter | Auth runtime uses `drizzleAdapter`, signup/signin/session still work, Kysely migration helper removed or isolated | Done |
| 3 | Establish fixed-schema migration workflow | Checked-in migrations and scripts/docs exist; setup behavior is explicit and tested | Done |
| 4 | Convert fixed Datamix tables incrementally | At least API keys, roles, media assets, or collection metadata use Drizzle repositories where practical | Done |
| 5 | Isolate dynamic collection raw SQL | Dynamic DDL/CRUD stays raw SQL but moves toward a dialect helper boundary | Done |
| 6 | Verification and documentation | typecheck/build/smoke pass and docs describe the new DB foundation | Done |

## Session Details

### Session 1: Drizzle Foundation

- Install `drizzle-orm`.
- Install `drizzle-kit` as a dev dependency.
- Add a Drizzle config for D1/SQLite.
- Add `apps/web/server/db/schema.ts`.
- Add `apps/web/server/db/index.ts`.
- Add initial table definitions for Better Auth and fixed Datamix tables.
- Keep service modules on their current raw SQL path until the schema compiles and imports cleanly.
- Run typecheck.

### Session 2: Better Auth Adapter

- Import the Better Auth Drizzle adapter.
- Create the Drizzle D1 client from `env.DB`.
- Pass `database: drizzleAdapter(db, { provider: "sqlite", schema })` or the equivalent supported shape into Better Auth options.
- Preserve:
  - base path `/api/auth`
  - email/password auth
  - social provider config
  - `user.role` additional field
  - first-user role assignment
  - invite/password reset behavior
  - background task handling
- Remove or replace `getMigrations(createAuthOptions(env))`.
- Update `getAuthSetupStatus` so it reports setup status without depending on the Kysely migration helper.
- Run smoke through setup, signup, signin, and session checks.

### Session 3: Migration Workflow

- Generate the initial Drizzle migration for fixed tables.
- Add scripts for:
  - generating migrations
  - applying local D1 migrations
  - applying preview/production migrations if appropriate
- Add Wrangler `migrations_dir` if useful for D1 migration application.
- Document required migration commands.
- Decide whether the smoke harness applies migrations before starting the app or the app bootstraps known fixed tables during local smoke.
- Ensure local smoke remains repeatable with a fresh temporary state directory.

### Session 4: Fixed Table Conversion

Convert fixed-table modules only where Drizzle clearly improves maintainability.

Good candidates:

- `apps/web/server/api-keys.ts`
- `apps/web/server/roles.ts`
- `apps/web/server/media.ts`
- `apps/web/server/users.ts`

Guidelines:

- Keep response shapes unchanged.
- Prefer small repository helpers over broad abstractions.
- Avoid converting dynamic collection record CRUD in this session.
- Keep raw SQL if a Drizzle equivalent is less readable for a specific query.

### Session 5: Dynamic Collection Boundary

- Keep generated record-table DDL raw SQL.
- Move repeated SQL utilities toward `apps/web/server/db/dialect.ts` or equivalent.
- Preserve:
  - collection table creation
  - additive field changes
  - empty-table rebuild guard
  - record CRUD behavior
  - public collection API behavior
- Do not add Postgres support yet; only name and shape the seam for later.

### Session 6: Verification and Docs

- Run:
  - `npm run check`
  - `npm run build`
  - `npm run smoke`
- Update docs with the new database foundation:
  - local development
  - deploy/runtime contract
  - architecture overview if needed
  - contributor onboarding if needed
- Update this plan's session statuses if the implementation agent is using it as a tracker.

## Test Plan

Required verification:

- `npm run check`
- `npm run build`
- `npm run smoke`

Verified on 2026-06-08 after implementation.

Smoke coverage must include:

- `GET /api/admin/setup/status` on fresh state
- first admin signup
- admin session read
- sign out
- sign in
- collection definition save
- generated record create/list/update
- media upload/list/object route
- public collection list/detail/record reads

Add focused tests if available for:

- auth setup status without tables
- API key create/update/revoke/authenticate
- custom role save/list/read
- media metadata insert rollback on R2 failure
- collection schema mutation plan behavior

## Risk Register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Better Auth Drizzle schema does not exactly match expected table/field names | signup/session flows break | Keep schema names aligned with current Better Auth tables; verify with smoke before converting other modules |
| Removing runtime auth migrations breaks browser-first setup | fresh instances fail before CLI migration | Decide and document explicit migration/bootstrap behavior before removing `getMigrations` |
| Drizzle D1 migrations and Wrangler local persistence disagree | smoke/dev instability | Keep migration commands documented and make smoke setup deterministic |
| Trying to make D1/Postgres universal too early | broad refactor and slower product work | Implement only D1 now; keep profile seams small and explicit |
| Dynamic collection DDL becomes over-abstracted | harder to reason about schema safety | Keep raw SQL readable; only extract repeated dialect mechanics |

## Acceptance Criteria

- Better Auth runtime uses Drizzle adapter. Done.
- The app has a checked-in Drizzle schema for fixed tables. Done.
- The app has an explicit fixed-schema migration/bootstrap path. Done.
- No current auth, admin, public API, media, or collection behavior regresses. Verified by smoke.
- Dynamic collection record tables remain functional. Verified by smoke.
- `npm run check`, `npm run build`, and `npm run smoke` pass. Done.
- Docs explain how local and deploy-time database setup works. Done.
- The resulting DB module shape can be copied into a future starter-kit app. Done.

## Remaining Work

No required implementation work remains for this plan.

Operational follow-up before real preview/production deploy:

- Replace placeholder Cloudflare D1/R2 IDs and app domains in `apps/web/wrangler.jsonc`.
- Apply fixed-schema D1 migrations with `npm run db:migrate:preview` or `npm run db:migrate:production` before deploying the matching Worker.

Optional future work outside this plan:

- Add focused tests around API key lifecycle, role persistence, media metadata rollback, and collection schema mutation if broader automated coverage becomes useful.
- Add a future Postgres/Hyperdrive profile only when Datamix is ready for that product decision.

## Agent Notes

- Start from the current source, not this plan alone.
- Inspect installed Better Auth adapter types before wiring the adapter.
- Do not assume Better Auth's generated schema names; verify against current table names and current app queries.
- Keep changes small enough that auth can be verified before fixed Datamix table conversion begins.
- If Hyperdrive/Postgres work becomes tempting, stop at the seam. Do not implement it in this pass.
