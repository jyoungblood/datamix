# Astro-Native Admin Architecture Design

Date: 2026-06-19

## Context

The first Astro migration made `apps/web` build and run through Astro, with `src/pages/**` owning the route surface and Cloudflare adapter output. That pass intentionally kept most admin UI under the old `app/admin/**`, `components/**`, `lib/**`, and `styles/**` roots, then mounted route-specific React islands from thin Astro page wrappers.

The next migration should make the app feel like an Astro app in source layout and rendering model. The priority is to use Astro templates for route pages and auth/setup screens, move application source into `src/**`, and reduce client React where the behavior is mostly form handling or static chrome. The authenticated admin workspace is still interaction-heavy, so React remains there while the surrounding page shell moves toward Astro.

## Goals

- Keep `apps/web/src/pages/**` as the only routed page and API endpoint surface.
- Move app source code into Astro-normal source directories:
  - `apps/web/src/admin/**` for retained admin workspace React code.
  - `apps/web/src/components/**` for shared UI components and Astro components.
  - `apps/web/src/lib/**` for client/runtime helpers.
  - `apps/web/src/server/**` for Worker-side route handlers and domain services.
  - `apps/web/src/styles/**` for global and editor styles.
- Make auth/setup routes (`/admin/login`, `/admin/setup`, `/admin/forgot-password`, `/admin/reset-password`) Astro template pages instead of React islands.
- Move reusable auth page structure into Astro components and small bundled browser scripts.
- Split authenticated workspace chrome so Astro renders the page shell/sidebar for every authenticated workspace page, while React keeps the provider, command palette, route access checks, and route bodies.
- Update tests and docs so the architecture enforces the new boundaries.

## Non-Goals

- Do not rewrite the full admin workspace provider in Astro.
- Do not replace TipTap or the schema/content/media/team/settings route bodies with Astro in this pass.
- Do not remove `@astrojs/react`, `react`, or `react-dom`; they remain required for the workspace island and editor.
- Do not use the Browser skill for preview/debugging. The user will verify UI behavior.
- Do not introduce a new client-side router. Astro pages and normal links remain the routing model.

## Target Source Layout

The web app root keeps framework config at the package root:

- `apps/web/astro.config.mjs`
- `apps/web/package.json`
- `apps/web/tsconfig.json`
- `apps/web/wrangler.jsonc`
- `apps/web/worker-configuration.d.ts`

Application code moves under `src`:

- `apps/web/src/pages/**`: Astro pages and API endpoints.
- `apps/web/src/layouts/DatamixRootLayout.astro`: shared document shell.
- `apps/web/src/components/auth/AuthCard.astro`: shared auth card page template.
- `apps/web/src/components/admin/AdminWorkspaceShell.astro`: Astro-rendered workspace canvas and sidebar.
- `apps/web/src/components/admin/AdminWorkspaceSidebar.astro`: static sidebar/nav/account template.
- `apps/web/src/scripts/admin-auth/*.ts`: browser scripts for auth forms and redirects.
- `apps/web/src/admin/**`: retained React admin workspace code, split by existing responsibilities.
- `apps/web/src/lib/**`: client helpers such as runtime paths, auth client, and fetch helpers.
- `apps/web/src/server/**`: Worker-side auth, database, route handlers, and domain services.
- `apps/web/src/styles/**`: global CSS and editor CSS.

The `@/*` alias should point at `apps/web/src/*`. Imports should become `@/admin/...`, `@/components/...`, `@/lib/...`, `@/server/...`, and `@/styles/...`. Transitional imports like `@/app/admin/...`, `@/src/admin-routes/...`, root `components/**`, root `lib/**`, and root `server/**` should be removed.

## Auth Page Design

Auth pages become Astro templates with native markup and small browser scripts:

- `src/pages/admin/login.astro`
- `src/pages/admin/setup.astro`
- `src/pages/admin/forgot-password.astro`
- `src/pages/admin/reset-password.astro`

