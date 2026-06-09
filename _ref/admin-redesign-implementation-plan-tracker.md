# Datamix Admin Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for progress tracking.

**Goal:** Implement the Pencil/shadcn admin redesign as focused admin screens with a persistent Datamix sidebar, preserving the existing working collection, record, media, team, role, API key, auth, and permission behavior.

**Architecture:** Keep the existing collection, content, media, team, role, and API key server APIs unchanged. Extract the current single-file dashboard into shared admin workspace state, reusable admin UI primitives, and route-level screens under `/admin`, `/admin/schema`, `/admin/content`, `/admin/media`, `/admin/team`, `/admin/settings`, and `/admin/account`. Keep the current `/admin` dashboard working until route parity is complete, then replace it with a lightweight placeholder homepage dashboard that can be built out after the routed app is working.

**Tech Stack:** React 19, Vinext app router, Tailwind CSS v4, local shadcn/ui primitives, `lucide-react`, Better Auth, Datamix admin client libraries.

---

## Source Materials

- Handoff brief: `_ref/pencil-base-shadcn-handoff/IMPLEMENTATION_BRIEF.md`
- Reference implementation: `_ref/pencil-base-shadcn-handoff/DatamixDashboard.tsx`
- Theme tokens: `_ref/pencil-base-shadcn-handoff/globals.css`
- Visual references:
  - `_ref/pencil-base-shadcn-handoff/assets/pGANp.png` - Schema overview
  - `_ref/pencil-base-shadcn-handoff/assets/wAU5o.png` - Schema builder
  - `_ref/pencil-base-shadcn-handoff/assets/G3RLTM.png` - Content editor
  - `_ref/pencil-base-shadcn-handoff/assets/K1eiv.png` - User settings
  - `_ref/pencil-base-shadcn-handoff/assets/aCIZb.png` - Supporting screens overview

## Current Repo Facts

- Current admin entry: `apps/web/app/admin/page.tsx`
- Current dashboard implementation: `apps/web/app/admin/_screens/dashboard.tsx`
- Current dashboard size: 5,902 lines
- Current dashboard shape: one client component containing auth gates, loading/error shells, collection builder, record editor, media library, team access, settings, roles, API keys, command palette, and all related helpers.
- Existing shadcn/ui files: `alert`, `badge`, `button`, `card`, `input`, `label`, `separator`, `textarea`.
- Missing handoff shadcn/ui file: `avatar`.
- Existing tests: API-level smoke test at `tests/smoke/datamix-smoke.mjs`; no local React component test harness exists.
- Existing global styles already use Tailwind v4 and Inter; design tokens need to be merged carefully into `apps/web/styles/globals.css`.
- User instruction for this repo: do not use the Browser skill unless explicitly asked for web lookup. Use local files, commands, and reasoning for verification.

## Route Plan

- `/admin` - keep current dashboard until Slice 8, then replace it with a placeholder homepage dashboard route.
- `/admin/schema` - Schema overview.
- `/admin/schema/new` - Schema builder in create mode.
- `/admin/schema/[schemaId]` - Schema builder for an existing schema.
- `/admin/content` - Content collection/record picker for direct Content nav.
- `/admin/content/[collection]` - Record list and create-entry state for a collection.
- `/admin/content/[collection]/new` - Content editor in create mode.
- `/admin/content/[collection]/[recordId]` - Content editor in edit mode.
- `/admin/media` - Media library.
- `/admin/team` - Team and roles screen for users, invites, and role previews.
- `/admin/settings` - Settings, OAuth posture, public API keys, and role editor.
- `/admin/account` - Current user account card, profile surface, and sign out.

## Naming Rules

- User-facing navigation and headers use `Schema` instead of `Collections`.
- User-facing navigation and headers use `Content` instead of `Records`.
- Code may continue using `collection` and `record` names where it mirrors existing API/domain types.
- Existing server route names and client library function names are not renamed in this redesign.

## Progress Tracker

