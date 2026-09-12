# Feature Research

**Domain:** Live/real-time steerable video generation demo (hackathon presentation), family-memory framing
**Researched:** 2026-09-11
**Confidence:** MEDIUM — synthesized from official Reactor docs (fetched directly), academic/project pages for comparable "live model" systems (Visko Orbis 1.0 paper, LongLive, Self-Forcing, SANA-Video, RealCam, MotionStream, Runway GWM Worlds 2), and general hackathon-demo-reliability community wisdom. No first-party access to Orbis-Stable itself yet (event-gated) — the single largest open question (does Orbis-Stable actually accept an image seed, confirmed only via one doc-catalog page: "Image-anchored openings") should be re-verified at the event before locking the build plan, per PROJECT.md's own flagged spike.

## Feature Landscape

### Table Stakes (Users Expect These)

These are non-negotiable — without them, a "live steerable video" demo reads as either a video playback demo or a broken demo, not a live-model demo.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Live session connect + start (image/photo seed → generating video) | Every comparable "live model" demo (Orbis 1.0 launch coverage, LongLive, Self-Forcing, RealCam, MotionStream) opens with "here's the source, watch it come alive" — this is the baseline proof the model is running, not pre-rendered | LOW–MEDIUM | Reactor's own quickstart pattern: connect → `trackReceived`/`statusChanged` → on `ready`, `set_prompt` + `start`. Confirm Orbis-Stable accepts an image seed (doc catalog says "Image-anchored openings") vs. text-only fallback — this is the first build task, not optional polish |
| At least one visible, causal prompt-steering interaction mid-stream | The single feature that separates a "live model" demo from a video-playback demo. Every reference system's "wow moment" (Orbis's sub-1s prompt-switch, LongLive's KV-recache prompt switch, GWM Worlds 2's live key/mouse steering) is the audience *seeing* an input change and the *scene visibly respond* in seconds, without a cut or restart | LOW–MEDIUM | Minimum: one `set_prompt` call while streaming, with the new prompt visibly changing on-screen content within ~1-5s. Do this at least twice during the demo — a single change can read as coincidence/luck to judges who don't know the tech |
| Continuity/identity held across the steering change | If the subject/scene resets or drifts unrecognizably when the prompt changes, it reads as "two different clips stitched," undermining the "one living memory" narrative — this is exactly what Orbis/LongLive/RealCam are built to avoid (persistent memory, KV-recache, frame-level attention sink) | Depends on model, not your code | Not something you build — verify it holds during rehearsal. If Orbis-Stable's continuity is weak on your specific seed image, pick steering prompts that are additive ("add smoke from the cooking fire") rather than transformative ("change to a different street") |
| Session start/stop control the presenter visibly operates | Judges need to see *a human causing the behavior* — an unattended autoplay reads as a video, not a live-steered session | LOW | One or two buttons/keys (start, stop, maybe reconnect) is sufficient; no need for a polished control panel |
| Live spoken narration synced to the visual | This is this project's actual Core Value (per PROJECT.md) and is also how every comparable demo grounds an otherwise abstract "look, pixels are moving" moment into something legible to a non-technical judge audience | LOW | No engineering — this is presenter skill + a rehearsed script; but the *script* is a deliverable (see Family Album hotspot content reuse) |
| Side-by-side original photo (the "before") next to the live-generated video (the "after") | Every "photo → living memory" narrative needs a visible anchor to the source; without it, judges can't tell whether what they're watching is derived from something real or just a generic AI video | LOW | Cheapest possible high-impact feature — a static `<img>` next to the video element. Directly answers "wait, is that from a real photo?" before anyone has to ask |
| Privacy-sanitized content only (per existing boundary) | Already true of the source assets from World Hackathon; a public demo showing living relatives' identities or exact addresses is a hard blocker, not a quality issue | LOW | No new work — reuse the already-sanitized photo/clip and Family Album's historical-only narration content |

### Differentiators (Competitive Advantage)

