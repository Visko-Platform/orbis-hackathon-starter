# Claude handoff: final review of Cutline

Review the final integrated product, identify material failures, and help the lead finish the release quickly. Prioritize reproducible functional/security issues and mismatches between the demo and the code. Avoid broad rewrites or repeating unchanged checks. This is a review handoff, not a claim that the release is complete.

**Workspace:** `/Users/moorthy/Downloads/Projects/viska`  
**Product:** Cutline — live audience-directed cinema for the Visko × Reactor × Nebius Live Models Hackathon.  
**Requested GitHub owner:** `vnmoorthy`. Repository creation and private preview publication remain pending.  
**Handoff basis:** source/evidence inspected on 12 September 2026, including reports through 23:22 UTC. Active agents are changing the opening and film controls; inspect the current files before relying on line numbers or screenshots.

## Current work that must land before final sign-off

1. **Continuous interactive cosmic flight:** a Three.js renderer is being built to replace the previous sequence of NASA photographs with CSS camera motion. `three` and `@types/three` are in `package.json`; the renderer was not yet present under `components/cutline` at the last handoff read. Judge the new implementation, not the old chapter UI. Preserve source attribution and label interpretive/procedural visuals honestly; do not call the flight a physically exact scientific simulation.
2. **Choices on the film:** the lead is integrating selectable choices on the live-video surface. Confirm these use real story/voting/direction handlers and remain synchronized with the sidebar and audience state. They were not present in the last inspected stage markup.
3. **Combined sponsor rehearsal:** real Orbis video and a real Nebius completion have each passed separately. One complete audience vote → frozen winner → Nebius scene → Orbis prompt → observed film response remains pending.
4. **Private publication and GitHub:** publish through the intended hosting flow, validate access and room participation, then create the authorized repository under `vnmoorthy`. Do not invent URLs or interpret a local build as a deployment. A private deployment may impose sign-in/access requirements beyond an unlisted room link; test the intended audience's actual access.
5. **Presentation and docs:** ten-slide PPTX/PDF and a three-minute storyboard exist. The presentation agent is updating them. The README and slide-three narration still describe the old source-image chapter sequence at this handoff; reconcile them after the new flight lands.

## Architecture and key files

The creator browser controls one Reactor/Orbis media session. The server owns durable story state, permissions, voting, and Nebius planning. Audience phones receive room state and ballots through HTTP/SSE and watch the shared theater screen; they do not receive independent video or a Reactor JWT.

```text
Audience phone → vote API → Cloudflare D1 → SSE snapshots → all room clients
Creator closes poll → atomic frozen winner → Nebius plan → saved child scene
Creator live hook → scoped Reactor session → Visko Orbis → shared video/audio
```

| File / directory                                                  | What to review                                                                                              |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `components/cutline/studio.tsx`                                   | Opening/film state, on-video choices, action guards, modal/keyboard controls, recordings                    |
| New Three.js flight component                                     | Discover its actual path after integration; renderer lifecycle, inputs, transition to film                  |
| `components/cutline/use-live-video.ts`                            | Session creation, readiness gates, cancellation, media tracks, cue trace, pause/reset, ten-second recording |
| `components/cutline/use-story.ts`                                 | Versioned mutations, active story selection, SSE reconnect, late-response protection                        |
| `components/cutline/audience.tsx`                                 | Phone voting, current poll scene, connected state, safe room-only access                                    |
| `app/api/stories/[id]/action/route.ts`                            | Atomic close/apply, branch changes, cosmic presentation transition, memory preservation                     |
| `app/api/stories/[id]/vote/route.ts`                              | Conditional vote upsert; current story phase/open poll/valid choice checks                                  |
| `app/api/stories/[id]/{token,events,export}/route.ts`             | Owner-only session credentials/exports; bounded SSE lifecycle                                               |
| `lib/cutline/{server,director,story,types,content,references}.ts` | Identity, budgets, structured director, ancestry, templates, source metadata                                |
| `db/schema.ts`, `drizzle/`                                        | Stories, votes, presence, hourly counters, initial migration                                                |
| `build/reactor-vite-plugin.ts`, `vite.config.ts`                  | Runtime WASM import/copying and built Worker configuration                                                  |
| `README.md`, `ARCHITECTURE.md`, `docs/`                           | Accurate feature promises, setup, verification, sponsor/source notices                                      |
| `presentation/STORYBOARD.md`                                      | Sole timed speaker script; `docs/DEMO-RUNBOOK.md` should link it                                            |
| `.github/workflows/verify.yml`                                    | Local built-Worker CI with D1, tests, no sponsor secrets                                                    |

