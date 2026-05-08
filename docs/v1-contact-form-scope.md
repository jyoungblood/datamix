# v1 Contact Form Scope

Datamix does not include contact-form or generic submission processing in v0. That work is explicitly deferred to v1.

## What v1 Means Here

For Datamix, "contact form support" means a backend submission endpoint that public-facing websites can post to. It does not mean Datamix will ship a public-facing form builder, visual form designer, or hosted site widget.

The intended v1 shape is:

- A backend endpoint that accepts `POST` submissions from external sites.
- Submission storage and basic management inside Datamix.
- Optional email relay on submission through the existing provider-agnostic email layer.
- A developer-owned frontend form on the public site that points its action to Datamix.

## Out of Scope Until v1

- No public-facing form builder.
- No admin-side drag-and-drop form designer.
- No marketing-site widget generator.
- No broad "newsletter platform" interpretation.

## Contributor Rule

If a task mentions "contact forms," "submissions," or "form relay" during v0 work, treat that as deferred unless the change is a very small enabling seam that does not expose end-user submission features ahead of schedule.

## Why This Note Exists

The revised PRD reference still contains older wording that mentions form relay in the v0 email discussion. The active roadmap and current implementation direction are narrower:

- v0 email scope is auth-only.
- Submission processing is a v1 backend capability.
- Developers bring their own frontend form UI.
