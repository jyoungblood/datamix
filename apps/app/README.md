# `@datamix/app`

Unified Vinext App Router Worker for Datamix.

This workspace serves the browser-first admin UI and every JSON/auth/media route from
one Cloudflare Worker app. App Router route handlers live under `app/api/**`, shared
server helpers live under `server/**`, and client admin screens live under
`client-pages/**`.

Use `npm run dev --workspace @datamix/app` for local development on
`http://127.0.0.1:3000`.