`AuthCard.astro` renders the shared centered card layout previously implemented as `CenteredCardPage`. It accepts `label`, `title`, and `description` props, wraps the content in the existing visual classes, and stays framework-free.

The pages should do server-side setup/session checks before rendering whenever the required state can be resolved from request cookies and Cloudflare bindings:

- Login reads setup status and redirects to `/admin/setup` when first-run setup is required.
- Login redirects an already-authenticated session to the `next` path if that path is local.
- Setup redirects an authenticated user to `/admin`, and redirects to login when setup is already complete.
- Setup-status/auth-config failures render an Astro error card with retry copy.
- Reset-password reads `token`, `email`, `mode`, and `error` from `Astro.url.searchParams` for initial render.

Browser scripts handle interactive submissions:

- Login script imports `authClient`, reads form fields, calls `authClient.signIn.email`, starts OAuth through `authClient.signIn.social`, writes error text into an alert region, disables active buttons, and redirects on success.
- Setup script calls `authClient.signUp.email`, validates matching passwords before submit, writes errors into an alert region, and redirects to `/admin` on success.
- Forgot-password script calls `authClient.requestPasswordReset`, shows the existing success message, and keeps the back-to-login link as a normal anchor.
- Reset-password script calls `authClient.resetPassword`, validates token/passwords, shows the existing success message, and links back to login with the email prefill when present.

The auth scripts live in `src/scripts/admin-auth/**` and use plain DOM APIs. Astro will process them as bundled TypeScript modules, avoiding React hydration for these routes.

## Workspace Shell Design

The authenticated workspace keeps React for the stateful core:

- `AdminWorkspaceProvider`
- `AdminWorkspaceCommandPalette`
- route access checks
- data loading and mutation actions
- TipTap-rich field editor
- route body components for schema, content, media, team, settings, account, and home

Astro takes over the page shell around those route bodies:

- `AdminWorkspaceShell.astro` renders the workspace canvas, sidebar, and main content region.
- `AdminWorkspaceSidebar.astro` renders brand, primary nav links, active route state, and account summary from server-resolved session data.
- Route pages call a server helper before rendering workspace pages. The helper resolves setup/session/authorization and returns either:
  - a redirect response to setup or login,
  - an error state for the Astro shell, or
  - shell props containing the active route and account summary.

React route bodies should no longer render `AdminWorkspaceRouteFrame` or `AdminFrame`. Each route body should export a content component that assumes it is already inside the workspace main region and provider. The React island wrappers should render:

1. `AdminWorkspaceProvider`
2. a compact React toolbar containing `AdminWorkspaceCommandPalette`
3. the selected route body

This preserves provider-backed behavior while letting Astro own the page layout and sidebar. The provider remains responsible for client-side auth stabilization, permission-derived route restrictions, data prefetching inside route bodies, sign out, and account profile edits.

The Astro sidebar account summary is server-rendered at page load. To preserve same-page profile updates on the account screen, the React provider should dispatch a small `datamix:account-profile-updated` browser event when the current user profile changes. A short script in the Astro shell should listen for that event and update the sidebar account name/avatar text. If the event is not observed, the sidebar still refreshes correctly on the next navigation.

The current hover-driven sidebar data prefetch can be dropped from the Astro sidebar in this slice because it is a performance optimization, not correctness behavior. Route bodies still load their required data after the provider resolves the session and permissions.

## Routing And Data Flow

Astro page frontmatter becomes responsible for initial server routing decisions:

- Public root and 404 render with `DatamixRootLayout`.
- Auth pages call setup/session helpers and redirect early when possible.
- Workspace pages call a workspace page helper before rendering the shell and island.
- API endpoints remain under `src/pages/api/**` and continue delegating to plain `Request`/`Response` route handlers in `src/server/routes/**`.

Client-side auth/data flow remains split:

