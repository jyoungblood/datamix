# Datamix

## Edge-Native Content Modeling Studio

Product Requirements Document

_v0.1 - Internal Working Draft_

## 1. LLM Context Synopsis

Provide this section verbatim to any LLM assisting with planning or implementation.

### WHAT WE'RE BUILDING

Datamix (DMX) is an open-source, edge-native headless content modeling studio that deploys in a single click to Cloudflare. It provides a JSON-first content delivery API, a fully managed admin UI for content modeling and editing, multi-user RBAC, and a media library - all running on Cloudflare Workers + D1 + R2 with zero local setup required. The admin is a client-rendered SPA (Vinext + shadcn) served from Cloudflare Pages. The backend is a Hono API on Cloudflare Workers. Auth is handled by better-auth. Client-side server state is managed with TanStack Query. Email (auth flows + form relay) uses an abstracted provider layer supporting SMTP, Resend, Mailgun, SendGrid, and Cloudflare Email interchangeably. The primary differentiator is that the entire lifecycle - provisioning, configuration, content management - happens in-browser with no code editor required.

### WHAT WE ARE NOT BUILDING (v0)

No GraphQL, no plugin ecosystem, no AI features, no ecommerce/Stripe, no static site generator integrations, no preview/draft workflow, no mobile app, no dark mode. Scope is intentionally narrow. Resist feature additions until v1 is explicitly scoped.

### GUIDING PRINCIPLE

Write the simplest, most human-readable code possible. This is an open-source project with future contributors. Favor clarity over cleverness. Avoid writing custom code when a well-maintained library exists. Every architectural decision should be justifiable to a contributor reading the code for the first time.

## 2. Product Overview

### 2.1 Marketing Tagline

**_"The 1-click Edge Content Studio designed specifically for Cloudflare. Deploy a JSON-first backend in seconds, not hours."_**

### 2.2 Positioning

- Category: Edge-native content modeling studio (not a "headless CMS")
- Primary persona: Technically-inclined non-developers - designers, agency ops, IT staff - who want to manage structured content without touching code
- Secondary persona: Developers who want a fast, opinionated Cloudflare-native content backend for client projects
- Competitive reference: SonicJS (primary), Sanity (UX inspiration), FilamentPHP (extensibility model)
- Strategic inspiration: "Filament for Cloudflare" - a best-in-class admin experience on a specific infrastructure platform

### 2.3 Core Differentiators

- Zero local setup: provisioning, configuration, and content management happen 100% in-browser
- Genuinely good UX: feels complete, smooth, and intentional - not vibe-coded
- Cloudflare-native: built for the platform, not bolted on - D1, R2, Workers, Pages
- Narrow, focused feature set: does fewer things and does them well
- Human-readable codebase: optimized for open-source contribution, not performance tricks

## 3. Technical Architecture

### 3.1 Stack - Locked

| Feature | Description | Priority |
| --- | --- | --- |
| Frontend | Vinext (vinext.io) - locked in | Required |
| UI Components | shadcn/ui component library + shadcn CSS variable system | Required |
| Backend API | Hono on Cloudflare Workers | Required |
| Database | Cloudflare D1 (SQLite at the edge) | Required |
| Media Storage | Cloudflare R2 with optional custom domain (e.g. media.yourdomain.com) | Required |
| Auth | better-auth - full auth with password reset, persistent sessions | Required |
| Query Building | Kysely - type-safe SQL query builder (adopt if/when query complexity warrants it) | Evaluate |
| Data Fetching | TanStack Query - client-side server state, caching, and mutation management | Required |
| Hosting | Cloudflare Pages (admin SPA) + Cloudflare Workers (API) | Required |

### 3.2 Email - Abstracted Provider Layer

Email is required in v0 for two flows: auth (forgot password / account invites) and form processor relay. The email layer must be provider-agnostic from day one - configure once, swap providers without touching application code.

| Feature | Description | Priority |
| --- | --- | --- |
| SMTP (generic) | Default - works with any SMTP-compatible provider. Lowest friction to configure. | Required v0 |
| Resend | First-class named provider (excellent DX, generous free tier) | Required v0 |
| Mailgun / SendGrid | Supported via same abstraction interface | Required v0 |
| Cloudflare Email | Supported as one option among many - not the default | Supported |

- Single internal email handler interface - provider swapped via env var or admin settings, not code changes
- Template engine: React Email - write once, render for any provider
- Admin UI: email provider selector + credential fields (SMTP host/port/user/pass, or API key for hosted providers)
- Ship SMTP + Resend first - add additional providers incrementally. Do not over-engineer early.