- [x] Planning: handoff and current admin implementation reviewed; this tracker created.
- [ ] Slice 1: Theme, shadcn, and shared admin UI foundation.
- [ ] Slice 2: Extract pure helpers and reusable behavioral components without route changes.
- [ ] Slice 3: Admin workspace shell, auth gate, route helpers, and safe route scaffolding.
- [ ] Slice 4: Schema overview and schema builder routes.
- [ ] Slice 5: Content routes and generated content editor.
- [ ] Slice 6: Media library route.
- [ ] Slice 7: Team, roles, settings, API keys, account route, and profile update API.
- [ ] Slice 8: Command palette, `/admin` homepage placeholder cutover, cleanup, smoke verification, and documentation update.

---

## Slice 1: Theme, shadcn, and Shared Admin UI Foundation

**Goal:** Add the visual foundation from the handoff without moving dashboard behavior yet.

**Files:**

- Modify: `apps/web/styles/globals.css`
- Create if absent: `apps/web/components/ui/avatar.tsx`
- Create: `apps/web/app/admin/_components/admin-design.tsx`
- Create: `apps/web/app/admin/_components/admin-frame.tsx`
- Create: `apps/web/app/admin/_components/admin-state.tsx`

**Steps:**

- [ ] Merge handoff tokens into `apps/web/styles/globals.css`, preserving existing Tailwind v4 imports and custom variants.
- [ ] Set Datamix sidebar tokens from the handoff: `--sidebar: #080f1f`, `--sidebar-accent: #0f1a2e`, `--sidebar-border: #334155`, `--sidebar-foreground: #e5e7eb`, `--sidebar-muted: #94a3b8`.
- [ ] Add `.font-heading`, `.font-body`, and `.font-data` utilities compatible with the existing Inter import. Use Inter fallback for Geist until a Geist font source is added intentionally.
- [ ] Add a local `Avatar`, `AvatarFallback`, and `AvatarImage` primitive in `apps/web/components/ui/avatar.tsx` if shadcn install is not run.
- [ ] Create shared presentational components:
  - `DatamixSidebar`
  - `AdminPageHeader`
  - `AdminMetric`
  - `AdminField`
  - `AdminSectionCard`
  - `AdminDetailList`
- [ ] Create `AdminStateBox` from the current `FlowStateBox` behavior, preserving `role="alert"` for error state and `role="status"` for other states.
- [ ] Do not change `apps/web/app/admin/page.tsx` in this slice.

**Acceptance Criteria:**

- Current `/admin` implementation still compiles.
- New shared components compile and are available for later screens.
- Theme tokens do not break login, setup, reset password, or forgot password screens.

**Verification:**

```bash
npm run typecheck --workspace @datamix/web
npm run build --workspace @datamix/web
```

---

## Slice 2: Helper and Component Extraction Without Route Changes

**Goal:** Reduce the 5,902-line dashboard by extracting pure logic and reusable components while keeping `/admin` behavior unchanged.

**Files:**

- Modify: `apps/web/app/admin/_screens/dashboard.tsx`
- Create: `apps/web/app/admin/_lib/schema-drafts.ts`
- Create: `apps/web/app/admin/_lib/record-drafts.ts`
- Create: `apps/web/app/admin/_lib/media-formatting.ts`
- Create: `apps/web/app/admin/_lib/role-drafts.ts`
- Create: `apps/web/app/admin/_lib/api-key-drafts.ts`
- Create: `apps/web/app/admin/_components/command-palette-dialog.tsx`
- Create: `apps/web/app/admin/_components/generated-record-field-input.tsx`
- Create: `apps/web/app/admin/_components/media-asset-field-picker.tsx`

**Steps:**

- [ ] Move collection draft types and helpers into `schema-drafts.ts`:
  - `CollectionDraft`
  - `CollectionFieldDraft`
  - `createFieldDraft`
  - `createEmptyCollectionDraft`
  - `createDraftFromDefinition`
  - `serializeDraft`
  - `formatIssuePath`
  - `formatCollectionSummary`
  - `formatPlanSummary`
  - `moveItem`
