# Datamix v0 Roadmap and Progress Tracker

Last updated: 2026-05-07
Source of truth: [Datamix-PRD-revised.md](/Users/jy/Desktop/projects/datamix/_ref/Datamix-PRD-revised.md)

## Summary

This roadmap reflects the revised PRD and should be treated as the working execution plan for Datamix v0.

Key product rules:

- Collection schema definition and the record edit form are the same system.
- There is no separate admin-side form designer in v0.
- Public-facing contact form / submission processing is deferred to v1.
- v0 email scope is auth-only, but the email adapter should be reusable in v1.
- The build sequence is vertical-slice first.
- The project remains Cloudflare-only in v0.

## Working Rules

- Keep work slices small enough to complete in one LLM session.
- Each slice should have one clear outcome and one primary seam of work.
- If a slice mixes deep backend work with broad UI polish, split it before implementation.
- Prefer readable, contributor-friendly code over clever abstractions.
- Do not pull v1 concepts into v0 unless a tiny enabling seam is clearly justified.

## Technical Architecture Decisions

This section is the default technical source of truth for roadmap execution. Future implementation work should follow these decisions unless this tracker is explicitly updated.

### Confirmed Stack Decisions

- Runtime/platform: `Cloudflare-only` in v0.
- Frontend architecture: admin is a client-rendered `SPA`.
- Frontend runtime/framework: `Vinext`.
- UI library/design system: `shadcn`.
- Styling system: `Tailwind CSS`.
- Backend/API framework: `Hono` on `Cloudflare Workers`.
- Admin hosting target: `Cloudflare Pages`.
- Database: `Cloudflare D1`.
- Object storage/media origin: `Cloudflare R2`.
- Auth library: `better-auth`.
- Client-side server state: `TanStack Query`.
- Content delivery shape: `JSON-first` API.

### Product-Architecture Constraints

- Collection schema definition and the generated record edit form are the same system.
- There is no separate admin-side form designer in v0.
- Public-facing contact form and submission processing are deferred to v1.
- v0 email scope is `auth-only`; the email adapter should remain reusable for v1 flows.
- The project should stay vertically sliced during implementation rather than broad horizontal platform buildout.
- The product should remain browser-first: a fresh instance should be deployable and usable without local setup.

### UI and UX Constraints

- `Tailwind CSS` and `shadcn` are required defaults for admin UI work unless this tracker is updated.
- Do not substitute another component system or design system such as `MUI`, `Chakra`, `Ant Design`, or similar without an explicit decision.
- The admin should keep a minimal, calm, collection-first information architecture.
- `Dark mode` is out of scope for v0.

### Infra and Integration Constraints

- Media assets must be served from `R2` through Worker-managed routes.
- Image transforms should be implemented in Worker routes; do not use `Cloudflare Image Resizing`.
- Email delivery should go through an abstracted provider layer.
- Supported email providers to design for are `SMTP`, `Resend`, `Mailgun`, `SendGrid`, and `Cloudflare Email`.

### Collaboration Rule for Agents

- Treat the decisions in this section as fixed unless the user changes them.
- If implementation work appears to conflict with these decisions, pause and update the tracker before changing course.
- If a tool, library, or architectural choice is not listed here, do not treat it as decided just because it is conventional.

### Still Open / Do Not Assume Yet

- Package manager is not yet fixed in the tracker.
- Monorepo tooling details beyond shared TypeScript config are not yet fixed in the tracker.
- Testing stack is not yet fixed in the tracker.
- Form/editor implementation details beyond the v0 product rules are not yet fixed in the tracker.

## Status Legend

- `planned`: defined but not yet ready to start
- `ready`: dependencies are satisfied and the slice can start
- `in_progress`: actively being worked
- `blocked`: cannot proceed until a dependency or decision is resolved
- `done`: implemented and accepted

## Progress Snapshot

| Area | Total Slices | Done | In Progress | Ready | Planned | Blocked |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| M0 Foundation and Repo Shape | 4 | 0 | 0 | 1 | 3 | 0 |
| M1 Deployable Authenticated Shell | 5 | 0 | 0 | 0 | 5 | 0 |
| M2 Collections as Schema + Edit Form | 6 | 0 | 0 | 0 | 6 | 0 |
| M3 Content API and Editor Depth | 6 | 0 | 0 | 0 | 6 | 0 |
| M4 Media Pipeline | 6 | 0 | 0 | 0 | 6 | 0 |
| M5 RBAC, Invites, and API Keys | 6 | 6 | 0 | 0 | 0 | 0 |
| M6 Global UX and Launch Hardening | 6 | 1 | 0 | 0 | 5 | 0 |
| M7 v1 Parking Lot Preparation | 3 | 0 | 0 | 0 | 3 | 0 |
| Total | 42 | 7 | 0 | 1 | 34 | 0 |

