# Admin Provider Decomposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `AdminWorkspaceProvider` as an application dependency by extracting route-scoped state modules and migrating retained React admin routes to explicit workspace props.

**Architecture:** Astro continues to resolve setup, session, authorization, shell props, permissions, and active route access before mounting each retained React island. `AdminWorkspaceProvider` remains temporarily as a compatibility composer while domain hooks are extracted, then route bodies switch to direct hook imports in grouped slices. The final state has no global admin React context, no `AdminWorkspacePage`, and React route bodies receive only explicit props plus route-scoped hooks.

**Tech Stack:** Astro 6, `@astrojs/react`, React 19 retained islands, TypeScript, Better Auth, Cloudflare Workers, D1, R2, Drizzle, Node test runner.

---

## Status Note

As of commit `d24a537`, this plan is historical execution context. The
provider-removal work is complete, and `/admin/account`, `/admin/schema`, and
`/admin/content` now render Astro-native route bodies. The remaining retained
React route bodies are the state-heavy dashboard, schema builder, content
editor, media, team, and settings routes.

## Design Reference

Read this first:

- `docs/superpowers/specs/2026-06-19-admin-provider-decomposition-design.md`

Ground rules:

- Do not use the Browser skill for preview/debugging. Ask the user to verify UI behavior.
- Increase slice size only when the change is repetitive and governed by one invariant.
- Do not change server authorization policy.
- Keep `AdminWorkspaceProvider` as a temporary compatibility composer until the deletion slice.
- Prefer failing inventory/unit tests before each slice, then implement the minimal code needed.
- Before each commit, run the targeted tests for that slice plus `git diff --check`.
- Before final completion, run:

```bash
npm run typecheck --workspace @datamix/web
npm run build --workspace @datamix/web
npm run smoke
git diff --check
```

## Current State

The provider-free admin architecture is in place:

- Protected pages live under `apps/web/src/pages/admin/**`.
- `resolveWorkspacePage` returns `page.shell` and serializable `page.workspace`.
- `AdminWorkspaceShell.astro` renders the workspace shell/sidebar.
- Retained React route bodies mount through
  `apps/web/src/admin/islands/workspace-routes.tsx` with explicit serialized
  `workspace` props.
- `AdminWorkspaceProvider`, `AdminWorkspacePage`, and the old global workspace
  hooks have been deleted.
- `/admin/account`, `/admin/schema`, and `/admin/content` now render
  Astro-native route bodies with targeted React islands only where needed.

## File Structure Map

State modules created by the completed provider decomposition:

- `apps/web/src/admin/_state/admin-account-state.ts`: account profile form state, profile update, sidebar event dispatch, sign out.
- `apps/web/src/admin/_state/admin-media-state.ts`: media asset loading, upload, selection, search query, storage-key clipboard feedback.
- `apps/web/src/admin/_state/admin-roles-state.ts`: shared role loading, role draft, permission toggles, role save.
- `apps/web/src/admin/_state/admin-team-state.ts`: user loading, invite form, user role drafts, user role update.
- `apps/web/src/admin/_state/admin-api-keys-state.ts`: API key/runtime loading, draft state, create/update/revoke/copy secret.
- `apps/web/src/admin/_state/admin-collections-state.ts`: collection definition loading/cache state.
- `apps/web/src/admin/_state/admin-records-state.ts`: record loading, selected record, generated record draft, validation issues, save.
- `apps/web/src/admin/_state/admin-dashboard-data.ts`: dashboard data assembly from the smaller hooks.
- `apps/web/src/admin/_state/admin-command-palette-data.ts`: command item assembly without global context.

Current integration files that enforce the provider-free shape:

- `apps/web/src/admin/_workspace/admin-command-palette.tsx`: targeted command
  palette island fed by explicit workspace props.
- `apps/web/src/admin/_workspace/admin-workspace-props.ts`: serializable
  workspace prop contract resolved by Astro.
- `apps/web/src/admin/islands/workspace-routes.tsx`: retained route island
  wrappers that pass explicit workspace and route access props.
- `apps/web/src/admin/islands/workspace-body-routes.tsx`: forward explicit props to retained route bodies.
- `apps/web/src/components/admin/*.astro`: Astro-native shell, sidebar, and
  route bodies for the completed account/schema/content pages.
- `apps/web/src/server/routes/astro-admin-page-inventory.test.ts`: enforce migration invariants.
- `tests/ux/admin-workspace-provider-layout.test.mjs`: static UX assertions for
  provider-free layout and targeted islands.