- [ ] Move generated record helpers into `record-drafts.ts`:
  - `GeneratedRecordFormState`
  - `GeneratedRecordFormValue`
  - `createGeneratedRecordFormState`
  - `createGeneratedRecordFormStateFromRecord`
  - `createGeneratedRecordPayload`
  - `createPersistedRecordPayload`
  - `createGeneratedFieldHint`
  - `createGeneratedFieldPlaceholder`
  - `summarizeRecord`
  - `upsertRecord`
- [ ] Move media formatting/search helpers into `media-formatting.ts`:
  - `formatRecordTimestamp`
  - `formatByteSize`
  - `createMediaAssetSearchText`
  - media URL derivation helpers used by the route screen.
- [ ] Move role draft helpers into `role-drafts.ts`:
  - `RoleDraft`
  - `createRoleIdSuggestion`
  - `createRoleDraftFromRole`
  - `createEmptyRoleDraft`
  - `resolveRoleLabel`
  - `rolePermissionSections`
- [ ] Move API key helpers into `api-key-drafts.ts`:
  - `ApiKeyDraft`
  - `createApiKeyDraftFromApiKey`
  - `createEmptyApiKeyDraft`
  - `formatApiKeyAccessLevel`
  - `formatPublicApiAccessMode`
  - `formatAuthProviderStatus`
- [ ] Extract `CommandPaletteDialog` with the same keyboard behavior and overflow cleanup.
- [ ] Extract `GeneratedRecordFieldInput` and `MediaAssetFieldPicker` with the same supported field types.
- [ ] Keep `dashboard.tsx` rendering the same UI by importing the extracted helpers/components.

**Acceptance Criteria:**

- No route changes.
- No user-facing copy changes except import-related whitespace or formatting.
- Dashboard still handles schema save, record save, media upload, invites, user role updates, roles, API keys, auth redirects, and command palette as before.

**Verification:**

```bash
npm run typecheck --workspace @datamix/web
npm run build --workspace @datamix/web
```

---

## Slice 3: Admin Workspace Shell, Auth Gate, Route Helpers, and Safe Route Scaffolding

**Goal:** Create the new route structure and shared workspace shell while keeping the old `/admin` page as the production fallback.

**Files:**

- Keep unchanged for now: `apps/web/app/admin/page.tsx`
- Create: `apps/web/app/admin/_workspace/admin-workspace-provider.tsx`
- Create: `apps/web/app/admin/_workspace/admin-workspace-hooks.ts`
- Create: `apps/web/app/admin/_workspace/admin-routes.ts`
- Create: `apps/web/app/admin/_screens/admin-route-placeholder.tsx`
- Create: `apps/web/app/admin/schema/page.tsx`
- Create: `apps/web/app/admin/schema/new/page.tsx`
- Create: `apps/web/app/admin/schema/[schemaId]/page.tsx`
- Create: `apps/web/app/admin/content/page.tsx`
- Create: `apps/web/app/admin/content/[collection]/page.tsx`
- Create: `apps/web/app/admin/content/[collection]/new/page.tsx`
- Create: `apps/web/app/admin/content/[collection]/[recordId]/page.tsx`
- Create: `apps/web/app/admin/media/page.tsx`
- Create: `apps/web/app/admin/team/page.tsx`
- Create: `apps/web/app/admin/settings/page.tsx`
- Create: `apps/web/app/admin/account/page.tsx`

**Steps:**

- [ ] Create `admin-routes.ts` with route builders for every route listed in "Route Plan".
- [ ] Create `AdminWorkspaceProvider` that centralizes:
  - Better Auth session lookup.
  - Setup-status redirects.
  - Session authorization lookup via `loadSessionAccess`.
  - Permission booleans currently computed in `dashboard.tsx`.
  - Shared sign-out action.
  - Loading and error shell rendering.
- [ ] Create hooks in `admin-workspace-hooks.ts` for reading provider state and enforcing provider usage.
- [ ] Create `AdminWorkspaceFrame` usage around route placeholders with persistent sidebar, brand, route-active nav, account card, and page content background from the handoff.
- [ ] Add placeholder route screens that render a real route header and restricted/loading states through the provider.
- [ ] Keep sidebar links pointing to the new routes inside the new shell only. Do not alter the old dashboard sidebar yet.
- [ ] Keep `/admin` serving `dashboard.tsx` until all route screens are complete.