## Milestones

| Milestone | Outcome | Exit Criteria | Status |
| --- | --- | --- | --- |
| M0 | Project is understandable, runnable, and safe to build on | Monorepo scaffold, shared tooling, CI, and Cloudflare conventions exist | `ready` |
| M1 | A new instance can be deployed, initialized, and opened into an authenticated admin shell | Deploy/runtime contract, auth, setup, auth email, and shell are working | `planned` |
| M2 | Users can define a collection once and immediately get storage structure plus a record edit UI | Schema model, D1 changes, schema builder, generated edit forms, and record CRUD exist | `planned` |
| M3 | Datamix behaves like a usable content backend | Generated REST API, auth hooks, richer editors, and content UX depth exist | `planned` |
| M4 | Media works end to end through records and a central library | Uploads, asset metadata, media UI, gallery UX, and transforms are working | `planned` |
| M5 | Multi-user access control is production-shaped | Roles, permission enforcement, invites, API keys, and optional OAuth exist | `done` |
| M6 | The app feels coherent and launch-ready | Command palette, navigation polish, hardening, smoke coverage, docs, and bootstrap path exist | `planned` |
| M7 | v1 work is clearly deferred without contaminating v0 | Deferred epics are documented and v0 cut line is enforced | `planned` |

## Detailed Slice Tracker

