# Requirements: Family Video Memories

**Defined:** 2026-09-11
**Core Value:** On stage, the presenter starts an Orbis-Stable session seeded from a sanitized family photo, narrates the memory, and steers the live-generated video in real time via prompt updates — proving "photo → living, steerable memory" works as a demo.

## v1 Requirements

Requirements for the Sept 12, 2026 live demo. Each maps to a roadmap phase.

### Setup

- [ ] **SETUP-01**: Reactor app is scaffolded via `create-reactor-app` wired to the `visko-orbis-stable` model, with server-side JWT minting so the raw Reactor API key never reaches the client
- [ ] **SETUP-02**: The chosen sanitized seed photo (Cavite City barrio cooking street) is cropped/prepared to 16:9 for image-seed upload

### Session

- [ ] **SESN-01**: App connects to an Orbis-Stable session and reaches `ready` status before any commands are sent
- [ ] **SESN-02**: App uploads the seed photo and starts live video generation anchored to it (confirmed image-seed path, not text-only)
- [ ] **SESN-03**: Presenter can send at least one live prompt-steering update while the video streams, with a visible change in the generated video within a few seconds
- [ ] **SESN-04**: Presenter can start and stop the session on demand from the UI

### Demo

- [ ] **DEMO-01**: Live-generated video displays side-by-side with the original source photo, so the "before/after" is visible to the audience
- [ ] **DEMO-02**: Presenter has a rehearsed narration script (historical/cultural context only, no personal family narrative) synced to steering beats, adapted from Family Album's hotspot content pattern

### Safety

- [ ] **SAFE-01**: All seed content and the spoken narration script are reviewed against the privacy boundary (no living relatives' identities, no personal narrative, no exact addresses) before rehearsal
- [ ] **SAFE-02**: A screen-recorded fallback of one full successful run (connect → seed → narrate/steer → stop) exists and is cued locally, ready to play if the live session fails during the demo
- [ ] **SAFE-03**: Live prompt-steering has been stress-tested with multiple prompt changes across a multi-minute session before demo day, with 2-3 reliable phrasings locked in for use on stage

## v2 Requirements

Deferred to "if time remains after v1 is working and rehearsed." Not required for a demoable v1.

### Demo Polish

- **DEMO-03**: On-screen caption/lower-third showing the current steering prompt or a one-line historical fact
- **DEMO-04**: Pre-scripted steering-preset buttons mapped to narration beats, replacing free-text prompt entry
- **DEMO-05**: Visible "● LIVE" / connection-status indicator driven off the session's status events
- **DEMO-06**: A framing beat (still frame or verbal callback) referencing the prior World Hackathon splat-world demo of the same photo

## Out of Scope

Explicitly excluded. Documented to prevent scope creep during the build.

| Feature | Reason |
|---------|--------|
| Video seed (feeding the ~193MB reenactment clips directly into the model) | Confirmed by research: Reactor's product API for Orbis-Stable supports an image seed but not a video seed, despite the underlying research model supporting video continuation — this is a platform limitation, not a build-time tradeoff |
| Voice-to-prompt ASR (live speech-to-text driving prompt steering) | Conflicts directly with the table-stakes need for a *visible* causal steering action the audience can see the presenter perform; adds a new failure surface on top of an unfamiliar API |
| Audience-facing self-serve steering UI | Privacy/moderation risk (uncontrolled prompts on a live public stream) and multiplies UI/state scope; single presenter-controlled session only |
| Multi-photo / multi-scene narrative with transitions | Dilutes the single-thread emotional narrative that is this project's differentiator; a 2-3 minute demo slot can't support more than one story arc |
| Persistent backend, accounts, saved sessions, analytics | Irrelevant to a one-off live demo; every hour here is an hour not spent de-risking the live-steering path |
| Polished custom design system / branding | Near-zero judging payoff relative to proving the live pipeline works; minimal functional UI is sufficient |
| Complex reconnect/retry state machine | Over-engineering for a single 2-3 minute live event; one manual reconnect button plus the fallback recording (SAFE-02) is the real safety net |
| Any Reactor model other than Orbis-Stable (LTX, X2, Happy Oyster, LingBot, etc.) | Orbis-Stable's image-seed + realtime-audio profile is the confirmed best fit; switching models mid-build would mean re-learning a different command surface with no time to spare |
| Native mobile/AR/VR delivery | Browser-only live video stream (WebRTC via the Reactor SDK), consistent with the scaffolded Next.js app |

## Traceability

Confirmed against .planning/ROADMAP.md (created 2026-09-11).

| Requirement | Phase | Status |
|-------------|-------|--------|
| SETUP-01 | Phase 1 - Auth + Seed-Contract Spike | Pending |
| SETUP-02 | Phase 1 - Auth + Seed-Contract Spike | Pending |
| SESN-01 | Phase 1 - Auth + Seed-Contract Spike | Pending |
| SESN-02 | Phase 1 - Auth + Seed-Contract Spike | Pending |
| SESN-03 | Phase 2 - Minimal Live-Steering UI | Pending |
| SESN-04 | Phase 2 - Minimal Live-Steering UI | Pending |
| DEMO-01 | Phase 2 - Minimal Live-Steering UI | Pending |
| DEMO-02 | Phase 3 - Stress-Test, Narration, and Rehearsal Hardening | Pending |
| SAFE-01 | Phase 3 - Stress-Test, Narration, and Rehearsal Hardening | Pending |
| SAFE-02 | Phase 3 - Stress-Test, Narration, and Rehearsal Hardening | Pending |
| SAFE-03 | Phase 3 - Stress-Test, Narration, and Rehearsal Hardening | Pending |

**Coverage:**
- v1 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0 ✓

---
*Requirements defined: 2026-09-11*
*Last updated: 2026-09-11 after initial definition*
