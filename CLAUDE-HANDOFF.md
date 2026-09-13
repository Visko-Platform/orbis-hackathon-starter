# CUTLINE — complete continuation context for Claude

**Voice update, 13 September 2026 01:06 UTC:** The shared checkout now includes audience speech input, an adaptive score and a hydration fix from intervening commits. This turn adds `use-voice-director.ts` and an on-film microphone/transcript overlay. Each final utterance uses the existing Nebius → Orbis direction path; listening resumes after delivery. Stop, room changes, voting and paused/disconnected state invalidate recognition callbacks. `npm run test:voice` covers one delivery, automatic listening, stop, room isolation and pause with a mocked recognizer and zero provider calls. Typecheck, lint and build passed; the studio loaded in the browser. Actual microphone transcription and the new voice-to-provider loop were not live-tested in this five-minute pass. Earlier live provider observations do not substitute for that voice test. Blender was available but not used.

This is the primary takeover document. It consolidates the user's requests, implementation decisions, verified results, external actions, and unfinished work. It is a curated handoff, not a raw chat transcript; credentials are intentionally excluded. Read this first, then inspect the current checkout. The shorter [CLAUDE-REVIEW.md](CLAUDE-REVIEW.md) is a focused code-review checklist.

**Snapshot:** 12 September 2026, 23:59 UTC, after GitHub publication and two hosted CI runs. The application/submission baseline is `b058987`. A concurrent update `7f6d6fd` added a GitHub Pages website link, quick start and Cloudflare deploy script while this handoff was being written. Later documentation commits may follow. Use `git status` and `git log` to determine the current state.

## 1. What the user wants

