# v1 Deferred Epics

These epics are intentionally deferred until after Datamix v0 ships. They are visible so contributors can preserve future room without pulling the work forward into current implementation.

## How To Use This List

- Treat these as product-direction notes, not permission to start building them during v0.
- Prefer tiny enabling seams only when they clearly support current v0 work and do not expose partial v1 behavior.
- If a proposed change starts sounding like one of the epics below, stop and route it back to roadmap discussion first.

## Deferred Epics

### Starter Packs / Content Templates

- Prebuilt collection/model starting points such as blog, portfolio, or events.
- Meant to accelerate setup, not replace the core schema system.
- Keep v0 schema work generic enough that templates can layer on later without special-case model logic now.

### Data Grid Editor

- Table-style collection editing with inline cell editing and bulk actions.
- Deferred because v0 still prioritizes the schema-driven record editor as the primary authoring path.
- Avoid v0 abstractions that assume every collection flow must already support spreadsheet-like interaction.

### CI / Build Trigger Integration

- Triggering Cloudflare Pages or external CI/webhook targets after content changes.
- Includes both automatic-on-save and manual trigger flows.
- v0 should avoid hard-coding webhook orchestration or deployment-trigger assumptions into core save flows.

### Draft / Published Workflow

- Record publication state, published-only API defaults, and optional preview URLs.
- Explicitly deferred even though the public JSON API exists in v0.
- Current API and record flows should stay readable and stable without trying to approximate publish-state behavior early.

### Import / Export

- JSON and CSV import/export for collection data.
- Useful for migrations and operational portability, but not a blocker for the first usable Datamix release.
- v0 should keep data shapes explicit so future import/export work has a clean contract to target.

### SSG / Framework Integrations

- Official adapters or recipes for frameworks such as Astro or Next.js.
- These are integrations on top of the JSON-first product surface, not the core product itself.
- Preserve stable API conventions in v0, but do not add framework-specific code paths yet.

### Custom Admin Panels / Extensibility

- Developer-defined admin pages or extension primitives inside Datamix.
- This is not a v0 plugin ecosystem and should not backdoor one into the codebase.
- Current code should favor readable seams, but not a speculative extension API.

### MCP Server

- Exposing Datamix content and schema through an MCP interface for LLM tooling.
- Clearly useful later, but lower priority than finishing the primary admin and API product.
- Do not let MCP assumptions distort the v0 REST and schema contracts before those stabilize.

## Boundary Notes

- The v1 contact-form backend endpoint is documented separately in [docs/v1-contact-form-scope.md](/Users/jy/Desktop/projects/datamix/docs/v1-contact-form-scope.md:1).
- AI features are still out of scope for both v0 and v1.
- Future-roadmap items such as ecommerce, mobile, newsletter management, and publishing hub remain post-v1, not part of this deferred-epic list.