| ID | Milestone | Slice | Goal | Depends On | Outputs | Acceptance | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M0-S1 | M0 | Package manager and workspace bootstrap | Choose package manager and initialize monorepo, root scripts, shared TS config | None | Workspace root, package manager config, shared tsconfig, root scripts | Fresh clone installs and root scripts run from repo root | `ready` | Recommend choosing the package manager best aligned with Cloudflare + Vinext tooling and contributor familiarity |
| M0-S2 | M0 | App and package scaffolds | Scaffold `apps/admin`, `apps/api`, and `packages/core` with clear boundaries | M0-S1 | Initial app/package directories and baseline entrypoints | Each app/package builds or typechecks with placeholder code and shared config | `planned` | Keep extraction minimal; avoid premature package sprawl |
| M0-S3 | M0 | Cloudflare runtime conventions | Add Cloudflare dev/runtime config, env typing, and contributor conventions | M0-S1, M0-S2 | Config files, env contract, local dev instructions | Local development contract is documented and typed | `planned` | Treat Cloudflare-only as a feature, not a temporary constraint |
| M0-S4 | M0 | CI quality gate | Add CI for install, lint, typecheck, and tests | M0-S1, M0-S2 | CI workflow files and passing baseline checks | PR-quality checks run automatically and pass on scaffolded repo | `planned` | Keep CI fast enough for contributors |
| M1-S1 | M1 | Deploy/runtime contract | Define Pages, Worker, D1, and R2 deployment/runtime contract | M0-S3 | Deployment config and service boundary docs/config | One documented runtime contract covers admin, API, database, and storage | `planned` | This is the infrastructure backbone for all later slices |
| M1-S2 | M1 | Persistent auth integration | Integrate better-auth and protect admin routes | M0-S2, M1-S1 | Auth setup, session handling, protected routing | Login state persists and protected routes reject anonymous access | `planned` | Keep session behavior explicit and testable |
| M1-S3 | M1 | First-run setup flow | Create initial admin account entirely in-browser | M1-S1, M1-S2 | Setup UI and backend initialization flow | Fresh instance reaches authenticated admin shell without CLI setup | `planned` | This is a core v0 success criterion |
| M1-S4 | M1 | Auth email abstraction | Build auth email adapter and ship password reset + invite email flows with SMTP and Resend | M1-S2 | Email interface, SMTP provider, Resend provider, auth mail templates | Password reset and invite flows work through either provider without app code changes | `planned` | v0 email consumer is auth only |
| M1-S5 | M1 | Minimal admin shell | Create sidebar shell, dashboard, and empty states | M1-S2, M1-S3 | Shell layout and initial screens | Authenticated user lands in a coherent admin frame with clear next actions | `planned` | Keep the first-run experience calm and obvious |
| M2-S1 | M2 | Schema model and validation | Define collection and field schema model in `packages/core` | M0-S2 | Shared schema types and validation logic | Schema definitions cover v0 field types and reject invalid definitions | `planned` | Schema is also the edit-form contract |
| M2-S2 | M2 | D1 schema planning | Turn collection schema changes into D1 migration/application logic | M2-S1, M1-S1 | Migration planner and schema application layer | Saving supported collection changes results in correct D1 structure updates | `planned` | Favor safety and readability over clever migration magic |
| M2-S3 | M2 | Collection builder UI | Build the admin UI to create, edit, and reorder field definitions | M1-S5, M2-S1 | Collection builder screens and interactions | Admin can define a collection visually with ordered fields | `planned` | No separate form designer terminology anywhere |
| M2-S4 | M2 | Generated record edit forms | Generate record edit forms directly from saved schema definitions | M2-S1, M2-S3 | Dynamic form renderer for record screens | Record edit UI reflects field types and schema order without hand-written forms | `planned` | The schema is the form definition |
| M2-S5 | M2 | Primitive record CRUD | Implement record list/create/edit flows for primitive fields | M2-S2, M2-S4 | Record screens and backend support for primitive fields | Admin can create and edit records using primitive field types end to end | `planned` | Keep the first pass narrow before adding richer field types |
| M2-S6 | M2 | Collection-first navigation | Make collections the primary admin information architecture | M1-S5, M2-S3, M2-S5 | Sidebar and navigation states centered on collections | Users can move between collections and records intuitively | `planned` | Reinforces the product's content-first posture |
| M3-S1 | M3 | Generated collection CRUD API | Generate collection CRUD API routes from schema definitions | M2-S1, M2-S2 | REST route generation layer | Supported collection schemas produce predictable CRUD endpoints | `planned` | Content API is a core product surface |
| M3-S2 | M3 | Public JSON API with key hooks | Expose collection data over public JSON API with API-key auth hooks | M3-S1 | Public API auth layer and response conventions | Read/write API access is controllable through key modes | `planned` | Final API-key management UI lands in M5 |
| M3-S3 | M3 | Markdown field experience | Add markdown editor with preview and persisted content handling | M2-S4, M2-S5 | Markdown field renderer/editor | Markdown fields are editable, previewable, and persisted correctly | `planned` | Keep storage format explicit |
| M3-S4 | M3 | Rich text field experience | Add accessible rich text editor and normalized storage format (ask about workhole markdown editor reference) | M2-S4, M2-S5 | Rich text editor integration and storage model | Rich text fields are usable, accessible, and persist safely | `planned` | Prefer maintained editor libraries |
| M3-S5 | M3 | Additional structured field editors | Add select, relationship, and date field editors | M2-S4, M2-S5 | Field-specific editors and persistence rules | Each supported field type renders and saves correctly | `planned` | Relationship semantics should stay simple in v0 |
| M3-S6 | M3 | Core content flow polish | Refine loading, empty, and error states in core content flows | M2-S6, M3-S1, M3-S5 | UX improvements across collection and record flows | Key content workflows feel stable and understandable under normal failure conditions | `planned` | Resist gold-plating before essential behavior exists |
| M4-S1 | M4 | R2 asset model and upload path | Create asset metadata model and R2 upload flow | M1-S1, M2-S1 | Asset schema, upload API, and storage flow | Uploading an asset stores metadata in D1 and binary data in R2 | `planned` | Keep metadata model future-friendly but lean |
| M4-S2 | M4 | Media library UI | Build media library list, upload, and detail views | M4-S1, M1-S5 | Media screens and basic management actions | Uploaded assets are browseable and reusable from a central library | `planned` | Search/filter can stay minimal in v0 |
| M4-S3 | M4 | Image field integration | Connect image and gallery fields to library-backed selection | M4-S1, M4-S2, M2-S4 | Media picker integration in record editor | Records can attach single images and galleries from the shared media library | `planned` | Reuse one picker surface where possible |
| M4-S4 | M4 | Gallery ordering UX | Add gallery ordering interactions | M4-S3 | Drag-and-drop gallery ordering | Editors can reorder images and saved order persists | `planned` | Keep interactions straightforward and predictable |
| M4-S5 | M4 | Worker image transforms | Implement Worker routes for resize, compress, and crop | M4-S1 | Media transform routes and URL contract | Requested transforms are served through Worker-managed R2 routes | `planned` | Do not use Cloudflare Image Resizing service |
| M4-S6 | M4 | Custom-domain media support | Add custom-domain media URL configuration support | M4-S1, M4-S5 | Config path and URL generation rules | Media URLs can resolve through configured custom domain | `planned` | Treat this as configuration, not a second storage system |
| M5-S1 | M5 | Role and permission model | Define role/permission model for collections, records, media, users, and settings | M1-S2, M2-S1 | Shared RBAC model and permission matrix | Permission model is explicit and usable by both API and UI | `done` | Keep model granular enough for v0 without overfitting |
| M5-S2 | M5 | Permission enforcement | Enforce permissions in API middleware and admin guards | M5-S1, M3-S2 | Shared enforcement layer | Unauthorized actions are blocked consistently in UI and API | `done` | Centralize checks to avoid drift |
| M5-S3 | M5 | Role management UI | Build role management UI and permission editing UX | M5-S1, M5-S2 | Roles screens and editing flows | Admin can create and edit roles with understandable permission controls | `done` | Favor legibility over dense matrices |
| M5-S4 | M5 | Invite-based onboarding | Implement invite-based onboarding flow | M1-S4, M5-S2 | Invite creation, acceptance, and membership flow | Invited users can join with assigned role and correct access | `done` | Align with persistent auth/session model |
| M5-S5 | M5 | API key management | Add API key creation, revocation, and access-level management | M3-S2, M5-S2 | API key UI and backend lifecycle support | Admin can create, revoke, and constrain API keys by access level | `done` | Record one-time secret display behavior clearly |
| M5-S6 | M5 | Optional OAuth providers | Add optional GitHub and Google OAuth configuration | M1-S2, M1-S4 | OAuth provider setup and auth flows | OAuth can be enabled with user-supplied credentials without breaking password auth | `done` | Keep this optional and isolated |
| M6-S1 | M6 | Command palette | Implement command palette for collections, records, and admin actions | M2-S6, M3-S1 | Palette UI and command indexing | Users can navigate core objects and actions with Cmd+K | `done` | Prioritize speed and clarity over long-tail commands |
| M6-S2 | M6 | Collection-first navigation polish | Refine sidebar and navigation behavior around collection-first usage | M2-S6, M6-S1 | Navigation refinements | Daily admin navigation feels coherent and low-friction | `planned` | Preserve the product's minimal, content-first feel |
| M6-S3 | M6 | Session and failure hardening | Harden session restoration, auth edge cases, and retry/loading behavior | M1-S2, M1-S3, M3-S6 | Reliability fixes and recovery UX | Session handling and recoverable failures behave predictably | `planned` | Especially important for first-run trust |
| M6-S4 | M6 | End-to-end smoke coverage | Create smoke coverage for deploy, login, collection, record, media, and API flows | M4-S6, M5-S5 | Automated smoke tests | Critical v0 flows have reliable automated coverage | `planned` | Keep suite focused on must-not-break paths |
| M6-S5 | M6 | Contributor readability docs | Write architecture docs and 30-minute contributor onboarding | M0-S4, M3-S6 | OSS-facing docs | New contributor can understand structure and run checks quickly | `planned` | This is a product requirement, not just project hygiene |
| M6-S6 | M6 | Secondary bootstrap path | Add `create-datamix` bootstrap path after browser-first deploy is proven | M1-S3, M6-S4 | Bootstrap scaffolder plan/implementation | Secondary bootstrap flow exists without compromising the primary deploy path | `planned` | Must not become the assumed primary onboarding path |
| M7-S1 | M7 | v1 contact form scope note | Document v1 contact form / submission processing as backend endpoint only | None | Deferred scope note | Contact-form processing is clearly documented as v1 with no public builder | `planned` | Protects the repo from the old terminology confusion |
| M7-S2 | M7 | v1 deferred epics | Document starter packs, data grid, CI triggers, draft/published, import/export, integrations, and MCP as deferred epics | None | Deferred epic list | Deferred work is visible without entering v0 implementation scope | `planned` | Useful for future planning without polluting current milestones |
| M7-S3 | M7 | Final v0 cut review | Remove or defer any slices that drift beyond v0 | M6-S6 | Final scope review notes | Roadmap has a clean v0 cut line before launch work closes | `planned` | Run this before calling v0 complete |

