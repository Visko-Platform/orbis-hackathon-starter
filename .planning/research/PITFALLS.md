# Pitfalls Research

**Domain:** Live/steerable generative video demo built solo on a brand-new (≈Sept 1, 2026) real-time
video API (Reactor / Visko Orbis-Stable), for a one-day hackathon with a hard 5:00 PM on-stage
demo deadline.
**Researched:** 2026-09-11
**Confidence:** MEDIUM-HIGH (Reactor API mechanics and Visko Orbis 1.0 model capabilities are
HIGH confidence, drawn directly from official docs already captured in PROJECT.md and the
Visko Orbis 1.0 arXiv paper; general hackathon/WebRTC/live-demo failure patterns are MEDIUM
confidence, drawn from community post-mortems and engineering blogs rather than data specific to
this event)

## Critical Pitfalls

### Pitfall 1: Building the whole demo around an unverified input-modality assumption

**What goes wrong:**
The builder assumes Orbis-Stable's session can be seeded from the sanitized photo or reenactment
clip (per the plan in PROJECT.md), builds the entire UI and narration flow around "upload image →
video animates it," and only discovers hours in — or on stage — that Reactor's *product* API
(as opposed to the underlying Visko Orbis 1.0 *model*) only exposes text-prompt seeding for this
model, or requires a different call shape (e.g., a separate "seed" endpoint, base64 vs. URL, size
limits) than assumed.

