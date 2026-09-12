# Family Video Memories

> **Repo migration note (2026-09-12):** This project's code and `.planning/` GSD tracking were
> migrated from the original prototype repo (`_prototypes/family_videos_memories`) into
> `orbis-hackathon-starter` (this repo, branch `family-video-memories`) to continue work here.
> Development continued past the original hackathon-day scope described below (see
> `.planning/STATE.md`'s Repo Migration note for what shipped since and what's stale).

## What This Is

A spatial-storytelling experiment that animates archival family photos and reenactment footage
(postwar Philippines, from the [Family Album](https://github.com/romyilano/Family-album) /
[World Hackathon](https://github.com/romyilano/world_hackathon) lineage) into a **live, steerable
video** using Visko's Orbis-Stable model via the Reactor API — built solo in one day at the
**Live Models Hackathon** (Sept 12, 2026, Ferry Building, SF, hosted by Visko x Reactor x Nebius).
Purpose: extend the "photo → explorable memory" thesis from World Hackathon, but replace the
walkable 3D-splat world with a real-time video the presenter can narrate and steer live on stage —
a format expected to read as a more vivid, more emotionally legible "memory" than a navigable
3D scene did.

## Core Value

On stage, the presenter starts an Orbis-Stable session seeded from a sanitized family photo (and/or
an existing reenactment clip), narrates the memory, and steers the live-generated video in real
time via prompt updates — proving "photo/clip → living, steerable memory" works as a demo, even
under hackathon time pressure.

## Requirements

### Validated

(None yet — ship to validate)

- ✓ Confirmed Orbis-Stable's session-seed contract (image seed yes, video seed no) — see Context below and REQUIREMENTS.md

### Active

- [ ] Pick one sanitized photo as the image seed for today's demo (Cavite City barrio cooking street is the leading candidate, reused from World Hackathon, cropped to 16:9 / 832x480)
- [ ] Scaffold a Reactor app (`npx create-reactor-app --model=visko-orbis-stable`) with server-side JWT minting (API key never touches the client)
- [ ] Build a minimal live-steering UI: connect to a session, upload the seed image, `setImage`/`setPrompt` + `start`, and a way to update the prompt live while the video streams
- [ ] Presenter can narrate the memory's historical context live while steering the prompt, carrying over the "hotspot → short summary + paragraphs" storytelling pattern from Family Album, adapted to spoken narration instead of clickable text
- [ ] Sanitize all seed content and the spoken narration script per the privacy boundary below before anything is shown publicly or committed to a public repo
- [ ] Stress-test live prompt-steering and produce a screen-recorded fallback of a successful run before demo day
- [ ] Demoable end-to-end (connect → seed → narrate/steer → stop) by the 5:00 PM presentations slot

### Out of Scope

- Living relatives' names or identities — anonymize or omit entirely; this is a public demo
- Personal family narrative/stories — keep only historical/cultural context (architecture, daily life, era, material culture), not private family history
- Exact locations/addresses — general place + era (e.g. "Binakayan public market, 1960s") is fine; nothing that pinpoints a specific home
- Voice-to-prompt pipeline (live speech-to-text driving `set_prompt` automatically) — narration steers the demo through the presenter typing/selecting prompts, not live ASR; revisit only if core pipeline lands early
- Video seed (feeding the ~193MB reenactment clips directly into Orbis-Stable) — confirmed unsupported by Reactor's product API for this model (image seed only); clips remain narration reference material only
- Multi-user/audience-steered sessions, auth, backend persistence, analytics — single presenter-controlled session only, static frontend + Reactor's hosted infra
- Native mobile/AR/VR delivery — browser-only live video stream (WebRTC via Reactor SDK)
- Any Reactor model other than Orbis-Stable (e.g. LTX talking-portrait, X2 video-to-video, Happy Oyster/LingBot explorable worlds) unless Orbis-Stable proves unable to accept an image/video seed, in which case the closest viable model becomes the fallback (see research)

## Context

- **Prior project (World Hackathon, Sept 5, 2026):** Same family-photo source material and privacy
  boundary, but generated a *walkable* 3D Gaussian-splat world via World Labs' Marble, delivered
  through Three.js + React Three Fiber + SparkJS. That project's thesis — "photo → explorable
  memory" — worked, but a navigable 3D scene is harder to narrate live and less immediately legible
  as "watching a memory come alive" than video is. This project swaps the medium (splat world →
  live steerable video) while keeping the same content pipeline and privacy discipline.
- **Existing content sources to reuse:**
  - Sanitized archival photos (e.g. `photo.jpg`, the Cavite City barrio cooking street) from the
    World Hackathon repo.
  - ~193MB of raw MP4 reenactment clips (previously stored in Cloudflare R2, gitignored) — these
    could serve as a starting-video seed if Orbis-Stable supports video continuation.
  - Family Album's `Photo`/`Hotspot` JSON content schema (heading/shortDescription/paragraphs) as
    the source of the historical narration content, adapted from "click a hotspot" to "presenter
    speaks this while steering."
- **The Reactor API (confirmed from docs.reactor.inc and reactor.inc, pulled 2026-09-11):**
  - Reactor is a developer platform for real-time generative video: connect to a model, receive a
    live video stream, and send commands to steer generation while it runs. Advertises <1s
    round-trip latency over what appears to be a WebRTC-based transport (`MediaStream`/track APIs).
  - Scaffold: `npx create-reactor-app <name> --model=<slug>` generates a Next.js app with the SDK
    pre-installed and auth configured. SDKs exist for JS/TypeScript (`@reactor-team/js-sdk`, with
    React bindings), Python (`reactor_sdk`), C++, and Swift.
  - Auth: API keys (`rk_...`) are exchanged server-side for short-lived JWTs via
    `POST https://api.reactor.inc/tokens` — the API key must never reach the client.
  - Steering pattern from the docs' example: connect with a JWT, listen for `trackReceived` and
    `statusChanged`, then once `status === "ready"` call `sendCommand("set_prompt", { prompt })`
    followed by `sendCommand("start", {})`. The prompt can be updated again with another
    `set_prompt` call while the session is live.
  - Reactor's model catalog (from reactor.inc/models, pulled 2026-09-11) includes: Orbis-Stable
    (prompt-steerable video with realtime audio — our primary candidate), Orbis-Dynamic (switches
    resolution mid-run, up to 4K), LTX (lip-synced talking portrait from a photo), X2 (real-time
    video-to-video editing), Happy Oyster / LingBot / LingBot World 2 (explorable world generation),
    H3 Reference Turbo Realtime (video cast from 1-9 reference images), LongLive 2 (multi-shot with
    hard cuts), Helios (infinite streaming, used as the docs' generic example).
  - **Resolved 2026-09-11 (project research, HIGH confidence — verified against the vendor's actual
    shipped `create-reactor-app` template source, not just marketing docs):** Orbis-Stable's product
    API accepts an **image seed** (`uploadFile` → `setImage` → `setPrompt` → `start`), with the
    image squashed to 832×480 (16:9), no crop performed automatically — crop the source photo to
    16:9 first. It does **not** accept a video seed — no `set_video`/`seed_video` command exists on
    Reactor's exposed API for this model, even though the underlying Visko Orbis 1.0 research model
    (arXiv 2607.26694) supports video continuation. This is a confirmed product-vs-research gap:
    the reenactment clips can inform narration but cannot be fed to the model directly.
  - Exact command surface for `visko-orbis-stable` (from the shipped template's `app/lib/visko.ts`):
    `setPrompt`, `setImage`, `setSeed`, `setResolution`, `setAudioPrompt`, `setAudioEnabled`,
    `start`, `pause`, `resume`, `reset`.
  - Auth is a Next.js API route (`app/api/reactor/token/route.ts`) exchanging `REACTOR_API_KEY` for
    a session-scoped JWT (up to 6h) — the JWT must be memoized once and reused, not re-fetched per
    action, or later calls 403.
  - Operational risk for the live demo: cold start can take minutes (SR compile + warmup chunks);
    warm reconnect is ~10s; first video chunk always takes ~4s to appear even when warm; capacity is
    shared (one live session per deployment — a 429 means busy, not broken). Plan to warm up a
    session 15-20 minutes before the 5:00 PM slot rather than cold-connecting live on stage.
  - Full research trail: `.planning/research/STACK.md`, `FEATURES.md`, `ARCHITECTURE.md`,
    `PITFALLS.md`, `SUMMARY.md`.

## Constraints

- **Time**: Hackathon day, Sept 12, 2026 — doors 10:00 AM, hackathon starts 11:30 AM, presentations
  5:00 PM, wrap-up 6:00 PM. Roughly 5.5 hours of build time. Bias hard toward the smallest working
  live-steering demo over completeness.
- **Team**: Assume solo build (confirm at check-in) — plan sequential critical-path work, not
  parallel workstreams, unless teammates are found on-site.
- **Access**: Orbis/Reactor API access and Nebius credits are granted through the event (100
  approved builder spots) — confirm API key issuance and any per-second billing caps at check-in;
  onboarding friction could eat build time.
- **Privacy**: Same boundary as World Hackathon — no living relatives' identities, no personal
  family narrative, no exact addresses; only sanitized, general historical/cultural content may be
  shown or committed publicly.
- **Track/judging**: General hackathon (no separate creative track structure confirmed yet) —
  prioritize a working, narratable live demo over technical breadth.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Swap Marble (walkable 3D splat world) for Reactor/Orbis-Stable (live steerable video) as the generation medium | User's stated hypothesis: video is expected to produce a more vivid, emotionally legible "memory" than a navigable 3D scene, and is a better fit for live on-stage narration | — Pending |
| Primary target model is Orbis-Stable, not Orbis-Dynamic/LTX/X2/Happy Oyster | Prompt-steerable video with realtime audio most directly matches "narrate + steer a memory live"; other models are noted fallbacks if Orbis-Stable can't take an image/video seed | — Pending |
| Reuse World Hackathon's sanitized photo(s) and reenactment clips as source material rather than sourcing new photos | Keeps privacy sanitization work already done; keeps the "extends World Hackathon" narrative explicit for judges | — Pending |
| Voice-to-prompt (live ASR) is explicitly out of scope for this pass | Adds a speech-recognition pipeline dependency on top of an already-tight one-day build with an unfamiliar API; presenter can type/select prompts instead | — Pending |
| First build task is a research/API spike, not the demo UI | The exact seed-input contract for Orbis-Stable (text-only vs. image/video) is unconfirmed from public docs and blocks every downstream decision about source material and UI | — Pending |

---
*Last updated: 2026-09-11 after initialization*

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state