## Acceptance Scenarios

1. A user clicks deploy, lands in the app, creates the first admin account, and reaches the admin shell without opening a terminal.
2. An admin creates a collection with custom fields and immediately gets a matching record edit screen from that schema.
3. An admin creates, edits, and retrieves records through both the admin UI and generated JSON API.
4. An editor uploads images, reuses them from the media library, and gets transformed asset URLs from the Worker route.
5. An admin invites another user, assigns a restricted role, and that user is blocked from unauthorized actions in both UI and API.
6. An admin creates a read-only API key that can fetch content but cannot mutate it.
7. A user requests password reset, receives email through the configured provider, and regains access with session persistence intact.
8. A new contributor can clone the repo, run checks, understand package boundaries, and navigate the codebase within 30 minutes.

## v1 Parking Lot

- Contact form / submission processing:
  Backend endpoint for public-site POST submissions, submission storage/management, and optional email relay. No public-facing form builder.
- Starter packs / content templates
- Data grid editor
- CI / build trigger integration
- Draft / published workflow
- Import / export
- SSG / framework integrations
- Custom admin panels / extensibility
- MCP server

## Revision Notes

- This tracker follows the revised PRD, including the clarification that schema definition and record edit form generation are the same feature.
- The revised PRD still contains a stale line in section `3.2` mentioning form relay in v0 email scope. This tracker intentionally treats email as auth-only in v0 and reserves submission relay for v1.
