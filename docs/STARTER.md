# Official Orbis starter integration

Cutline incorporates code and lifecycle patterns from [Visko’s official hackathon starter](https://github.com/Visko-Platform/orbis-hackathon-starter), pinned to commit `6de7ad733e90967f25979afcfca55b73a71f064a`.

`lib/cutline/orbis/starter.ts` adapts the starter’s `OrbisMessage` type and `unwrapOrbisMessage` implementation. The live player calls this helper for every model message. The startup flow in `components/cutline/use-live-video.ts` adapts the starter’s readiness sequence: image upload → confirmed `image_accepted` → prompt → `conditions_ready` → start → verified image conditioning.

Cutline adds bounded event waits, cancellation, reference framing, audience voting, story persistence, and Dynamic live steering. The starter uses Stable; Cutline defaults to Dynamic. Its optional Google image-generation example is omitted: the product AI integrations are Visko, Reactor, and Nebius.

The upstream starter did not declare a license at this commit. Its adapted code is attributed separately and is not represented as Cutline-authored or relicensed under Cutline’s license.

## Organizer’s submission instructions

From the participant’s photograph: prepare a branch named `ProductName-TeamName`, push it to the organizer repository, and post the submission on X mentioning `@viskoai`. Cutline’s proposed branch is `Cutline-vnmoorthy`; substitute the actual team name if different. Organizer repository write access is required. The X post is a draft until the participant explicitly authorizes publication.
