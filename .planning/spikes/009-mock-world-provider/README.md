---
spike: 009
name: mock-world-provider
type: standard
validates: "Given a Memory object, when \"ENTER THEIR WORLD\" is clicked, then a WorldProvider-abstracted fake world screen renders with Home/Market/Neighborhood nav + free-text steering, with MockWorldProvider and a stubbed OrbisWorldProvider both satisfying the same contract"
verdict: VALIDATED ✓
related: [006, 008, 010]
tags: [ui, architecture, worldprovider]
---

# Spike 009: Mock World Provider

## What This Validates

Given a `Memory` object (from spike 008), when "Enter Their World" opens a fake world screen, then
the app's `WorldProvider` boundary — `MockWorldProvider` built first, `OrbisWorldProvider` swapped
in later, both satisfying one shared contract — actually holds up, not just as a diagram but as
real code with a real call site that doesn't change when the provider changes.

This is the highest-risk spike in the vertical slice per the priority stack: "that's a particularly
good hackathon architecture because Orbis can misbehave for three hours and you're still making
progress" only holds if the boundary is real.

## Research

No external dependency — this is an in-process interface design question, not a library question.
Read this project's own architecture note instead: the priority stack's explicit diagram
(`UI → Memory → MemoryDirector → WorldProvider → {MockWorldProvider, OrbisWorldProvider}`) and spike
006's finding that a landing screen needs a `pendingWorldId`-style handoff into a "ready" connection
— the same shape of problem (deciding a world before the render surface is live) shows up again here
as the `provider.enter(memory)` call site.

## How to Run

**Serve via a local static server**, not `file://` — see spike 008's README for why (Chromium
isolates `localStorage` per `file://` path, which breaks reading the `Memory` this spike depends on).
`python3 -m http.server 8000` from the repo root, then
`http://localhost:8000/.planning/spikes/009-mock-world-provider/`.

It reads the most recently created `Memory` from spike
008's `localStorage` (or falls back to a bundled Cavite/Lola example if none exists, so this spike
is independently testable). Click through Home / Market / Neighborhood, type something in "Where
should we go?" and hit Go, then open the "WorldProvider debug" panel and click "Try
OrbisWorldProvider.enter()" to see the swap point fail loudly and clearly instead of silently.

Contract-only test (no browser): `node test-worldProvider.mjs` — includes the exact
`Lola → Market → Home → Exit` loop from the priority brief as an assertion, not just prose.

## What to Expect

- **Home** shows the actual uploaded/example photo with narration built from the Memory's own
  fields. **Market** and **Neighborhood** show stock placeholder backdrops (reused from spikes
  004/005's composite-world assets) with narration that explicitly says it's a placeholder — the
  point is proving the location-switching interaction, not faking a convincing render. No
  ambiguity here: nothing in this spike pretends to be a real Orbis render.
- Free-text steering doesn't call any model — it deterministically echoes the typed text back into
  a narration line, proving the round trip (type → session updates → UI re-renders) without needing
  an LLM in the loop for the spike itself.
- "Exit this world" resets to Home, ready for "another relative" — clicking through to spike 010's
  gallery link confirms the loop the priority brief asked for: **Lola → Enter Her World → Market →
  Home → Exit → another relative**.
- The debug panel's "Try OrbisWorldProvider" button throws a clear, specific error naming exactly
  what's unimplemented — proving the contract exists and is enforced, not just documented in a
  comment.

## Observability

The debug `<details>` panel doubles as the forensic layer for this spike: it's the mechanism by
which a reviewer can directly witness the Mock/Orbis call-site parity (`orbis.enter === mock.enter`
in shape, not implementation) without reading source code.

## Investigation Trail

1. First draft returned locations as plain strings and let `index.html` build the narration/backdrop
   mapping inline. **Reworked to have `worldProvider.js` own that mapping entirely** (`buildLocations`)
   — otherwise "the rest of the app shouldn't care whether the world is mocked or live" isn't actually
   true, since the UI would need Mock-specific knowledge to render it. Moving backdrop/narration
   construction into the provider itself is what makes the later Orbis swap a real drop-in rather
   than a partial one.
2. Tested the exact interaction sequence named in the priority brief
   (`Lola → Enter Her World → Market → Home → Exit → another relative`) as a literal assertion
   sequence in `test-worldProvider.mjs`, not just eyeballing the UI — confirmed `exit()` resets state
   cleanly so a second `enter()` (for "another relative") starts from a known-good `home` state
   rather than carrying over the previous relative's steered location.
3. **Deliberately made `OrbisWorldProvider.enter()` throw immediately** rather than returning a
   fake-success session. A stub that silently "succeeds" would hide the real integration work behind
   a false sense of parity; a stub that throws with a specific message documents exactly what build
   day needs to replace and forces any accidental early wiring attempt to fail loudly instead of
   demoing broken.
4. Considered whether `steer()` should append to history (multi-turn steering) or just replace
   current state. Chose **replace** for this spike — matches the mocked scope (nothing here is
   actually accumulating context in a model) — and noted in the code comment that a real
   `OrbisWorldProvider.steer()` composing `baseScene + directional` (per this project's spike 002
   convention) is a build-day concern, not something this contract needs to dictate today.

## Results

**Verdict: VALIDATED ✓**

- The `WorldProvider` boundary is real, tested code: `createMockWorldProvider()` and
  `createOrbisWorldProvider()` expose the identical `enter(memory) -> session` shape, confirmed by a
  contract test that calls both through the same assertions.
- The full click-path interaction (location switching, free-text steering, exit-and-reenter) works
  end-to-end in the browser using only the Memory object spike 008 produces — no Orbis, no API key,
  no network call anywhere in this spike.
- The required demo loop (`Lola → Enter Her World → Market → Home → Exit → another relative`) is
  provably correct, not just plausible — it's a literal test assertion in `test-worldProvider.mjs`.
- **Confirms the architecture bet from the priority stack**: build day's job is writing one new
  function body (`OrbisWorldProvider.enter`) that returns the same session shape — not redesigning
  how the UI talks to worlds.
- Not attempted (correctly out of scope): any real Orbis-Stable call — no live Reactor API key
  exists until event check-in, and per the priority stack this integration point comes after the
  full mocked slice (spike 010) is complete.
