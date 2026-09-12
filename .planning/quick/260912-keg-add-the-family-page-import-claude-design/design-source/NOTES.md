# Design source notes — Add Family.dc.html

Fetched live from the Claude Design MCP (project `868bef8e-ac73-4d10-8db7-6a61a92c86e8`,
"Front page modernist redesign") via the `DesignSync` tool's read methods
(`get_project`, `list_files`, `get_file`). `DesignSync` is not available to the planner/executor
subagents, so the fetched source is saved locally here for them to read instead.

- `Add Family.dc.html` — the page to implement (saved verbatim in this directory).
- `_ds/modernist-.../_ds_bundle.js` — empty component-registration stub (no components exported).
  Nothing to port from it.
- `support.js` — the Claude Design *preview* runtime only (parses `<x-dc>`/`sc-for`/`sc-if`
  template syntax in-browser). Not needed for the Next.js port — same conclusion the prior
  "Front Page.dc.html" import reached (see `.planning/quick/260912-g80-*/260912-g80-PLAN.md`).
- `_ds/modernist-.../styles.css` — **already ported** into this repo as
  `app/family-world.css` (fw-* prefixed classes, scoped under `.family-world`), used by the
  already-shipped front page (`app/page.tsx`) and `app/explore-grandmas-world/page.tsx`. Do NOT
  re-port it — reuse the existing `fw-*` classes (`fw-nav`, `fw-nav-brand`, `fw-btn`,
  `fw-btn-primary`, `fw-btn-ghost`, `fw-btn-secondary`, `fw-field`, `fw-input`, `fw-hr`,
  `fw-tag`/`fw-tag-accent`/`fw-tag-neutral`, `fw-grayscale`) exactly as the design's bare
  `nav`/`btn`/`btn-primary`/`btn-ghost`/`field`/`input` classes map to them 1:1.

## Important deviation from the fetched file, made deliberately

`Add Family.dc.html`'s own `<helmet><style>` block locally overrides `:root` with a **different**
font (Schibsted Grotesk instead of Archivo) and different accent colors (`#ff4d1f` orange /
`#2f6bff` blue instead of the shared system's `#ec3013` red). This is inconsistent with every
other page in this design project (`Front Page.dc.html`, already shipped as `app/page.tsx`, and
`Live World.dc.html`) which all use the shared `_ds/modernist-.../styles.css` tokens un-overridden.

**Decision: ignore this page-local token override.** Implement the page using the same shared
`family-world.css` tokens (Archivo, `#ec3013` accent) already used by every other page in this app,
for visual consistency with the already-shipped Family World pages. Do not import Schibsted
Grotesk or introduce the orange/blue accent pair. This matches how a real design system works
(shared tokens, not a per-page fork) and avoids a jarring inconsistency between "Add Family" and
the page it links back to.

## Routing translation

- `Front Page.dc.html` → `/` (already `app/page.tsx`)
- `Live World.dc.html?memoryId=...` → `/session?memoryId=...` (already `app/session/page.tsx`,
  consistent with `FamilyGallery.tsx`'s existing `href` construction — even though `/session`
  doesn't consume `memoryId` yet; that's a known, separately-tracked gap, not something to fix here)
- This new page → `/add-family` (new route, `app/add-family/page.tsx`)

## Scope note

This design's flow (multi-photo grid, per-photo metadata form with `who`/`place`/`year`/`scene`/
`context`, a "Ready to enter" saved list) is a fuller, standalone alternative to the single-photo
"Add someone" tile already inline on `app/page.tsx` (`FamilyGallery.tsx`). The task is to implement
this design as its own new page at `/add-family` — do not modify `FamilyGallery.tsx`'s existing
inline flow or wire the front page's nav to link to this new page unless asked; that's a separate
follow-up decision, not part of this quick task.