**Acceptance Criteria:**

- Existing `/admin` still works through the current dashboard.
- New routes compile and render guarded placeholder content when visited directly.
- Login, setup, forgot password, and reset password routes are not wrapped in the new persistent sidebar.

**Verification:**

```bash
npm run typecheck --workspace @datamix/web
npm run build --workspace @datamix/web
```

---

## Slice 4: Schema Overview and Schema Builder Routes

**Goal:** Implement `/admin/schema`, `/admin/schema/new`, and `/admin/schema/[schemaId]` using the handoff visuals and existing collection behavior.

**Files:**

- Modify: `apps/web/app/admin/_workspace/admin-workspace-provider.tsx`
- Modify: `apps/web/app/admin/schema/page.tsx`
- Modify: `apps/web/app/admin/schema/new/page.tsx`
- Modify: `apps/web/app/admin/schema/[schemaId]/page.tsx`
- Create: `apps/web/app/admin/_screens/schema-overview.tsx`
- Create: `apps/web/app/admin/_screens/schema-builder.tsx`

**Steps:**

- [ ] Add collection/schema state and loaders to `AdminWorkspaceProvider`:
  - `collections`
  - `hasLoadedCollections`
  - `isLoadingCollections`
  - `isRefreshingCollections`
  - `collectionLoadError`
  - `loadCollections`
  - `refreshCollections`
- [ ] Implement `/admin/schema` as Schema Overview:
  - Metrics for schema count, record count when available, and draft/error state where available.
  - Table/list of saved schemas using `StoredCollectionDefinition`.
  - Primary action: `New schema` linking to `/admin/schema/new`.
  - Row action: open `/admin/schema/[schemaId]`.
- [ ] Implement `/admin/schema/new` as create-mode Schema Builder using `createEmptyCollectionDraft`.
- [ ] Implement `/admin/schema/[schemaId]` as edit-mode Schema Builder using `createDraftFromDefinition`.
- [ ] Preserve current collection behavior:
  - Existing schema names cannot be edited.
  - New schema names use lowercase letters, numbers, and underscores.
  - Field add/remove/move works.
  - Field type switching preserves label, name, required, and description.
  - Select and relationship type-specific controls remain available.
  - Save uses `saveCollectionDefinition(serializeDraft(draft))`.
  - Validation issues display through `AdminStateBox` and issue list.
- [ ] Replace user-facing "collection" wording with "schema" on these routes while keeping API names unchanged.

**Acceptance Criteria:**

- A user with collection permissions can create a schema from `/admin/schema/new`.
- A user with collection permissions can edit a schema from `/admin/schema/[schemaId]`.
- Restricted roles see a permission state instead of broken forms.
- Saved schema route returns to the persisted schema state after save.

**Verification:**

```bash
npm run typecheck --workspace @datamix/web
npm run build --workspace @datamix/web
npm run smoke
```

---

## Slice 5: Content Routes and Generated Content Editor

**Goal:** Implement content picker, content collection view, create editor, and edit editor routes using existing record behavior.

**Files:**

- Modify: `apps/web/app/admin/_workspace/admin-workspace-provider.tsx`
- Modify: `apps/web/app/admin/content/page.tsx`
- Modify: `apps/web/app/admin/content/[collection]/page.tsx`
- Modify: `apps/web/app/admin/content/[collection]/new/page.tsx`
- Modify: `apps/web/app/admin/content/[collection]/[recordId]/page.tsx`
- Create: `apps/web/app/admin/_screens/content-index.tsx`
- Create: `apps/web/app/admin/_screens/content-collection.tsx`
- Create: `apps/web/app/admin/_screens/content-editor.tsx`

**Steps:**

