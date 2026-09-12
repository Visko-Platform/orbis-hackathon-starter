# Roadmap: Family Video Memories

## Overview

A one-day build (Sept 12, 2026, ~5.5 hours) that takes a sanitized archival family photo and turns
it into a live, presenter-steered video via Reactor's `visko-orbis-stable` model. The path runs
straight down the critical path research identified: first prove the highest-uncertainty piece
(auth + the image-only seed contract) in isolation, then wrap it in the minimal UI that makes live
steering visible and presenter-controllable, then spend all remaining time de-risking the actual
stage moment — stress-testing steering, scripting and privacy-checking the narration, and capturing
a fallback recording. Each phase produces something independently verifiable; nothing is deferred
to "should work by demo time."

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Auth + Seed-Contract Spike** - Scaffold the Reactor app and prove the image-seed pipeline produces a live video frame end-to-end
- [ ] **Phase 2: Minimal Live-Steering UI** - Presenter can start/stop the session and visibly steer the live video via a UI, with the original photo shown alongside
- [ ] **Phase 3: Stress-Test, Narration, and Rehearsal Hardening** - Steering is stress-tested, narration is scripted and privacy-checked, and a fallback recording exists

## Phase Details

### Phase 1: Auth + Seed-Contract Spike
**Goal**: A working image-seeded live video session can be started end-to-end, proving the auth flow and the confirmed image-only seed contract before any UI work begins
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: SETUP-01, SETUP-02, SESN-01, SESN-02
**Success Criteria** (what must be TRUE):
  1. The scaffolded app exchanges the Reactor API key for a session JWT entirely server-side — the raw API key is never sent to or visible in the browser
  2. Connecting to an Orbis-Stable session reaches `ready` status before any `setImage`/`setPrompt`/`start` command is sent
  3. The sanitized seed photo (Cavite City barrio cooking street, cropped to 16:9) uploads successfully as the image seed
  4. Calling `start()` after `setImage`/`setPrompt` produces a visible, live-generating video frame anchored to the seed photo, viewable in a browser
**Plans**: TBD

### Phase 2: Minimal Live-Steering UI
**Goal**: A presenter-facing UI makes the live pipeline controllable and steerable on demand, turning the Phase 1 spike into something a person can operate on stage
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: SESN-03, SESN-04, DEMO-01
**Success Criteria** (what must be TRUE):
  1. Presenter can trigger a live prompt-steering update from the UI and see a visible change in the generated video within a few seconds
  2. Presenter can start and stop the live session on demand from the UI, not from a dev console or script
  3. The live-generated video and the original seed photo are displayed side by side in the same view, so a "before/after" is visible to an observer
**Plans**: TBD
**UI hint**: yes

### Phase 3: Stress-Test, Narration, and Rehearsal Hardening
**Goal**: The end-to-end demo is rehearsed, privacy-reviewed, and backed by a safety net, so the live on-stage run is reliable even under time and network pressure
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: DEMO-02, SAFE-01, SAFE-02, SAFE-03
**Success Criteria** (what must be TRUE):
  1. Presenter has a written, rehearsed narration script (historical/cultural context only) with specific prompt phrasings mapped to steering beats
  2. All seed content and the narration script have been checked against the privacy boundary (no living relatives' identities, no personal narrative, no exact addresses) and signed off before rehearsal
  3. A screen-recorded fallback video of one full successful run (connect → seed → narrate/steer → stop) exists and is cued locally, ready to play if the live session fails
  4. Live prompt-steering has been exercised with multiple prompt changes across a multi-minute session, with 2-3 reliably working phrasings locked in for use on stage
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Auth + Seed-Contract Spike | 0/TBD | Not started | - |
| 2. Minimal Live-Steering UI | 0/TBD | Not started | - |
| 3. Stress-Test, Narration, and Rehearsal Hardening | 0/TBD | Not started | - |
