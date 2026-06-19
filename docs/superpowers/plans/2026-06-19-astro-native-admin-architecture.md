# Astro-Native Admin Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Astro web app into an Astro-native source layout, convert auth/setup routes to Astro templates, and move authenticated workspace chrome into Astro while retaining React for provider-backed route bodies.

**Architecture:** `apps/web/src/pages/**` remains the only routed surface. Shared app code moves under `apps/web/src/**` with `@/*` resolving to `src/*`. Auth pages become Astro templates plus small DOM scripts, and workspace routes render an Astro shell/sidebar around a React island containing `AdminWorkspaceProvider`, command palette, and route body content.

**Tech Stack:** Astro 6, `@astrojs/cloudflare`, `@astrojs/react`, React 19 for retained islands, Tailwind CSS 4 Vite plugin, Better Auth, Cloudflare Workers, D1, R2, Drizzle, Node test runner.

---

## Design Reference

Read this first:

- `docs/superpowers/specs/2026-06-19-astro-native-admin-architecture-design.md`

Ground rules:

- Do not use the Browser skill for preview/debugging. Ask the user to verify UI behavior.
- Keep implementation slices independently commit-ready.
- Run the targeted failing test before each slice implementation.
- Run `npm run typecheck --workspace @datamix/web` and `npm run build --workspace @datamix/web` before committing each slice when feasible.
- Use `git mv` for relocations so history stays readable.

## File Structure Map

Create or modify these source locations:

- `apps/web/astro.config.mjs`: update `@` alias to `apps/web/src`.
- `apps/web/tsconfig.json`: include only source-rooted app code plus generated Worker types.
- `apps/web/src/admin/**`: moved retained React admin workspace code.
- `apps/web/src/admin/islands/**`: React island wrappers for retained workspace route bodies.
- `apps/web/src/components/auth/AuthCard.astro`: shared Astro auth card template.
- `apps/web/src/components/admin/AdminWorkspaceShell.astro`: Astro workspace shell.
- `apps/web/src/components/admin/AdminWorkspaceSidebar.astro`: Astro workspace sidebar.
- `apps/web/src/components/**`: moved React UI primitives and loader components still used by retained islands.
- `apps/web/src/lib/**`: moved client/runtime helpers.
- `apps/web/src/scripts/admin-auth/**`: DOM scripts for auth forms.
- `apps/web/src/server/**`: moved Worker route handlers and domain services.
- `apps/web/src/styles/**`: moved global and editor CSS.
- `apps/web/src/pages/admin/**`: Astro pages for auth and workspace routes.
- `apps/web/src/pages/api/**`: existing API endpoints with imports updated to `@/server/**`.
- `tests/ux/**`: source-layout and UX inventory tests.
- `docs/architecture-overview.md`, `docs/local-development.md`, `docs/contributor-onboarding.md`: source layout documentation.

Delete after replacement:

- `apps/web/src/admin/islands/auth-routes.tsx`
- `apps/web/src/admin/_screens/login.tsx`
- `apps/web/src/admin/_screens/setup.tsx`
- `apps/web/src/admin/_screens/forgot-password.tsx`
- `apps/web/src/admin/_screens/reset-password.tsx`
- `apps/web/src/admin/_workspace/admin-workspace-route-frame.tsx`
- `apps/web/src/admin/_components/admin-frame.tsx`
- root source directories after `git mv`: `apps/web/app`, `apps/web/components`, `apps/web/lib`, `apps/web/server`, `apps/web/styles`, `apps/web/types`

## Task 1: Astro Source Tree Relocation

**Files:**

