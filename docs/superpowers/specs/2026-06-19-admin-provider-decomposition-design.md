# Admin Provider Decomposition Design

Date: 2026-06-19

## Context

The current Astro migration renders authenticated admin pages through Astro page
templates and an Astro workspace shell, but the route bodies still mount a
React island. Inside that island, `AdminWorkspaceProvider` acts as the global
client-side service layer for the retained React admin workspace.

The provider is intentionally large from the earlier React application shape. It
owns session stabilization, setup redirects, authorization loading, permission
mapping, data loading, mutation actions, drafts, upload state, clipboard
messages, command-palette data, account profile state, and route-aware
prefetching. Existing tests also enforce that the shared provider remains in
place, because that was the correct boundary for the previous Astro shell pass.

The next migration should remove that provider without taking a big-bang risk.
The end state is no `AdminWorkspaceProvider`, no global admin React context, and
no hidden workspace service layer. The reliable path is a strangler
decomposition: first extract the provider's responsibilities into explicit
server props and route-scoped client state modules, then move screens off the
compatibility context one by one until the provider can be deleted.

## Goals

- Remove `AdminWorkspaceProvider` as an application dependency by the end of
  this migration.
- Preserve current admin behavior during every intermediate slice.
- Keep Astro responsible for workspace page setup, redirects, shell props, and
  server-known authorization data.
- Pass serializable workspace props from Astro pages into retained React islands
  instead of making the island rediscover setup/session/authorization through a
  global provider.
- Split provider logic into route-scoped state hooks and shared service modules
  with clear ownership.
- Let each React route body import only the state and actions it uses.
- Keep normal Astro page navigation as the routing model.
- Update tests and docs so the new boundaries are enforced.
- Record the next roadmap step toward a more Astro-native admin after provider
  removal.

## Non-Goals

- Do not convert all route bodies to Astro in this pass.
- Do not replace TipTap or rewrite the schema/content editors in this pass.
- Do not introduce a client-side router or app-wide client store.
- Do not remove `@astrojs/react`, `react`, or `react-dom`; retained route bodies
  and editor components still require them.
- Do not use the Browser skill for preview/debugging. The user will verify UI
  behavior manually.
- Do not change server authorization policy. Existing server route permission
  checks remain the source of truth.

## Current Provider Responsibilities

`AdminWorkspaceProvider` currently combines several independent concerns:

- Session/setup gate:
  - reads Better Auth client session state,
  - checks setup status,
  - redirects to setup or login,
  - renders protected-workspace loading canvases.
- Authorization and permissions:
  - calls `/api/admin/session`,
  - maps `DatamixAuthorizationSummary` to UI capability booleans,
  - resets route state when permissions no longer allow access.
- Collections and schema data:
  - loads collection definitions,
  - exposes shared collection state used by schema and content screens.
- Records:
  - loads records for a selected collection,
  - maintains generated record form drafts,
  - creates and updates records.
- Media:
  - loads media assets,
  - uploads files,
  - tracks selected media, search query, upload state, and clipboard messages.
- Team and roles:
  - loads users and roles,
  - sends invites,
  - updates user roles,
  - edits and saves custom roles.
- API keys:
  - loads API keys and public API runtime summary,
  - creates, updates, revokes, and copies API key secrets.
- Account:
  - edits current profile,
  - dispatches the sidebar profile update event,
  - signs out.
- Route prefetch:
  - preloads route-relevant data for the dashboard and command palette.

These concerns should become separate modules. A screen should not need to
understand the full admin workspace to edit a record, upload media, or update an
API key.

## Target Architecture

### Server Workspace Props

`resolveWorkspacePage` should continue to run before every protected admin page.
It should expand from shell-only data to a serializable workspace payload:

- active route metadata,
- account summary,
- authorization summary,
- derived permissions,
- role summary needed by the shell and route gates.

The returned data is passed into `AdminWorkspaceShell.astro` and the retained
React island. The island receives the server-resolved workspace data as props
and treats it as the initial authenticated workspace contract.

This removes the need for the island to call `/api/admin/session` before it can
render a route. If a later client request receives `401`, the request helper or
route hook redirects to login with the current path as `next`.

