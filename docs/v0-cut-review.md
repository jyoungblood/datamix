# Final v0 Cut Review

This note is the final scope boundary for Datamix v0. Its purpose is to make the launch cut line obvious to contributors so new work does not quietly re-expand the release.

## What v0 Is Still Trying To Ship

Datamix v0 remains a narrow, Cloudflare-only content studio with these core product commitments:

- Browser-first deployment and first-run admin setup.
- Collection schema definition and record edit form generation as one system.
- JSON-first content delivery through Worker-managed API routes.
- Media stored in `R2` and served through Worker-managed routes.
- Multi-user auth, invites, roles, permissions, and API keys.
- Contributor-readable docs, smoke coverage, and a secondary bootstrap path that does not replace the browser-first flow.

## What Does Not Enter v0

Anything already documented as v1 or later stays out of the launch cut unless the roadmap is explicitly reopened.

- Contact-form and generic submission processing:
  See [docs/v1-contact-form-scope.md](/Users/jy/Desktop/projects/datamix/docs/v1-contact-form-scope.md:1).
- Starter packs, data grid, CI/build triggers, draft/published workflow, import/export, framework integrations, custom admin extensibility, and MCP:
  See [docs/v1-deferred-epics.md](/Users/jy/Desktop/projects/datamix/docs/v1-deferred-epics.md:1).
- Future-roadmap work such as ecommerce, premium add-ons, mobile, newsletter management, visual layout editing, and publishing hub:
  These remain post-v1 in the PRD.

## Review Outcome

The v0 cut line is now considered enforced by documentation:

- The stale PRD wording around form relay has an active clarification note.
- The broader v1 parking lot has a dedicated deferred-epics doc.
- The browser-first Cloudflare deployment model remains primary.
- No additional slices are being pulled into v0 through this review.

## Contributor Rule

If a request introduces new feature scope that is not clearly part of the current v0 commitments above, do one of these instead of implementing it directly:

1. Route it to the v1 deferred docs if it matches known post-launch scope.
2. Route it to future-roadmap discussion if it is beyond the current v1 list.
3. Reopen roadmap review explicitly before changing the launch cut.