- Create: `tests/ux/astro-source-layout.test.mjs`
- Move: `apps/web/app/admin` to `apps/web/src/admin`
- Move: `apps/web/src/admin-routes` to `apps/web/src/admin/islands`
- Move: `apps/web/components` to `apps/web/src/components`
- Move: `apps/web/lib` to `apps/web/src/lib`
- Move: `apps/web/server` to `apps/web/src/server`
- Move: `apps/web/styles` to `apps/web/src/styles`
- Move: `apps/web/types` to `apps/web/src/types`
- Modify: `apps/web/astro.config.mjs`
- Modify: `apps/web/tsconfig.json`
- Modify: `apps/web/src/layouts/DatamixRootLayout.astro`
- Modify: `apps/web/src/pages/**/*.astro`
- Modify: `apps/web/src/pages/api/**/*.ts`
- Modify: `tests/ux/*.test.mjs`
- Modify: `docs/architecture-overview.md`
- Modify: `docs/local-development.md`
- Modify: `docs/contributor-onboarding.md`
- Test: `node tests/ux/astro-source-layout.test.mjs`
- Test: `npm run typecheck --workspace @datamix/web`
- Test: `npm run build --workspace @datamix/web`

- [ ] **Step 1: Write the failing source layout test**

Create `tests/ux/astro-source-layout.test.mjs`:

```js
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const webRoot = path.join(repoRoot, "apps/web");
const srcRoot = path.join(webRoot, "src");

const requiredSourceRoots = [
  "admin",
  "components",
  "lib",
  "pages",
  "server",
  "styles",
  "types",
];

const forbiddenRootPaths = [
  "app",
  "components",
  "lib",
  "server",
  "styles",
  "types",
];

const forbiddenImportPatterns = [
  /@\/app\/admin\//,
  /@\/src\/admin-routes\//,
  /from ["']\.\.\/\.\.\/components\//,
  /from ["']\.\.\/\.\.\/lib\//,
  /from ["']\.\.\/\.\.\/server\//,
];

function walkFiles(directory) {
  const entries = readdirSync(directory);
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry);
    const stats = statSync(entryPath);

    if (stats.isDirectory()) {
      if ([".astro", ".wrangler", "dist", "node_modules"].includes(entry)) {
        continue;
      }

      files.push(...walkFiles(entryPath));
      continue;
    }

    if (/\.(astro|css|d\.ts|mjs|ts|tsx)$/.test(entry)) {
      files.push(entryPath);
    }
  }

  return files;
}

for (const sourceRoot of requiredSourceRoots) {
  assert.ok(
    existsSync(path.join(srcRoot, sourceRoot)),
    `apps/web/src/${sourceRoot} should exist after the Astro source relocation.`,
  );
}

for (const rootPath of forbiddenRootPaths) {
  assert.ok(
    !existsSync(path.join(webRoot, rootPath)),
    `apps/web/${rootPath} should be moved under apps/web/src/${rootPath}.`,
  );
}

const astroConfig = readFileSync(path.join(webRoot, "astro.config.mjs"), "utf8");
const tsconfig = readFileSync(path.join(webRoot, "tsconfig.json"), "utf8");

assert.match(
  astroConfig,
  /new URL\("\.\/src", import\.meta\.url\)/,
  "The Vite @ alias should resolve to apps/web/src.",
);

assert.match(
  tsconfig,
  /"@\/\*": \["\.\/src\/\*"\]/,
  "The TypeScript @ alias should resolve to apps/web/src.",
);

assert.doesNotMatch(
  tsconfig,
  /"(app\/admin|components\/|lib\/|server\/|styles\/|types\/)/,
  "TypeScript should include moved source through src globs, not old root paths.",
);

const sourceFiles = [
  ...walkFiles(srcRoot),
  ...walkFiles(path.join(repoRoot, "tests")),
  path.join(repoRoot, "docs/architecture-overview.md"),
  path.join(repoRoot, "docs/local-development.md"),
  path.join(repoRoot, "docs/contributor-onboarding.md"),
];

for (const sourceFile of sourceFiles) {
  const source = readFileSync(sourceFile, "utf8");

  for (const pattern of forbiddenImportPatterns) {
    assert.doesNotMatch(
      source,
      pattern,
      `${path.relative(repoRoot, sourceFile)} should not reference pre-relocation imports.`,
    );
  }
}
```