### 3.3 Architecture Constraints

- Client-rendered SPA admin - avoids Worker cold-start UX issues associated with server-rendered apps like SonicJS
- Separate package architecture - core package + optional extension packages under a shared npm org
- All image processing (compression, resizing, cropping) via Cloudflare Worker routes for R2 - do NOT use Cloudflare Image Resizing service (keep manipulation and storage concerns separate)
- Built to receive security updates over time without breaking user customizations
- No custom code where a maintained library exists

### 3.4 Deployment Model

- PRIMARY: 1-click deploy via Cloudflare Deploy Button - provisions all services, runs init, creates admin user with zero local setup
- SECONDARY: `npx create-datamix@latest my-project --deploy` - local init + immediate deploy option
- Goal: a new instance must be fully operational from a browser tab with no terminal required

## 4. v0 - Core Feature Set

Everything in this section must ship before public launch. No exceptions.

### 4.1 1-Click Deploy & Init

- Cloudflare Deploy Button integration - single click provisions Workers, D1, R2, Pages
- First-run setup flow: create admin user account from within the deployed app (no CLI step)
- Environment credentials handled automatically during CF service provisioning
- Instance is fully operational post-deploy with no local setup at all

### 4.2 Content Collections (Schema & Edit Form)

- Visual collection creator - define schemas from the admin UI without writing code
- Defining a collection's schema also defines its edit form: the field types, labels, and layout used on the record editing screen. These are the same thing.
- Custom field types: text, number, boolean, date, select/enum, relationship, rich text, markdown, image, image gallery
- Drag-and-drop field ordering within a collection - order in schema = order on edit screen
- Schema changes reflected in D1 automatically
- Sidebar navigation with collections as the primary focal point
- No separate "form designer" concept - the schema IS the form definition

### 4.3 Content Editor

- Record creation and editing for any defined collection
- Rich text editor (well-maintained, accessible)
- Markdown editor with preview
- Image upload directly from record editor - uploads go to R2, entry added to media library
- Image gallery field type with drag-and-drop reordering

### 4.4 JSON Content Delivery API

- REST API endpoints auto-generated for every collection
- API key management with configurable access levels (read-only, full access)
- JSON over HTTP - no GraphQL
- Content is the primary output; the API is the product

### 4.5 Media Manager

- Central library of all uploaded assets (anything uploaded anywhere appears here)
- Direct uploads to library possible (not required to attach to a record first)
- Stored in Cloudflare R2
- Custom domain support for media URLs (e.g. media.yourdomain.com)
- Worker route for image processing: compression, resizing, cropping on R2 assets

### 4.6 Users, Roles & RBAC

- Multi-user support from v0
- Role-based access control: define roles with granular permissions
- Invite-based user onboarding
- Auth powered by better-auth: email/password, persistent sessions, password reset flow
- Optional OAuth (user supplies their own app credentials): GitHub, Google
- Session persists until explicit logout - no forced re-authentication

### 4.7 Navigation & Global UX

- Cmd+K command palette - access any collection, record, or admin action instantly
- Sidebar with collections as primary nav - clean, minimal, content-first
- UI aesthetic: feels like Arena, Roam, or Kirby - intuitive, requires no onboarding docs
- No dark mode in v0 (planned for later)
- No AI features in v0

## 5. v1 - Nice to Have (Post-Launch)

These features are explicitly out of scope for v0 but are next in priority queue.

### 5.1 Data Grid Editor

- Table view for any collection - each row is a record, columns are fields
- Inline editing of any cell - similar to TablePlus, Airtable, or Sequel Pro
- Bulk operations on selected rows

### 5.2 Starter Packs (Content Templates)

- Pre-built data model templates for common use cases: blog, portfolio, event calendar, etc.
- Install a starter pack to pre-populate collections, then modify as needed
- Acts as a "cassette" - load it to get a head start, then make it your own

### 5.3 Contact Form / Submission Processing

- Backend endpoint that accepts POST submissions from public-facing websites (contact forms, newsletter signups, etc.)
- Submissions saved to database, viewable and manageable from admin
- Optional email relay on submission (uses the abstracted email provider layer)
- No public-facing form builder - developers embed their own forms and point the action at the Datamix endpoint

### 5.4 CI / Build Trigger Integration

- Trigger a Cloudflare Pages build (or external CI webhook) on content save
- Manual trigger button available in admin UI
- Support for configurable webhook targets

