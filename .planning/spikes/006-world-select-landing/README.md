---
spike: 006
name: world-select-landing
type: standard
validates: "Given three world entries (Cavite/Phnom Penh/Leningrad) each answering the same 3 questions, when a \"FAMILY WORLD\" landing screen is built routing \"Enter World\" into the existing EvolveScene, then the Scene data model extends cleanly without breaking the current single-scene flow"
verdict: VALIDATED (UX pattern) ✓ — one real wiring wrinkle found, scoped for build day
related: [003a, 004, 005, 007]
tags: [ui, architecture, routing]
---

# Spike 006: "Family World" Landing Screen

## What This Validates

Given three world entries, each answering the same three questions (Where did she live? / What was
everyday life like? / What did she experience as a child?), when a "FAMILY WORLD" landing screen is
built that routes "Enter World" into the existing live-steering experience, then the app's `Scene`
data model extends cleanly to carry per-world intro content without breaking the current
single-scene flow — the architecture risk behind the whole pivot's UI half.

## Research

Read the real, already-shipped app code rather than guessing at the architecture:
- `app/lib/prompts.ts` — the `Scene`/`Prompt` interfaces, `SCENES`/`IMAGE_SCENES`, and
  `findSceneForPrompt`. No landing/world concept exists yet — `IMAGE_SCENES` is flat, rendered as a
  2-column card grid inside the setup sidebar (`ImageStarter.tsx`), not a full-screen picker.
- `app/components/ImageStarter.tsx` — clicking a curated scene card runs the **entire** chain in one
  click: `uploadFile → setImage → setPrompt → start`, gated only on `ready` (the WebRTC connection
  already being live). There is currently no "pick now, connect+auto-start later" path.
- `app/ViskoOrbisStableApp.tsx` — the whole client tree mounts inside `ViskoOrbisStableProvider`
  immediately; there's no pre-connection screen today. A landing screen needs to render *before* (or
  instead of) this tree, then hand off a choice into it.
- `app/components/EvolveScene.tsx` — reads the live scene by matching the running prompt text
  against `SCENES`, not by an explicit "current world" id. This match-by-text approach still works
  fine once a world's `initial.text` is unique (true for all three worlds already).

## How to Run

Open `mockup.html` in this directory directly in a browser (no server needed — it's self-contained,
same convention as spike 003's comparison HTML). Click through: Landing → pick a world → "Meet
{name} at age {N}" intro card with the three questions → "Enter her memory" → mocked live-steering
view with real beat titles/narration from spikes 003a/004/005 → the demo nav strip at the top can
jump straight to the closing recap screen (spike 007) too.

## What to Expect

- Landing: "FAMILY WORLD" / "Discover where they came from", three world cards (Lola/Cavite —
  tagged **Flagship — real family**; Yay/Phnom Penh and Babushka/Leningrad — tagged **Composite /
  fictional**) plus a disabled "+ Add Your Family" placeholder card, matching the user's own sketch.
- Each card's "Enter World" opens an intro screen with the exact three-question structure, and
  — only for the two composite worlds — a visible disclosure box (the `compositeDisclosure` string
  spikes 004/005 wrote into their `worldMeta`).
- "Enter her memory →" opens a simplified live view: the world's reference photo plus its beat
  buttons, clicking a beat swaps the displayed narration line (mocked — no real Orbis-Stable
  connection, since no API key exists tonight; this only demonstrates the routing/data shape).

## Investigation Trail

1. First instinct was to prototype this directly in the real app (extend `Scene` in `prompts.ts`,
   add a landing component to `ViskoOrbisStableApp.tsx`). **Deliberately did not** — another session
   is actively wiring Phase 1 auth/seed work in this same shared checkout tonight (confirmed via a
   cross-session status check), so touching live app files risks a real collision on demo night.
   Built a standalone mockup instead, per this project's own established convention for content/UX
   spikes (spike 003's storyline comparison, spike 002's steering module) — prove the shape, wire it
   for real as a deliberate follow-up commit, same pattern spike 003a → the `cavite-1953` scene
   commit already followed.
2. While building the mockup, re-read `ImageStarter.tsx`'s `startFromExample` closely and found a
   real coordination gap the mockup itself doesn't have to solve (it fakes "already connected"):
   today, a curated-scene click assumes the WebRTC connection is *already* `ready` — there's no
   "user chose a world before connecting, auto-run its chain once ready" path. A landing screen that
   sits in front of the whole Provider tree needs one small addition: a `pendingWorldId` held above
   `ViskoOrbisStableApp`, consumed by an effect inside the connected tree that fires
   `startFromExample` for that world's scene the moment `status === "ready"` — not a redesign, but a
   real piece of glue code that doesn't exist today and isn't exercised by clicking an already-live
   example card.
3. Confirmed the `Scene`/`Prompt` shape spikes 004/005 already used (a separate `worldMeta` export
   alongside `baseScene`/`BEATS`) is additive, not a breaking change to the existing interface —
   `cavite-1953`'s scene entry in the real `prompts.ts` doesn't need a `worldMeta` to keep working
   exactly as it does today; only newly-landing-aware worlds need one.

## Results

**Verdict: VALIDATED (UX pattern) ✓ — one real wiring wrinkle found, scoped for build day.**

- The landing → intro → live flow, the repeated three-question structure, and the composite-vs-
  flagship labeling all work as a coherent, clickable system — confirmed by actually building and
  clicking through it, not just describing it.
- The `Scene` data model extends additively: add an optional `world` field
  (`{ grandmotherLabel, age, place, year, flagship, compositeDisclosure?, threeQuestions }`) to the
  `Scene` interface in `prompts.ts`, populate it only for landing-eligible scenes, and existing
  scenes (`underwater`, `rooftop-drummer`, `fisherman`, `greenhouse`, and the flagship
  `cavite-1953`) keep working unchanged.
- **The one real finding:** wiring "pick a world before connecting" into the live app needs a small,
  specific piece of state-coordination code (`pendingWorldId` + a ready-gated effect) that doesn't
  exist yet and isn't optional — this is the actual build-day task, not "just move the mockup's HTML
  into a component." Flagging it now means it's a planned five-minute addition tomorrow, not a
  surprise discovered live.
- Not attempted (out of scope for tonight, correctly deferred): wiring this into the real
  `ViskoOrbisStableApp.tsx`/`prompts.ts`, since another session is actively working there and a real
  API key doesn't exist yet to test the full connect-then-auto-start path end-to-end anyway.