- [ ] Add record state and loaders to `AdminWorkspaceProvider`, keyed by active schema name:
  - `records`
  - `selectedRecord`
  - `recordDraft`
  - `recordIssues`
  - `recordLoadError`
  - `recordMessage`
  - `recordSupportedFieldNames`
  - `hasLoadedRecords`
  - `isLoadingRecords`
  - `isRefreshingRecords`
  - `isSavingRecord`
  - `loadRecords`
  - `refreshRecords`
- [ ] Implement `/admin/content` as a content picker with schema rows and links to `/admin/content/[collection]`.
- [ ] Implement `/admin/content/[collection]` as record list plus primary action `New content` linking to `/admin/content/[collection]/new`.
- [ ] Implement `/admin/content/[collection]/new` as create-mode content editor using `createGeneratedRecordFormState`.
- [ ] Implement `/admin/content/[collection]/[recordId]` as edit-mode content editor using `createGeneratedRecordFormStateFromRecord`.
- [ ] Preserve generated field behavior:
  - Text, number, boolean, date, select, rich text, markdown, image, image gallery, and relationship inputs.
  - Markdown preview.
  - Rich text editor via `TiptapRichTextEditor`.
  - Image/image gallery storage-key selection from loaded media assets.
  - Reset values restores selected record or empty create state.
  - Submit calls `createCollectionRecord` or `updateCollectionRecord`.
  - Payload preview remains available.
- [ ] Replace user-facing "record" wording with "content" where it is navigation/header language. Use "record id" only for technical identifiers.

**Acceptance Criteria:**

- Content nav opens a useful picker when no schema is selected.
- Existing saved content can be opened by route and edited.
- New content can be created for a schema.
- Image field selection still opens/navigates to media when needed.
- Restricted roles see permission states matching current dashboard behavior.

**Verification:**

```bash
npm run typecheck --workspace @datamix/web
npm run build --workspace @datamix/web
npm run smoke
```

---

## Slice 6: Media Library Route

**Goal:** Implement `/admin/media` using the handoff layout while preserving upload, browse, filter, select, URL preview, and clipboard behavior.

**Files:**

- Modify: `apps/web/app/admin/_workspace/admin-workspace-provider.tsx`
- Modify: `apps/web/app/admin/media/page.tsx`
- Create: `apps/web/app/admin/_screens/media-library.tsx`

**Steps:**

- [ ] Add media state and loaders to `AdminWorkspaceProvider`:
  - `mediaAssets`
  - `mediaLoadError`
  - `mediaMessage`
  - `mediaClipboardMessage`
  - `mediaSearchQuery`
  - `selectedMediaAssetId`
  - `selectedMediaFile`
  - `isLoadingMediaAssets`
  - `isRefreshingMediaAssets`
  - `isUploadingMedia`
  - `loadMediaAssets`
  - `refreshMediaAssets`
  - `uploadMediaAsset`
  - `copyMediaStorageKey`
- [ ] Implement upload panel with file picker, file metadata, upload button, success state, and error state.
- [ ] Implement library list with search over filename, MIME type, uploader email, and storage key.
- [ ] Implement selected asset detail with storage key, MIME type, size, uploaded timestamp, uploader, asset id, original URL, transform URL example, and transform query contract.
- [ ] Keep clipboard fallback messages from current dashboard.
- [ ] Keep media permissions:
  - No access state when neither view nor upload is allowed.
  - Upload disabled when only view is allowed.
  - Library hidden when view is not allowed.

**Acceptance Criteria:**

- Upload still creates a media asset.
- Refresh reloads assets.
- Filtering keeps the selected asset state clear and understandable.
- Storage key copy works when clipboard access is available and shows fallback messaging when unavailable.

**Verification:**

```bash
npm run typecheck --workspace @datamix/web
npm run build --workspace @datamix/web
npm run smoke
```

---

## Slice 7: Team, Roles, Settings, API Keys, Account Route, and Profile Update API

**Goal:** Implement the remaining operational screens without changing server behavior.

**Files:**

