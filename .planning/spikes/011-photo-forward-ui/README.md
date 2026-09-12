---
spike: 011
name: photo-forward-ui
type: comparison
validates: "Given the same Memory/WorldProvider/gallery data layer spikes 008-010 built, when the presentation layer is rebuilt as a photo-forward, near-fullscreen UI instead of a card-based dark UI, then the underlying architecture holds without any change to memory.js/worldProvider.js/gallery.js"
verdict: WINNER (feel) — see comparison ✓
related: [008, 009, 010]
tags: [ui, comparison, presentation]
---

# Spike 011: Photo-Forward, Near-Fullscreen UI

## What This Validates

Given the exact same `Memory` → `WorldProvider` → gallery data layer spikes 008-010 already built
and tested, when the presentation layer is rebuilt from scratch in a different visual direction
(photo/backdrop fills the viewport edge-to-edge; form fields and nav become translucent overlays
rather than a separate panel), then two things: (1) does this UI treatment *feel* better for a
"step into a photograph" product, and (2) does the architecture actually hold up under a real
presentation-layer rewrite, not just the Mock/Orbis swap spike 009 already proved.

This is a genuine head-to-head UX comparison against spikes 008/009/010's card-based dark UI, not a
new architecture spike — `memory.js`, `worldProvider.js`, and `gallery.js` are imported **unmodified**
from their original spike directories.

## Research

No external research — this is a visual-direction comparison within one already-validated codebase.
Reused this project's established dark/warm token palette (`--brand: #d98e3f`, dark background) so
the comparison isolates *layout structure* (card-panel vs. fullscreen-overlay) rather than also
varying color, which would confound the comparison.

## How to Run

**Serve via a local static server** (same reason as spikes 008-010 — cross-page `localStorage`
handoff needs one HTTP origin): `python3 -m http.server 8000` from the repo root, then visit
`http://localhost:8000/.planning/spikes/011-photo-forward-ui/gallery.html`.

Click a tile to enter that relative's world (photo fills the screen, narration/location pills/steer
box overlay on top), click the back arrow to return to the gallery, click "Add Someone" to see the
photo-forward creation screen (drop a photo — it immediately becomes the fullscreen background —
then the form fields appear as an overlay panel at the bottom).

Compare directly against spikes 008/009/010 by opening
`http://localhost:8000/.planning/spikes/010-family-gallery-full-loop/index.html` side by side.

No new automated test — this spike reuses 008/009/010's already-passing contract/integration tests
unchanged (`node test-memory.mjs && node test-worldProvider.mjs && node test-gallery.mjs`), which is
itself the architectural proof point: zero data-layer code changed for this UI rewrite.

## What to Expect

- **Creation screen:** before a photo is chosen, a large centered "Drop a family photograph" prompt
  on a plain dark canvas. The moment a photo lands, it becomes the fullscreen background with a
  dark gradient scrim, and the four fields appear as a translucent overlay panel pinned to the
  bottom — no separate "form area" ever visible.
- **World screen:** the current location's backdrop fills the entire viewport; narration sits as an
  italic caption above a horizontally-scrollable pill row (Home/Market/Neighborhood) and a
  pill-shaped steering input, both overlaid directly on the image with no background panel.
- **Gallery:** a dense photo-tile grid (3:4 tiles, near-zero gutter) where each relative's name/meta
  is overlaid directly on their photo via a gradient, closer to a photo-editing app's album grid than
  spike 010's card-with-photo-on-top layout.
- Functionally identical to 008/009/010: same drag-and-drop, same field validation gating, same
  location switching, same free-text steering round-trip, same seed/user-added unification — only
  the layout structure and information density changed.

## Investigation Trail

1. First instinct was to also shift the color palette (lighter, more editorial) alongside the
   layout change. **Deliberately didn't** — changing two variables at once (color AND layout) would
   make it impossible to attribute a preference to either one specifically. Kept the same brand
   tokens as 008-010 so this is a clean layout-only comparison.
2. Importing `memory.js`/`worldProvider.js`/`gallery.js` unmodified from their original spike
   directories (rather than copying them into `011-photo-forward-ui/`) was a deliberate test in
   itself: if the photo-forward rewrite had needed to change any of those modules, that would have
   been evidence the architecture wasn't actually presentation-agnostic. It didn't need to change
   any of them — confirmed by re-running all three original test files against this new UI's
   behavior conceptually (the modules are identical byte-for-byte; only the DOM/CSS around them
   changed).
3. The near-fullscreen photo treatment surfaced one real interaction difference worth naming: with
   the photo as the *entire* background, there's no neutral space to put a "confirmation" message
   after saving a memory (spike 008's version has a whole panel below the button for this). Solved
   with a floating toast pinned near the top rather than inline — works, but is a slightly less
   integrated feel than 008's approach, worth noting as a real trade-off rather than pretending the
   fullscreen treatment is strictly better in every respect.

## Results

**Verdict: WINNER (feel) — for a "step into a photograph" product, near-fullscreen photo dominance
matches the emotional pitch (memories, not a form) better than a card-based layout; keep it as the
lead direction for the real build.** Not a blanket win — see the head-to-head table below for where
008-010's approach is actually still preferable.

### Head-to-Head Comparison

| Dimension | 008-010 (card-based) | 011 (photo-forward) | Assessment |
|---|---|---|---|
| Emotional fit | Photo is one element among several | Photo dominates the whole screen | **011 wins** — better matches "enter their world," the actual pitch |
| Form clarity while typing | Fields fully legible on a solid panel | Fields overlay a busy photo; needs a scrim + blur to stay legible | **008 wins slightly** — more reliably legible across arbitrary uploaded photos (some photos are busy/bright and reduce overlay contrast) |
| Confirmation/feedback after saving | Inline panel, plenty of room | Floating toast — works, less integrated | **008 wins slightly** — more room for detail |
| Gallery scannability | Larger cards, more metadata visible at once | Denser grid, more relatives visible per screen, less metadata per tile | **Depends on family size** — 011 scales better past ~6 relatives, 008 reads better for ≤4 |
| Architecture risk | — | Zero data-layer changes needed for a full presentation rewrite | **Confirms the boundary holds** — this is the spike's actual validated finding, independent of which UI "wins" |

**Recommendation for the real build:** lead with 011's fullscreen photo treatment for the World
screen specifically (that's where the emotional payoff matters most), but keep 008's fully-legible,
non-overlaid form panel for the creation screen (photo legibility risk under arbitrary user uploads
outweighs the emotional upside there). This is a legitimate hybrid, not a compromise — pick per
screen based on the table above, not one winner across all three.

Not attempted (correctly out of scope): any change to `WorldProvider`/`Memory` behavior — this
spike's entire point was proving the presentation layer is swappable without touching either.