### Client State Modules

Provider logic should move into focused client modules under `apps/web/src/admin`
or `apps/web/src/lib`, using names that reflect behavior rather than framework
plumbing. The exact filenames can be adjusted during implementation, but the
boundaries should be:

- `admin-workspace-props`:
  shared types for serializable workspace props and route access data.
- `admin-permissions`:
  pure permission mapping and route-access helpers.
- `admin-account-state`:
  profile form state, profile update, sidebar event dispatch, sign out.
- `admin-collections-state`:
  collection definition list loading and cache state.
- `admin-records-state`:
  generated record loading, selected record state, drafts, validation, save.
- `admin-media-state`:
  media asset loading, upload, selection, search, clipboard feedback.
- `admin-team-state`:
  roles, users, invites, role assignment state.
- `admin-api-keys-state`:
  API key list/runtime loading, draft state, create/update/revoke/copy.
- `admin-dashboard-data`:
  dashboard prefetch/load orchestration built from the smaller hooks.
- `admin-command-palette-data`:
  command item assembly from current route props and optional loaded datasets.

Each module should expose a small API suitable for one or two screens. Shared
request helpers in `apps/web/src/lib/*.ts` stay as fetch wrappers around the
existing API endpoints.

### Temporary Compatibility Layer

To keep each slice safe, implementation may introduce a compatibility adapter
that exposes the old `useAdminWorkspace()` shape while internally delegating to
the new state modules. This adapter is temporary and should shrink as screens
move to direct imports.

The compatibility layer must not become the new architecture. It exists only to
let one screen migrate at a time. The deletion criteria are:

- no route body imports `useAdminWorkspace`,
- no route body imports `useAdminWorkspaceRouteAccess` from the old context
  module,
- no island wraps content in `AdminWorkspacePage`,
- no tests require `AdminWorkspaceProvider`,
- `admin-workspace-provider.tsx` and `admin-workspace-page.tsx` can be deleted.

### Route Bodies

Route bodies remain React components during this pass, but their dependencies
become explicit:

- account screen receives workspace props and uses `useAdminAccountState`,
- media screen uses `useAdminMediaState`,
- schema overview and content index use `useAdminCollectionsState`,
- schema builder owns its local draft and uses collection helpers directly,
- content editor uses collection and record hooks plus local media lookup where
  needed,
- team screen uses `useAdminTeamState`,
- settings screen uses `useAdminApiKeysState` and role state,
- dashboard uses an explicit dashboard-data hook,
- command palette receives explicit data inputs rather than reading global
  context.

Route access checks should use pure helpers against `workspace.permissions`.
Restricted-route messaging should remain equivalent to today's copy.

## Data Flow

1. Astro page frontmatter builds the route object and calls
   `resolveWorkspacePage(Astro.request, route)`.
2. The resolver handles setup redirects, login redirects, access errors, and
   successful authorization.
3. On success, the page renders:
   - `DatamixRootLayout`,
   - `AdminWorkspaceShell`,
   - the matching retained React route island with `workspace` props.
4. The React route island renders a small toolbar containing the command palette
   and then the route body.
5. Route bodies call route-scoped hooks for their own data loading and
   mutations.
6. Client request helpers keep `credentials: "include"` and redirect to login
   on unauthorized protected admin requests.
7. Account profile updates continue to dispatch
   `datamix:account-profile-updated` so the Astro sidebar updates without a
   full navigation.

## Error Handling

- Setup and authorization failures detected in Astro render the existing shell
  error state or redirect before the island mounts.
- Client data hooks expose load errors and mutation errors in the same UI places
  used today.
- A protected request returning `401` redirects to
  `/admin/login?next=<current-path>`.
- A protected request returning `403` stays on the page and renders the
  route-specific restricted/error state.
- Clipboard failures continue to show inline copy feedback.
- Upload, API-key, role, and record validation errors preserve their existing
  issue lists and messages.

## Testing

Update tests in parallel with the architecture changes:

- Add pure unit coverage for permission mapping and route access helpers.
- Add inventory assertions that protected Astro pages pass workspace props to
  retained islands.