- Modify: `apps/web/server/db/users.ts`
- Modify: `apps/web/server/users.ts`
- Modify: `apps/web/server/routes/validation.ts`
- Modify: `apps/web/server/routes/admin-handlers.ts`
- Create: `apps/web/app/api/admin/account/route.ts`
- Create: `apps/web/lib/account.ts`
- Modify: `apps/web/app/admin/_workspace/admin-workspace-provider.tsx`
- Modify: `apps/web/app/admin/team/page.tsx`
- Modify: `apps/web/app/admin/settings/page.tsx`
- Modify: `apps/web/app/admin/account/page.tsx`
- Create: `apps/web/app/admin/_screens/team-and-roles.tsx`
- Create: `apps/web/app/admin/_screens/settings-api-keys.tsx`
- Create: `apps/web/app/admin/_screens/user-account.tsx`

**Steps:**

- [ ] Add team state and loaders to `AdminWorkspaceProvider`:
  - `users`
  - `usersLoadError`
  - `usersMessage`
  - `isLoadingUsers`
  - `updatingUserRoleId`
  - `userRoleDrafts`
  - `inviteEmail`
  - `inviteName`
  - `inviteRoleId`
  - `inviteError`
  - `inviteMessage`
  - `isInviting`
  - `loadUserList`
  - `sendInvite`
  - `updateUserRole`
- [ ] Add role state and loaders:
  - `availableRoles`
  - `rolesLoadError`
  - `rolesMessage`
  - `roleIssues`
  - `isLoadingRoles`
  - `isSavingRole`
  - `isCreatingRole`
  - `selectedRoleId`
  - `roleDraft`
  - `loadAvailableRoles`
  - `saveRole`
- [ ] Add API key state and loaders:
  - `apiKeys`
  - `apiKeyDraft`
  - `apiKeyDrafts`
  - `apiKeysLoadError`
  - `apiKeysMessage`
  - `apiKeySecret`
  - `apiKeySecretMessage`
  - `publicApiRuntime`
  - `isLoadingApiKeys`
  - `isCreatingApiKey`
  - `savingApiKeyId`
  - `revokingApiKeyId`
  - `loadApiKeyData`
  - `createApiKey`
  - `updateApiKey`
  - `revokeApiKey`
  - `copyApiKeySecret`
- [ ] Add a current-user profile update API:
  - Add `updateUserProfileRow(env, { userId, name, image, updatedAt })` in `apps/web/server/db/users.ts`.
  - Add a profile update type and `updateDatamixCurrentUserProfile(env, userId, input)` in `apps/web/server/users.ts`.
  - Add `parseCurrentUserProfileRequest` in `apps/web/server/routes/validation.ts`.
  - Add `updateAdminCurrentUserProfile` in `apps/web/server/routes/admin-handlers.ts`.
  - Create `apps/web/app/api/admin/account/route.ts` with `PUT = updateAdminCurrentUserProfile` and `OPTIONS = adminOptions`.
  - Create `apps/web/lib/account.ts` with `updateAccountProfile({ name, image })`.
  - Require only an authenticated session for this API; do not require `users.update`, because users must be able to edit their own profile without team-admin permissions.
  - Keep email display read-only in this slice. Email changes need a verified email-change flow and should not be bundled into the first profile API.
- [ ] Implement `/admin/team`:
  - Current users list.
  - User role assignment.
  - Invite form.
  - Available role previews.
  - Permission states for view/invite/update restrictions.
- [ ] Implement `/admin/settings`:
  - Session details.
  - Optional OAuth provider status.
  - Public API runtime posture.
  - API key create/update/revoke/copy secret flows.
  - Role list and role editor.
  - Permission states for settings restrictions.
- [ ] Implement `/admin/account`:
  - Profile preview from current session user.
  - Sign out action using the existing `authClient.signOut`.
  - Editable name and avatar image URL fields matching the handoff layout.
  - Read-only email field matching the handoff layout.
  - Save action wired through `updateAccountProfile`.
  - Refresh local session/profile state after a successful profile save.

**Acceptance Criteria:**

