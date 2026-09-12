# Hackathon submission and repository handoff

Cutline targets the [Live Models Hackathon hosted by Visko × Reactor × Nebius](https://luma.com/gh4256ju). It has a working local product, real sponsor verification, automated application checks, a recorded live example, and a ten-slide presentation undergoing its final update. Public deployment and repository creation remain pending.

The reviewed public event material does not provide a complete weighted scoring rubric. Demonstrate the audience-to-live-film loop, identify each sponsor's responsibility, and support technical claims with the actual evidence.

## Submission destinations

From the participant’s photograph: prepare a branch named `ProductName-TeamName`, push it to the organizer repository, and post the submission on X mentioning `@viskoai`. Cutline’s proposed branch is `Cutline-vnmoorthy`; substitute the actual team name if different. Organizer repository write access is required. The X post is a draft until the participant explicitly authorizes publication.

The participant separately requested a repository under `vnmoorthy`. That repository does not substitute for the organizer branch. Confirm the exact organizer destination and access from the supplied instructions; do not infer a write destination from the public starter link.

## Current deliverables

| Deliverable | Status / location |
| --- | --- |
| Local product | Creator studio, source opening, live film, audience voting, branching, and export implemented |
| Sponsor checks | Real Orbis media and Nebius structured planning verified; final combined rehearsal in progress |
| Automated checks | API, regression, replay-preservation, unit, and mocked lifecycle evidence in [VERIFICATION.md](VERIFICATION.md) |
| Production build and lint | Local build passed; latest lint had zero errors and warnings |
| Recorded example | [MP4 from an actual live session](../public/demo/cutline-live.mp4), with real-frame poster |
| Documentation | README, architecture, setup, contribution guidance, sponsor notes, and provenance |
| Ten-slide deck | [PowerPoint](../presentation/CUTLINE-3-minute-pitch.pptx), [PDF](../presentation/CUTLINE-3-minute-pitch.pdf); final updated render review pending |
| Three-minute narration | [Canonical storyboard](../presentation/STORYBOARD.md) |
| CI | [Verify workflow](../.github/workflows/verify.yml) added; hosted run pending repository publication |
| Public product URL | Pending deployment and cross-device verification |
| `vnmoorthy` repository and About metadata | Pending creation |
| Organizer branch and X post | Pending destination/access and explicit posting authorization |

## GitHub presentation

Proposed repository: `cutline` under `vnmoorthy`, subject to availability. No fabricated repository or deployment link should be published.

**About description**

> Live audience-directed cinema with Visko Orbis, Reactor, and Nebius. Vote, steer the running film, preserve story branches, and export the result.

**Website field:** the actual tested public HTTPS product URL. Leave it unset until that URL exists.

**Topics:** `realtime-video`, `interactive-storytelling`, `generative-video`, `visko`, `orbis`, `reactor`, `nebius`, `typescript`, `react`, `cloudflare-workers`, `cloudflare-d1`, `hackathon`.

Use the real Cutline banner and source gallery in the README. Link the verified deck, storyboard, demo recording, and test evidence. Do not add fabricated stars, downloads, customers, revenue, awards, or uptime badges.

## Final publication checks

- [ ] Final combined audience → Nebius → Orbis rehearsal is complete and its observations recorded accurately.
- [ ] The final source-opening controls, mobile layout, story replay, exports, and session cleanup pass UI review.
- [ ] Final tests/build pass for the release commit; retained reports match their claimed run.
- [ ] Public deployment uses the intended D1 binding and migration, and a second device can join a fresh room.
- [ ] Secrets, scoped JWTs, browser cookies, local runtime state, and private fixtures are excluded from source and media.
- [ ] README, About, QR, deck, and submission use the real verified URLs.
- [ ] The updated PowerPoint has ten slides, renders cleanly, and matches the canonical three-minute storyboard.
- [ ] The original starter attribution remains pinned to `6de7ad733e90967f25979afcfca55b73a71f064a`; the scoped license does not relicense its unlicensed material or third-party assets.
- [ ] The organizer branch uses the actual team name and known authorized destination.
- [ ] GitHub Actions runs successfully after repository creation.
- [ ] Social copy is approved as a concrete draft before publication.

## X post — draft only

> We built Cutline: a live film where the audience votes on what happens next. Visko Orbis generates the scene, Reactor carries live commands, and Nebius plans the next beat. Built for the Live Models Hackathon. @viskoai
>
> Try: [insert verified product URL]
> Code: [insert actual repository URL]

Replace both placeholders and check the final character count. Label attached recordings as recorded footage. This document has not published a post or completed an organizer submission.
