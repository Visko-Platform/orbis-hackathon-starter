---
spike: 010
name: family-gallery-full-loop
type: standard
validates: "Given 3 example relatives + \"Add someone\" (wired to 008) + the mock world (wired to 009), when clicking Lola → Enter Her World → Market → Home → Exit → another relative, then the full loop feels complete end-to-end"
verdict: VALIDATED ✓
related: [006, 008, 009]
tags: [ui, integration, full-loop]
---

# Spike 010: Family Gallery — Full Loop

## What This Validates

Given three example relatives plus "Add Someone" (spike 008) plus the mocked world experience
(spike 009), when a user clicks all the way through **Lola → Enter Her World → Market → Home → Exit
→ another relative** — the exact interaction named as the night's success criterion — then the loop
feels complete end-to-end, with real code wiring 008 and 009 together rather than three disconnected
demos.

## Research

No new external research — this spike is pure integration of 008+009's already-built contracts plus
spike 006's established gallery card visual pattern (reused directly: photo/name/meta/tag/enter-btn
card shape).

## How to Run

**Serve via a local static server** (see the finding below for why this actually matters here, not
just as boilerplate advice): `python3 -m http.server 8000` from the repo root, then visit
`http://localhost:8000/.planning/spikes/010-family-gallery-full-loop/`.

Click "Enter Their World" on any of the three example cards (Lola/Yay/Babushka), click through
Market → Home in spike 009's screen, click "Exit this world", then "Enter another relative's
world →" back on the gallery. Click "Add Someone" to confirm it opens spike 008's real creation
screen — submit a memory there and confirm a fourth card appears back in the gallery with a working
"×" remove button (seed cards don't get one — they're permanent examples).

Full-loop integration test (no browser, exercises real memory.js + worldProvider.js + gallery.js
together): `node test-gallery.mjs`.

## What to Expect

- Three example cards (Lola/Cavite, Yay/Phnom Penh, Babushka/Leningrad) appear on first load, each
  tagged "Example," reusing spike 006's photos and the same three-questions worlds' flavor —
  but now flowing through the exact same `Memory` shape spike 008 produces for user-added content,
  not a separate hardcoded landing-page model.
- "Add Someone" opens spike 008's real creation screen (not a placeholder card, unlike spike 006's
  disabled "+ Add Your Family" stub) — submitting there and returning to the gallery shows the new
  memory as a fourth card.
- Every card, seed or user-added, resolves through spike 009's `MockWorldProvider` via the identical
  `?memoryId=` URL pattern — there's no branch anywhere in this code that treats "example relative"
  differently from "relative I just added," which is the actual thing this spike needed to prove.

## Investigation Trail

1. **Real finding, not a hypothetical:** the three-page flow (008 → 009 → 010) depends entirely on
   `localStorage` being shared across pages so a `Memory` created on one screen is readable on the
   next. Chromium-based browsers (Chrome, Edge) give each `file://` **path** its own storage
   partition as a security measure — `file:///.../008/index.html` and
   `file:///.../009/index.html` do NOT share `localStorage` when opened directly. Firefox is more
   permissive and shares `localStorage` across all `file://` pages. This is a genuine
   cross-browser inconsistency, not a bug in this spike's code — verified against documented
   Chromium file-URL security behavior, not just assumed. **Fix:** serve all three spikes from one
   local HTTP origin (`python3 -m http.server`) instead of opening files directly — added to all
   three spikes' "How to Run" sections, and this is the top build-day gotcha to remember once the
   real app moves off `localStorage` onto a real backend anyway (at which point this whole class of
   problem disappears).
2. Considered hardcoding the three example relatives as a separate array the gallery renders
   directly (spike 006's original approach) instead of seeding them into the same `Memory` store
   spike 008 writes to. **Deliberately unified them** — seeding via `ensureSeedsInStorage()` — because
   the actual point of tonight's priority stack is that user-generated and curated worlds should be
   indistinguishable to `WorldProvider`. Keeping them as two models would have hidden exactly the
   integration risk this spike exists to surface.
3. Had to decide what happens if a user deletes a seed relative — resurrect it on next load, or
   respect the delete? **Chose to respect it**: `ensureSeedsInStorage()` gates on a one-time
   `familyWorldSeeded` flag, not on "is the seed currently present," so a deleted example stays
   deleted. Verified this distinction matters with a test case in `test-gallery.mjs`: seeding a
   family list that already has *unrelated* user data (simulating "tested spike 008 before ever
   opening the gallery") still adds all 3 seeds, since the flag — not list emptiness — gates seeding.
4. Wrote the full named interaction sequence as literal test code
   (`test-gallery.mjs`: `provider.enter(lola)` → `goTo("market")` → `goTo("home")` → `exit()` →
   `provider.enter(yay)`) using the real `memory.js` and `worldProvider.js` modules together, not
   fresh mocks — this is what actually proves integration rather than three independently-passing
   unit tests that happen to describe compatible shapes on paper.

## Results

**Verdict: VALIDATED ✓**

- The exact required demo loop — **Lola → Enter Her World → Market → Home → Exit → another
  relative** — passes as a real, automated integration test spanning all three spikes' modules, not
  just a manual click-through.
- "Add Someone" is a real, working entry point into spike 008's creation screen, and a newly created
  memory correctly reappears in the gallery and is independently deletable — the loop closes in both
  directions (create → appear in gallery; gallery → create).
- **The one significant finding: the `file://`-vs-served-origin `localStorage` partitioning
  gotcha.** This would have looked like "nothing shows up" or "my new memory doesn't appear" during
  a live demo with zero indication of why, if discovered live instead of now. Flagged in all three
  spikes' README with the concrete fix (`python3 -m http.server`).
- This is genuinely a *spike-only* limitation, not a build-day one: once the real app persists
  `Memory` objects through a real backend/API instead of `localStorage`, this entire class of
  problem disappears — worth remembering so it isn't over-engineered around in the real build.
- Not attempted (correctly out of scope, per tonight's priority stack): swapping in
  `OrbisWorldProvider` for real, and any Tripo-character work — both explicitly deferred past this
  vertical slice.