**Why it happens:**
Reactor's own quickstart docs only demonstrate `set_prompt`/`start` (text-only) steering, while the
underlying Visko Orbis 1.0 research paper confirms the *model* supports text, image, and video
seeds plus mid-generation prompt switching ("Visko Orbis 1.0 ... supports long-form text-to-video,
image-to-video, and video continuation," arXiv:2607.26694). It is easy to assume Reactor's API
surface exposes 1:1 what the paper describes — a brand-new platform commonly lags its own
underlying model's documented capability, or exposes it under an undocumented/differently-named
parameter. This is the single highest-leverage unknown in the whole project, per PROJECT.md's own
open question.

**How to avoid:**
Treat "confirm the seed contract" as a hard blocking spike, not a research nice-to-have. In order
of speed: (1) check for a login-gated docs section or Reactor's Discord/support channel the moment
API keys are issued; (2) ask Reactor/Visko staff on-site directly — this is a hosted hackathon with
sponsor engineers present; (3) if docs are ambiguous, just try it — POST an image alongside
`set_prompt` and inspect the response/error rather than reasoning about it further. Cap this spike
at a hard time box (e.g. 30-45 min); if unresolved, fall back immediately to the text-description
path from PROJECT.md ("an old photo of a Philippine barrio street, women cooking over a charcoal
stove") and never revisit the image/video-seed path again today.

**Warning signs:**
Docs page for "session creation" or "seed" only shows a `prompt: string` field with no
image/video/file parameter documented; any attempt to pass an image returns a 4xx/schema-validation
error rather than a clear "unsupported" error; Reactor support/Discord doesn't answer within
~15 minutes of asking.

**Phase to address:**
Very-early spike (first task of the day, before any UI work) — this is already reflected as the
first Active requirement in PROJECT.md and should not be reordered.

---

### Pitfall 2: API key / auth provisioning delay at event check-in eats build time

**What goes wrong:**
The 100 approved builder spots imply a manual or semi-manual credential-issuance process. If key
issuance is slow, gated behind a form, or the granted key doesn't work immediately (propagation
delay, wrong scope, wrong model access tier), the builder loses 15-45 minutes of a 5.5-hour budget
before writing a single line of integration code — and that's exactly the highest-risk time to lose
it, since the seed-modality spike (Pitfall 1) is also blocked on having a working key.

**Why it happens:**
Early-access developer platforms provisioning at a live event commonly rely on manual key
generation, batch imports, or sandbox environments that lag behind what's promised on stage; the
same pattern shows up broadly in partner-onboarding and hackathon sponsor integrations, where
"registration and API key provisioning" is a known bottleneck point distinct from the technical
integration itself.

**How to avoid:**
At check-in, request the API key and immediately do a trivial smoke test (mint a JWT via
`POST /tokens`, open a session, confirm `statusChanged` fires) *before* doing anything else,
including finding a seat or reading docs in depth. If the key doesn't work, escalate to event
staff/sponsor engineers immediately rather than debugging blind — with 100 builders on-site,
provisioning bugs are likely already known and have a fast-path fix. Don't build UI against a
mocked/assumed response while waiting; the auth flow itself (server-side JWT exchange) is a
dependency for every other step.

**Warning signs:**
Key issued but `/tokens` returns 401/403; JWT exchange succeeds but session `statusChanged` never
reaches `ready`; docs reference a model slug that isn't in the key's allowed list (see Pitfall 9).

**Phase to address:**
Very-early spike — first 15 minutes after doors/check-in, before the modality spike in Pitfall 1
(auth is a prerequisite for testing modality at all).

---

### Pitfall 3: GPU cold-start / queue latency kills the live moment on stage

**What goes wrong:**
The presenter clicks "start" in front of judges and the stream takes 10-30+ seconds to appear, or
the first `set_prompt` update lags several seconds before visibly affecting the video — reading as
"broken" to an audience even though the system is technically working, because live demo audiences
have zero tolerance for silent dead air.

**Why it happens:**
Real-time generative video platforms frequently run on scale-to-zero or shared GPU pools; a session
that hasn't been touched in a while can hit a cold-start path that adds many seconds of model-load
latency before generation begins, and shared infrastructure under hackathon-day load (100 builders
hitting the same GPU pool) makes p95/p99 latency far worse than whatever the presenter saw during
solo testing at 2pm.

**How to avoid:**
Warm the session 60-90 seconds before walking on stage — start the connection and issue an initial
`set_prompt`/`start` in the wings or at the podium while being introduced, not as the first action
in front of judges. Never let the "first frame ever" moment happen live on stage. If Reactor
exposes any session-keepalive/ping, use it. Build a scripted opening line ("give me one second while
this warms up") into the narration as a deliberate buffer rather than treating any startup lag as a
failure to hide.

**Warning signs:**
Time-to-first-frame measured during build/rehearsal varies significantly between runs (e.g. 3s vs.
25s) — that variance is the tell that cold starts are happening; latency gets worse in the couple of
hours before the 5:00 PM slot as more builders are simultaneously hitting the shared GPU pool.

**Phase to address:**
Mid-build (measure latency variance as soon as the first working session exists) and pre-demo
rehearsal (bake the warm-up buffer into the actual walk-on choreography, rehearsed at least twice).

---

### Pitfall 4: Venue WiFi/firewall breaks the WebRTC connection, tested only on home network

**What goes wrong:**
The build-and-test loop happens all day on a laptop connected to reliable home/hotel wifi or the
builder's own hotspot; the WebRTC stream (ICE negotiation, UDP media ports) never gets exercised
against the actual venue network until minutes before presenting — where conference wifi is
typically a locked-down corporate/guest network that can block or throttle the UDP ports WebRTC
needs, causing ICE candidates to fail or time out and the connection to silently sit in
"connecting"/"disconnected" state.

**Why it happens:**
WebRTC's reliance on UDP/STUN/TURN negotiation is exactly the kind of traffic hotel, conference
center, and corporate guest networks are configured to restrict; "networks do not care about your
demo" and locked-down venue firewalls are one of the most commonly cited causes of live WebRTC
demo failure. A room full of hackathon builders simultaneously saturating the same shared wifi
compounds this with bandwidth contention, independent of firewall rules.

**How to avoid:**
Test the actual live-video path (not just the API logic) on the actual venue network as early as
physically possible after doors open — do not wait until pre-demo rehearsal to discover this.
Bring a phone hotspot as an explicit fallback network and know in advance how to switch to it
quickly. If Reactor's SDK/docs mention a TURN relay or specific firewall requirements, check for
them proactively rather than reactively debugging a stuck ICE connection. If the venue has a
wired/AV-team network for presenters (common at staged events with a dedicated presentation slot),
ask organizers about it at check-in — wired beats venue wifi every time for the actual demo moment.

**Warning signs:**
Session connects and `statusChanged` events fire, but no video track ever renders
(`trackReceived` never fires, or fires but stream stays black) specifically when on venue wifi but
not on hotspot/home network; connection works then drops after ~30-60s (mid-negotiation renegotiation
failing).

**Phase to address:**
Mid-build (first full connect-to-stream test must happen on venue wifi, immediately after the
first working session, not deferred) and pre-demo rehearsal (final run on the actual stage network
if accessible, with hotspot fallback rehearsed).

---

### Pitfall 5: No fallback plan if the live connection drops during the actual demo

**What goes wrong:**
The presenter has only the live path — if the stream stutters, disconnects, or the model produces
garbage output at the exact moment judges are watching, there is nothing to fall back to, and the
demo either dies in silence or the presenter has to verbally explain what *should* have happened
instead of showing it.

**Why it happens:**
Under time pressure, "make it work live" consumes 100% of available time and a recorded fallback
feels like wasted effort that could go toward the real thing — until the live thing breaks in front
of the one audience that matters. This is the single most repeated lesson across hackathon
post-mortems: teams that chose to show only a live/server-dependent demo without a recorded backup
are disproportionately represented among "it broke in front of judges" stories, while teams with a
recorded fallback in their back pocket degrade gracefully instead of failing publicly.

**How to avoid:**
Screen-record a full successful run (connect → seed → narrate/steer → stop) as soon as the pipeline
works end-to-end even once — treat this recording as a required deliverable, not an afterthought,
and re-record it if a materially better run happens later. Keep the video file open/cued locally
(not dependent on wifi to play) so it can be switched to instantly if the live session fails.
Decide *in advance* what the trigger is for switching to backup (e.g., "if no video track after
15 seconds of narration, switch") so it's not an in-the-moment judgment call under stage pressure.

**Warning signs:**
No recording exists yet and it's within ~60-90 minutes of the presentation slot; the only copy of a
"good run" is a memory of how it looked once, not a saved file.

**Phase to address:**
Mid-build (capture the recording the first time the pipeline fully works, don't wait for a
"perfect" run) and pre-demo rehearsal (confirm the backup file plays instantly, offline, and the
switch-over trigger is decided and rehearsed).

---

### Pitfall 6: Prompt-steering behaves unpredictably live, and it happens for the first time in front of judges

**What goes wrong:**
Live-updating the prompt mid-session (`set_prompt` while streaming) is inherently less predictable
than single-shot generation: the model may ignore the new prompt for several seconds, over-react
and abruptly change the scene in a jarring way, or drift toward artifacts/incoherence the longer a
session runs. If the presenter has only tried 1-2 prompt updates before going on stage, the first
time they see truly unexpected behavior is while narrating live to an audience.

**Why it happens:**
Streaming/autoregressive video diffusion models are known to be prone to quality degradation and
drift the longer a session runs, especially outside the temporal range they were tuned for, and
prompt-conditioning changes mid-generation can be absorbed smoothly or can cause visible
discontinuities depending on timing and phrasing — the underlying Visko Orbis 1.0 paper's own
"bounded multi-scale memory" fix for drift is itself evidence that ungoverned drift is a real
failure mode of this model family, not a hypothetical one. A builder who has only tested the happy
path (one clean prompt, no live updates) has no model of how it fails.

**How to avoid:**
During build, deliberately stress-test the steering interaction, not just the seed: run one session
for several minutes with 5-10 prompt changes back to back, including intentionally vague or
conflicting prompts, and note how the model responds (delay, overshoot, drift). Write down 2-3
prompt phrasings that reliably produced good results and use *those* verbatim during the real demo
instead of improvising new phrasing live. Script the narration to work with expected model behavior
("watch the scene shift as I steer it toward evening") rather than describing a specific outcome
that might not land exactly that way.

**Warning signs:**
Only one full session has ever been run start-to-finish before the demo; prompt changes have only
been tested seconds apart from the initial `start`, never on a session that's been running for
minutes; narration script assumes precise visual outcomes rather than general directional ones.

**Phase to address:**
Mid-build (dedicated steering stress-test session, distinct from the initial "does it work at all"
spike) and pre-demo rehearsal (lock in the exact prompt sequence to use live, rehearsed at least
twice with timing).

---

### Pitfall 7: Sinking build time into narration/content polish before the core technical risk is retired

**What goes wrong:**
Because the narration content (historical/cultural context, adapted from Family Album's
hotspot schema) is familiar, low-risk work the builder has done before, it's tempting to spend early
hours polishing wording, picking the perfect photo, or refining the story — while the actual novel,
uncertain risk (can Orbis-Stable even be seeded and steered live at all, per Pitfall 1) sits
unretired. If that core risk turns out to be a blocker, it's discovered late, with no time left to
adapt.

**Why it happens:**
Content/writing work has a clear, comfortable path to "done" and produces visible progress, which
is psychologically rewarding under time pressure — compared to API integration work, which feels
uncertain and unrewarding until it suddenly works. This is a general pattern in hackathons and
time-boxed builds: effort flows toward legible, low-risk tasks and away from the highest-uncertainty
blocking task, even when the latter is explicitly known to be the biggest risk (as it is here,
per PROJECT.md's own "first build task is a research/API spike" decision).

**How to avoid:**
Enforce the sequencing already decided in PROJECT.md: seed-modality spike and a bare end-to-end
connect→seed→stream→stop path must work, even with a placeholder prompt and no narration content,
before spending meaningful time on narration polish. Treat "one ugly but working live loop" as the
phase-1 done condition, not "a good demo." Content/narration work is real and necessary, but should
happen in parallel with or after the pipeline risk is retired, using whatever time remains — not
compete with it for the first 1-2 hours.

**Warning signs:**
More than ~60-90 minutes elapsed and there is polished narration copy but no working live session
yet; time spent choosing between multiple candidate photos/clips instead of committing to the one
already identified in PROJECT.md (Cavite City barrio cooking street).

**Phase to address:**
Very-early spike / mid-build boundary — this is a sequencing discipline to enforce throughout the
day, not a single checkpoint; explicitly re-check at each hour mark whether the live pipeline is
ahead of or behind the content work.

---

### Pitfall 8: Privacy sanitization review happens right before the demo instead of before content is finalized

**What goes wrong:**
Because the source photos/clips are reused from a prior project (World Hackathon) and the builder
already trusts they were sanitized once, the sanitization check against *this* project's boundary
(no living relatives' identities, no personal narrative, no exact addresses) gets skipped or
deferred — and only gets a real second look minutes before presenting, when there's no time left to
swap material or reword narration if something doesn't pass.

**Why it happens:**
"We already did this" is a false sense of completeness: the privacy boundary for this project
explicitly calls out things (living relatives' names, personal family narrative, exact
addresses/locations) that are easy to reintroduce accidentally in *live, spoken* narration even if
the visual source material itself was already sanitized — spoken narration is improvised in a way
static hotspot text wasn't, which is a new surface for privacy leakage this project introduces that
World Hackathon didn't have.

**How to avoid:**
Do the sanitization review twice, deliberately: once early against the static source material
(reused photos/clips — likely a fast pass since this was largely done before), and once again
specifically against the *narration script/talking points* the presenter will actually say live —
before the pre-demo rehearsal, not during it. Write down the exact narration content and read
it as if a judge is fact-checking it for the excluded categories: names, addresses, personal
stories. Treat this as a checklist gate, not a vibe check.

**Warning signs:**
Narration is being improvised/decided on the fly rather than scripted, meaning there's no fixed
text to actually review; the "sanitize content" requirement is still unchecked with less than
30 minutes before the demo slot.

**Phase to address:**
Mid-build (first pass, against source photos/clips, can happen early since it's largely inherited
work) and pre-demo rehearsal (second, mandatory pass against the actual spoken narration script,
completed with enough buffer to still change wording if something fails).

---

### Pitfall 9: Model slugs, docs, and actual granted access silently diverge

**What goes wrong:**
The model catalog names things like `Orbis-Stable`, but the actual slug required by
`create-reactor-app --model=<slug>` or the session-creation call is spelled/versioned differently
(e.g. includes a version suffix, or the hackathon-granted key only has access to a subset of
models), causing confusing 404s/403s that look like a broken integration rather than a naming
mismatch.

**Why it happens:**
Brand-new platforms launched within the last two weeks (Reactor/Orbis-Stable was announced ~Sept 1,
2026) commonly have documentation, model catalog pages, and actual API behavior that haven't fully
converged yet — marketing pages, quickstart docs, and the live API can each reflect a slightly
different snapshot of the platform.

**How to avoid:**
Don't hand-type the model slug from memory or from PROJECT.md's notes — pull it live from whatever
`create-reactor-app` scaffolding or a models-list endpoint returns at the time of building, and
copy-paste it. If a call fails with an auth/not-found error, check the exact slug string first
before assuming a deeper integration bug.

**Warning signs:**
A session-creation or scaffold command fails with an unhelpful 404/403 immediately, before any
logic-level debugging is warranted.

**Phase to address:**
Very-early spike (verify the exact slug as part of the first scaffold/connect attempt).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|------------------|
| Hardcode the API key/JWT flow inline instead of a clean server route | Faster to get a session running | Key could leak if committed; PROJECT.md explicitly requires server-side JWT minting | Never for the API key itself — always proxy server-side, even as a one-file hack |
| Skip a real UI and drive prompts from a hardcoded array/console during build | Saves UI-build time while validating the pipeline | Presenter has no live control on stage | Acceptable through mid-build; must be replaced by a minimal live-input UI before rehearsal |
| Reuse World Hackathon photos/clips without re-reviewing against this project's privacy boundary | Saves content-sourcing time | Live spoken narration is a new leak surface (see Pitfall 8) | Acceptable to reuse the *material*, never acceptable to skip the *narration* review |
| Skip error handling on `statusChanged`/connection-failure events | Faster to reach a working happy path | No graceful fallback if the session fails live on stage | Acceptable in the very-early spike only; must be added by pre-demo rehearsal |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|--------------|------------------|--------------------|
| Reactor auth (`api key -> JWT`) | Exposing the raw `rk_...` API key to the client, or minting the JWT client-side | Mint the JWT via a server route (`POST /tokens`) and only ever send the short-lived JWT to the browser |
| Reactor session lifecycle | Calling `set_prompt`/`start` before `status === "ready"` fires | Gate all `sendCommand` calls on the `statusChanged` event reaching `ready`, don't assume immediate readiness after connect |
| WebRTC track handling | Assuming `trackReceived` fires immediately after `start` | Show an explicit "warming up" state in the UI between `start` and the first `trackReceived`, so latency reads as intentional rather than broken |
| Model catalog / slugs | Trusting a slug copied from marketing docs (reactor.inc/models) over what the scaffold/API actually returns | Always source the slug from the live scaffold output or an API models endpoint at build time |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| Shared GPU pool cold starts | Time-to-first-frame varies wildly (3s vs 25s+) run to run | Warm the session before going on stage; never let "first ever start" happen live | Worst right before the 5:00 PM slot, when most of the 100 builders are simultaneously hitting the platform |
| Long-running steered sessions drifting | Visual quality/coherence degrades gradually over minutes-long sessions | Keep demo sessions short (a few minutes), restart cleanly between rehearsal runs rather than letting one session run all day | Becomes visible past roughly the multi-minute mark, model-dependent |
| Venue wifi bandwidth contention | Stream stutters or fails only when many other builders are also online | Test at the same time of day/load level as the actual demo slot, not just early when the room is empty | Worst during peak building hours and right at demo time when everyone's laptops are active |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Committing the Reactor API key or JWT-minting secret to the (public) repo | Key theft/abuse, possibly against shared hackathon billing/Nebius credits | Use env vars + `.gitignore`, verify with `git status`/`git diff` before every commit that no key literal is staged |
| Publishing narration script or repo with unsanitized content because privacy review was skipped under time pressure | Public exposure of living relatives' identities or personal family history — this is a public demo and a public repo | Treat Pitfall 8's second review pass as a non-negotiable gate before the repo is made public or the demo goes live |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| No visible state feedback while connecting/warming up | Audience/judges see a blank screen and assume it's broken | Show explicit status text ("connecting," "warming up," "live") tied to `statusChanged`/`trackReceived` events |
| Presenter typing raw prompts live, exposed to typos/awkward pauses | Breaks narrative flow, looks unpolished on stage | Pre-stage a short list of tested prompt phrasings as clickable buttons/presets, typing only if something clearly unscripted is needed |
| Steering UI requires precise/fast interaction under stage pressure | Presenter fumbles controls while also narrating and facing an audience | Keep the live-control surface to the smallest possible number of buttons/inputs, tested one-handed while talking |

## "Looks Done But Isn't" Checklist

- [ ] **Live session connects:** Often missing a tested run on the *actual venue wifi* — verify by
  connecting from the venue network specifically, not just home/hotspot.
- [ ] **Prompt steering works:** Often only tested as a single clean prompt at session start —
  verify with a multi-minute session and several live `set_prompt` updates, including one
  mid-session.
- [ ] **Fallback plan exists:** Often assumed unnecessary because "the live demo worked once" —
  verify a screen-recorded backup file exists, plays offline, and the presenter has practiced
  switching to it.
- [ ] **Privacy sanitization complete:** Often checked only against the visual source material —
  verify the actual spoken narration script/talking points have also been reviewed against the
  exclusion list (names, personal narrative, exact addresses).
- [ ] **API key security:** Often "handled" by just not printing it in the UI — verify the raw
  `rk_...` key never appears in any client-side bundle or committed file, only the short-lived JWT.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|-----------------|-------------------|
| Seed-modality spike fails (image/video seeding not supported) | LOW | Fall back immediately to the text-description seed path already identified in PROJECT.md; no architecture change needed, just different input to the same `set_prompt` call |
| Live connection drops on stage | LOW | Switch to the pre-recorded backup clip per the pre-agreed trigger; narrate over it as if steering, acknowledge briefly that this is the recorded run if directly asked |
| Cold-start latency stalls the opening | LOW | Narrate through the wait with the scripted buffer line; if it exceeds ~20-30s, switch to backup per the same trigger as a dropped connection |
| Privacy issue discovered late in a narration script | MEDIUM | Cut the offending line entirely rather than trying to reword under time pressure — a shorter, safe script beats a risky detailed one |
| Model slug/API mismatch discovered mid-build | LOW | Re-pull the slug from the live scaffold/API response rather than debugging deeper; usually a five-minute fix once identified as a naming issue |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|--------------------|-----------------|
| Unverified input-modality assumption (Pitfall 1) | Very-early spike | A real API call with an image/video payload either succeeds or returns a clear, understood rejection within the first ~45 min |
| API key/auth provisioning delay (Pitfall 2) | Very-early spike | JWT mint + session connect succeeds within minutes of receiving the key |
| GPU cold-start/queue latency (Pitfall 3) | Mid-build measurement, pre-demo rehearsal buffer | Time-to-first-frame measured across multiple runs; walk-on choreography includes a warm-up buffer, rehearsed twice |
| Venue wifi/WebRTC firewall issues (Pitfall 4) | Mid-build (test on venue network ASAP), pre-demo rehearsal | A full connect-to-stream test has succeeded specifically on venue wifi, with a hotspot fallback ready |
| No live-drop fallback (Pitfall 5) | Mid-build (record early), pre-demo rehearsal | A working backup recording exists, plays offline, and the switch-over trigger is written down |
| Unpredictable live prompt-steering (Pitfall 6) | Mid-build stress test, pre-demo rehearsal | A multi-minute session with several live prompt changes has been run at least once; final prompt sequence is fixed and rehearsed |
| Narration polish before core risk retired (Pitfall 7) | Sequencing discipline, checked hourly | At each hour mark, the live pipeline's progress is at or ahead of the narration content's progress |
| Late privacy sanitization review (Pitfall 8) | Mid-build (source material), pre-demo rehearsal (narration script) | Both the source photos/clips and the final spoken narration script have been explicitly checked against the exclusion list |
| Model slug/docs divergence (Pitfall 9) | Very-early spike | The exact slug used in code was copied from live scaffold/API output, not typed from memory or marketing docs |

## Sources

- PROJECT.md (this repo) — Reactor API mechanics (auth flow, `sendCommand`/`set_prompt`/`start`,
  `trackReceived`/`statusChanged`), model catalog, and the open question about seed-input support,
  pulled from docs.reactor.inc and reactor.inc on 2026-09-11. Confidence: HIGH (primary source,
  already verified by the project).
- [Visko Orbis 1.0: A Live Model for Real-Time Interactive Long Video Generation](https://arxiv.org/abs/2607.26694) — confirms Visko Orbis 1.0 (the underlying model) supports
  text, image, and video seeds plus mid-generation prompt switching, and documents drift/consistency
  as an explicit engineering challenge the model addresses via bounded multi-scale memory.
  Confidence: HIGH (primary research source).
- [Visko launches Orbis, a new real-time AI video model — TestingCatalog](https://www.testingcatalog.com/visko-launches-orbis-a-new-real-time-ai-video-model/) and
  [Visko launches Orbis live model and closes pre-seed funding round — The Robot Report](https://www.therobotreport.com/visko-launches-orbis-live-model-closes-pre-seed-funding-round/) —
  corroborating coverage of the model launch and Reactor distribution partnership. Confidence: MEDIUM.
- [WebRTC Works Great in Demos. In Production, It Falls Apart. Here's the Fix. — DEV Community](https://dev.to/colocohen/webrtc-works-great-in-demos-in-production-it-falls-apart-heres-the-fix-f9h)
  and [WebRTC works great, right up until a real user shows up — DEV Community](https://dev.to/jackmorris10/webrtc-works-great-right-up-until-a-real-user-shows-up-4bje) —
  ICE/firewall failure patterns on real-world networks. Confidence: MEDIUM.
- [The perils of the live demo](https://networked.substack.com/p/the-perils-of-the-live-demo) and
  [Lessons learned from Hackathons. Expect the unexpected. — Medium](https://medium.com/@raphael.moutard/lessons-learned-from-hackathons-expect-the-unexpected-48fd58b4a927) —
  hackathon-specific live-demo failure and backup-plan patterns (recorded fallback vs. live-only
  teams). Confidence: MEDIUM.
- [The hackathon demo that works live: a technical checklist — DEV Community](https://dev.to/pranjulrathour/the-hackathon-demo-that-works-live-a-technical-checklist-4k1) —
  rate-limit/cold-start/rehearsal checklist practices for hackathon demos. Confidence: MEDIUM.
- [Scale-to-Zero Cold Start Latency: Why Serverless GPU Breaks Real-Time AI — regolo.ai](https://regolo.ai/scale-to-zero-cold-start-latency-why-serverless-gpu-breaks-real-time-ai-and-how-to-fix-it/) —
  cold-start latency mechanics for serverless/shared GPU inference. Confidence: MEDIUM.
- [Frame Context Packing and Drift Prevention in Next-Frame-Prediction Video Diffusion Models (arXiv)](https://arxiv.org/pdf/2504.12626) and
  [BAgger: Backwards Aggregation for Mitigating Drift in Autoregressive Video Diffusion Models (arXiv)](https://arxiv.org/pdf/2512.12080) —
  general evidence that autoregressive/streaming video diffusion models are prone to drift over
  longer generation windows, motivating Pitfall 6. Confidence: MEDIUM (general model-family
  research, not Orbis-Stable-specific benchmarking).
- Is Your Venue's WiFi Enough? A Corporate Planner's Bandwidth Checklist — avfx.com (2026) — venue
  wifi bandwidth-contention and wired-fallback guidance for live-demo events. Confidence: MEDIUM.

---
*Pitfalls research for: brand-new real-time generative video API + solo one-day hackathon + live
on-stage demo*
*Researched: 2026-09-11*