Other teams at this hackathon will also be steering Orbis-Stable (or another Reactor model) live on stage with generic or fun prompts (fantasy scenes, memes, games). These features are what make *this* demo memorable relative to "yet another live-steered scene."

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Emotional framing: real family photo + real historical context, not a generic/fictional scene | Every reference "live model" demo (Orbis launch, LongLive, GWM Worlds 2) showcases technically impressive but emotionally neutral content (fantasy landscapes, game worlds, generic scenes). A judge sitting through 20+ demos of "watch me steer a video" will remember the one that made them feel something. This is the project's actual thesis, inherited from World Hackathon | already baked in | Zero extra engineering — this is a content/narrative choice, not a build task. Reinforce verbally: "this isn't a generic AI video — it's a specific place, [my family's/a] barrio street in postwar Philippines" |
| On-screen caption/lower-third showing current steered prompt or one-line historical fact | Solves the classic live-demo failure mode: the audience can't hear over PA/room noise, or the visual is engrossing enough that spoken narration gets missed. A caption also *visibly proves* the causal link between "presenter changes text" and "video changes" for anyone watching without following along verbally | LOW–MEDIUM | A simple `<div>` overlay updated in the same handler that calls `set_prompt`. This single feature does double duty: accessibility (silent legibility) + demo credibility (visible proof of live steering) |
| Pre-scripted steering presets tied to narration beats (buttons, not free-text typing) | Reduces on-stage risk (typos, blanking on a good prompt) while still visibly demonstrating "the presenter is choosing this live" — the causal steering moment is preserved without depending on live creative writing under pressure | LOW | 3-5 buttons: e.g. "Morning market opens" → "Woman lights the charcoal stove" → "Children run past" → "Smoke rises over the street." Each maps to one narration beat, adapted from Family Album's hotspot heading/shortDescription pattern |
| Explicit "extends World Hackathon" framing (photo → 3D splat world → now living video) | Gives judges a through-line/narrative arc across two hackathons using the *same* source photo, which reads as depth and iteration rather than a one-off stunt — a strong differentiator among hackathon demos that are typically single-shot and disconnected from any prior work | LOW | One sentence in the pitch + optionally one still frame from the World Hackathon splat-world demo shown before switching to the live video, if time allows |
| Visible "session is live" indicator (timer/status/latency readout) | Reinforces "this is not a recording" without you having to say it — mirrors how RealCam/MotionStream demos show control overlays (key bindings, track grids) so the audience can map cause to effect themselves | LOW | Optional stretch — even a simple "● LIVE — connected Xs" text driven off Reactor's `statusChanged` event is enough; do not build a real dashboard |

### Anti-Features (Commonly Requested, Often Problematic)