Runtime: React 19 / TypeScript / Tailwind 4 / Vinext + Vite / Cloudflare Worker + D1. `.openai/hosting.json` declares `DB`; there is no R2 dependency for story storage. Follow the existing Sites project workflow when editing/building/publishing; do not reinitialize or replace its scaffold.

## Verified checks and their limits

| Check                  | Recorded evidence                                                                                                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API integration        | **210 assertions, 12 groups, zero failures**, completed 23:20:58 UTC; `docs/testing/api-results.json`                                                                                          |
| Additional regressions | **62 assertions, eight groups, zero failures**, completed 23:19:04 UTC; `docs/testing/regressions.json`                                                                                        |
| Replay preservation    | **233 assertions, five groups, zero failures**, completed 23:22:19 UTC; six fixtures removed; `docs/testing/cosmic-preservation.json`                                                          |
| Story unit tests       | Six passed; `tests/story.test.ts`                                                                                                                                                              |
| Mock live lifecycle    | Old canceled failure did not kill a new session; zero-frame chunk did not count as observed media; `docs/testing/live-lifecycle.json`                                                          |
| Lint/build             | Lead reported zero lint errors/warnings and a production build pass before the new flight/overlay changes                                                                                      |
| Real Nebius            | One HTTP200 request to `openai/gpt-oss-120b` in **3,630 ms**; three valid choices, character/coat/train/compass retention, correct parent/version/persistence; `docs/testing/nebius-live.json` |
| Real Orbis             | Dynamic/Stable media observed; Stable image conditioning and **2560×1440 delivery at 18 fps**; recorded example in `public/demo/`                                                              |
| Actual recording       | Browser WebM inspected with ffprobe; converted MP4 and real-frame poster retained                                                                                                              |

The Nebius verification saved `visualStatus: draft`: it proves planning/persistence, not that the same planned scene was rendered. Cue timing observations (1,642/3,464 ms and a later audience cue 419/2,317 ms) separate command acknowledgement and later chunk arrival. They are not latency benchmarks or proof of semantic visual compliance. Delivery resolution is not native generation resolution. The new Three.js/overlay changes are not covered by earlier UI/build results.

Run relevant checks after the final integration:

```sh
npm run typecheck
npm run lint
npm test
npm run test:live-lifecycle
CUTLINE_TEST_BASE=http://localhost:3000 npm run test:integration
CUTLINE_TEST_BASE=http://localhost:3000 npm run test:regressions
CUTLINE_TEST_BASE=http://localhost:3000 npm run test:cosmic
npm run build
```

HTTP suites need the existing local preview. They create isolated cookie sessions, force rehearsal planning, and remove fixtures. They do not need real provider credentials. Do not run real sponsor calls through the test suite or start a competing preview process. New real-media validation belongs in a deliberate live rehearsal.

## Security and state invariants