- `tests/ux/loader-transitions.test.mjs`: static loader assertions.

## Slice Size Rules

- A slice can touch many files when it applies one mechanical invariant everywhere.
- A slice should stay smaller when it changes mutation ownership, redirect behavior, authorization behavior, or shared data lifetime.
- Each extraction slice first keeps provider compatibility working, then migrates the grouped screens off context.
- Do not mix provider deletion with domain state extraction.

## Task 1: Finish Route-Access Invariant

**Files:**

- Modify: `apps/web/src/admin/islands/workspace-routes.tsx`
- Modify: `apps/web/src/server/routes/astro-admin-page-inventory.test.ts`
- Test: `node --import tsx --test apps/web/src/server/routes/astro-admin-page-inventory.test.ts tests/ux/admin-workspace-provider-layout.test.mjs`

- [ ] **Step 1: Strengthen the inventory test**

Update `apps/web/src/server/routes/astro-admin-page-inventory.test.ts` so the route-access island tests enforce this global invariant:

```ts
assert.doesNotMatch(
  workspaceSource,
  /resolveAdminWorkspaceRouteAccess/,
  "workspace islands should consume serialized workspace.routeAccess instead of re-deriving route access in React",
);

for (const islandName of workspaceIslands) {
  const islandSource =
    workspaceSource.match(
      new RegExp(`export function ${islandName}\\\\([\\\\s\\\\S]*?\\\\nexport function |export function ${islandName}\\\\([\\\\s\\\\S]*?$`),
    )?.[0] ?? "";

  assert.match(
    islandSource,
    /const routeAccess = workspace\?\.routeAccess;/,
    `${islandName} should consume serialized route access from workspace props`,
  );
}
```

- [ ] **Step 2: Run the targeted test and confirm it fails**

Run:

```bash
node --import tsx --test apps/web/src/server/routes/astro-admin-page-inventory.test.ts tests/ux/admin-workspace-provider-layout.test.mjs
```

Expected: FAIL before implementation because `workspace-routes.tsx` still imports or calls `resolveAdminWorkspaceRouteAccess` for some islands.

- [ ] **Step 3: Update workspace route islands**

In `apps/web/src/admin/islands/workspace-routes.tsx`:

- remove the `resolveAdminWorkspaceRouteAccess` import,
- set `const routeAccess = workspace?.routeAccess;` in every island,
- keep the existing `routeAccess ? <Body routeAccess={routeAccess} /> : null` render guards.

- [ ] **Step 4: Run the targeted test and confirm it passes**

Run:

```bash
node --import tsx --test apps/web/src/server/routes/astro-admin-page-inventory.test.ts tests/ux/admin-workspace-provider-layout.test.mjs
git diff --check
```

Expected: both commands exit `0`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/admin/islands/workspace-routes.tsx apps/web/src/server/routes/astro-admin-page-inventory.test.ts
git commit -m "refactor admin islands route access invariant"
```

## Task 2: Extract Account And Media State

**Files:**

- Create: `apps/web/src/admin/_state/admin-account-state.ts`
- Create: `apps/web/src/admin/_state/admin-media-state.ts`
- Modify: `apps/web/src/admin/_workspace/admin-workspace-provider.tsx`
- Modify: `apps/web/src/admin/islands/workspace-routes.tsx`
- Modify: `apps/web/src/admin/islands/workspace-body-routes.tsx`
- Modify: `apps/web/src/admin/_screens/user-account.tsx`
- Modify: `apps/web/src/admin/_screens/media-library.tsx`
- Modify: `apps/web/src/server/routes/astro-admin-page-inventory.test.ts`
- Test: `node --import tsx --test apps/web/src/server/routes/astro-admin-page-inventory.test.ts tests/ux/admin-workspace-provider-layout.test.mjs`

- [ ] **Step 1: Add failing inventory assertions**

Add assertions that:

- `user-account.tsx` does not import `useAdminWorkspace`,
- `media-library.tsx` does not import `useAdminWorkspace`,
- both files import their route-scoped state hooks,
- `admin-workspace-provider.tsx` imports and composes `useAdminAccountState` and `useAdminMediaState`.

- [ ] **Step 2: Extract account state behind the provider**

Move account fields and actions out of `admin-workspace-provider.tsx` into `useAdminAccountState`.

The hook should own:

- `accountName`, `setAccountName`,
- `accountImage`, `setAccountImage`,
- `accountMessage`,
- `accountError`,
- `isSavingAccountProfile`,
- `updateAccountProfile`,
- `signOut`,
- account profile override and `datamix:account-profile-updated` dispatch.

`AdminWorkspaceProvider` should call the hook and spread the returned fields into its existing context value.

- [ ] **Step 3: Extract media state behind the provider**

Move media fields and actions out of `admin-workspace-provider.tsx` into `useAdminMediaState`.

The hook should own:

- media asset load request id,
- `mediaAssets`,
- `mediaLoadError`,
- `mediaMessage`,
- `mediaClipboardMessage`,
- `mediaSearchQuery`, `setMediaSearchQuery`,
- `selectedMediaAssetId`, `selectMediaAsset`,
- `selectedMediaFile`, `setSelectedMediaFile`,
- `hasLoadedMediaAssets`,
- `isLoadingMediaAssets`,
- `isUploadingMedia`,
- `resetMediaWorkspace`,
- `loadMediaAssets`,
- `uploadMediaAsset`,
- `copyMediaStorageKey`.

`AdminWorkspaceProvider` should call the hook and spread the returned fields into its existing context value.

- [ ] **Step 4: Migrate account and media screens off context**

Pass `workspace` through `AccountBody`, `MediaBody`, `UserAccountRoute`, and `MediaLibraryRoute`. Update `UserAccountRoute` to initialize account form state from `workspace.account` and use `useAdminAccountState`. Update `MediaLibraryRoute` to derive media permissions from `workspace.permissions` and use `useAdminMediaState`.

- [ ] **Step 5: Run targeted verification**

```bash
node --import tsx --test apps/web/src/server/routes/astro-admin-page-inventory.test.ts tests/ux/admin-workspace-provider-layout.test.mjs
npm run typecheck --workspace @datamix/web
git diff --check
```

Expected: all commands exit `0`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/admin/_state apps/web/src/admin/_workspace/admin-workspace-provider.tsx apps/web/src/admin/islands/workspace-routes.tsx apps/web/src/admin/islands/workspace-body-routes.tsx apps/web/src/admin/_screens/user-account.tsx apps/web/src/admin/_screens/media-library.tsx apps/web/src/server/routes/astro-admin-page-inventory.test.ts
git commit -m "refactor admin account and media state"
```

## Task 3: Extract Team, Roles, And API Key State

**Files:**

- Create: `apps/web/src/admin/_state/admin-roles-state.ts`
- Create: `apps/web/src/admin/_state/admin-team-state.ts`
- Create: `apps/web/src/admin/_state/admin-api-keys-state.ts`
- Modify: `apps/web/src/admin/_workspace/admin-workspace-provider.tsx`
- Modify: `apps/web/src/admin/islands/workspace-routes.tsx`
- Modify: `apps/web/src/admin/islands/workspace-body-routes.tsx`
- Modify: `apps/web/src/admin/_screens/team-and-roles.tsx`
- Modify: `apps/web/src/admin/_screens/settings-api-keys.tsx`
- Modify: `apps/web/src/server/routes/astro-admin-page-inventory.test.ts`

- [ ] **Step 1: Add failing inventory assertions**

Assert that `team-and-roles.tsx` and `settings-api-keys.tsx` do not import `useAdminWorkspace`, and that they import the new state hooks directly.

- [ ] **Step 2: Extract shared role state**

Move role loading, role draft, role permission toggles, role selection, role creation, role reset, and role save into `useAdminRolesState`.

- [ ] **Step 3: Extract team state**

Move user loading, invite form state, invite submission, user role drafts, and user role update into `useAdminTeamState`.

- [ ] **Step 4: Extract API key state**

Move API key/runtime loading, key drafts, create/update/revoke, and secret clipboard state into `useAdminApiKeysState`.

- [ ] **Step 5: Migrate team and settings screens**

Pass explicit workspace props through the relevant islands and body wrappers. Update `TeamAndRolesRoute` and `SettingsApiKeysRoute` to use the new hooks instead of `useAdminWorkspace()`.

- [ ] **Step 6: Verify and commit**

```bash
node --import tsx --test apps/web/src/server/routes/astro-admin-page-inventory.test.ts tests/ux/admin-workspace-provider-layout.test.mjs
npm run typecheck --workspace @datamix/web
git diff --check
git add apps/web/src/admin/_state apps/web/src/admin/_workspace/admin-workspace-provider.tsx apps/web/src/admin/islands/workspace-routes.tsx apps/web/src/admin/islands/workspace-body-routes.tsx apps/web/src/admin/_screens/team-and-roles.tsx apps/web/src/admin/_screens/settings-api-keys.tsx apps/web/src/server/routes/astro-admin-page-inventory.test.ts
git commit -m "refactor admin team and settings state"
```

## Task 4: Extract Collection Read State

**Files:**

- Create: `apps/web/src/admin/_state/admin-collections-state.ts`
- Modify: `apps/web/src/admin/_workspace/admin-workspace-provider.tsx`
- Modify: `apps/web/src/admin/islands/workspace-routes.tsx`
- Modify: `apps/web/src/admin/islands/workspace-body-routes.tsx`
- Modify: `apps/web/src/admin/_screens/schema-overview.tsx`
- Modify: `apps/web/src/admin/_screens/content-index.tsx`
- Modify: `apps/web/src/server/routes/astro-admin-page-inventory.test.ts`

- [ ] **Step 1: Add failing inventory assertions**

Assert that `schema-overview.tsx` and `content-index.tsx` do not import `useAdminWorkspace`, and that they import `useAdminCollectionsState`.

- [ ] **Step 2: Extract collection state**

Move collection definition loading, load error, loaded/loading flags, and reset behavior into `useAdminCollectionsState`.

- [ ] **Step 3: Migrate schema overview and content index**

Pass explicit workspace props through the wrappers and update both screens to load collections through `useAdminCollectionsState`.

- [ ] **Step 4: Verify and commit**

```bash
node --import tsx --test apps/web/src/server/routes/astro-admin-page-inventory.test.ts tests/ux/admin-workspace-provider-layout.test.mjs
npm run typecheck --workspace @datamix/web
git diff --check
git add apps/web/src/admin/_state/admin-collections-state.ts apps/web/src/admin/_workspace/admin-workspace-provider.tsx apps/web/src/admin/islands/workspace-routes.tsx apps/web/src/admin/islands/workspace-body-routes.tsx apps/web/src/admin/_screens/schema-overview.tsx apps/web/src/admin/_screens/content-index.tsx apps/web/src/server/routes/astro-admin-page-inventory.test.ts
git commit -m "refactor admin collection state"
```

## Task 5: Extract Editor, Dashboard, And Command Palette State

**Files:**

- Create: `apps/web/src/admin/_state/admin-records-state.ts`
- Create: `apps/web/src/admin/_state/admin-dashboard-data.ts`
- Create: `apps/web/src/admin/_state/admin-command-palette-data.ts`
- Modify: `apps/web/src/admin/_workspace/admin-workspace-provider.tsx`
- Modify: `apps/web/src/admin/_workspace/admin-command-palette.tsx`
- Modify: `apps/web/src/admin/islands/workspace-routes.tsx`
- Modify: `apps/web/src/admin/islands/workspace-body-routes.tsx`
- Modify: `apps/web/src/admin/_screens/schema-builder.tsx`
- Modify: `apps/web/src/admin/_screens/content-editor.tsx`
- Modify: `apps/web/src/admin/_screens/admin-home.tsx`
- Modify: `apps/web/src/server/routes/astro-admin-page-inventory.test.ts`

- [ ] **Step 1: Add failing inventory assertions**

Assert that `schema-builder.tsx`, `content-editor.tsx`, `admin-home.tsx`, and `admin-command-palette.tsx` do not import `useAdminWorkspace` or `useAdminWorkspaceRouteAccess`.

- [ ] **Step 2: Extract record state**

Move record collection name, record list loading, selected record, generated draft state, validation issues, save state, `loadRecords`, `selectRecord`, `startNewRecord`, `updateRecordDraftValue`, and `saveRecord` into `useAdminRecordsState`.

- [ ] **Step 3: Make schema builder explicit**

Replace schema-builder provider reads with explicit props plus direct state hooks: use `useAdminCollectionsState` for collection-definition loading and use `workspace.permissions` for schema create/update capability checks. Keep schema draft logic local to `schema-builder.tsx` unless extracting it is required to remove the provider dependency.

- [ ] **Step 4: Make content editor explicit**

Update `content-editor.tsx` to use `useAdminRecordsState`, `useAdminCollectionsState`, and media lookup state directly.

- [ ] **Step 5: Extract dashboard and command palette data**

Move prefetch/data assembly into `useAdminDashboardData` and command item assembly into `createAdminCommandPaletteItems` or `useAdminCommandPaletteData`. Pass command-palette inputs explicitly from the island frame instead of reading context.

- [ ] **Step 6: Verify and commit**

```bash
node --import tsx --test apps/web/src/server/routes/astro-admin-page-inventory.test.ts tests/ux/admin-workspace-provider-layout.test.mjs tests/ux/loader-transitions.test.mjs
npm run typecheck --workspace @datamix/web
git diff --check
git add apps/web/src/admin/_state apps/web/src/admin/_workspace/admin-workspace-provider.tsx apps/web/src/admin/_workspace/admin-command-palette.tsx apps/web/src/admin/islands/workspace-routes.tsx apps/web/src/admin/islands/workspace-body-routes.tsx apps/web/src/admin/_screens/schema-builder.tsx apps/web/src/admin/_screens/content-editor.tsx apps/web/src/admin/_screens/admin-home.tsx apps/web/src/server/routes/astro-admin-page-inventory.test.ts
git commit -m "refactor admin editor and dashboard state"
```

## Task 6: Delete Provider And Update Docs

**Files:**

- Delete: `apps/web/src/admin/_workspace/admin-workspace-provider.tsx`
- Delete: `apps/web/src/admin/_workspace/admin-workspace-page.tsx`
- Delete: `apps/web/src/admin/_workspace/admin-workspace-hooks.ts`
- Modify: `apps/web/src/admin/islands/workspace-routes.tsx`
- Modify: `apps/web/src/server/routes/astro-admin-page-inventory.test.ts`
- Modify: `tests/ux/admin-workspace-provider-layout.test.mjs`
- Modify: `tests/ux/loader-transitions.test.mjs`
- Modify: `apps/web/README.md`
- Modify: `docs/architecture-overview.md`
- Modify: `docs/local-development.md`

- [ ] **Step 1: Add the final no-provider inventory test**

Assert that no source file under `apps/web/src/admin/**`, `apps/web/src/components/**`, or `apps/web/src/pages/**` contains:

- `AdminWorkspaceProvider`,
- `AdminWorkspacePage`,
- `useAdminWorkspace`,
- `useAdminWorkspaceRouteAccess`,
- `AdminWorkspaceContext`.

- [ ] **Step 2: Remove the wrapper**

Update `workspace-routes.tsx` so islands render `AdminWorkspaceIslandFrame` directly, with no `AdminWorkspacePage` wrapper.

- [ ] **Step 3: Delete provider files and replace provider-specific tests**

Delete the provider/page/hooks files. Replace old tests that required the provider with tests that require explicit workspace props, route-scoped hooks, and no global context.

- [ ] **Step 4: Update docs**

Update docs to say authenticated admin pages render the Astro shell and retained React route bodies with explicit workspace props and route-scoped state hooks.

- [ ] **Step 5: Full verification**

```bash
npm run typecheck --workspace @datamix/web
npm run build --workspace @datamix/web
npm run smoke
git diff --check
```

Expected: all commands exit `0`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/admin apps/web/src/server/routes/astro-admin-page-inventory.test.ts tests/ux/admin-workspace-provider-layout.test.mjs tests/ux/loader-transitions.test.mjs apps/web/README.md docs/architecture-overview.md docs/local-development.md
git commit -m "refactor admin workspace without provider"
```

## Handoff Prompt

Use this prompt to start the next implementation session:

```text
We are on branch `astro` in `/Users/jy/Desktop/projects/datamix`.

Important user instruction from AGENTS.md: do not use the Browser skill for preview/debugging unless explicitly asked. Use terminal/static tests and ask the user to manually verify UI flows.

Current state:
- `AdminWorkspaceProvider`, `AdminWorkspacePage`, and the global admin workspace hooks have been removed.
- Workspace routes receive explicit serialized `workspace` props and use server-derived `workspace.routeAccess`.
- `/admin/account`, `/admin/schema`, and `/admin/content` render Astro-native route bodies.
- The remaining retained React route bodies are dashboard, schema builder, content editor, media, team, and settings.

Recommended next slice:
1. Do not convert the deferred state-heavy routes unless explicitly directed.
2. Run the focused static inventory and inspect for obsolete whole-route React body references.
3. Prefer small cleanup around completed Astro-native bodies, docs, and inventory tests.
4. Preserve explicit serialized workspace props, server-derived route access, targeted React islands only, and no global admin provider/context.

Verification expectation for narrow cleanup:
- `node --import tsx --test apps/web/src/server/routes/astro-admin-page-inventory.test.ts tests/ux/admin-workspace-provider-layout.test.mjs tests/ux/admin-content-routing.test.mjs`
- `git diff --check`
- Broader `typecheck/build/smoke` only if behavior or runtime code changes.
```