- [ ] **Step 2: Run the failing source layout test**

Run:

```bash
node tests/ux/astro-source-layout.test.mjs
```

Expected: FAIL with `apps/web/src/admin should exist after the Astro source relocation.`

- [ ] **Step 3: Move source directories with git history**

Run:

```bash
git mv apps/web/app/admin apps/web/src/admin
git mv apps/web/src/admin-routes apps/web/src/admin/islands
git mv apps/web/components apps/web/src/components
git mv apps/web/lib apps/web/src/lib
git mv apps/web/server apps/web/src/server
git mv apps/web/styles apps/web/src/styles
git mv apps/web/types apps/web/src/types
```

Expected: all commands exit `0`.

- [ ] **Step 4: Remove the now-empty legacy app directory**

Run:

```bash
rmdir apps/web/app/loader/demo
rmdir apps/web/app/loader
rmdir apps/web/app
```

Expected: each command exits `0`. If a command fails because a file remains, inspect `find apps/web/app -maxdepth 3 -type f -print`, move any remaining intentional source file under `apps/web/src`, then retry the `rmdir` commands from deepest directory to shallowest directory.

- [ ] **Step 5: Update the Astro alias**

Edit `apps/web/astro.config.mjs` so the alias block is:

```js
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
```

- [ ] **Step 6: Replace the TypeScript include and alias config**

