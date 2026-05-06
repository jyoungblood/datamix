# `@datamix/api`

Minimal Hono API scaffold for Datamix.

This package owns the HTTP surface and now carries the Cloudflare Worker local-dev contract through `wrangler.jsonc`, `.dev.vars`, and generated Worker types.

It is also the only surface that binds to `D1` and `R2` in the v0 deployment contract.