### 5.5 Draft / Published Workflow

- Record-level publish state (draft vs published)
- API respects publish state (published records only by default)
- Preview URL support (optional)

### 5.6 Import / Export

- Export collection data to JSON or CSV
- Import records from JSON or CSV
- Useful for migrations from other systems

### 5.7 SSG / Framework Integrations

- Official content collection adapters for Astro, Next.js, etc.
- Reference: SonicJS Astro integration as a model

### 5.8 Cold Start UX Mitigation

- Client-rendered SPA should naturally avoid SonicJS-style cold-start 503 errors
- If cold starts occur: show loading interstitial, auto-retry after a few seconds
- Ensure 'remember me' session behavior works correctly (better-auth persistent sessions)

### 5.9 Extensibility - Custom Admin Panels

- Allow developers to register custom admin panels/pages within the Datamix admin
- Define a spec/interface for extension primitives (available hooks, data access patterns)
- Everything manageable from within the admin - never require opening a code editor

### 5.10 MCP Server

- Expose Datamix content and schema via an MCP server interface
- Enables LLM tooling integrations
- Low priority - note for roadmap only

## 6. Future Roadmap (Post-v1)

Do not implement or architect for these in v0 or v1. Listed for awareness only.

| Feature | Description | Priority |
| --- | --- | --- |
| Ecommerce / Stripe | Subscription and payment management, product/order collections | Future |
| Premium Add-ons | Advanced image processing, i18n/localization, SAML/SSO, 3rd-party connectors, webhooks, AI content tools | Future |
| Mobile App | Connect to multiple Datamix installations from iOS/Android | Future |
| Newsletter Management | Send newsletters via Cloudflare Email, manage subscriber lists | Future |
| Visual Layout Editor | Drag-and-drop page builder / block editor beyond simple rich text | Future |
| Publishing Hub | ActivityPub pipelines, automated cross-posting to newsletters, YouTube, podcasts | Future |
| CF Boilerplate Spinoff | Spin Datamix admin patterns into a standalone "Filament for Cloudflare" boilerplate once audience is established | Future |

## 7. Monetization Strategy

Datamix is open-source. Revenue is not a v0 requirement, but the architecture should not foreclose these options.

### 7.1 Indirect (Highest Near-Term Probability)

- Consulting pipeline and agency work - open source as lead generation
- Developer mindshare, portfolio credibility, and luck surface area
- Strategic partnerships (Cloudflare sponsorship or acquisition interest)

### 7.2 Direct

- GitHub Sponsors / Open Collective for community sponsorship
- Corporate sponsorships
- Premium first-party add-ons (commercial plugins): advanced image processing, RBAC workflows, SSO/SAML, enterprise connectors, AI integrations
- Pre-built premium starter kits for specific verticals

### 7.3 Acquisition Path

- Cloudflare is a natural acquirer - Datamix is purpose-built for their platform
- Build demonstrable adoption and community before approaching

## 8. Explicitly Out of Scope

If an LLM or contributor proposes any of the following, decline and redirect to the roadmap.

| Out of Scope Item | Rationale |
| --- | --- |
| GraphQL API | REST JSON is sufficient; GraphQL adds complexity with no v0 benefit |
| Plugin ecosystem / marketplace | No community yet; define extension spec in v1 instead |
| AI features (any) | Explicitly excluded from v0 and v1 |
| Dark mode | Planned for later theme work |
| Ecommerce / Stripe | Future roadmap only |
| Multi-deployment targets (VPS, etc.) | Cloudflare-only is the identity; flexibility dilutes focus |
| Cache monitoring/controls | Cloudflare handles this; not Datamix's responsibility |
| ActivityPub / publishing pipelines | Future roadmap only |
| Mobile app | Future roadmap only |

## 9. v0 Success Criteria

### Test Drive Experience

A non-developer should be able to:

- Click a Cloudflare Deploy Button
- Visit the deployed URL and log in
- Create a content collection with custom fields
- Add records and upload media
- Read content from the JSON API

...without reading documentation, watching a tutorial, or opening a terminal.

### Technical Baseline

- Zero local setup required for a fresh instance
- Persistent admin sessions (no forced re-login)
- All image assets served from R2 via Worker with processing support
- Multi-user with role-based permissions working end-to-end
- Codebase passes a "contributor readability" check - new contributor can navigate and understand structure in under 30 minutes

---

_Datamix (DMX) - Internal Working Draft - Do Not Distribute_
