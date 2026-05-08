# 30-Minute Contributor Onboarding

This guide is the fastest path from fresh clone to productive context in Datamix.

## Before You Start

- Use `Node.js 22+` and the repo's `npm` workspace setup.
- Expect a Cloudflare-only architecture even in local development.
- Keep these docs open:
  [README.md](/Users/jy/Desktop/projects/datamix/README.md:1),
  [docs/architecture-overview.md](/Users/jy/Desktop/projects/datamix/docs/architecture-overview.md:1),
  [docs/local-development.md](/Users/jy/Desktop/projects/datamix/docs/local-development.md:1),
  [docs/v1-contact-form-scope.md](/Users/jy/Desktop/projects/datamix/docs/v1-contact-form-scope.md:1)

## 0-5 Minutes: Read the Shape

1. Read the short architecture map in [docs/architecture-overview.md](/Users/jy/Desktop/projects/datamix/docs/architecture-overview.md:1).
2. Skim the product rules in [datamix-roadmap-tracker.md](/Users/jy/Desktop/projects/datamix/_ref/datamix-roadmap-tracker.md:1).
3. Keep two constraints in mind:
   Cloudflare-only is intentional, and the collection schema is also the record form contract.

## 5-10 Minutes: Install and Configure

From the repo root:

```bash
npm install
cp apps/api/.dev.vars.example apps/api/.dev.vars
cp apps/admin/.env.example apps/admin/.env.local
```

Then make the minimum local edits:

- Replace `BETTER_AUTH_SECRET` in `apps/api/.dev.vars` with a long random string.
- Keep `ADMIN_ORIGIN=http://127.0.0.1:3000` and `NEXT_PUBLIC_API_ORIGIN=http://127.0.0.1:8787` unless you intentionally change ports.
- Leave the email provider placeholders as-is unless you are actively working on invite or password-reset delivery. Basic setup and most UI work do not require real provider credentials.

## 10-20 Minutes: Run the App

Use two terminals from the repo root:

1. `npm run dev:api`
2. `npm run dev:admin`

Then open:

- `http://127.0.0.1:3000/setup` for the first-run admin bootstrap
- `http://127.0.0.1:3000/login` after the first account exists
- `http://127.0.0.1:8787/health` to confirm the Worker is up

What to notice:

- First-run setup is browser-first and closes public sign-up after the first admin is created.
- The admin always talks to the API origin for auth and data.
- D1 and R2 stay behind the Worker boundary.

## 20-25 Minutes: Run the Confidence Checks

From the repo root:

```bash
npm run check
npm run build
npm run smoke
```

What each command tells you:

- `npm run check` verifies TypeScript across all workspaces.
- `npm run build` confirms the admin and API still build cleanly.
- `npm run smoke` covers first-run setup, login, collection CRUD, record CRUD, media upload/object access, and public JSON routes.

Smoke note:
`npm run smoke` starts its own local admin dev server and runs the API in-process through Miniflare. You do not need a separate `npm run dev:api` session for that command.

## 25-30 Minutes: Learn the Main Seams

- If you are changing admin UI or client fetch behavior:
  Start in [apps/admin/pages/admin.tsx](/Users/jy/Desktop/projects/datamix/apps/admin/pages/admin.tsx:1) and the matching helper in `apps/admin/lib/`.
- If you are changing auth or session behavior:
  Start in [apps/api/src/auth.ts](/Users/jy/Desktop/projects/datamix/apps/api/src/auth.ts:1), [apps/api/src/auth-guard.ts](/Users/jy/Desktop/projects/datamix/apps/api/src/auth-guard.ts:1), and [apps/admin/lib/session.ts](/Users/jy/Desktop/projects/datamix/apps/admin/lib/session.ts:1).
- If you are changing collection schema or record behavior:
  Start in [packages/core/src/collections.ts](/Users/jy/Desktop/projects/datamix/packages/core/src/collections.ts:1), [apps/api/src/collections.ts](/Users/jy/Desktop/projects/datamix/apps/api/src/collections.ts:1), and [apps/api/src/records.ts](/Users/jy/Desktop/projects/datamix/apps/api/src/records.ts:1).
- If you are changing media:
  Start in [packages/core/src/media.ts](/Users/jy/Desktop/projects/datamix/packages/core/src/media.ts:1), [apps/api/src/media.ts](/Users/jy/Desktop/projects/datamix/apps/api/src/media.ts:1), and [apps/admin/lib/media.ts](/Users/jy/Desktop/projects/datamix/apps/admin/lib/media.ts:1).
- If you are changing the secondary bootstrap path:
  Start in [packages/create-datamix/src/index.ts](/Users/jy/Desktop/projects/datamix/packages/create-datamix/src/index.ts:1) and [scripts/build-create-datamix-template.mjs](/Users/jy/Desktop/projects/datamix/scripts/build-create-datamix-template.mjs:1).

## Working Rules for Contributions

- Preserve Cloudflare-only deployment and the current session/auth flow.
- Avoid premature abstractions, generic policy engines, or cross-cutting rewrites.
- Keep runtime contracts stable unless a small enabling change is clearly justified.
- Treat contact-form and generic submission processing as v1-only backend scope, not a v0 builder feature.
- Run the root checks before handing work back.
- Update docs when setup steps, route contracts, or contributor expectations change.
