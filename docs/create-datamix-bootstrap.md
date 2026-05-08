# Secondary Bootstrap Path

Datamix v0 is still designed around a browser-first Cloudflare deploy flow. The `create-datamix` package is a secondary path for contributors or teams who want a local scaffold first and are comfortable continuing with Cloudflare provisioning from the terminal.

## Intent

- Keep the browser-first deploy path as the primary onboarding story.
- Offer a local scaffold for teams who want to start from a working repository shape.
- Avoid inventing a second runtime model or a non-Cloudflare deployment path.

## Current Usage

From the published package, the intended shape is:

```bash
npx create-datamix@latest my-project --deploy
```

Inside this repository while developing the bootstrap path, use:

```bash
npm run build --workspace create-datamix
node packages/create-datamix/dist/index.js my-project --deploy
```

## What It Does

- Copies a clean Datamix workspace template without local build artifacts or machine-specific env files.
- Stamps the root package name from the target directory name.
- Rewrites Cloudflare resource names in `apps/api/wrangler.jsonc` and `apps/admin/wrangler.pages.jsonc.example` to match the new project slug.
- Prints the next Cloudflare provisioning commands when `--deploy` is passed.

## What It Deliberately Does Not Do Yet

- It does not replace the browser-first first-run admin setup flow.
- It does not provision Cloudflare resources automatically.
- It does not introduce a non-Cloudflare deployment story.
- It does not try to outgrow the current repo shape with a generic template engine.
