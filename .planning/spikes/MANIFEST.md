# Spike Manifest

## Idea

Two parallel spike threads de-risking Phase 1 ("Auth + Seed-Contract Spike") before the Live
Models Hackathon build day:

1. **Scaffold validation** (spike 001, built in a parallel session): scaffold a sample Reactor app
   for `visko-orbis-stable` via the vendor CLI the day before the event, to prove the install/build
   pipeline and the no-API-key fallback path work before the real key is issued and build time
   becomes scarce.
2. **Cookbook reuse + storyline design** (spikes 002-003, this session): audit
   `reactor-team/reactor-cookbook`'s closest architectural analog (`fast-h3-streaming-app`) for
   patterns worth reusing on top of that scaffold, and draft/compare candidate narrative arcs for
   turning the Cavite sari-sari-1953 photo's real hotspot content into a 2-3 minute live-steered
   demo — checked against the privacy boundary that excludes personal family narrative.

3. **Direction pivot to "Family World" (spikes 004-007, night-before-hackathon session):** widen the
   demo from one personal family memory to a small system of "worlds" — Cavite City, 1953
   (Filipino, the user's real family, already built as the `cavite-1953` scene) stays the flagship,
   joined by two new *composite/fictional* worlds (Phnom Penh, 1963 — Cambodian, ordinary
   pre-Khmer-Rouge childhood; Leningrad, 1984 — Russian) built the same "Object Journey" way, plus a
   landing screen that lets a judge pick a grandmother and "Enter World." The pitch shift: this
   demonstrates a *product* (a repeatable system for turning any family's era into an explorable
   memory), not a one-off personal memoir — while keeping Grandma, not the culture, as the emotional
   object, per spike 003's established convention.

4. **Real storyline detail pass (spikes 012-013, 2026-09-11, built in a separate git worktree):**
   the user supplied real family detail for two existing worlds and asked for it to be added —
   requiring two explicit, recorded reversals of earlier locked decisions (see Requirements below).
   The Leningrad world's great-grandmother, who died of starvation during the Siege of Leningrad and
   whom the storyteller never met, converts that world from composite/fictional to real family
   narrative (spike 012). The Cavite flagship's previously-excluded orphaned-child detail is
   reinstated, with the constraint that no photograph of that child survives the period (spike 013).
   Both spikes independently landed on the same solution for "real person, no surviving photo": an
   explicit `imagined`/`imaginedDisclosure` field on the beat, never a silently-generated image
   presented as documentary.

5. **Upload-to-Orbis prompt pipeline (spikes 014-016, 2026-09-12, this session):** the PRD's
   "create your own" flow (§7-8) needs a way to turn an arbitrary uploaded family photo into a
   good Orbis anchor image and a grounded video prompt — the gap this project hadn't yet built,
   since spikes 008-011's creation flow was a standalone HTML mockup with no real Gemini/Orbis
   wiring. Modeled directly on a second, newer reference app (`orbis-hackathon-starter`, a
   different, more recent Reactor example than the `create-reactor-app` scaffold spikes 001/002
   were built from) which demonstrates the exact Nano-Banana-edit → Gemini-grounded-prompt →
   Orbis-start pipeline this project needed, minus the real-family-photo and structured-memory
   adaptations. Delivered as real `my-orbis-app` code (prompt modules, two API routes, and a new
   internal-only `/internal/upload-test` raw test page), not a standalone mockup — this is
   infra-establishing work in the same vein as spikes 001/002, not a UI/UX exploration.

## Requirements

Design decisions that emerged from spiking. Non-negotiable for the real build.

- Must scaffold via the official `create-reactor-app` CLI, not a hand-rolled Next.js setup — the
  template ships the auth route, typed SDK, and model-specific components for free. *(Spike 001)*
- The app must degrade gracefully (not crash) when `REACTOR_API_KEY` is absent, since the real key
  is only issued at event check-in. *(Spike 001)*
- `REACTOR_API_KEY` must never reach the client — only server-minted, session-scoped JWTs may.
  *(Spike 001, corroborated independently by Spike 002's cookbook comparison)*
- Must exclude the "four children / orphan father" hotspot content entirely from any storyline —
  it is personal family narrative (Out of Scope in PROJECT.md), not historical/cultural context.
  *(Spike 002/003)*
- Steering prompt composition should follow a persistent "base scene" instruction + an appended
  "directional" instruction, truncating the directional clause (never the base scene) when over
  budget — not a single monolithic prompt rewritten from scratch on every steer. *(Spike 002)*
- Token route should scope the minted JWT to a single model + `max_sessions: 1` + a fixed max
  duration — tighter than the cookbook's own multi-tester example, since this is a single-presenter
  demo. *(Spike 002)*
- Narration must not paraphrase back into the excluded family hotspot even indirectly (e.g.
  "watched from several kitchens" is fine as a general social-density fact; framing it as *this
  photo's specific children* is not) — the privacy boundary requires active rewriting in some
  cases, not just skipping the one excluded hotspot. *(Spike 003c)*
- Lead Phase 3's narration script with the "object journey" arc (each beat has one obvious visual
  referent) for reliability; treat atmosphere-first and social-density arcs as optional
  enhancements/stretch goals pending Phase 1/3 rehearsal evidence that Orbis-Stable renders subtle
  motion and human activity convincingly. *(Spike 003a/b/c head-to-head)*
- Non-flagship worlds (any family that isn't the presenter's own) must be built as **clearly
  labeled composite/fictional** — UI copy states this explicitly (e.g. "a composite portrait,
  built from public historical sources") — never presented as if they were a real family's
  authentic history. *(Direction pivot, spike 004/005)*
- The Cambodian world deliberately depicts an **ordinary pre-1965 Phnom Penh childhood**
  (market/home/school/street/food/music) — explicitly not Khmer Rouge-era history. Do not let the
  narration or imagery gesture toward the genocide period; that association is exactly what this
  world is designed to avoid. *(Direction pivot, spike 004)*
- Every world (flagship or composite) answers the same three questions in the same order — Where
  did she live? What was everyday life like? What did she experience as a child? — so the repeated
  structure reads as a system across worlds, not three unrelated demos. *(Direction pivot, spike
  006)*
- Historical/cultural detail stays the *environment*, not the spectacle — the emotional anchor in
  every world's copy is the grandmother at a specific childhood age, not the culture or era as a
  showcase. Matches spike 003's established "object journey" framing, now stated as a cross-world
  rule. *(Direction pivot)*
- Actual Orbis-Stable render-quality verification for the two new worlds' reference images is
  **deferred to build day** — no live Reactor API key exists until event check-in (Sept 12), so
  spikes 004/005 can only validate content grounding, sourcing legitimacy, and composition
  suitability by inspection, not a live render. Both photos are pre-cropped to 832×480 (16:9) and
  drop-in ready at `.planning/spikes/phnom-penh-1964.jpg` and `.planning/spikes/leningrad-1980s.jpg`
  — the only remaining build-day step is copying them into `my-orbis-app/public/images/` and test-
  rendering. *(Direction pivot, spike 004/005)*
- **Never trust a search summary's or filename's claimed date/license for a historical image —
  verify against the file's own metadata** (Commons' `imageinfo`/`extmetadata` API, or equivalent)
  before using it as a "vintage" reference photo. Both composite-world spikes independently hit a
  candidate photo whose filename/caption implied vintage provenance that direct metadata inspection
  contradicted (a modern photo in each case). Two-for-two across two unrelated searches is a pattern,
  not a fluke. *(Spike 004/005)*
- Composite worlds ground beats in what's **actually visible in the chosen reference photo**, not
  in generically-accurate-but-unpictured facts (e.g. Psar Thmei's dome is a real, verified fact
  about Phnom Penh but doesn't appear in spike 004's chosen photo, so it was cut). Never assign a
  real, unconsented photograph subject an invented character's identity (e.g. the real child in
  spike 004's photo is not narrated as "Yay") — the same privacy discipline already applied to this
  project's own family photos (spike 003's "four children" exclusion) applies with equal force to a
  stranger's archival photo. *(Spike 004/005)*
- Landing-eligible scenes get an additive optional `world` field on the existing `Scene` interface
  in `prompts.ts` (`{ grandmotherLabel, age, place, year, flagship, compositeDisclosure?,
  threeQuestions }`) — existing non-landing scenes (`underwater`, `rooftop-drummer`, `fisherman`,
  `greenhouse`) need no changes. Wiring "pick a world before connecting" requires a
  `pendingWorldId` held above `ViskoOrbisStableApp` plus a ready-gated effect that fires
  `startFromExample` once `status === "ready"` — a small, specific, real piece of glue code, not
  optional, not yet written. *(Spike 006)*
- User-generated worlds (not just the 3 curated worlds) go through a `Memory` object shaped
  `{id, person, relationship, place, year, memory, photo, createdAt}` — the fixed contract between
  the creation UI and everything downstream (`MemoryDirector` → `WorldProvider`). `photo` is a
  `data:` URL, not a blob URL, specifically so it survives a `localStorage` round-trip. *(Spike 008)*
- The internal boundary for rendering a world is `WorldProvider`, with `MockWorldProvider` built
  first and an `OrbisWorldProvider` swapped in later — the rest of the app must not care which one
  is live. Build and validate the mock path completely before touching Orbis. *(Direction pivot,
  this session)*
- Curated example relatives and user-added relatives must be the **same** `Memory`-shaped data,
  seeded into one store, not two separate models — that's what makes "pick a relative" a single
  code path regardless of whether the relative is a built-in example or something the user just
  added. *(Spike 010)*
- **Spike-only gotcha, not a build-day one:** a multi-page flow backed by `localStorage` must be
  served from one HTTP origin, not opened via `file://` — Chromium partitions `localStorage` per
  `file://` path, silently breaking cross-page handoff. Disappears once the real app uses a real
  backend instead of `localStorage`. *(Spike 010)*
- The World screen should lead with a photo-forward, near-fullscreen treatment (backdrop fills the
  viewport, narration/nav/steering overlay directly on it) — this won a head-to-head comparison on
  emotional fit for "step into a photograph." The creation screen should keep a non-overlaid, fully
  legible form panel instead (photo legibility risk under arbitrary user uploads outweighs the
  emotional upside there) — a deliberate per-screen hybrid, not a single UI direction applied
  everywhere. *(Spike 011)*
- **Reversal of spike 004/005/006's composite-only rule for Leningrad:** the Leningrad world is now
  real family narrative, not composite/fictional — `worldMeta.composite: false`, with
  `compositeDisclosure` replaced by `realFamilyNote`. The underlying street photograph's sourcing
  facts (CC BY 2.0, captioned "1980s") are unaffected; only the claim about *who* the world depicts
  changed, not the claim about *where* the photo itself came from. Decided explicitly by the user on
  2026-09-11, specifically to include a great-grandmother who died of starvation during the Siege of
  Leningrad and whom the storyteller never met. *(Spike 012)*
- **Reversal of spike 002/003's Cavite orphan-content exclusion:** the flagship `cavite-1953` world
  may now include that a child in the household was orphaned very young. The original exclusion note
  stays in place in both `003a-storyline-object-journey/beats.ts` and
  `my-orbis-app/app/lib/prompts.ts` as the historical record; the new detail is an additive beat, not
  an in-place rewrite of the earlier boundary. Decided explicitly by the user on 2026-09-11.
  *(Spike 013)*
- **New standing rule for any beat with no surviving photographic record of a real person:** disclose
  it explicitly via the `Prompt` interface's `imagined`/`imaginedDisclosure` fields (title +
  narration + structured metadata) — never a silently-generated image presented as if documentary,
  and never an invented likeness for a real, named, specific, deceased person even when a
  generated/imagined visual is otherwise appropriate (contrast with spikes 004/005's composite
  worlds, which invent an atmospheric placeholder *person* to inhabit a real, unrelated archival
  photo — a real person's own missing photographic record is not the same problem and must not reuse
  that solution). *(Spikes 012, 013, independently convergent)*