Edit `apps/web/tsconfig.json` to:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "lib": ["DOM", "DOM.Iterable", "ES2023"],
    "paths": {
      "@/*": ["./src/*"]
    },
    "rootDir": ".",
    "types": ["node"],
    "tsBuildInfoFile": "./tsconfig.tsbuildinfo"
  },
  "include": [
    ".astro/types.d.ts",
    "src/**/*.astro",
    "src/**/*.css",
    "src/**/*.d.ts",
    "src/**/*.ts",
    "src/**/*.tsx",
    "worker-configuration.d.ts"
  ],
  "exclude": ["dist"]
}
```

- [ ] **Step 7: Update imports after the move**

Use `rg` to find and edit all moved import paths:

```bash
rg -n "@/app/admin|@/src/admin-routes|\\.\\./\\.\\./styles|apps/web/app/admin|apps/web/components|apps/web/lib|apps/web/server|apps/web/styles|apps/web/types" apps/web/src tests docs
```

Required replacements:

- `@/app/admin/` becomes `@/admin/`.
- `@/src/admin-routes/` becomes `@/admin/islands/`.
- `../../styles/globals.css` in `src/layouts/DatamixRootLayout.astro` becomes `../styles/globals.css`.
- Test and doc path strings for admin code become `apps/web/src/admin/**`.
- Test and doc path strings for shared components become `apps/web/src/components/**`.
- Test and doc path strings for client helpers become `apps/web/src/lib/**`.
- Test and doc path strings for server code become `apps/web/src/server/**`.
- Test and doc path strings for styles become `apps/web/src/styles/**`.

- [ ] **Step 8: Keep the temporary React bridge compiling at its new path**

Confirm these files exist after edits:

```text
apps/web/src/admin/islands/workspace-routes.tsx
apps/web/src/admin/islands/auth-routes.tsx
```

They should still import retained screens from `@/admin/_screens/**` and workspace provider code from `@/admin/_workspace/**`.

- [ ] **Step 9: Run the source layout test again**

Run:

```bash
node tests/ux/astro-source-layout.test.mjs
```

Expected: PASS with no output.

- [ ] **Step 10: Run typecheck**

Run:

```bash
npm run typecheck --workspace @datamix/web
```

Expected: exit code `0`.

- [ ] **Step 11: Run build**

Run:

```bash
npm run build --workspace @datamix/web
```

Expected: exit code `0`.

- [ ] **Step 12: Commit Slice 1**

Run:

```bash
git add apps/web docs tests
git commit -m "refactor: move web app source under astro src"
```

Expected: commit succeeds.

## Task 2: Auth Pages As Astro Templates

**Files:**

- Create: `apps/web/src/components/auth/AuthCard.astro`
- Create: `apps/web/src/scripts/admin-auth/login.ts`
- Create: `apps/web/src/scripts/admin-auth/setup.ts`
- Create: `apps/web/src/scripts/admin-auth/forgot-password.ts`
- Create: `apps/web/src/scripts/admin-auth/reset-password.ts`
- Create: `apps/web/src/server/routes/astro-auth-page.ts`
- Modify: `apps/web/src/pages/admin/login.astro`
- Modify: `apps/web/src/pages/admin/setup.astro`
- Modify: `apps/web/src/pages/admin/forgot-password.astro`
- Modify: `apps/web/src/pages/admin/reset-password.astro`
- Modify: `apps/web/src/server/routes/astro-admin-page-inventory.test.ts`
- Delete: `apps/web/src/admin/islands/auth-routes.tsx`
- Delete: `apps/web/src/admin/_screens/login.tsx`
- Delete: `apps/web/src/admin/_screens/setup.tsx`
- Delete: `apps/web/src/admin/_screens/forgot-password.tsx`
- Delete: `apps/web/src/admin/_screens/reset-password.tsx`
- Test: `node --import tsx apps/web/src/server/routes/astro-admin-page-inventory.test.ts`
- Test: `npm run typecheck --workspace @datamix/web`
- Test: `npm run build --workspace @datamix/web`

- [ ] **Step 1: Update the admin page inventory test for Astro auth pages**

In `apps/web/src/server/routes/astro-admin-page-inventory.test.ts`, split expectations into workspace and auth routes. The auth route assertion must require:

```ts
assert.doesNotMatch(
  source,
  /client:only="react"/,
  `${route} should not mount a React client-only island`,
);
assert.doesNotMatch(
  source,
  /auth-routes/,
  `${route} should not import the temporary auth route bridge`,
);
assert.match(
  source,
  /AuthCard/,
  `${route} should use the shared Astro auth card template`,
);
assert.match(
  source,
  /data-auth-page=/,
  `${route} should expose a stable auth page hook for its DOM script`,
);
```

- [ ] **Step 2: Run the failing auth inventory test**

Run:

```bash
node --import tsx apps/web/src/server/routes/astro-admin-page-inventory.test.ts
```

Expected: FAIL because auth pages still mount `client:only="react"`.

- [ ] **Step 3: Create the shared Astro auth card**

Create `apps/web/src/components/auth/AuthCard.astro`:

```astro
---
type Props = {
  description?: string;
  label: string;
  title: string;
};

const { description, label, title } = Astro.props;
---

<main
  class="min-h-svh bg-[var(--sidebar)] px-4 py-8 sm:px-6 lg:px-8"
  data-page-canvas="sidebar"
>
  <div class="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-lg items-center">
    <section class="w-full rounded-lg border border-border/70 bg-card text-card-foreground shadow-sm">
      <header class="flex flex-col gap-4 p-6">
        <span class="inline-flex w-fit items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold text-foreground">
          {label}
        </span>
        <div class="space-y-1.5">
          <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          {description ? (
            <p class="max-w-prose text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </header>
      <div class="space-y-6 p-6 pt-0">
        <slot />
      </div>
    </section>
  </div>
</main>
```

- [ ] **Step 4: Create server helpers for auth page checks**

Create `apps/web/src/server/routes/astro-auth-page.ts` with helpers that use `getDatamixEnv()`, `getAuthSetupStatus()`, and `createAuth()` to read setup status and session from `Astro.request.headers`. Export:

```ts
export type AuthPageState = {
  oauthProviders: { enabled: boolean; id: string; label: string }[];
  setupError: string | null;
  setupStatusCode: number | null;
  setupRequired: boolean | null;
};
```

Required functions:

- `readLocalNextPath(url: URL)`: returns `next` only when it starts with `/`, otherwise returns `/admin`.
- `resolveLoginPageState(request: Request, url: URL)`: returns `{ redirect: string }` for setup-required or existing session; otherwise returns `{ state: AuthPageState }`.
- `resolveSetupPageState(request: Request)`: returns `{ redirect: string }` for existing session or completed setup; otherwise returns `{ state: AuthPageState }`.

- [ ] **Step 5: Convert login page to Astro**

Replace `apps/web/src/pages/admin/login.astro` with an Astro template that:

- imports `AuthCard`,
- imports `DatamixRootLayout`,
- imports `resolveLoginPageState`,
- returns `Astro.redirect(result.redirect)` when redirect is present,
- renders OAuth buttons from `state.oauthProviders.filter((provider) => provider.enabled)`,
- renders email/password fields with ids `email` and `password`,
- renders an alert element with `data-auth-error` and `role="alert"`,
- includes `<script>import "@/scripts/admin-auth/login";</script>`,
- sets `data-auth-page="login"` on the form container.

- [ ] **Step 6: Convert setup page to Astro**

Replace `apps/web/src/pages/admin/setup.astro` with an Astro template that:

- imports `AuthCard`,
- imports `DatamixRootLayout`,
- imports `resolveSetupPageState`,
- redirects when the helper returns a redirect,
- renders fields `name`, `email`, `password`, and `confirm-password`,
- renders an alert element with `data-auth-error` and `role="alert"`,
- includes `<script>import "@/scripts/admin-auth/setup";</script>`,
- sets `data-auth-page="setup"` on the form container.

- [ ] **Step 7: Convert forgot-password page to Astro**

Replace `apps/web/src/pages/admin/forgot-password.astro` with an Astro template that:

- imports `AuthCard` and `DatamixRootLayout`,
- renders the existing reset-request copy,
- renders an email field with id `email`,
- renders a hidden success alert with `data-auth-success`,
- renders an alert element with `data-auth-error` and `role="alert"`,
- includes `<script>import "@/scripts/admin-auth/forgot-password";</script>`,
- sets `data-auth-page="forgot-password"` on the form container.

- [ ] **Step 8: Convert reset-password page to Astro**

Replace `apps/web/src/pages/admin/reset-password.astro` with an Astro template that:

- reads `token`, `email`, `mode`, and `error` from `Astro.url.searchParams`,
- renders the invite heading when `mode=invite`,
- stores the token in a hidden input with id `token`,
- renders password fields with ids `new-password` and `confirm-password`,
- renders a hidden success alert with `data-auth-success`,
- renders an alert element with `data-auth-error` and `role="alert"`,
- includes `<script>import "@/scripts/admin-auth/reset-password";</script>`,
- sets `data-auth-page="reset-password"` on the form container.

- [ ] **Step 9: Create DOM auth scripts**

Create scripts under `apps/web/src/scripts/admin-auth/**` that use plain DOM APIs and `authClient` from `@/lib/auth-client`.

Shared requirements:

- prevent duplicate form submission with a disabled submit button,
- write failed Better Auth messages into `[data-auth-error]`,
- remove `hidden` from success alerts after successful non-redirect flows,
- redirect with `window.location.replace()` for local app redirects,
- use `new URL(path, window.location.origin).toString()` for Better Auth callback URLs.

Each script should call the matching Better Auth client method:

- `login.ts`: `authClient.signIn.email()` and `authClient.signIn.social()`.
- `setup.ts`: `authClient.signUp.email()`.
- `forgot-password.ts`: `authClient.requestPasswordReset()`.
- `reset-password.ts`: `authClient.resetPassword()`.

- [ ] **Step 10: Delete the replaced React auth bridge**

Run:

```bash
git rm apps/web/src/admin/islands/auth-routes.tsx
git rm apps/web/src/admin/_screens/login.tsx
git rm apps/web/src/admin/_screens/setup.tsx
git rm apps/web/src/admin/_screens/forgot-password.tsx
git rm apps/web/src/admin/_screens/reset-password.tsx
```

Expected: all commands exit `0`.

- [ ] **Step 11: Run the auth inventory test**

Run:

```bash
node --import tsx apps/web/src/server/routes/astro-admin-page-inventory.test.ts
```

Expected: PASS.

- [ ] **Step 12: Run typecheck and build**

Run:

```bash
npm run typecheck --workspace @datamix/web
npm run build --workspace @datamix/web
```

Expected: both commands exit `0`.

- [ ] **Step 13: Commit Slice 2**

Run:

```bash
git add apps/web
git commit -m "refactor: render admin auth pages with astro"
```

Expected: commit succeeds.

## Task 3: Astro Workspace Shell

**Files:**

- Create: `apps/web/src/components/admin/AdminWorkspaceShell.astro`
- Create: `apps/web/src/components/admin/AdminWorkspaceSidebar.astro`
- Create: `apps/web/src/server/routes/astro-workspace-page.ts`
- Create: `apps/web/src/admin/islands/workspace-body-routes.tsx`
- Modify: `apps/web/src/admin/islands/workspace-routes.tsx`
- Modify: `apps/web/src/admin/_workspace/admin-workspace-provider.tsx`
- Modify: `apps/web/src/admin/_workspace/admin-routes.ts`
- Modify: `apps/web/src/admin/_screens/*.tsx`
- Modify: `apps/web/src/pages/admin/**/*.astro`
- Modify: `apps/web/src/server/routes/astro-admin-page-inventory.test.ts`
- Delete: `apps/web/src/admin/_workspace/admin-workspace-route-frame.tsx`
- Delete: `apps/web/src/admin/_components/admin-frame.tsx`
- Test: `node --import tsx apps/web/src/server/routes/astro-admin-page-inventory.test.ts`
- Test: `npm run typecheck --workspace @datamix/web`
- Test: `npm run build --workspace @datamix/web`

- [ ] **Step 1: Extend the admin page inventory test for the workspace shell**

Update `apps/web/src/server/routes/astro-admin-page-inventory.test.ts` so workspace page assertions require:

```ts
assert.match(
  source,
  /AdminWorkspaceShell/,
  `${route} should render the Astro workspace shell`,
);
assert.match(
  source,
  new RegExp(`<${island}\\b[^>]*client:only="react"`),
  `${route} should mount ${island} as the retained React body island`,
);
```

Add a route-body source assertion that reads every retained workspace screen and requires:

```ts
assert.doesNotMatch(
  source,
  /AdminWorkspaceRouteFrame|AdminFrame/,
  `${screenPath} should not render the workspace shell from React`,
);
```

- [ ] **Step 2: Run the failing workspace shell test**

Run:

```bash
node --import tsx apps/web/src/server/routes/astro-admin-page-inventory.test.ts
```

Expected: FAIL because workspace pages still use only the React route frame.

- [ ] **Step 3: Create the workspace page resolver**

Create `apps/web/src/server/routes/astro-workspace-page.ts` with:

- `resolveWorkspacePage(request: Request, route: AdminWorkspaceRoute)`,
- `WorkspaceShellProps` containing `account`, `activeSection`, `routes`, and `title`,
- redirect to `/admin/setup` when setup is required,
- redirect to `/admin/login?next=<current path>` when session is unauthorized,
- error state for auth-config or authorization failures,
- account summary derived from `access.session.user` and `access.authorization.role.label`.

- [ ] **Step 4: Create Astro sidebar and shell components**

Create `AdminWorkspaceSidebar.astro` and `AdminWorkspaceShell.astro` under `apps/web/src/components/admin`.

Required markup:

- outer shell has `class="flex min-h-screen bg-[var(--background)] font-body text-[var(--foreground)]"` and `data-page-canvas="muted"`,
- sidebar has `class="sticky top-0 flex h-screen w-[176px] shrink-0 flex-col overflow-y-auto bg-[var(--sidebar)] px-4 py-[18px] text-[var(--sidebar-foreground)]"`,
- nav links use normal `<a>` elements,
- active links set `aria-current="page"`,
- account link points to `/admin/account`,
- main region has `class="flex-1 bg-[var(--muted)] p-6"`,
- shell script listens for `datamix:account-profile-updated` and updates account name/image text hooks.

- [ ] **Step 5: Split route bodies out of the React frame**

For each retained screen in `apps/web/src/admin/_screens`:

- remove `AdminWorkspaceRouteFrame` imports,
- export a content component that renders only the page body,
- keep `useAdminWorkspaceRouteAccess(route)` inside the content component,
- keep route-specific `adminRoutes.*` calls unchanged,
- keep default route exports that choose the route and return the content component.

The affected files are:

- `admin-home.tsx`
- `schema-overview.tsx`
- `schema-builder.tsx`
- `content-index.tsx`
- `content-editor.tsx`
- `media-library.tsx`
- `team-and-roles.tsx`
- `settings-api-keys.tsx`
- `user-account.tsx`

- [ ] **Step 6: Keep the command palette inside the React island**

Update `apps/web/src/admin/islands/workspace-routes.tsx` so each island renders:

```tsx
<AdminWorkspacePage>
  <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
    <div className="flex justify-end">
      <AdminWorkspaceCommandPalette />
    </div>
    <RouteBody />
  </div>
