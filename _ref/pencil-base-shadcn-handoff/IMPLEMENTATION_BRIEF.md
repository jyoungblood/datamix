# DATAMIX Admin Implementation Handoff

## Deliverables

- `DatamixDashboard.tsx`: shadcn/Tailwind reference implementation for the redesigned CMS admin.
- `globals.css`: Tailwind v4-compatible theme tokens and font utility classes.
- `assets/*.png`: exported visual references from the Pencil design.

## Required Stack Assumptions

- React or Next.js app.
- Tailwind CSS, preferably v4 syntax.
- shadcn/ui components installed.
- `lucide-react` installed.
- Fonts: Geist for headings, Inter for body, Geist Mono for metadata/data labels.

## shadcn Components To Install

```bash
npx shadcn@latest add avatar badge button card input label textarea
```

Also install icons if missing:

```bash
npm install lucide-react
```

## Route / Screen Split

Split the original one-page admin dashboard into separate screens. Do not keep it as one vertical mega-page.

1. `Schema Overview`
   Route suggestion: `/admin/schema`
   Use for the old Collections and collection workspace sections.
   Purpose: list schemas/collections, show field/record/draft counts, create new schema.

2. `Schema Builder`
   Route suggestion: `/admin/schema/:schemaId`
   Use for the old collection builder/editing section.
   Purpose: edit fields for a schema, configure labels, API names, required/preview/localization behavior.

3. `Content Editor`
   Route suggestion: `/admin/content/:collection/:recordId`
   Use for the old record editing form.
   Purpose: edit one content record with preview and metadata alongside the form.

4. `Media Library`
   Route suggestion: `/admin/media`
   Use for upload/import/library/asset selector sections.
   Purpose: upload, browse, filter, and select assets.

5. `Team and Roles`
   Route suggestion: `/admin/team`
   Use for users, invitations, and role management.
   Purpose: invite users, assign roles, inspect permissions.

6. `Settings / API Keys`
   Route suggestion: `/admin/settings`
   Use for current user/org settings, OAuth, public API keys, access level, project URL, and rules.
   Purpose: configure workspace and developer access.

7. `User Settings`
   Route suggestion: `/admin/account`
   Link from the account card at the bottom of the sidebar.
   Purpose: edit name, email, avatar, and sign out.

## Nomenclature

- Use `Schema` in navigation and headers instead of `Collections`.
- Use `Content` in navigation and headers instead of `Records`.
- A collection in the old UI maps to a schema in the redesigned UI.
- A record in the old UI maps to content in the redesigned UI.

## Layout Rules

- Use a persistent left sidebar on every admin screen.
- Sidebar width: `176px`.
- Sidebar background: `--sidebar` (`#080f1f`).
- Brand: blue square icon plus `DATAMIX` label.
- Navigation order: Schema, Content, Media, Team, Settings.
- Active nav item: dark outlined row, blue icon, and a blue left accent bar.
- Account card: bottom of sidebar, Maya Chen avatar/name/email-role line.
- Page content background: `--muted` / light grey.
- Screen content should be separated into focused screens, not hidden accordions inside one page.
- Each screen has one top-right primary action button using `--primary`.

## Implementation Notes For Follow-On Agents

- Start by implementing `DatamixSidebar`, `PageHeader`, `Metric`, and `Field` as shared components.
- Then implement screens one at a time in this order:
  1. Schema Overview
  2. Schema Builder
  3. Content Editor
  4. Media Library
  5. Team and Roles
  6. Settings/API Keys
  7. User Settings
- Keep data wiring separate from presentation. First build static UI matching the screenshots, then connect forms/actions.
- Preserve existing working form behavior from the current dashboard, but move each form section into its screen.
- Use shadcn components for inputs, buttons, cards, badges, avatar, textarea, select/dropdowns, dialogs, and tables where appropriate.
- Avoid inventing a marketing landing page. This is an operational admin app.

## Visual Reference Files

- `assets/pGANp.png`: Schema overview
- `assets/wAU5o.png`: Schema builder
- `assets/G3RLTM.png`: Content editor
- `assets/K1eiv.png`: User settings
- `assets/aCIZb.png`: Supporting screens overview
