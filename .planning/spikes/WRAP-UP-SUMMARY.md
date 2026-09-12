# Spike Wrap-Up Summary

**Date:** 2026-09-11 (spikes 001-003); 2026-09-11 direction-pivot + UI rewrite wrap-up (spikes 004-011)
**Spikes processed:** 14 (5 + 9, with 004-007 revisited and superseded by 008-011's updated feature-area names)
**Feature areas:** Scaffold & Auth, Steering Composition, Narration & Storyline, Composite Worlds & Sourcing,
Landing/Gallery & Recap UI, Creation Screen & Memory Contract, WorldProvider Architecture, UI Presentation Comparison
**Skill output:** `./.claude/skills/spike-findings-family_videos_memories/`

## Processed Spikes

| # | Name | Type | Verdict | Feature Area |
|---|------|------|---------|--------------|
| 001 | scaffold-orbis-sample-app | standard | VALIDATED ✓ | Scaffold & Auth |
| 002 | cookbook-pattern-reuse | standard | VALIDATED ✓ | Scaffold & Auth / Steering Composition |
| 003a | storyline-object-journey | comparison | WINNER (legibility/reliability) ✓ | Narration & Storyline |
| 003b | storyline-then-now | comparison | WINNER (Core Value fit) ✓ | Narration & Storyline |
| 003c | storyline-neighborhood-in-motion | comparison | STRETCH GOAL (richest content, highest render risk) ⚠ | Narration & Storyline |
| 004 | composite-world-cambodia | standard | VALIDATED (content+sourcing) ✓ — render PENDING | Composite Worlds & Sourcing |
| 005 | composite-world-russia | standard | VALIDATED (content+sourcing) ✓ — render PENDING | Composite Worlds & Sourcing |
| 006 | world-select-landing | standard | VALIDATED (UX pattern) ✓ — 1 wiring wrinkle scoped | Landing, Gallery & Recap UI |
| 007 | closing-recap-screen | standard | VALIDATED ✓ | Landing, Gallery & Recap UI |
| 008 | creation-screen-memory-contract | standard | VALIDATED ✓ | Creation Screen & Memory Contract |
| 009 | mock-world-provider | standard | VALIDATED ✓ | WorldProvider Architecture |
| 010 | family-gallery-full-loop | standard | VALIDATED ✓ | Landing, Gallery & Recap UI |
| 011 | photo-forward-ui | comparison | WINNER (feel, per-screen) ✓ | UI Presentation Comparison |

(006/007's feature-area label was renamed from "Family World Landing UI" to "Landing, Gallery &
Recap UI" when 008-011 broadened the same area; no content was lost, see SKILL.md findings index.)

## Key Findings (spikes 001-003)

- **The scaffold just works, today, without the event key.** `npx create-reactor-app my-orbis-app
  --model=visko-orbis-stable` installs, type-checks, and builds cleanly against live npm/GitHub
  with zero drift from prior research. Its own `SetupRequired` fallback means the app is safe to
  build and demo-boot a full day before the real `REACTOR_API_KEY` is issued at event check-in.
  `my-orbis-app/` now exists at the project root, committed — Phase 1 should build on it directly,
  not re-scaffold.
- **Auth and steering patterns independently corroborate the original research.** The
  reactor-cookbook's `fast-h3-streaming-app` example converges on the same token-route shape the
  vendor's own scaffold template uses — two unrelated sources agreeing is a strong signal this is
  the platform's real intended pattern. The cookbook's clip-queue and multi-prop machinery,
  however, has no Orbis-Stable equivalent and should not be ported.
- **Orbis-Stable's max prompt length is still unconfirmed.** `steering-composition.md`'s
  `MAX_PROMPT_LENGTH = 480` is a conservative placeholder carried forward as an open action item —
  verify against the installed `@reactor-models/visko-orbis-stable` types at Phase 1 build time.
- **Three distinct narration arcs were drafted and compared head-to-head**, not just one. Object
  Journey wins on reliability and audience legibility; This Photo, Alive wins on matching the
  project's actual Core Value statement but has the thinnest content buffer; Neighborhood in
  Motion has the richest historical content but the highest live-rendering risk and required the
  most careful privacy rewriting (a beat had to be generalized away from paraphrasing the excluded
  family hotspot, not just omit it). Recommended Phase 3 assembly: lead with Object Journey,
  optionally splice This Photo, Alive's silent cold-open onto the front once rehearsal confirms
  Orbis-Stable renders subtle atmospheric motion well.
- **Two sessions worked this spike set in parallel** (scaffold validation in one, cookbook
  reuse + storyline drafting in the other) — `MANIFEST.md` and this wrap-up both treat all five
  spikes as one coherent body of evidence for Phase 1/3, cross-referenced accordingly.

## Key Findings (spikes 004-011, direction pivot + UI rewrite)

- **The pivot's real risk wasn't cultural sensitivity — it was provenance laundering.** Two
  independent "vintage-looking" photo candidates (one Cambodian, one Russian) turned out, on
  checking Wikimedia Commons' own metadata, to be modern photos with misleading filenames/captions.
  Two-for-two across two unrelated searches is now a standing sourcing rule (see
  `composite-worlds-sourcing.md`), not a one-off gotcha.
- **Both composite worlds landed on genuinely real, dated, rights-clear source photos** — a Nov.
  1964 Phnom Penh street scene (CC BY-SA 4.0) and a 1980s-captioned Leningrad street scene
  (CC BY 2.0) — and their beats were drafted from what's actually visible in each, not from
  generically-accurate invented imagery. Neither world's narration assigns a real photographed
  bystander the invented grandmother's identity.
- **Real Orbis-Stable render quality for both new photos was unverified during spiking** — no live
  Reactor API key existed until event check-in. Crop both to 16:9 and test-render in the first 15
  minutes of build time, before investing further polish in either composite world.
- **Sourcing rule confirmed 2-for-2:** both composite-world spikes independently hit a candidate
  historical photo whose filename/caption implied vintage provenance that the file's own metadata
  contradicted. Always verify against Commons' own `imageinfo`/`extmetadata` API before treating a
  photo as genuinely vintage/rights-clear.
- **`Scene` extends additively:** an optional `world` field carries landing-screen content without
  touching existing non-landing scenes. The one real build-day task this surfaced: a
  `pendingWorldId` + ready-gated effect to let a landing screen sit in front of the live connection.
- **The `Memory` contract is real, tested code, not a diagram:** `memory.js` (`buildMemory`,
  `derivePersonLabel`) is the UI→data boundary; `worldProvider.js`'s `MockWorldProvider`/
  `OrbisWorldProvider` share one `enter(memory)` call site, verified by a contract test that
  exercises both. `gallery.js` unifies curated and user-added relatives into one store.
- **The full required demo loop is a passing automated test, not just a click-through:**
  `Lola → Enter Her World → Market → Home → Exit → another relative`, exercised across
  `memory.js` + `worldProvider.js` + `gallery.js` together in `test-gallery.mjs`.
- **One real spike-only gotcha found and fixed:** a multi-page flow backed by `localStorage` must be
  served from one HTTP origin — Chromium partitions `localStorage` per `file://` path, silently
  breaking cross-page handoff. Disappears once the real app has a real backend.
- **A full presentation-layer rewrite (spike 011) needed zero data-layer changes** — `memory.js`,
  `worldProvider.js`, and `gallery.js` were imported unmodified into a photo-forward, near-fullscreen
  UI and their existing tests still passed. Confirms the `Memory`/`WorldProvider` boundary is
  genuinely presentation-agnostic, not just Mock/Orbis-agnostic.
- **UI comparison result is per-screen, not a blanket winner:** photo-forward fullscreen wins for the
  World screen (matches "step into a photograph"); the card-based solid form panel wins for the
  creation screen (legibility under arbitrary uploaded photos). Recommend this exact hybrid for the
  real build.