- Better Auth endpoint handling stays in `src/pages/api/auth/[...auth].ts`.
- `authClient` stays in `src/lib/auth-client.ts`.
- Workspace route data helpers stay in `src/lib/**`.
- Server domain logic stays in `src/server/**`.

## Error Handling

- Server-side auth/setup failures on auth pages render Astro error cards matching current copy and styles.
- Workspace server helper failures render an Astro shell error state for unrecoverable setup/auth-config problems.
- The React provider keeps its existing retry behavior for client session and authorization stabilization.
- Browser auth scripts write errors into `role="alert"` regions and restore disabled button states after failed submissions.
- Redirects only honor local paths beginning with `/`.

## Testing

Update existing inventory and UX tests so the new architecture is enforced:

- API route inventory reads from `apps/web/src/pages/api/**`.
- Admin page inventory requires workspace pages to use `AdminWorkspaceShell.astro` and React body islands.
- Auth page inventory requires auth pages not to use `client:only="react"` and not to import `auth-routes.tsx`.
- Source layout tests assert no imports from `@/app/admin`, `@/src/admin-routes`, root `components`, root `lib`, or root `server`.
- Existing tests that read admin source files are updated to `apps/web/src/admin/**`, `apps/web/src/components/**`, and `apps/web/src/lib/**`.

Verification commands:

- `npm run typecheck --workspace @datamix/web`
- `npm run build --workspace @datamix/web`
- `npm run smoke`

The Browser skill is not used for preview/debugging. After verification passes, ask the user to manually verify the admin flows in the running app.

## Implementation Slices

### Slice 1: Astro Source Tree Relocation

Move existing source roots into `src/**`, update the `@/*` alias to point at `src/*`, and update imports/tests/docs without behavior changes. This slice is mostly mechanical and should not convert React components.

Expected result: the app still builds with the same React islands, but no application source imports from the old root `app/admin`, `components`, `lib`, `server`, or `styles` paths.

### Slice 2: Auth Pages As Astro Templates

Replace `src/admin-routes/auth-routes.tsx` and the four auth React screen mounts with Astro templates, shared auth Astro components, and DOM-based scripts. Delete the old auth screen React files after parity is restored.

Expected result: `/admin/login`, `/admin/setup`, `/admin/forgot-password`, and `/admin/reset-password` ship no React client islands.

### Slice 3: Astro Workspace Shell

Add the server workspace page helper, Astro workspace shell/sidebar components, and React workspace body wrappers. Split `AdminWorkspaceRouteFrame` usage out of route bodies so the page shell is Astro-rendered and the React island only contains provider-backed toolbar/body behavior.

Expected result: authenticated workspace routes use Astro for layout/sidebar and React for the provider, command palette, and route body.

### Slice 4: Cleanup, Tests, And Docs

Delete obsolete bridge files, update architecture/local-development docs, tighten inventory tests, and run full verification. This slice should leave the migration enforceable by tests and document the next provider-decomposition boundary.

Expected result: no temporary admin route bridge remains, docs describe the Astro-native architecture, and the verification commands pass.

## Residual React

React remains only where it is still carrying real application behavior:

- admin workspace provider/context
- command palette
- route body screens
- TipTap rich text editor
- existing React UI primitives used by retained route bodies

This is the right boundary for this pass. The next conversion pass should start with decomposing `AdminWorkspaceProvider` into smaller stores or server-loaded route data so individual route bodies can move to Astro without duplicating state and mutation logic.

## References

- Astro project structure: `src/pages` is the required routing directory, and `src/components`, `src/layouts`, and `src/styles` are the conventional project source locations.
- Astro front-end framework components: hydrated framework components use `client:*` directives, while non-hydrated framework components can render as static HTML.
- Astro scripts and event handling: plain `<script>` tags in Astro components are bundled, support TypeScript, and can add browser behavior without a UI framework.