Build and finish an ambitious, functioning hackathon product, prioritizing **real-time interaction**, then creativity and functionality. The event is the [Visko × Reactor × Nebius Live Models Hackathon](https://luma.com/gh4256ju). The selected product is **CUTLINE — The audience changes everything**: an audience directs an ongoing movie through votes and visible scene choices.

The user's accumulated requirements, still relevant:

- Deliver frontend and backend, polished cinematic UI, working controls, actual sponsor integrations, and meaningful verification. Work autonomously; do not repeatedly request permission for already authorized work.
- Use **Visko Orbis, Reactor, and Nebius** in the product. **Do not use Higgsfield.** The user supplied working Reactor and Nebius credentials privately; never repeat their values.
- Create an Interstellar/IMAX-inspired experience with restrained navy/black, warm amber, scale, camera movement, and cinematic framing. This describes an aesthetic, not an affiliation with those brands.
- The opening should be a **single continuous interactive movie-like view**, not ten still images played in sequence. Click our universe → cosmic web → Milky Way → solar system → Earth → San Francisco → theater → people deciding the next movie scene → movie responds.
- Prefer NASA/professional source imagery and realistic visual treatment. Avoid generic generated cosmic artwork masquerading as scientific observation. Be explicit where geometry, multiverse, or compressed scale is a visualization.
- Finish quickly; the user wants Claude to review/take over. Preserve working implementation rather than restart the project.
- Publish a detailed GitHub repository under **vnmoorthy**, with architecture diagrams, About text/topics, a sample product link, a strong repository image, source attribution, and a thorough README.
- Include an actual **10-slide PowerPoint**, upload it to GitHub, and provide a **three-minute presentation storyboard**.
- User aspired to win and attract millions of stars. Do not claim or guarantee competition outcomes, popularity, or commercial results.

### Organizer instructions adopted by the user

The user supplied a photo and explicitly said “do this.” It says to use [Visko-Platform/orbis-hackathon-starter](https://github.com/Visko-Platform/orbis-hackathon-starter), create/push a branch named `ProductName-TeamName`, and post on X with **@viskoai**. Reactor promo `REACTORXVISKO` was shown; no redemption was performed. A Nebius builder-program QR was also shown; joining it has not been done or needed for the working API integration.

The latest publishing steering was **“use github” twice**. There had previously been permission for a Sites public deployment, but no Sites deployment occurred. Keep GitHub as the chosen source/submission destination. Do not silently replace this with a private source-hosting service.

## 2. Current status — read before taking action

| Area | Verified state | Remaining limitation |
| --- | --- | --- |
| App | Implemented locally, built, linted, typechecked, and exercised with real providers | No verified public HTTPS backend |
| Cosmic experience | One continuous Three.js canvas with camera travel and selectable projected destinations | Cinematic visualization, not a literal photoreal video of every scale; final SF fill/fade adjustment needs visual signoff |
| Audience loop | Actual audience vote → frozen winner → Nebius plan → Orbis cue → later moving frames | Local observation; phones outside the laptop need a public backend |
| GitHub | [vnmoorthy/cutline](https://github.com/vnmoorthy/cutline), public official-starter fork | About homepage is a recorded example, not a live app |
| Static website | [GitHub Pages demo](https://vnmoorthy.github.io/cutline/) returned HTTP 200; Pages reports built from `gh-pages` | This pitch/recording website does not run the interactive Worker/D1 backend |
| Submission | Branch `Cutline-vnmoorthy`; [organizer PR #6](https://github.com/Visko-Platform/orbis-hackathon-starter/pull/6) is open | Account lacks direct upstream push permission; organizers must accept PR or grant access |
| CI | Both [34726286569](https://github.com/vnmoorthy/cutline/actions/runs/34726286569) and [34726670796](https://github.com/vnmoorthy/cutline/actions/runs/34726670796) failed in the same integration group | Repeated HTTP 503 Worker restart vs expected 413; do not claim CI green |
| Pitch | PPTX, PDF, source, image credits and 180-second storyboard committed | User still needs to rehearse presentation |
| X submission | Copy prepared, login requested | No post sent; no post URL exists yet |

## 3. Workspace, Git, and running app

- Local workspace: `/Users/moorthy/Downloads/Projects/viska` on macOS, zsh.
- Node `24.14.1` was used; package requirement is Node >=22.13.0. Use the lockfile.
- Current branch: `Cutline-vnmoorthy`, tracking `origin/Cutline-vnmoorthy`.
- `origin`: `https://github.com/vnmoorthy/cutline.git`.
- `upstream`: `https://github.com/Visko-Platform/orbis-hackathon-starter.git`.
- `gh` CLI is authenticated as **vnmoorthy**. A separate GitHub connector was authenticated to another account, so use the verified CLI identity for mutations.
- Application commit `75155d2`; final arrival/docs commit `5f3162d`; ancestry merge `b058987`.
- Concurrent commit `7f6d6fd` added `npm run deploy` / `scripts/deploy-cloudflare.sh` and README guidance. These additions were observed in the shared checkout, not implemented or deployed by the author of this handoff. Preserve them and review before use.
- The merge used the `ours` strategy with unrelated histories to retain the complete Cutline tree while making the official starter's `main` an ancestor. Upstream fetched SHA: `cbdc70c0ee286e8b7770575b14bb955655ce3139`.
- The **adapted starter code** is pinned to a different, earlier commit: `6de7ad733e90967f25979afcfca55b73a71f064a`. This distinction is intentional.
- GitHub default branch, About description, topics, and recorded-demo homepage are configured. No force pushes or upstream default-branch changes were made.
- At handoff, dev listens on `http://localhost:3000` and built Worker on `http://127.0.0.1:3001`. Recheck listeners before starting another process. Ports/processes are ephemeral.
- Existing working story: `http://localhost:3000/?story=BD2D771F` (also used on port 3001). Ownership depends on the existing browser cookie. Do not delete it or local D1 state.
- Production preview log: `/tmp/cutline-production-server.log`; final local build log: `/tmp/cutline-publish-build.txt`. Temporary logs may disappear; committed sanitized evidence is the durable source.
- No deliberate agent-created provider session was left running after the final live rehearsal. Check the UI before opening another paid session.

## 4. Architecture and key code

React 19 + TypeScript + Tailwind 4, using Vinext/Vite and a Cloudflare Worker with D1. This is a full-stack app, not a static GitHub Pages site. `.openai/hosting.json` declares D1 binding `DB`; no R2 dependency is needed for story storage.

```text
Host studio ── HTTP versioned mutations ──> Worker ──> D1
Audience phones ── ballots ───────────────> Worker ──> D1
Host and audience <── bounded SSE snapshots/presence ── D1

Host closes vote -> atomically freeze winner -> Nebius structured scene
                 -> save child beat + exactly three next choices
Host live hook -> creator-scoped Reactor JWT -> Visko Orbis video/audio
               -> send cue -> distinguish acknowledgement from later frames

Opening: local Three.js canvas -> continuous camera flight -> enter film
Audience watches the shared theater screen; phones carry ballots, not video.
```

| File | Responsibility |
| --- | --- |
| `components/cutline/studio.tsx` | Main studio, library, connections, cinematic opening, on-film choices, vote controls, branches, exports, keyboard and recording UI |
| `components/cutline/cosmic-flight.tsx` | Lazy-loaded single Three.js canvas, nested worlds, camera movement, projected destination buttons, renderer cleanup and fallback |
| `components/cutline/use-live-video.ts` | Reactor SDK, WASM load, session lifecycle, image/prompt readiness, tracks, pause/resume/reset, cue telemetry, 10-second MediaRecorder export |
| `components/cutline/use-story.ts` | Room loading, versioned mutations, SSE reconnect and stale-response protection; explicit rehearsal vs Nebius planning |
| `components/cutline/audience.tsx` | Audience voting companion, current choices/totals, connection state; no token or independent film stream |
| `app/api/bootstrap/route.ts` | Public configuration flags, never credential values |
| `app/api/stories/route.ts` | Creator-specific library and story creation |
| `app/api/stories/[id]/route.ts` | Owner/audience snapshots and owner-only deletion |
| `app/api/stories/[id]/action/route.ts` | Story actions, director, branch/memory/camera changes, atomic close/apply, cosmic progression and session flags |
| `app/api/stories/[id]/vote/route.ts` | One replaceable ballot per cookie identity, conditional on current valid open poll |
| `app/api/stories/[id]/events/route.ts` | Bounded SSE updates with reconnect |
| `app/api/stories/[id]/token/route.ts` | Owner-only Reactor token exchange |
| `app/api/stories/[id]/export/route.ts` | Owner-only Markdown and JSON exports |
| `lib/cutline/server.ts` | Identity, authorization, request validation, D1 access, limits and versioned state |
| `lib/cutline/director.ts` | Nebius adapter, continuity context and validated three-choice response |
| `lib/cutline/story.ts` / `types.ts` | Story graph/active ancestry and typed state |
| `lib/cutline/content.ts` / `references.ts` | Templates and media/source metadata |
| `lib/cutline/orbis/starter.ts` | Attributed adaptation of official `OrbisMessage` / `unwrapOrbisMessage` |
| `build/reactor-vite-plugin.ts` / `vite.config.ts` | Paired SDK JS/WASM copy and browser-safe import configuration |
| `db/schema.ts` / `drizzle/` | Stories, votes, presence and hourly counters |
| `app/globals.css` | Cinematic theme, film overlays, mobile behavior and reduced motion |

See [ARCHITECTURE.md](ARCHITECTURE.md) for larger diagrams and data flow. Read actual code before changing assumptions.

## 5. Cinematic implementation and important decisions

The previous still-image chapter sequence did not meet the user's request. It was replaced by `cosmic-flight.tsx`, loaded through React lazy/Suspense. The opening now uses a single canvas and log-scale world rebasing across nested geometry rather than swapping ten source frames.

Stages: multiverse bubbles → universe web → cosmic filaments → spiral Milky Way → Sun/planet orbits → NASA-textured Earth → original San Francisco aerial → modeled theater with audience silhouettes → live fictional film. Projected DOM targets are keyboard-accessible and move with the scene. Transitions take roughly four seconds with smooth easing; pointer parallax is subtle. Reduced motion shortens transitions. Resize, renderer disposal, event cleanup and a WebGL fallback exist.

The visible target labels are: “Enter this universe”, “Follow the cosmic web”, “Choose the Milky Way”, “Find our solar system”, “Travel to Earth”, “Find San Francisco”, “Enter the theater”, “Begin the live film”.

The last refinement enlarged the SF ground plane to 76×57 and fades it in around chapter 5.68–6; old dimensions made it look like a floating photo. Earth/SF retire before the theater to avoid occluding it. This final source change was built/typechecked/linted, but a fresh full-size visual check of that arrival and theater remains useful. Do not describe this geometry-based experience as physically accurate astronomical footage or assume it fully satisfies the user's realism standard without review.

On-film choices appear over moving video. During an open poll they vote; otherwise they send a new direction. They share action guards with sidebar controls. The most recent overlay behavior was integrated and statically checked; the final exact overlay click path has not received its own complete fresh browser walkthrough.

The fictional anchor is **Mara**, burnt-orange coat, brass compass, amber train doorway and teal-lit train. Custom stories remain prompt-only unless a fitting reference is provided. Opening replay pauses a connected Orbis session, keeps controls available, and preserves saved story/memory. Only the pristine cosmic template converts to the canonical train scene on entering the film; edited train/custom states must survive unchanged.

## 6. Sponsor integrations and private configuration

**Reactor / Visko:** server calls `POST https://api.reactor.inc/tokens`; creator browser receives a scoped JWT for one supported model and at most one session, with a 900-second maximum session authorization. Default `reactor/visko-orbis-dynamic`; Connections also offers `reactor/visko-orbis-stable`, which produced the final verified take. SDK `@reactor-team/js-sdk` version 3.0.2 is used. Main video/audio arrive through the SDK. A JWT is not a publishable API key or audience credential.

**Nebius:** `https://api.tokenfactory.nebius.com/v1/chat/completions`, default `openai/gpt-oss-120b`. The adapter uses continuity memory and the last five active-branch ancestors, asks for one visible change, and validates JSON with exactly three choices using Zod. Timeout is 25 seconds. An explicit failed Nebius request stays an error; it must not silently become “successful AI” rehearsal output.

Credentials are already in the ignored local `.env.local` at the project root, with restrictive file permissions. Do not display the file or copy it into the handoff, GitHub, browser logs, screenshots, or a prompt. Needed names only:

```dotenv
REACTOR_API_KEY=
NEBIUS_API_KEY=
LIVE_ACCESS_CODE=
REACTOR_MODEL=reactor/visko-orbis-dynamic
NEBIUS_MODEL=openai/gpt-oss-120b
SHARED_REACTOR_HOURLY_LIMIT=12
SHARED_NEBIUS_HOURLY_LIMIT=120
```

The presenter code is random and at least 16 characters. Shared requests fail closed when absent/short/wrong. Personal BYOK can instead be entered in Connections; values remain in current tab React memory, clear on refresh, and pass only to the named provider through the server. `.env.local` works with the local dev profile; the built preview/public host does not automatically inherit those secrets. Do not infer paid-service availability from bootstrap flags alone.

Shared request caps are atomic across browser identities (default 12 Reactor / 120 Nebius per hour); these are request caps, not monetary spending caps. Avoid repeated real-provider calls during automated tests. User authorized sponsor use for this product; no additional key request is needed just to continue local work.

## 7. Verified results and honest limits

Local automated results retained in `docs/testing`:

| Check | Result |
| --- | --- |
| `npm run build` | Passed after the final SF arrival source change |
| `npm run typecheck` | Passed after the final source changes |
| `npm run lint` | Zero errors / zero warnings after the final source changes |
| `npm test` | Six story unit tests passed |
| `npm run test:live-lifecycle` | Two mocked lifecycle cases passed: stale canceled error isolation and zero-frame chunk handling |
| `npm run test:integration` | Local: 210 assertions, 12 passing groups; hosted first run differs below |
| `npm run test:regressions` | 62 assertions, eight passing groups |
| `npm run test:cosmic` | 233 assertions, five passing groups; six fixtures removed |
| `npm run test:choices` | Three passing groups: open-poll guard, paused winner/resume-once, stale poll after a new scene |

These overlap; do not add counts into a unique coverage claim. HTTP tests create isolated cookies and disposable stories, request rehearsal planning and remove fixtures. They do not need real provider calls. They verify authorization, version races, voting closure, SSE reconnect, branch ancestry, exports and replay preservation. They do not establish load capacity or prove every UI control.

Real observations:

- `docs/testing/nebius-live.json`: one actual HTTP 200 in **3,630 ms**, valid three choices, Mara/coat/train/compass continuity, correct parent/version/persistence, fixture removed. Its visual status stayed draft, so this individual check proves planning only.
- `docs/testing/combined-live.json`: built app on port 3001, host opened poll, audience page chose “Open the last door”, host froze/applied winner, Nebius produced “Mara Opens the Amber Door” and three choices, Orbis accepted the cue, subsequent video arrived. **93 ms cue acknowledgement; 1,927 ms to later chunk; 18 fps observed.** Film visually showed Mara near an amber train doorway. Session ended cleanly.
- Other real Dynamic/Stable sessions observed, including Stable image conditioning and **2560×1440 delivered media**. This is delivery resolution, not a native-generation-resolution claim.
- Actual 10-second browser recording was inspected with ffprobe. `public/demo/cutline-live.mp4` is H.264/AAC, approximately 15.15 MB, 2560×1440, 18 fps; `cutline-live-poster.jpg` is an actual frame. The MP4 is a recording, not a remote live stream.
- Cosmic on-screen navigation was exercised through the sequence. The latest SF fill/fade and final overlay controls still deserve a targeted visual pass.

Timing samples are individual observations, not guarantees, averages, or semantic compliance scores. Audience validation used a separate tab; independent cookie isolation was separately covered by API tests. A live public two-device demo has not been verified.

### Repeated hosted CI failure to investigate first

[Run 34726286569](https://github.com/vnmoorthy/cutline/actions/runs/34726286569) completed with failure on the initial published app. Installation, build, typecheck, lint, unit and mocked lifecycle steps passed. During `test:integration`, the group “invalid input, cross-origin protection, stale versions” expected **HTTP 413** for an oversized action body but got **HTTP 503**:

> Your worker restarted mid-request. Please try sending the request again. Only GET or HEAD requests are retried automatically.

The remaining 11 groups passed (209 assertions reported). Later HTTP suites did not run because the workflow stopped after integration failure. The exact message comes from Wrangler's development proxy (`node_modules/wrangler/templates/startDevWorker/ProxyWorker.ts`), which emits it when a downstream failure coincides with a changed/cleared worker URL. Cutline's `body()` explicitly rejects more than 24,000 characters/bytes with 413; the failing fixture sends 24,001 spaces. Artifact `server.log` shows one interrupted request and subsequent success, without explaining the reconfiguration. Downloaded evidence is at `/tmp/cutline-ci34726286569-audit`.

The later [run 34726670796](https://github.com/vnmoorthy/cutline/actions/runs/34726670796) at commit `7f6d6fd` reproduced the same failure, again with 11 groups passing and 209 assertions. Application/request handling was unchanged between those runs. Treat this as a reproducible hosted-runtime issue until diagnosed, not a one-off startup transient. Do not weaken the assertion or retry state-changing requests blindly. Inspect the uploaded `test-evidence/server.log`, request-size guard and local Worker runtime. GitHub command: `gh run view 34726670796 --repo vnmoorthy/cutline --log-failed`.

Workflow: `.github/workflows/verify.yml`, Node 24, fresh local D1, built Worker on port 3000, no sponsor secrets, artifacts retained for 14 days. Any subsequent fix must be followed through to a verified new run.

## 8. State and security invariants to preserve

- Creator ownership is a random HttpOnly SameSite=Lax cookie; database stores its SHA-256 identity. Audience cannot direct, mint tokens, export or delete another creator's story.
- Room links are unlisted invitations and expose story content. One cookie is one ballot identity, not a verified human. Do not promise private-document ACLs or anti-Sybil voting.
- Open voting blocks manual direction on client and server. Votes match current scene/poll and valid choices. Replacement does not add a second ballot.
- Poll close atomically freezes winner and tallies with a version check. No-vote closure has no winner. Ties use visible choice order. A frozen winner applies once.
- A paused live session cannot apply a winner; keep it frozen until resume. A closed poll from an older scene cannot apply after unrelated direction.
- Story writes use optimistic version checks. Late responses cannot overwrite a newer selected room.
- Director context follows parent ancestry, excluding abandoned futures. Branching regenerates from text rather than rewinding exact live model state.
- Cosmic replay preserves edits; it must not reset memory or force a train image into custom stories.
- Cue “acknowledged” and “observed” are different; model acceptance is not proof of the intended pixels.
- End/cancel must release media tracks, callbacks, timers, recording and GPU resources; a stale callback cannot terminate a newer session.
- Local D1 and env files are not disposable build outputs. Do not clear them while troubleshooting.

## 9. Local commands and reproduction

From the existing checkout, inspect `git status`, listeners and current configuration without printing secrets. Dependencies and the local database already exist. **Do not apply the initial SQL migration again to the existing database.**

```sh
# Existing dev profile, only if its port is free:
npm run dev -- --port 3000

# Built preview, only if its port is free:
npm run build
npm start -- --port 3001

# Static/unit checks:
npm run typecheck
npm run lint
npm test
npm run test:live-lifecycle

# Against an already running local preview; no sponsor credits:
CUTLINE_TEST_BASE=http://127.0.0.1:3001 npm run test:integration
CUTLINE_TEST_BASE=http://127.0.0.1:3001 npm run test:regressions
CUTLINE_TEST_BASE=http://127.0.0.1:3001 npm run test:cosmic
CUTLINE_TEST_BASE=http://127.0.0.1:3001 npm run test:choices
```

For a **fresh clone only**, see [docs/SETUP.md](docs/SETUP.md): locked install → build → apply `drizzle/0000_magical_sway.sql` once to fresh local D1 → run preview. `.wrangler/state` persists stories. Use separate browser profiles/private windows for independent audience identities. A phone's localhost is the phone, not the presenter laptop.

## 10. Presentation, media and rights

- [PowerPoint: exactly 10 slides](presentation/CUTLINE-3-minute-pitch.pptx).
- [Rendered PDF: 10 pages](presentation/CUTLINE-3-minute-pitch.pdf).
- [Canonical storyboard](presentation/STORYBOARD.md): timed slots total **180 seconds**, approximately **390 spoken words**.
- [Preview](presentation/preview.webp), [sources](presentation/SOURCES.md), editable build and assets in `presentation/source/`.
- Deck was regenerated for the continuous canvas and combined live results, rendered and visually reviewed. Do not describe it as still pending generation.
- Slide 3 explains the continuous canvas; its agency reference images are clearly references, not app screenshots. Slide 9 uses the single observed 93/1,927 ms sample.
- Repository banner and original fictional train/multiverse concept art are included. No Higgsfield was used.
- NASA images retain source classifications: observation, simulation or artist concept. Earth sphere uses original equirectangular NASA imagery from [SVS 3615](https://svs.gsfc.nasa.gov/3615), documented in `docs/provenance/EARTH-TEXTURE.md`. SF is original aerial imagery. Multiverse and theater geometry are cinematic interpretation.
- Archival theater and other agency references have individual provenance; do not claim NASA/sponsor endorsement.
- The starter commit has no declared license. Preserve attribution in `docs/STARTER.md` and helper comments. Root `LICENSE` scopes original Cutline contributions and excludes starter material, dependencies and media; do not blanket-relicense the entire repository MIT.

## 11. Publishing and exact remaining external actions

**Already done:** public fork, branch push, About/topics/homepage configuration, deck/source/media upload, organizer PR #6. PR title: “Hackathon submission: Cutline — audience-directed live cinema”. The fork branch includes official history; no direct upstream push was possible with current permissions.

**X:** user authorized the organizer submission steps. An X composer was opened but redirected to login. The user has been asked to sign in and say when ready. No credentials were entered and no post was submitted. Check current browser state before acting; do not assume the login finished. Once signed in, verify account identity, use the prepared copy below, submit and record the actual post permalink. Do not claim posting merely from opening a composer.

```text
We built CUTLINE: the audience directs a live movie. Explore a clickable cosmos, vote on what happens next, and steer Visko Orbis through Reactor + Nebius. @viskoai

https://github.com/vnmoorthy/cutline/tree/Cutline-vnmoorthy
```

**Public app:** GitHub now hosts source/artifacts plus a static [Pages demo website](https://vnmoorthy.github.io/cutline/) on `gh-pages`; the URL returned HTTP 200 and the Pages API reported `built`. A Worker/D1 deployment, production migration and secret provisioning are still needed for audience phones. No public interactive-backend URL is verified. Do not relabel the static site or recorded demo as the full deployed product.

**New deployment helper to review:** `scripts/deploy-cloudflare.sh` creates/looks up D1, rewrites the built Worker config, executes the initial remote SQL, deploys, and uploads values from `.env.local` as secrets. It has not been executed or validated in this handoff. Its migration step currently suppresses *all* SQL failures and continues with “schema already applied (or partially)”; do not assume that establishes a valid production schema. Review that handling and the secret/config path before using the helper on a real account. `npm run deploy` changes external infrastructure and copies private secrets to the chosen Cloudflare account; verify the account/destination first.

**Historical Sites setup:** local metadata references project `appgprj_6aa5c88bae808191b9a23dd13f921256`, slug `cutline-live-vnmoorthy`. It was registered owner-private at version 0 with no source push/deploy. An earlier automatic approval review rejected source transfer to the Sites Git host because only GitHub had then been authorized. User subsequently permitted Sites, then explicitly steered to GitHub. Do not reuse expired tool tokens or assume an old deployment exists. Keep the existing scaffold while deciding any future hosting flow from the user's current instructions.

## 12. Suggested takeover order

1. Read current code/status and this handoff. Keep the user's existing work and private runtime state.
2. Diagnose/fix the single hosted CI failure with a bounded change and verify the next GitHub run.
3. Visually review the final SF/theater arrival and click the actual on-video choices, including pause/resume and open-vote behavior. Focus on the user's continuous realistic movie requirement.
4. Resolve a public HTTPS Worker/D1 deployment if the user still wants phones to join remotely; use GitHub as the source, verify the URL and real two-device loop before publishing a live-link claim.
5. Complete X submission after the user's sign-in; retain PR and post URLs accurately. Organizers must accept the fork PR if direct repository branch placement is mandatory.
6. Keep docs/deck consistent with verified behavior. Report concrete remaining limitations instead of announcing everything complete.

### Prompt the user can paste into Claude

> Continue Cutline in `/Users/moorthy/Downloads/Projects/viska`. Read `CLAUDE-HANDOFF.md` first and `CLAUDE-REVIEW.md` for the review checklist. Preserve the existing product and use the verified vnmoorthy GitHub repository/branch. Prioritize the documented CI failure, continuous cinematic interaction and remaining submission/deployment steps. API credentials are already in the ignored local environment; do not print or commit them. Distinguish observed live results from unverified claims and do not rebuild from scratch.
