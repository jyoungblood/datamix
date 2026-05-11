# `@datamix/api`

Minimal Hono API scaffold for Datamix.

This package owns the Cloudflare Worker runtime contract through `wrangler.jsonc`, `.dev.vars`, and generated Worker types.

It serves the admin assets, exposes the JSON routes, and is the only surface that binds to `D1` and `R2` in the v0 deployment contract.
