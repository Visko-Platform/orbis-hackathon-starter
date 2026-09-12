# Project Research Summary

**Project:** Family Video Memories
**Domain:** Live/real-time steerable generative video demo (hackathon), built on Reactor's Orbis-Stable model, Next.js/WebRTC
**Researched:** 2026-09-11
**Confidence:** MEDIUM-HIGH

## Executive Summary

This is a solo, one-day hackathon build: take a sanitized archival family photo (and possibly a short reenactment clip) and turn it into a live, presenter-steered video using Reactor's `visko-orbis-stable` model, narrated on stage. Experts building "live model" demos (Orbis 1.0 launch, LongLive, RealCam, GWM Worlds 2) converge on a simple pattern: scaffold with the vendor CLI, mint a server-side JWT to protect the API key, connect via WebRTC, wait for a `ready` status, seed with an image and/or prompt, then call `set_prompt` repeatedly while streaming to demonstrate live steering. The Reactor `create-reactor-app` scaffold (Next.js 15 + React 19 + the typed `@reactor-models/visko-orbis-stable` SDK) already provides ~90% of this out of the box, including the token route, image-upload chain, and a ready-made video component — so the recommended approach is "use the scaffold, don't hand-roll WebRTC."

The single most important resolved question this round of research answers is the seed-input contract: Orbis-Stable's product API supports an **image seed** (`uploadFile` → `setImage` → `setPrompt` → `start`), cropped/resized to 832x480 (16:9) with no crop — but **not a video seed**, despite the underlying Visko Orbis 1.0 research model supporting video continuation. This means the 193MB reenactment clip library cannot be fed directly into the model; only the sanitized photo can serve as a pixel-level seed, with the clip content usable only as spoken narration reference. This closes what PROJECT.md flagged as the highest-leverage open question, and should reshape the build plan: skip the video-seed spike entirely and go straight to image-seed + text-steering.

The key risks are almost all operational, not architectural: cold-start GPU latency (minutes on first connect, ~10s warm), venue WiFi/WebRTC firewall issues, unpredictable live prompt-steering behavior on long sessions, and the classic "no fallback recording" failure mode that dominates hackathon post-mortems. Mitigation is consistent across all four research files: warm sessions before going on stage, test on venue WiFi as early as possible, pre-write 3-5 steering "beat" prompts instead of live-typing, and record a successful rehearsal run as a mandatory fallback video. Privacy sanitization must be re-checked against the live spoken narration script specifically (not just the reused visual assets), since ad-libbed narration is a new leak surface this project introduces that the prior World Hackathon project didn't have.

## Key Findings

### Recommended Stack

Use the official `create-reactor-app` CLI to scaffold a Next.js 15 / React 19 / Tailwind v4 app pre-wired with `@reactor-team/js-sdk@^3.0.0` and the typed `@reactor-models/visko-orbis-stable@^2.3.0` package. This gives a working server-side JWT-minting route (`app/api/reactor/token/route.ts`), a typed `ViskoOrbisStableProvider`/`useViskoOrbisStable()` hook set, and a ready `<ViskoOrbisStableMainVideoView>` component. No manual WebRTC or SDK installation is needed.

**Core technologies:**
- `create-reactor-app` CLI (`2.2.0`) - scaffolds the entire app in one command, including auth and SDK wiring
- Next.js 15 (App Router) + React 19 - frontend framework and the server-side JWT route, confirmed as the template's actual generated stack
- `@reactor-team/js-sdk` (`^3.0.0`) + `@reactor-models/visko-orbis-stable` (`^2.3.0`) - typed session lifecycle, `setImage`/`setPrompt`/`start` command methods, and video track rendering
- Tailwind CSS v4 - ships pre-configured; fastest path to a passable UI given the 5.5-hour budget
- pnpm - the template's recommended package manager