</AdminWorkspacePage>
```

Use the matching route body component for each route. Pass `schemaId` and `recordId` props where the current island does.

- [ ] **Step 7: Dispatch account profile updates to the Astro shell**

In `apps/web/src/admin/_workspace/admin-workspace-provider.tsx`, after a successful `updateCurrentUserProfile`, dispatch:

```ts
window.dispatchEvent(
  new CustomEvent("datamix:account-profile-updated", {
    detail: {
      image: result.user.image ?? "",
      name: result.user.name || result.user.email,
    },
  }),
);
```

Keep existing React state updates.

- [ ] **Step 8: Update workspace Astro pages**

For every protected workspace page in `apps/web/src/pages/admin/**`, import:

```astro
import AdminWorkspaceShell from "@/components/admin/AdminWorkspaceShell.astro";
import { resolveWorkspacePage } from "@/server/routes/astro-workspace-page";
```

In frontmatter, resolve the page state and return redirects:

```astro
const page = await resolveWorkspacePage(Astro.request, route);
if (page.kind === "redirect") {
  return Astro.redirect(page.location);
}
```

Render:

```astro
<DatamixRootLayout>
  <AdminWorkspaceShell {...page.shell}>
    <MatchingIsland client:only="react" />
  </AdminWorkspaceShell>
</DatamixRootLayout>
```

Pass existing route params to the matching island.

- [ ] **Step 9: Delete replaced React shell files**

Run:

```bash
git rm apps/web/src/admin/_workspace/admin-workspace-route-frame.tsx
git rm apps/web/src/admin/_components/admin-frame.tsx
```

Expected: both commands exit `0`.

- [ ] **Step 10: Run the workspace inventory test**

Run:

```bash
node --import tsx apps/web/src/server/routes/astro-admin-page-inventory.test.ts
```

Expected: PASS.

- [ ] **Step 11: Run typecheck and build**

Run:

```bash
npm run typecheck --workspace @datamix/web
npm run build --workspace @datamix/web
```

Expected: both commands exit `0`.

- [ ] **Step 12: Commit Slice 3**

Run:

```bash
git add apps/web
git commit -m "refactor: render admin workspace shell with astro"
```

Expected: commit succeeds.

## Task 4: Cleanup, Tests, Docs, And Verification

**Files:**

- Modify: `tests/ux/admin-content-routing.test.mjs`
- Modify: `tests/ux/admin-workspace-provider-layout.test.mjs`
- Modify: `tests/ux/loader-page.test.mjs`
- Modify: `tests/ux/loader-transitions.test.mjs`
- Modify: `tests/ux/root-home-page.test.mjs`
- Modify: `tests/ux/admin-auth-request-origin.test.mjs`
- Modify: `tests/ux/security-hardening.test.mjs`
- Modify: `docs/architecture-overview.md`
- Modify: `docs/local-development.md`
- Modify: `docs/contributor-onboarding.md`
- Modify: `apps/web/README.md`
- Test: all UX tests under `tests/ux`
- Test: `npm run typecheck --workspace @datamix/web`
- Test: `npm run build --workspace @datamix/web`
- Test: `npm run smoke`

- [ ] **Step 1: Update remaining UX tests to the new source layout**

Edit all `tests/ux/*.test.mjs` path constants:

- `apps/web/app/admin` becomes `apps/web/src/admin`.
- `apps/web/components` becomes `apps/web/src/components`.
- `apps/web/lib` becomes `apps/web/src/lib`.
- `apps/web/server` becomes `apps/web/src/server`.
- `apps/web/styles` becomes `apps/web/src/styles`.
- Root home assertions read `apps/web/src/pages/index.astro` and `apps/web/src/layouts/DatamixRootLayout.astro`.

Remove Vinext/Next-specific assertions for `next/link` and prefetch behavior. Replace them with assertions for normal anchors, Astro page templates, `AdminWorkspaceShell`, and `client:only="react"` only on retained workspace islands.

- [ ] **Step 2: Run UX tests**

Run each UX test:

```bash
node tests/ux/astro-source-layout.test.mjs
node tests/ux/admin-content-routing.test.mjs
node tests/ux/admin-workspace-provider-layout.test.mjs
node tests/ux/loader-page.test.mjs
node tests/ux/loader-transitions.test.mjs
node tests/ux/root-home-page.test.mjs
node tests/ux/admin-auth-request-origin.test.mjs
node tests/ux/security-hardening.test.mjs
```

Expected: all commands exit `0`.

- [ ] **Step 3: Update docs**

Update docs to describe the final architecture:

- `docs/architecture-overview.md`: app source lives under `apps/web/src/**`; Astro pages/API endpoints are under `src/pages/**`; retained React workspace code is under `src/admin/**`.
- `docs/local-development.md`: admin route templates live in `src/pages/admin/**`; auth pages are Astro templates; workspace route bodies are retained React islands.
- `docs/contributor-onboarding.md`: new feature entry points should start in `src/pages`, `src/admin`, `src/lib`, or `src/server`.
- `apps/web/README.md`: remove language saying React admin screens remain under root `app/admin/**`.

- [ ] **Step 4: Verify no obsolete bridge paths remain**

Run:

```bash
rg -n "@/app/admin|@/src/admin-routes|apps/web/app/admin|apps/web/components|apps/web/lib|apps/web/server|apps/web/styles|from \"next/link\"|client:only=\"react\"" apps/web/src tests docs apps/web/README.md
```

Expected:

- no matches for `@/app/admin`,
- no matches for `@/src/admin-routes`,
- no matches for old root path docs,
- no matches for `from "next/link"`,
- `client:only="react"` matches only protected workspace page islands.

- [ ] **Step 5: Run typecheck**

Run:

```bash
npm run typecheck --workspace @datamix/web
```

Expected: exit code `0`.

- [ ] **Step 6: Run build**

Run:

```bash
npm run build --workspace @datamix/web
```

Expected: exit code `0`.

- [ ] **Step 7: Run smoke**

Run:

```bash
npm run smoke
```

Expected: exit code `0`. If smoke needs a dev server and fails because no server is running, start the project with `npm run dev --workspace @datamix/web`, rerun smoke, then stop the dev server before finishing.

- [ ] **Step 8: Commit Slice 4**

Run:

```bash
git add apps/web docs tests
git commit -m "chore: document astro-native admin structure"
```

Expected: commit succeeds.

## Final Handoff

After Task 4 passes:

- Report the commits created for each slice.
- Report the exact verification commands and their exit status.
- Ask the user to manually verify `/`, `/admin/login`, `/admin/setup`, `/admin/forgot-password`, `/admin/reset-password`, and the authenticated admin workspace routes.
- Do not claim Browser-based preview verification was performed.
