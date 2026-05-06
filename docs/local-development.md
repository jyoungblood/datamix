# Local Development

Datamix is intentionally Cloudflare-only in v0. We do not maintain a separate "generic Node deployment" story and we do not treat Cloudflare support as an adapter layer to add later.

## Current contract

- `apps/api` runs through `wrangler dev` on `http://127.0.0.1:8787`
- `apps/admin` runs through `vinext dev --port 3000` on `http://127.0.0.1:3000`
- The admin talks to the API through `NEXT_PUBLIC_API_ORIGIN`
- Preview and production topology is documented separately in [deploy-runtime-contract.md](/Users/jy/Desktop/projects/datamix/docs/deploy-runtime-contract.md:1)

## First-time setup

1. Run `npm install` from the repo root.
2. Copy `apps/api/.dev.vars.example` to `apps/api/.dev.vars`.
3. Copy `apps/admin/.env.example` to `apps/admin/.env.local`.
4. Run `npm run typegen:api` once after changing `apps/api/wrangler.jsonc`.

## Daily workflow

Use two terminals from the repo root:

1. `npm run dev:api`
2. `npm run dev:admin`

Then open `http://127.0.0.1:3000`.

## Why the files live where they do

- `apps/api/.dev.vars` belongs next to `apps/api/wrangler.jsonc` because Wrangler loads local Worker variables from the Worker directory.
- `apps/admin/.env.local` belongs next to the Vinext app because the admin reads public browser-facing variables at build/dev time.

## Typed env expectations

- Worker bindings and runtime types are generated into `apps/api/worker-configuration.d.ts` via `wrangler types`.
- Admin public env is typed in `apps/admin/types/env.d.ts`.
- Shared env shapes live in `packages/core` so both surfaces reference the same vocabulary.

## Deliberate non-goals for this slice

- No Cloudflare resource bindings yet for D1, R2, KV, or Queues
- No deploy scripts or environment-specific deployment topology
- No auth secrets or product feature env yet

Those land in later slices once the runtime contract is concrete.