**Critical gotcha:** the minted JWT is session-scoped - it must be memoized once (module scope, via the scaffold's `fetchToken()` resolver) and reused for the session's lifetime, never re-fetched per action, or later calls will 403.

### Expected Features

**Must have (table stakes):**
- Live session connect + start from an image/photo seed, visibly generating video (not pre-rendered)
- At least one, ideally 2+, visible mid-stream prompt-steering interactions the presenter triggers
- Continuity of subject/scene held across steering changes (verify during rehearsal, not something you build)
- Presenter-visible start/stop control
- Live spoken narration synced to steering beats (this project's actual Core Value)
- Side-by-side original photo next to the live-generated video ("before/after" anchor)
- Privacy-sanitized content only

**Should have (differentiators):**
- Emotional framing: real family photo + real historical context vs. other teams' generic/fantasy prompts (already baked into the project's thesis, zero extra engineering)
- On-screen caption/lower-third showing the current steering prompt or a historical fact (accessibility + visible proof of causal steering)
- Pre-scripted steering-preset buttons (not free-text typing) tied to narration beats
- "Extends World Hackathon" framing beat, tying to the prior splat-world project
- Visible "LIVE" / connection-status indicator

**Defer (v2+ / explicit anti-features):**
- Voice-to-prompt ASR - conflicts directly with the table-stakes need for a *visible* causal steering action; not just deferred, actively wrong for this format
- Audience-facing self-serve steering UI - privacy/moderation risk, out of scope
- Multi-photo/multi-scene narrative with transitions - dilutes the single-thread narrative differentiator
- Persistent backend, accounts, saved sessions, analytics - irrelevant to a one-off live demo
- Polished custom design system - near-zero judging payoff relative to de-risking the live pipeline
- Complex reconnect/retry state machine - a single manual "reconnect" button plus the fallback recording is sufficient

### Architecture Approach

A minimal two-component system: one Next.js server route that turns a private `REACTOR_API_KEY` into a scoped, short-lived JWT, and one client-side session driver that owns the entire Reactor SDK lifecycle (connect -> upload seed -> `setImage`/`setPrompt` -> `start` -> render `MediaStreamTrack` -> steer -> stop). No database, no accounts, no persistence layer - everything generative happens in Reactor's hosted infra; the app is a thin client. The steering UI should route both preset "beat" buttons and a free-text fallback through the exact same `setPrompt` call, not two separate code paths, and all command-sending must be gated on `status === "ready"` (a `statusChanged` event), never assumed immediately after `connect()`.

**Major components:**
1. `app/api/token/route.ts` (server) - the only file that touches the raw API key; exchanges it for a scoped JWT
2. `SessionDemo.tsx` (client) - owns the Reactor session instance, connects, uploads the seed image, sends commands, and attaches the received video track to a `<video>` element
3. `SteeringPanel.tsx` (client, presentation-only) - renders ordered preset "beat" buttons plus a free-text escape hatch, calling back up to `SessionDemo` rather than holding its own session reference
4. `lib/beats.ts` - plain data file holding the ordered narration-synced prompt strings, editable independently of UI code during rehearsal
5. `public/seed.jpg` - the single sanitized, 16:9-cropped photo used as the image seed (no video seed - see below)

### Critical Pitfalls

1. **Unverified input-modality assumption** - now resolved by this round of stack research: Orbis-Stable accepts an **image** seed but explicitly **not a video** seed (the paper's V2V capability isn't exposed in Reactor's product API). Build only around the image-seed + text-steering path; treat the reenactment clip as narration reference only, never as an API input.
2. **GPU cold-start / queue latency kills the live moment** - first connect can take minutes, first visible frame lands ~3.7-4s after `start()` even when warm. Warm the session in the wings before walking on stage; never let "first frame ever" happen live in front of judges.
3. **Venue WiFi/WebRTC firewall breaks the connection** - test the actual live-video path on the venue network as early as possible, not just at home; bring a phone hotspot as an explicit fallback.
4. **No fallback plan if the live connection drops** - screen-record a full successful rehearsal run (connect -> seed -> narrate/steer -> stop) as soon as the pipeline works once; keep it cued locally, decide the switch-over trigger in advance.
5. **Unpredictable live prompt-steering discovered for the first time on stage** - stress-test steering with 5-10 prompt changes on a multi-minute session during build; lock in 2-3 phrasings that reliably worked and use them verbatim live rather than improvising.
6. **Late privacy sanitization review** - the reused photo/clip were sanitized once for World Hackathon, but the live *spoken narration script* is a new leak surface; review it explicitly against the exclusion list (names, personal narrative, addresses) before rehearsal, not during it.

## Implications for Roadmap

Based on combined research, suggested phase structure:

### Phase 1: Auth + Seed-Contract Spike
**Rationale:** Everything downstream depends on a working JWT flow and on knowing the confirmed image-only seed contract; this is also the highest-uncertainty, least-comfortable work, and pitfalls research warns explicitly against letting comfortable narration work crowd it out.
**Delivers:** Scaffolded Reactor app (`npx create-reactor-app --model=visko-orbis-stable`), working server-side JWT mint, one successful `connect()` -> `ready` -> `uploadFile`/`setImage` -> `setPrompt` -> `start()` run producing a visible video frame.
**Addresses:** Table-stakes "live session connect + start from an image seed" (FEATURES.md)
**Avoids:** Pitfall 1 (unverified modality assumption - now resolved to image-only), Pitfall 2 (auth provisioning delay), Pitfall 9 (model slug divergence)

### Phase 2: Minimal Live-Steering UI
**Rationale:** Once the pipeline proves it can generate at all, the next highest-value work is making steering visible and presenter-controllable - this is the actual "wow moment" and cannot be validated without a UI.
**Delivers:** `SessionDemo.tsx` + `SteeringPanel.tsx` with preset beat buttons (from `lib/beats.ts`) plus free-text fallback, start/stop controls, status-gated command sending, side-by-side original photo next to the live video.
**Uses:** `@reactor-team/js-sdk` + `@reactor-models/visko-orbis-stable` typed hooks, `<ViskoOrbisStableMainVideoView>` (STACK.md)
**Implements:** Server-mints-JWT/client-owns-session pattern, status-gated command sequencing, preset-beat-list steering pattern (ARCHITECTURE.md)

### Phase 3: Stress-Test, Narration, and Rehearsal Hardening
**Rationale:** With a working end-to-end loop, remaining time should go to de-risking the live moment rather than polish - this is where the pitfalls research concentrates almost all its warnings (cold-start, WiFi, drift, no fallback).
**Delivers:** A multi-minute steering stress test with 5-10 prompt changes to identify reliable phrasings; a rehearsed and scripted narration pass (adapted from Family Album's hotspot content) checked against the privacy boundary; a screen-recorded fallback video captured from a successful run; venue-WiFi connectivity test; a warm-up choreography for walking on stage.
**Addresses:** Differentiator features (caption overlay, presets, live-status indicator) if time remains
**Avoids:** Pitfalls 3, 4, 5, 6, 7, 8 (cold-start, WiFi, no fallback, unpredictable steering, narration-before-risk sequencing, late privacy review)

### Phase Ordering Rationale

- Auth + seed-contract must come first because every other decision (UI shape, whether an upload step exists at all) depends on it, and it is the single highest-uncertainty task per PITFALLS.md's own Pitfall 7 warning against letting comfortable content work jump the queue.
- Steering UI comes second because it is the mechanism that makes the "wow moment" (visible causal prompt change) demonstrable at all - narration and polish are worthless without it.
- Rehearsal/hardening is deliberately last and treated as a first-class phase, not an afterthought, because nearly all of PITFALLS.md's critical risks (cold start, WiFi, drift, no fallback) only surface under real stage-like conditions and require dedicated stress-testing time, not just "it worked once."

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Confirm the exact current SDK method names/shapes at build time (re-check `templates/visko-orbis-stable/README.md` on the day - the CLI resolves templates live from GitHub's default branch, so file contents may have shifted since this research was captured 2026-09-11).
- **Phase 3:** Actual per-second billing rate and any Nebius credit allotment for this specific event remain unconfirmed (LOW confidence) - needs on-site verification at check-in, may affect how long/how many times steering can be stress-tested.

Phases with standard patterns (skip research-phase):
- **Phase 2:** The server-mints-JWT/client-owns-session and status-gated command sequencing patterns are confirmed directly from the scaffold's own generated source code (HIGH confidence) - standard, well-documented Reactor patterns, no additional research needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified directly against the vendor's GitHub template source and live npm registry, not just marketing docs; only the exact per-second billing rate is LOW/unconfirmed |
| Features | MEDIUM | Synthesized from official Reactor docs plus academic/project pages for comparable systems; no first-party hands-on access to Orbis-Stable yet at time of research |
| Architecture | MEDIUM-HIGH | Core scaffold/auth/lifecycle pattern confirmed from official docs and the generic Helios API reference; Orbis-Stable-specific command names cross-confirmed by the newer STACK.md research (which had access to actual shipped source) |
| Pitfalls | MEDIUM-HIGH | Reactor API mechanics and Visko Orbis capabilities are HIGH confidence (official docs, arXiv paper); general hackathon/WebRTC failure patterns are MEDIUM confidence (community post-mortems, not event-specific data) |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Exact per-second Orbis-Stable billing rate:** publicly listed as "TBD" as of 2026-09-11; check the Reactor dashboard at event check-in and set a hard session-length timeout regardless.
- **Nebius Builder Program credit amount for this specific event:** no public source confirms an amount tied to this exact hackathon; confirm at on-site check-in.
- **Live re-verification of the image-seed 16:9/832x480 constraint:** confirmed from template source, but worth a quick sanity check against the actual installed package once scaffolded, since template contents resolve live from GitHub's default branch and could shift before event day.
- **Continuity/drift behavior on the specific chosen photo:** not something research can resolve - must be verified during Phase 1/3 rehearsal on the actual seed image, not assumed from general model behavior.

## Sources

### Primary (HIGH confidence)
- `github.com/reactor-team/create-reactor-app` (vendor GitHub repo, `templates/visko-orbis-stable/`) - CLI flags, generated project structure, exact model slugs, full command surface, token-route implementation, image-seeding chain
- `registry.npmjs.org` - live-confirmed package versions and publish dates
- `docs.reactor.inc` (overview, quickstart, SDK reference) - auth flow, event names, steering pattern
- `arxiv.org/abs/2607.26694` (Visko Orbis 1.0 paper) - underlying model capabilities (T2V/I2V/V2V), drift-mitigation architecture

### Secondary (MEDIUM confidence)
- `reactor.inc/models/helios/api` - generic SDK code sample used to infer shared lifecycle pattern across Reactor models
- `viskoorbis.com` - marketing/product copy corroborating image/video seed capability at the model level
- PR Newswire / The Robot Report / TestingCatalog - Visko launch and funding coverage
- Academic project pages (LongLive, Self-Forcing, SANA-Video, RealCam, MotionStream, Runway GWM Worlds 2) - comparable "live model" feature landscape
- Hackathon live-demo reliability blog posts (dev.to, Substack, Medium) - failure-mode and fallback-recording patterns

### Tertiary (LOW confidence)
- Third-party tool-directory claim of "1 credit = 1 second of Orbis Stable" - conflicts with official "TBD" pricing page, needs on-site confirmation
- Nebius Builder Program credit amount for this specific event - no public source, inferred only from an unrelated Nebius hackathon's precedent

---
*Research completed: 2026-09-11*
*Ready for roadmap: yes*