- **Upload-anchor editing must restore and 16:9-normalize a real family photo by extending the
  background outward, never by cropping or letting Orbis squash it, and must never retouch,
  reshape, or invent identity for a real person** — Orbis resizes a non-16:9 reference image with
  no crop (documented in `ImageStarter.tsx`), so an unprocessed portrait/square upload would
  otherwise arrive visibly distorted. *(Spike 014)*
- **Memory-grounding must take structured Person+Place+Year+Memory fields (PRD.md §8's shape),
  not a single free-text "motion" string** — and must explicitly forbid inventing a different
  identity for a real person visible in the reference photo, extending this project's real-family
  privacy rule (see above) into the grounding instruction itself, not just the image edit. *(Spike
  015)*
- **Every new route added to `my-orbis-app` must be added explicitly to `middleware.ts`'s
  matcher** — it is an allowlist (`/session/:path*`, `/api/reactor/:path*`, ...), not a
  blanket-except-a-few pattern, so a new page or API route is publicly reachable by default until
  added. This was caught mid-spike as a real (if brief, dev-only) exposure — see spike 016. *(Spike
  016)*

## Spikes

| # | Name | Type | Validates | Verdict | Tags |
|---|------|------|-----------|---------|------|
| 001 | scaffold-orbis-sample-app | standard | Given the `create-reactor-app` CLI and `visko-orbis-stable` model, when scaffolded and booted without a live Reactor API key, then the app installs, builds, and serves a safe fallback instead of crashing | VALIDATED ✓ | reactor, scaffold, nextjs, auth, pre-hackathon |
| 002 | cookbook-pattern-reuse | standard | Given fast-h3-streaming-app's token route + steering-composition pattern, when adapted to Orbis-Stable's confirmed command surface, then produce ready-to-copy code + a does/doesn't-transfer map | VALIDATED ✓ | reactor, code-reuse, auth, steering |
| 003a | storyline-object-journey | comparison | Given the 6 sanitized Cavite hotspots, when scripted as an "object journey" arc, then produce concrete steering beats + narration | WINNER (legibility/reliability) ✓ | storyline, narration, privacy |
| 003b | storyline-then-now | comparison | Given the same hotspots, when scripted as a "this photo, alive" transformation arc, then produce concrete steering beats + narration | WINNER (Core Value fit) ✓ | storyline, narration, privacy |
| 003c | storyline-neighborhood-in-motion | comparison | Given the same hotspots, when scripted as a "daily life in motion" arc, then produce concrete steering beats + narration | STRETCH GOAL (richest content, highest render risk) ⚠ | storyline, narration, privacy |
| 004 | composite-world-cambodia | standard | Given verified public-domain historical research on an ordinary early-1960s Phnom Penh childhood and a rights-clear reference image, when scripted as an object-journey `beats.ts` entry labeled explicitly composite, then produce a demo-ready world + a sourcing/legitimacy trail | VALIDATED (content+sourcing) ✓ — render PENDING | storyline, narration, composite, sourcing, cambodia |
| 005 | composite-world-russia | standard | Given verified public-domain historical research on an early-1980s Leningrad household childhood and a rights-clear reference image, when scripted the same way, then produce a demo-ready world + a sourcing/legitimacy trail | VALIDATED (content+sourcing) ✓ — render PENDING | storyline, narration, composite, sourcing, russia |
| 006 | world-select-landing | standard | Given three world entries (Cavite/Phnom Penh/Leningrad) each answering the same 3 questions, when a "FAMILY WORLD" landing screen is built routing "Enter World" into the existing EvolveScene, then the Scene data model extends cleanly without breaking the current single-scene flow | VALIDATED (UX pattern) ✓ — 1 wiring wrinkle scoped | ui, architecture, routing |
| 007 | closing-recap-screen | standard | Given the three worlds exist, when a closing "1953 Cavite · 1964 Phnom Penh · 1980s Leningrad — every family has a world that disappeared" recap screen is built, then it renders as a low-effort, high-impact closer (cut first under time pressure) | VALIDATED ✓ | ui, low-risk, stretch |
| 008 | creation-screen-memory-contract | standard | Given the 4-field capture form + real photo upload, when submitted, then a Memory object {person, relationship, place, year, memory, photo} is produced — the UI→data contract for everything downstream | VALIDATED ✓ | ui, contract, architecture |
| 009 | mock-world-provider | standard | Given a Memory object, when "Enter Their World" is clicked, then a WorldProvider-abstracted fake world screen renders with Home/Market/Neighborhood nav + free-text steering, with MockWorldProvider and a stubbed OrbisWorldProvider both satisfying the same contract | VALIDATED ✓ | ui, architecture, worldprovider |
| 010 | family-gallery-full-loop | standard | Given 3 example relatives + "Add someone" (wired to 008) + the mock world (wired to 009), when clicking Lola → Enter Her World → Market → Home → Exit → another relative, then the full loop feels complete end-to-end | VALIDATED ✓ | ui, integration, full-loop |
| 011 | photo-forward-ui | comparison | Given the same Memory/WorldProvider/gallery data layer, when the presentation layer is rebuilt as a photo-forward near-fullscreen UI instead of the card-based dark UI, then the architecture holds with zero data-layer changes and the UI feel is compared head-to-head | WINNER (feel, per-screen) ✓ | ui, comparison, presentation |
| 012 | leningrad-real-family | standard | Given spike 005's composite Leningrad world and a real great-grandmother who died of starvation in the Siege of Leningrad and was never met, when the world is converted to real family narrative with a new object-anchored beat, then the composite disclosure is correctly retired without fabricating an invented likeness for a real, deceased person | VALIDATED ✓ | storyline, real-family, russia, privacy, imagined-content |
| 013 | cavite-orphan-detail | standard | Given the flagship cavite-1953 world's locked exclusion of orphan content and a new instruction to include an orphaned-young-child detail with no surviving photograph, when the exclusion is lifted and a new evolution beat is added, then the beat discloses the missing photographic record honestly instead of presenting a generated image as documentary | VALIDATED ✓ | storyline, real-family, cavite, privacy, imagined-content |
| 014 | upload-anchor-prompt | standard | Given a real, imperfect uploaded family photo, when edited via Gemini's image model (gemini-2.5-flash-image, "Nano Banana") with a restoration + reframe prompt, then produce a clean 16:9 Orbis-ready anchor image that preserves the real people's identity/likeness unaltered | VALIDATED (content) ✓ — render PENDING | prompts, nano-banana, gemini, upload, privacy |
| 015 | memory-grounded-orbis-prompt | standard | Given the anchor image plus structured Person+Place+Year+Memory context, when analyzed by Gemini with an adapted system instruction, then produce one polished, production-ready Orbis video prompt grounded in the specific photo and memory — not generic motion | VALIDATED (content) ✓ — render PENDING | prompts, gemini, grounding, orbis, memory |
| 016 | raw-upload-test-page | standard | Given both routes/prompts wired together, when opened as an internal raw test page mirroring orbis-hackathon-starter's UI pattern, then a developer can run the full pipeline end-to-end without going through the polished creation flow | VALIDATED (wiring) ✓ — Gemini leg render PENDING | ui, wiring, orbis, internal, security |