- Add tests that `resolveWorkspacePage` returns serializable authorization and
  permission props on success.
- During compatibility slices, keep current provider behavior tests passing.
- As screens migrate, replace provider-presence assertions with assertions that
  screens import route-scoped hooks directly.
- Add a final deletion test asserting no source file imports
  `AdminWorkspaceProvider`, `AdminWorkspacePage`, or the old context hook.

Verification commands:

```bash
npm run typecheck --workspace @datamix/web
npm run build --workspace @datamix/web
npm run smoke
git diff --check
```

The Browser skill is not used for preview/debugging. After verification passes,
ask the user to manually verify the admin flows in the running app.

## Implementation Slices

The remaining work should use larger, invariant-based slices instead of one
route per commit. A slice may touch many screens when the change is mechanical,
but it should change only one risky behavior axis at a time.

### Slice 1: Finish The Route-Access Invariant

Complete the route-access sweep everywhere:

- every protected Astro page passes `page.workspace` to its island,
- every workspace island consumes serialized `workspace.routeAccess`,
- no workspace island re-derives route access in React,
- every retained body requires explicit `routeAccess`,
- inventory tests enforce the invariant globally instead of route by route.

Expected result: route access is a solved server-workspace-prop concern, and
future provider work does not need to revisit it.

### Slice 2: Extract Leaf State Behind The Provider

Extract account and media behavior into focused hooks or service modules. Keep
`AdminWorkspaceProvider` as a compatibility composer while `UserAccountRoute`
and `MediaLibraryRoute` move to direct route-scoped state imports.

Expected result: two low-risk screens no longer import `useAdminWorkspace()`,
and the provider shrinks without changing behavior for the remaining screens.

### Slice 3: Extract Team And Settings State

Extract roles, users, invites, API keys, and settings-role behavior into
`team`, `roles`, and `api keys` state modules. Migrate `TeamAndRolesRoute` and
`SettingsApiKeysRoute` together because they share role data and permission
rules.

Expected result: team/settings state is explicit, shared role loading is not
hidden in the provider, and both screens stop using the global workspace
context.

### Slice 4: Extract Collection Read State

Extract collection-definition loading and cache state. Migrate
`SchemaOverviewRoute` and `ContentIndexRoute` together because they are mostly
read/list surfaces over the same collection metadata.

Expected result: collection listing/selection no longer depends on the provider,
and the provider owns less shared schema/content state before the editors move.

### Slice 5: Extract Editor And Dashboard State

Extract record loading/draft/save state, schema-builder draft state,
dashboard-data assembly, and command-palette data. Migrate
`SchemaBuilderRoute`, `ContentEditorRoute`, `AdminHomeRoute`, and
`AdminWorkspaceCommandPalette` after the lower-risk state modules exist.

Expected result: no route body and no toolbar imports the old context hook.

### Slice 6: Delete The Provider And Update Docs

Remove `AdminWorkspaceProvider`, `AdminWorkspacePage`, the old context hook, and
provider-specific tests. Update workspace islands to compose the toolbar and
route bodies directly from explicit props. Update `apps/web/README.md`,
`docs/architecture-overview.md`, and `docs/local-development.md` to describe the
provider-free retained React route body architecture.

Expected result: provider removal is complete, enforced by a global no-import
test, and documented for the next Astro-native route-body migration.

## Roadmap: Next Big Astro-Native Step

After `AdminWorkspaceProvider` is removed, the next major step toward an
Astro-native admin is converting retained React route bodies into Astro pages or
Astro components section by section.

The recommended order is:

1. account page,
2. schema overview,
3. content index,
4. media library,
5. team and settings,
6. dashboard,
7. schema builder,
8. content editor.

This order keeps the most interactive editing surfaces last. The schema builder
and content editor should only move after route data, mutations, validation
messages, and form drafts are already explicit outside the old provider. TipTap
can remain a small React island inside an otherwise Astro-rendered content
editor until a native replacement is justified.

The strategic target is an Astro-rendered admin where React is used only for
genuinely interactive widgets, not as the default page body runtime.