- Team invites still send.
- User role updates still refresh session authorization when the current user changes.
- Role edits still save and refresh permissions.
- API key create/update/revoke/copy secret flows still work.
- Account route signs out reliably.
- Account route updates the current user's name and avatar image URL through `/api/admin/account`.
- Account update API rejects unauthenticated requests and does not allow one user to edit another user's profile.

**Verification:**

```bash
npm run typecheck --workspace @datamix/web
npm run build --workspace @datamix/web
npm run smoke
```

---

## Slice 8: Command Palette, `/admin` Homepage Placeholder Cutover, Cleanup, and Final Verification

**Goal:** Finish the migration from a one-page dashboard to routed screens, keep `/admin` as a placeholder homepage dashboard route, then remove obsolete single-page dashboard code.

**Files:**

- Modify: `apps/web/app/admin/page.tsx`
- Modify: `apps/web/app/admin/_workspace/admin-workspace-provider.tsx`
- Modify: `apps/web/app/admin/_components/command-palette-dialog.tsx`
- Modify: `apps/web/app/admin/_components/admin-frame.tsx`
- Create: `apps/web/app/admin/_screens/admin-home.tsx`
- Delete after parity: `apps/web/app/admin/_screens/dashboard.tsx`
- Modify if needed: `apps/web/styles/globals.css`
- Modify: `apps/web/README.md`

**Steps:**

- [ ] Rebuild command palette items around route navigation:
  - Open homepage dashboard.
  - Open schema overview.
  - Create new schema.
  - Open each schema builder.
  - Open content picker.
  - Open current schema content list.
  - Create content for current schema.
  - Open each loaded content item.
  - Open media, team, settings, account.
  - Refresh schemas, content, media, users, roles, and API keys when the relevant screen state is loaded.
  - Sign out.
  - Check API health.
- [ ] Add command palette trigger to `AdminWorkspaceFrame`.
- [ ] Create `AdminHomeScreen` as a placeholder homepage dashboard with the persistent sidebar, a page header, route cards for Schema, Content, Media, Team, Settings, and Account, and clear copy that this dashboard will be expanded after the routed app is working.
- [ ] Change `apps/web/app/admin/page.tsx` to render `AdminHomeScreen` instead of the legacy one-page dashboard.
- [ ] Remove `dashboard.tsx` only after every route from this plan has working parity.
- [ ] Remove old dashboard-only CSS selectors from `apps/web/styles/globals.css` when no screen imports them.
- [ ] Update `apps/web/README.md` with the new admin route map and local verification commands.

**Acceptance Criteria:**

- `/admin` lands on the redesigned placeholder homepage dashboard, not the legacy one-page dashboard.
- All sidebar routes work.
- Command palette opens with Cmd+K and routes to separate screens.
- Existing smoke test still passes.
- Deleted dashboard code is not imported anywhere.

**Verification:**

```bash
npm run typecheck --workspace @datamix/web
npm run build --workspace @datamix/web
npm run smoke
rg -n "_screens/dashboard|collections-builder|record-editor|inviteSectionId|overviewSectionId" apps/web/app/admin apps/web/styles
```

The final `rg` command should return no references to deleted dashboard code or old hash-section ids.

---

## Cross-Slice Guardrails

- Do not rename server APIs or storage concepts in the implementation. Keep UI naming changes at the presentation layer.
- Do not remove current `/admin` dashboard until the new route screens have parity.
- Do not use the Browser skill under the current repo instruction. Verification for each slice is local command output plus code review.
- Prefer local shadcn-compatible components over network installs when a missing primitive is small, as with `Avatar`.
- Run `npm run typecheck --workspace @datamix/web` before considering a slice complete.
- Run `npm run smoke` after slices that preserve or move behavior across schema, content, media, team, roles, or API key flows.
- Make a git commit after each completed slice so rollback is straightforward.

## Resolved Implementation Decisions

- Slice 7 adds a current-user profile update API for name and avatar image URL.
- `/admin` remains a homepage dashboard route. Slice 8 replaces the legacy one-page dashboard with a placeholder homepage dashboard instead of redirecting to `/admin/schema`.