These already substantially overlap with PROJECT.md's own Out of Scope list — this section adds the *why* from a features-research lens and one addition (multi-photo narratives) that's easy to scope-creep into under demo-day excitement.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Voice-to-prompt (live ASR driving `set_prompt`) | Feels more "magical" — presenter just talks, no visible manual steering | Adds a full speech-recognition pipeline, a new failure surface (mic noise, ASR latency, misrecognition), and *removes* the visible causal steering action that judges need to see to believe it's live, on top of an unfamiliar API already eating the build budget | Presenter clicks a preset button or types a short prompt while narrating around it — the visible click/type *is* the demo of "live steering," not a limitation |
| Audience-facing self-serve UI (let anyone in the room steer it) | Seems like a bigger "wow" — turns a demo into an interactive installation | Multiplies UI/state-management scope (turn-taking, input validation, someone typing something off-brand/unsanitized on a live public stream), and directly conflicts with the privacy boundary (uncontrolled prompts could pull in unintended content) | Single presenter-controlled session, exactly as scoped. If audience interactivity is wanted post-hackathon, that's a v2 concept, not a day-one feature |
| Multi-scene / multi-photo narrative with scene transitions or a scene picker | More material = feels like a richer demo | Multiplies sanitization work, multiplies rehearsal surface area, and dilutes the emotionally legible single-thread narrative that's this project's actual differentiator; a 2-3 minute slot cannot support more than one story beat sequence anyway | One photo/clip, one narration arc, 3-5 steering beats — depth over breadth |
| Persistent backend, accounts, saved sessions, analytics | Feels like "real product" maturity | Zero relevance to a single live on-stage demo; every hour spent here is an hour not spent de-risking the live steering path, which is the actual point of judging | Static frontend + Reactor's hosted session, exactly as scoped |
| Polished custom design system / branding pass on the UI | Wanting the demo to "look professional" | Time sink with near-zero judging payoff relative to the live-steering-works risk; judges are watching the video and listening to narration, not evaluating your CSS | Minimal, functional UI: two labeled buttons, one caption overlay, one side-by-side layout — done in plain CSS/Tailwind defaults |
| Complex reconnect/retry state machine for dropped sessions | Feels like "production robustness" | Over-engineering for a single 2-3 minute live event; a complex retry state machine is itself a new source of on-stage failure (edge cases you didn't rehearse) | One manual "reconnect" button the presenter can press if the connection drops, backed by the fallback recording as the real safety net (see below) |
| Trying every fallback Reactor model (LTX, X2, Happy Oyster, etc.) "just in case" | Hedges against Orbis-Stable not accepting an image seed | Each additional model is a separate API contract, separate prompt vocabulary, and separate rehearsal — spreads a 5.5-hour budget too thin | Resolve the seed-input question for Orbis-Stable *first* (spike, already first task in PROJECT.md); only pivot to one specific fallback model if Orbis-Stable is confirmed unable to take an image/video seed, per the Key Decisions table |

## Feature Dependencies

```
Confirm Orbis-Stable seed input (image vs text-only) [research spike]
    └──requires──> Source-material path decision (photo vs clip vs text-description-of-photo)
                       └──requires──> Reactor app scaffold + server-side JWT minting
                                          └──requires──> Minimal live-steering UI (connect, set_prompt, start)
                                                             └──requires──> At least one mid-stream steering interaction (table stakes)
                                                                                └──enhances──> Pre-scripted steering presets (differentiator)
                                                                                └──enhances──> On-screen caption overlay (differentiator)

Side-by-side original photo + live video ──requires──> Sanitized photo already exists (done, reused from World Hackathon)

Live spoken narration ──requires──> Family Album hotspot content (heading/shortDescription/paragraphs), adapted to spoken form (done as content, needs script pass)

Fallback recorded demo (Tier 3) ──requires──> One successful full live run during rehearsal to record
    └──conflicts with──> Skipping rehearsal to save build time (do not cut rehearsal time; the recording IS the fallback)

Visible "session is live" indicator ──enhances──> At least one mid-stream steering interaction (proves liveness without presenter narration alone)

Voice-to-prompt ASR ──conflicts──> Visible causal steering interaction (removes the very thing judges need to see) — this is why it's an anti-feature, not just deferred
```

### Dependency Notes

- **The seed-input spike blocks everything downstream:** every other build task (scaffold, UI, rehearsal, narration sync) depends on knowing whether the session opens on the actual photo/clip pixels or on a text description of them. This must be the first ~30-45 minutes of the build, exactly as PROJECT.md already sequences it.
- **Steering interactions require the UI to exist before they can be rehearsed**, and rehearsal is what produces the fallback recording — so the build order is necessarily: spike → scaffold → UI → rehearse (which also produces the safety-net recording) → polish (captions, presets) only if time remains.
- **Voice-to-prompt is excluded specifically because it conflicts with the table-stakes requirement** of a visible causal steering action — this is a stronger reason to cut it than "not enough time," and worth stating that way if anyone suggests adding it mid-hackathon.

## MVP Definition

### Launch With (Live Demo, Day-Of)

Minimum to walk on stage and credibly demonstrate "photo/clip → living, steerable memory."

- [ ] Confirmed Orbis-Stable seed-input contract (image/video vs. text-only) — unblocks everything else
- [ ] Reactor app scaffolded, server-side JWT minting (API key never client-side)
- [ ] Session connects, seeds from the chosen photo/clip (or its text description, if that's the confirmed path), and starts streaming
- [ ] At least 2 live prompt-steering interactions the presenter visibly triggers during the demo
- [ ] Side-by-side original photo next to the live-generated video
- [ ] Rehearsed spoken narration (historical/cultural context only, per privacy boundary) synced to the steering beats
- [ ] Start/stop control the presenter operates on stage
- [ ] A screen-recorded fallback captured from a real successful rehearsal run, ready to play if the live session fails (labeled honestly as a recording if used)

### Add After Validation (Same Day, If Time Remains)

Only attempt once the above is working end-to-end and rehearsed at least once.

- [ ] On-screen caption/lower-third showing the current steering prompt or a one-line historical fact
- [ ] Pre-scripted steering-preset buttons (replacing free-text typing) mapped to narration beats
- [ ] Visible "● LIVE" / connection-status indicator driven off Reactor's `statusChanged` event
- [ ] One still frame or clip from the World Hackathon splat-world demo shown before the video, to frame the "extends prior project" narrative

### Future Consideration (Post-Hackathon, Not Today)

- [ ] Voice-to-prompt ASR — revisit only outside the time-boxed hackathon context, and even then, preserve a visible steering affordance alongside it
- [ ] Multi-photo / multi-scene narrative with transitions — needs its own sanitization and UX pass
- [ ] Audience-facing self-serve steering — different privacy/moderation model entirely, needs input validation and content controls
- [ ] Persistent backend, saved sessions, accounts — only relevant if this becomes a repeatable installation rather than a one-off demo

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Confirm seed-input contract (spike) | HIGH | LOW | P1 |
| Live session connect/seed/start | HIGH | MEDIUM | P1 |
| Mid-stream prompt steering (≥2 interactions) | HIGH | LOW | P1 |
| Side-by-side photo + live video | HIGH | LOW | P1 |
| Rehearsed live narration script | HIGH | LOW | P1 |
| Start/stop control | MEDIUM | LOW | P1 |
| Fallback recording (rehearsal capture) | HIGH | LOW | P1 |
| On-screen caption overlay | MEDIUM | LOW | P2 |
| Pre-scripted steering-preset buttons | MEDIUM | LOW | P2 |
| Live-status indicator | LOW | LOW | P2 |
| "Extends World Hackathon" framing beat | MEDIUM | LOW | P2 |
| Voice-to-prompt ASR | LOW (for this format) | HIGH | P3 (anti-feature, not just deferred) |
| Multi-photo narrative | LOW (dilutes focus) | HIGH | P3 |
| Audience-facing self-serve UI | LOW (for this format) | HIGH | P3 |
| Persistent backend/accounts | NONE (for a one-day demo) | HIGH | P3 |

**Priority key:**
- P1: Must have for the live demo to land
- P2: Should have, add only after P1 is working and rehearsed
- P3: Explicitly deferred or excluded — do not build today

## Competitor Feature Analysis

"Competitors" here means other reference "live model" demo formats — both the underlying research systems and what a typical hackathon peer team steering the same Reactor models will likely show.

| Feature | Orbis 1.0 launch demo / other Reactor models (LongLive-2, Helios, GWM Worlds 2, RealCam, MotionStream) | Typical hackathon peer demo (generic/fantasy scene) | Our Approach |
|---------|------|------|--------------|
| Wow moment | Sub-1s prompt-switch latency on a generic or fantastical scene; live key/mouse world-steering (GWM Worlds 2, LingBot) | Same steering mechanic, applied to a fun/fictional prompt (dragons, games, memes) | Same steering mechanic, applied to a real family photo with real historical narration — emotional stakes the generic demos don't have |
| Source material | Text prompt or generic stock-style image/video seed | Usually a text prompt typed live, or a stock/found image | A specific, sanitized archival family photo already vetted through a prior hackathon's privacy pass |
| Narration | None (silent tech demo, captions describing the model architecture) | Presenter narrates the *technology*, not the content ("watch this steer in real time") | Presenter narrates the *content* (historical/cultural context of the memory) while the steering happens underneath — content and mechanism reinforce each other |
| Continuity proof | Built into the model (persistent memory, KV-recache) — demoed by holding a subject steady across prompt switches | Same, inherited from the model | Same (inherited from Orbis-Stable), but rehearsal must confirm it holds specifically on the chosen photo/clip's subject |
| Fallback for failure | Not publicly documented (research/launch demos are typically pre-vetted, low-stakes if they glitch) | Usually none — hackathon demos frequently fail live with no graceful degradation | Explicit fallback tiers: prepared preset prompts → recorded rehearsal fallback → static side-by-side with verbal explanation, decided in advance rather than improvised |

## Sources

- Reactor developer docs, `docs.reactor.inc/overview` and `docs.reactor.inc/model-api-reference/overview` (fetched 2026-09-11) — confirms `set_prompt`/`start` steering pattern and lists Orbis-Stable as accepting "Image-anchored openings," MEDIUM-HIGH confidence (official docs, but summarized via fetch tool rather than read verbatim; re-verify at the event as PROJECT.md already flags)
- Visko Orbis 1.0 paper and launch coverage: [arXiv 2607.26694](https://arxiv.org/abs/2607.26694), [The Robot Report](https://www.therobotreport.com/visko-launches-orbis-live-model-closes-pre-seed-funding-round/), [PR Newswire](https://www.prnewswire.com/news-releases/ai-startup-visko-closes-10-million-pre-seed-round-and-launches-orbis-its-first-live-model-302865890.html), [viskoorbis.com](https://viskoorbis.com/) — MEDIUM confidence (press coverage + preprint, not independently reproduced)
- LongLive: [hanlab.mit.edu/projects/longlive](https://hanlab.mit.edu/projects/longlive), [arXiv 2509.22622](https://arxiv.org/abs/2509.22622), [GitHub NVlabs/LongLive](https://github.com/NVlabs/LongLive) — MEDIUM-HIGH confidence (academic project page + code repo)
- Self-Forcing: [self-forcing.github.io](https://self-forcing.github.io/), [GitHub guandeh17/Self-Forcing](https://github.com/guandeh17/Self-Forcing) (NeurIPS 2025 Spotlight) — MEDIUM-HIGH confidence
- SANA-Video: [hanlab.mit.edu/projects/sana-video](https://hanlab.mit.edu/projects/sana-video), [NVlabs/Sana docs](https://nvlabs.github.io/Sana/docs/sana_video/) — MEDIUM-HIGH confidence
- RealCam: [arXiv 2605.06051](https://arxiv.org/abs/2605.06051) — MEDIUM confidence (preprint)
- MotionStream: [arXiv 2511.01266](https://arxiv.org/html/2511.01266v2) — MEDIUM confidence (preprint)
- Runway Research, GWM Worlds 2: [runway.com/research/introducing-gwm-worlds-2](https://runway.com/research/introducing-gwm-worlds-2) — MEDIUM-HIGH confidence (primary source, product research page)
- Hackathon live-demo reliability practices: [dev.to — "The hackathon demo that works live: a technical checklist"](https://dev.to/pranjulrathour/the-hackathon-demo-that-works-live-a-technical-checklist-4k1), [dev.to — "A good fallback hides the failure it was built for"](https://dev.to/znlong2203/a-good-fallback-hides-the-failure-it-was-built-for-1cgm), [networked.substack.com — "The perils of the live demo"](https://networked.substack.com/p/the-perils-of-the-live-demo) — MEDIUM confidence (community/blog wisdom, not peer-reviewed, but broadly consistent across independent sources)
- Project context: `.planning/PROJECT.md` (this repo) for scope boundaries and already-confirmed Reactor API mechanics

---
*Feature research for: live/real-time steerable video demo (hackathon), family-memory framing*
*Researched: 2026-09-11*