- `cutline_session` is a random 32-byte HttpOnly, SameSite=Lax cookie; HTTPS adds Secure. The database stores its SHA-256 identity, not the bearer cookie.
- Only a story owner can direct, mint a Reactor token, export, or delete. Spectators can read an invited room and vote. Ownership must be checked on the server, including any new overlay route.
- BYOK values live in the tab's React state, pass through the server to the named provider, and are not saved in D1/localStorage/story exports. Never log or include `.env` values, JWTs, or cookies in the handoff, repo, screenshots, or review output.
- Shared keys require a presenter code of at least 16 characters. Atomic shared-provider hourly caps complement per-cookie counters. Provider keys stay server-side; only the scoped session JWT reaches the creator.
- A vote is conditional on the matching current open poll, story phase, and valid choice. Unique `(story,poll,voter)` replaces a ballot; late votes fail.
- Poll closure freezes tallies/winner/open=false in one version-checked SQL statement. No-vote polls have no winner; ties use visible choice order; the winner applies once.
- Ordinary story writes compare versions. Do not let a late action switch the user's selected room or overwrite newer state.
- Branch context follows parent IDs, not insertion order. Alternate futures stay saved but are excluded from the active director context.
- Cosmic replay must preserve custom/last-train prompts, choices, and edited memory. Only the original unconverted cosmic template becomes the canonical train beat; memory is never overwritten by replay.
- Timers, frame callbacks, media sessions, listeners, and the Three.js renderer must be cleaned up. A stale callback cannot update or disconnect a newer session.

## Focused final review questions

1. Does the new flight feel continuous and respond to its advertised mouse/touch/keyboard controls? Do chapter jumps, pause, replay, resize, reduced-motion, and loss of WebGL have usable behavior? Are GPU resources and animation frames released on unmount?
2. Does flight progress update durable room state only at meaningful boundaries, rather than writing D1 every frame? Is entering/exiting the film deterministic, including while Orbis is paused, priming, disconnected, or recording?
3. Do on-video choices use the same current scene/poll IDs as the audience/sidebar? Are closed/stale choices blocked, duplicate clicks bounded, and keyboard handlers guarded inside the action functions? Do overlay hit targets preserve video controls and work on a phone?
4. Can a real audience vote produce one saved Nebius beat and one acknowledged Orbis direction, with actual subsequent video inspected? Does provider failure preserve the winner and give a usable retry?
5. Do custom stories stay prompt-only unless an appropriate reference exists? Do replay and branch actions preserve edited memory and avoid forcing unrelated train/multiverse imagery?
6. Can the presenter end the session from every relevant state, cancel recording, and recover after capacity/disconnection errors without hidden generation continuing behind the flight?
7. Do the final README, deck, narration, provenance, and About description match the new flight/overlay behavior and actual verification? Are private publication and GitHub URLs real and tested before they are linked?

## Known scope and rights

There is no account recovery, cross-device creator library, or verified-person voting. Room links are unlisted invitations, not private-document ACLs; they reveal story content. Audience phones do not relay video. Branching regenerates from saved prompts rather than rewinding exact video state. JSON includes current poll state; exports are not a full historical ballot ledger. Large-audience capacity has not been load-tested.

The official starter is pinned to **`6de7ad733e90967f25979afcfca55b73a71f064a`** at `Visko-Platform/orbis-hackathon-starter`. `lib/cutline/orbis/starter.ts` adapts `OrbisMessage` and `unwrapOrbisMessage`; the live hook adapts readiness patterns. That commit has no declared license. Preserve `docs/STARTER.md` exactly and do not describe all repository content as MIT. The root LICENSE covers original Cutline contributions and excludes starter material, third-party scaffold/dependencies, and media. NASA/theater assets retain individual provenance; sponsor endorsement is not implied.

Return a short prioritized list of actual blockers with file references, reproduction steps, and bounded fixes. Separate verified failures from review questions and remaining external steps. Do not announce publication, repository creation, hosted CI success, or combined provider success until those actions/results exist.

Latest verified update: combined audience vote → Nebius scene/three choices → Orbis command/next chunk passed in the local production build. See `docs/testing/combined-live.json`. The sample was 93 ms provider acknowledgement and 1,927 ms to the next movie chunk, with 18 fps observed. The host ended the session cleanly.
