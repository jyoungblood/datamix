# 30-Minute Contributor Onboarding

This guide is the fastest path from fresh clone to productive context in Datamix.

## Before You Start

- Use `Node.js 22+` and the repo's `npm` workspace setup.
- Expect a Cloudflare-only architecture even in local development.
- Keep these docs open:
  [README.md](/Users/jy/Desktop/projects/datamix/README.md:1),
  [docs/architecture-overview.md](/Users/jy/Desktop/projects/datamix/docs/architecture-overview.md:1),
  [docs/local-development.md](/Users/jy/Desktop/projects/datamix/docs/local-development.md:1),
  [docs/v1-contact-form-scope.md](/Users/jy/Desktop/projects/datamix/docs/v1-contact-form-scope.md:1),
  [docs/v1-deferred-epics.md](/Users/jy/Desktop/projects/datamix/docs/v1-deferred-epics.md:1),
  [docs/v0-cut-review.md](/Users/jy/Desktop/projects/datamix/docs/v0-cut-review.md:1)

## 0-5 Minutes: Read the Shape

1. Read the short architecture map in [docs/architecture-overview.md](/Users/jy/Desktop/projects/datamix/docs/architecture-overview.md:1).
2. Skim the product rules in [datamix-roadmap-tracker.md](/Users/jy/Desktop/projects/datamix/_ref/datamix-roadmap-tracker.md:1).
3. Keep two constraints in mind:
   Cloudflare-only is intentional, and the collection schema is also the record form contract.

## 5-10 Minutes: Install And Configure

From the repo root:

```bash
npm install
cp apps/app/.dev.vars.example apps/app/.dev.vars
```

Then make the minimum local edits:

- Replace `BETTER_AUTH_SECRET` in `apps/app/.dev.vars` with a long random string.
- Keep `APP_ORIGIN=http://127.0.0.1:3000` unless you intentionally change ports.
- Leave the email provider placeholders as-is unless you are actively working on invite or password-reset delivery. Basic setup and most UI work do not require real provider credentials.

## 10-20 Minutes: Run The App

Use one terminal from the repo root:

1. `npm run dev`

Then open:

- `http://127.0.0.1:3000/` for the splash page
- `http://127.0.0.1:3000/admin/setup` for the first-run admin bootstrap
- `http://127.0.0.1:3000/admin/login` after the first account exists
- `http://127.0.0.1:3000/api/health` to confirm the Worker is up

What to notice:

- First-run setup is browser-first and closes public sign-up after the first admin is created.
- The admin and API share one origin locally and in deployment.
- D1 and R2 stay behind the Worker boundary.

## 20-25 Minutes: Run The Confidence Checks

From the repo root:

```bash
npm run check
npm run build
npm run smoke
```

What each command tells you:

- `npm run check` verifies TypeScript for the unified app.
- `npm run build` confirms the app builds cleanly.
- `npm run smoke` covers first-run setup, login, collection CRUD, record CRUD, media upload/object access, and public JSON routes.

Smoke note:
`npm run smoke` starts its own unified local app. You do not need a separate `npm run dev` session for that command.

## 25-30 Minutes: Learn The Main Paths

- If you are changing admin UI or client fetch behavior:
  Start in [apps/app/client-pages/admin-dashboard.tsx](/Users/jy/Desktop/projects/datamix/apps/app/client-pages/admin-dashboard.tsx:1) and the matching helper in `apps/app/lib/`.
- If you are changing auth or session behavior:
  Start in [apps/app/server/auth.ts](/Users/jy/Desktop/projects/datamix/apps/app/server/auth.ts:1), [apps/app/server/routes/auth-handlers.ts](/Users/jy/Desktop/projects/datamix/apps/app/server/routes/auth-handlers.ts:1), [apps/app/server/routes/admin-auth.ts](/Users/jy/Desktop/projects/datamix/apps/app/server/routes/admin-auth.ts:1), and [apps/app/lib/session.ts](/Users/jy/Desktop/projects/datamix/apps/app/lib/session.ts:1).
- If you are changing collection schema or record behavior:
  Start in [packages/core/src/collections.ts](/Users/jy/Desktop/projects/datamix/packages/core/src/collections.ts:1), [apps/app/server/collections.ts](/Users/jy/Desktop/projects/datamix/apps/app/server/collections.ts:1), and [apps/app/server/records.ts](/Users/jy/Desktop/projects/datamix/apps/app/server/records.ts:1).
- If you are changing media:
  Start in [packages/core/src/media.ts](/Users/jy/Desktop/projects/datamix/packages/core/src/media.ts:1), [apps/app/server/media.ts](/Users/jy/Desktop/projects/datamix/apps/app/server/media.ts:1), [apps/app/server/routes/media-handlers.ts](/Users/jy/Desktop/projects/datamix/apps/app/server/routes/media-handlers.ts:1), and [apps/app/lib/media.ts](/Users/jy/Desktop/projects/datamix/apps/app/lib/media.ts:1).
- If you are changing the secondary bootstrap path:
  Start in [packages/create-datamix/src/index.ts](/Users/jy/Desktop/projects/datamix/packages/create-datamix/src/index.ts:1) and [scripts/build-create-datamix-template.mjs](/Users/jy/Desktop/projects/datamix/scripts/build-create-datamix-template.mjs:1).

## Working Rules For Contributions

- Preserve Cloudflare-only deployment and the current session/auth flow.
- Avoid premature abstractions, generic policy engines, or cross-cutting rewrites.
- Keep runtime contracts stable unless a small enabling change is clearly justified.
- Treat contact-form and generic submission processing as v1-only backend scope, not a v0 builder feature.
- Treat the rest of the v1 parking lot as deferred product direction, not silent implementation scope.
- Use the final cut review note as the default tie-breaker when new scope questions come up close to launch.
- Run the root checks before handing work back.
- Update docs when setup steps, route contracts, or contributor expectations change.
