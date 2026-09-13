# Verification record

Cutline has local application tests and a verified combined audience → Nebius → Orbis rehearsal. Public deployment remains unverified. This page records what each result actually establishes.

## Application checks

| Check                      | Latest recorded result                                                                                      | Evidence / entrypoint                                                          |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| API integration            | 210 assertions across 12 passing groups; fresh cookie sessions and fixture cleanup                          | [Retained API report](testing/api-results.json), `npm run test:integration`    |
| SSE recovery               | Updates across a stream lasting more than 25 seconds; reconnect recovered current state                     | [SSE report](testing/sse-evidence.json)                                        |
| Additional regressions     | 62 assertions across eight passing groups; no sponsor calls                                                 | [Regression report](testing/regressions.json), `npm run test:regressions`      |
| Cosmic replay preservation | 233 assertions across five passing groups; six fixtures removed; no sponsor calls                           | [Replay report](testing/cosmic-preservation.json), `npm run test:cosmic`       |
| Story logic                | Six passing unit tests                                                                                      | `npm test`                                                                     |
| Mocked live lifecycle      | Stale connection failure did not kill a newer session; a zero-frame chunk did not count as visible progress | [Lifecycle report](testing/live-lifecycle.json), `npm run test:live-lifecycle` |
| Lint                       | Zero errors and zero warnings in the latest local run                                                       | `npm run lint`                                                                 |
| Production build / types   | Passed locally after final Three.js, on-video choices and SF arrival changes | `npm run build`, `npm run typecheck` |
| Choice regressions         | Three passing groups, no provider calls | [Choice report](testing/choice-regressions.json), `npm run test:choices` |
| GitHub Actions             | Two runs failed at the oversized-input test: Worker proxy HTTP 503 instead of 413; 11 other groups passed in each | [Latest checked run 34726670796](https://github.com/vnmoorthy/cutline/actions/runs/34726670796) |

The reports are dated local observations. The retained API and voting reports reflect the successful final rerun after the pause, stale-poll, and manual-direction fixes. Do not aggregate these assertion counts into unique coverage, performance, or load-testing claims.

The API suite checks owner isolation, audience permissions, input boundaries, vote replacement, atomic closure, deterministic ties, empty ballots, concurrent updates, active-branch context, exports, event recovery, and deletion. The replay suite specifically checks that edited last-train prompts and memory survive the cosmic opening, that custom premises and choices remain intact, and that the initial cosmic template converts into the train film without discarding edited memory.

## Real Nebius planning

On **12 September 2026 at 23:16:45 UTC**, an authorized request through the local Cutline action endpoint called Nebius Token Factory with `openai/gpt-oss-120b`. It returned HTTP 200 in **3,630 ms**, created a beat tagged `nebius`, and produced exactly three validated choices. The fixture was removed after verification. [Full sanitized evidence](testing/nebius-live.json)

The requested action opened the train door while Mara continued holding a brass compass. The returned prompt retained Mara, her burnt-orange coat, the train, and the compass. Checks confirmed unchanged continuity memory, the previous scene as parent, one additional scene/version, and persistence across a fresh read.

The result remained `visualStatus: draft`, correctly distinguishing a successful text plan from rendered video. This request verifies the live Nebius adapter and persistence path. It does not by itself verify that Orbis rendered that same planned action. The 3,630 ms observation is one local action round trip, not a provider latency benchmark.

## Real Reactor and Orbis media

Real Dynamic and Stable sessions have delivered live media. An observed Stable session confirmed image conditioning and **2560 × 1440 delivery at 18 fps**. Delivery resolution is not native model-generation resolution.

Two individual cue observations were recorded during local work:

| Observation                                  | Command acknowledgement | Later chunk event  |
| -------------------------------------------- | ----------------------- | ------------------ |
| Earlier live cue                             | 1,642 ms                | 3,464 ms from send |
| Audience chose “Follow the flickering light” | 419 ms                  | 2,317 ms from send |

In the audience test, the creator closed the vote and applied the saved winner to the running session. These are individual event observations, not averages, percentiles, guarantees, or proof of exact semantic compliance. The resulting picture must still be inspected.

The browser recorded a **1,706,448-byte WebM** containing VP9 video and Opus audio; `ffprobe` independently inspected the recording. A compatible [recorded MP4 example](../public/demo/cutline-live.mp4) and [real-frame poster](../public/demo/cutline-live-poster.jpg) are included. This is recorded footage from a real session, not a live remote stream. The observed session ended cleanly.

During an exploratory Stable test, a generated Earth reference visibly distorted after approximately 40 seconds. The shipped design therefore preserves original science imagery in the cosmic opening and uses Orbis for the fictional film. The source sequence is editorial and does not claim a physically exact astronomical flight.

## Reproduce local checks

```sh
npm run typecheck
npm run lint
npm test
npm run test:live-lifecycle
CUTLINE_TEST_BASE=http://localhost:3000 npm run test:integration
CUTLINE_TEST_BASE=http://localhost:3000 npm run test:regressions
CUTLINE_TEST_BASE=http://localhost:3000 npm run test:cosmic
CUTLINE_TEST_BASE=http://localhost:3000 npm run test:choices
npm run build
```

HTTP suites require a running local preview and create isolated test stories. They explicitly use rehearsal planning and reject real Nebius planning. Shared Nebius configuration no longer makes those rehearsal actions unsafe: the integration harness forces the planning mode. Tests never send live credentials to providers. The token-denial checks use unauthorized or uncredentialed requests; they do not start sessions.

GitHub Actions provisions a fresh local D1 database, starts the built Worker, runs the tests, and retains `test-results` artifacts. It receives no sponsor secrets. A checked-in workflow is not evidence of a successful hosted run.

## Release status

| Item                                                       | State                                             |
| ---------------------------------------------------------- | ------------------------------------------------- |
| Application baseline and retained reports                  | Published at `b058987`; reports in `docs/testing` |
| Combined Nebius → Orbis audience rehearsal                 | Passed locally; evidence below |
| Final flight arrival, overlay controls and mobile layout   | Targeted final visual review remains |
| Ten-slide PowerPoint regeneration and render review        | Complete; PPTX, PDF, source and 180-second storyboard committed |
| Public HTTPS product and second-device check               | Pending deployment                                |
| Public GitHub repository, About URL, and topics            | [Published](https://github.com/vnmoorthy/cutline); homepage links recorded demo |
| GitHub Actions hosted run                                  | Two runs failed at the same request; details in [handoff](../CLAUDE-HANDOFF.md) |
| Static GitHub Pages website                                | HTTP 200 and Pages `built`; full Worker/D1 backend remains separate |
| Organizer `ProductName-TeamName` branch                    | `Cutline-vnmoorthy` pushed to fork; [PR #6](https://github.com/Visko-Platform/orbis-hackathon-starter/pull/6) open; upstream write unavailable |
| X announcement                                             | Prepared copy; pending user sign-in; no post sent |

Before publishing, verify a fresh room on the actual public URL: join from another device, vote, close, apply, inspect live frames, branch, export, and end the session. Retain the final evidence without provider keys, JWTs, or browser cookies.

## Scope limits

- Creator ownership belongs to a browser cookie; there is no account recovery or cross-device creator library.
- Room links expose story content and permit voting. One cookie is one ballot identity, not a verified person.
- Audience phones receive story/voting state, not a Reactor JWT or independent video stream.
- Branches preserve written story history; continuing one regenerates video rather than rewinding exact model state.
- Cosmic source images and generated fictional scenes are labeled separately.
- JSON includes current poll state; Markdown is a scene treatment. Neither is a complete ledger of every historical ballot round.
- SSE polling and provider behavior have been tested locally, not certified for a large production audience.

## Final live application rehearsal

The built app passed a complete audience vote → Nebius plan → Orbis live cue on 2026-09-12. The generated beat was marked `nebius`, three new choices appeared, and Orbis acknowledged the instruction in 93 ms; the next movie chunk arrived at 1,927 ms. The film was visually inspected and the session ended cleanly. These are individual observations, not latency or semantic guarantees. [Evidence](testing/combined-live.json).

The updated interactive opening uses one Three.js canvas with continuously animated camera travel and projected selectable destinations. Earth uses an original NASA equirectangular texture. Cosmic scales, the multiverse and theater geometry are cinematic visualization; San Francisco uses original aerial imagery. This replaces the previous sequence of still-source chapters. API integration, vote safety and replay preservation remain separately verified.
