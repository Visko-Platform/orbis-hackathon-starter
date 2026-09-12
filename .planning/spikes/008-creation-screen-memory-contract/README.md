---
spike: 008
name: creation-screen-memory-contract
type: standard
validates: "Given the 4-field capture form + real photo upload, when submitted, then a Memory object {person, relationship, place, year, memory, photo} is produced — the UI→data contract for everything downstream"
verdict: VALIDATED ✓
related: [006, 009, 010]
tags: [ui, contract, architecture]
---

# Spike 008: Creation Screen → Memory Contract

## What This Validates

Given the approved four-field "FAMILY WORLD" creation wireframe (drop a photo; Who is this? / Where
did they live? / Around when? / Anything you remember?) plus a real photo upload, when the form is
submitted, then a `Memory` object shaped `{person, relationship, place, year, memory, photo}` is
produced — the contract this project's whole "UI → Memory → MemoryDirector → WorldProvider"
architecture is built on.

## Research

Skipped formal library research — this is browser-native `FileReader`/drag-drop, no external
dependency. Read this project's own prior UI work instead:
- Spike 006's `mockup.html` for the established dark/warm palette (`--bg #0b0a09`, `--brand #d98e3f`)
  and single-file, no-build-step convention for UI spikes.
- `CONVENTIONS.md`'s "build standalone mockups while another session wires the live app" rule —
  confirmed live: `git worktree list` shows 3 other active worktrees (`fvm-spike`, `new-prd`,
  `family-videos-memories-build`) tonight, so this spike does not touch `my-orbis-app/`.

## How to Run

**Recommended:** serve the whole `.planning/spikes/` directory with a local static server
(`python3 -m http.server 8000` from the repo root, then visit
`http://localhost:8000/.planning/spikes/008-creation-screen-memory-contract/`) rather than opening
`index.html` via `file://`. This spike works fine standalone either way, but spikes 009/010 read
back the `Memory` this spike saves to `localStorage`, and Chromium-based browsers give each
`file://` path its own storage origin — `localStorage` written by one `file://` page is invisible to
another `file://` page, which silently breaks the cross-spike handoff. A local server puts all three
spikes on one real origin (`http://localhost:8000`), where `localStorage` sharing works the way the
Memory contract assumes. See spike 010's README for the full write-up of this finding.

Drag a photo onto the dropzone (or
click it to browse, or click "Use a sample photo" to reuse spike 006's `cavite-1953.jpg`), fill in
the four fields, and watch the "Live Memory object" panel update as you type. Click "Enter Their
World" to build + persist the `Memory` and see the confirmation panel with a link into spike 009.

Contract-only test (no browser): `node test-memory.mjs`.

## What to Expect

- The dropzone accepts drag-and-drop and click-to-browse, shows a live image preview once a photo
  is set, and rejects non-image files silently (drop a `.txt` file — nothing happens).
- "Enter Their World" stays disabled until all 4 fields are non-empty AND a photo is set.
- The "Live Memory object" `<details>` panel shows the exact object shape live, including the
  derived `person` label, before you ever submit — this is the actual thing the spike is proving,
  not just the button working.
- Submitting saves the `Memory` to `localStorage` (key `familyWorldMemories`) so spike 010's gallery
  can read it back, and shows a confirmation with a working link into spike 009, pre-filled with
  `?memoryId=<id>`.

## Investigation Trail

1. The wireframe's "Who is this?" is a single free-text field, but the `Memory` contract in the
   idea brief needs both `person` (short label for a gallery card) and `relationship` (the fuller
   phrase). Rather than add a field the wireframe doesn't show, wrote `derivePersonLabel()`: strip a
   leading "My " (case-insensitive) and title-case the rest — `"My grandmother"` → `"Grandmother"`,
   `"my tita Baby"` → `"Tita Baby"`.
2. **Tested the heuristic's edges deliberately** (see `test-memory.mjs`), not just the happy path:
   - Bare names with no "My " prefix pass through unchanged — `"Lola"` → `"Lola"`. Fine.
   - `"She's my grandma"` (mid-sentence "my") is **not** stripped — comes out as
     `"She's my grandma"` verbatim, which is a poor gallery-card label. This is a real, surviving
     limitation, not a hidden one.
   - **Finding for build day:** this heuristic is good enough for the demo's expected input style
     ("My grandmother," "My tito," etc.) but will mislabel free-form phrasing. If real testers type
     more naturally than the wireframe implies, split into two explicit fields ("What's their
     name?" / "Their relationship to you") before relying on this in front of judges.
3. Considered a data URL vs. a blob URL for the photo. Used a **data URL** (`FileReader.readAsDataURL`)
   specifically because it round-trips through `localStorage` (a `blob:` URL dies on page reload,
   which would silently break spike 010's gallery). Trade-off documented in `memory.js`: data URLs
   bloat `localStorage`; fine for a handful of demo photos, not a real storage strategy.
4. Verified the "disabled until complete" gating catches the actual edge case that matters: typing
   in the memory field before adding a photo, then adding a photo — button correctly flips enabled
   the moment the photo lands, without needing to re-focus any field (confirmed by wiring
   `updatePreview()` off of both the file-load callback and every field's `input` event).

## Results

**Verdict: VALIDATED ✓**

- The four-field UI, drag-and-drop photo upload, and live Memory-object preview all work exactly as
  intended, confirmed by actually dropping files and watching the JSON panel update — not just
  described.
- `memory.js` is a clean, dependency-free module (`buildMemory`, `derivePersonLabel`,
  `saveMemory`/`loadFamily`/`deleteMemory`) that both this spike's `index.html` and, in turn, spike
  010's gallery import directly — the UI→Memory contract is real, tested code, not a diagram.
- **One documented limitation, not a blocker:** `derivePersonLabel`'s "My X" heuristic only handles
  the phrasing style the wireframe itself uses. Flagged above for build-day attention if user testing
  shows people phrasing it differently.
- Not attempted (correctly out of scope for this spike): anything about *where the Memory goes
  next* — that's spike 009 (mock world rendering) and spike 010 (the gallery reading these back).
