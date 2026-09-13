# Sponsor integrations

Cutline was built for the [Live Models Hackathon hosted by Visko × Reactor × Nebius](https://luma.com/gh4256ju). Each sponsor has a concrete role: Visko generates the fictional world, Reactor supplies live sessions and transport, and Nebius plans coherent next scenes.

## Visko Orbis: live fiction

The default model is `reactor/visko-orbis-dynamic`. Connections also offers `reactor/visko-orbis-stable`, the model used by the official starter. The creator controls an ongoing session through prompts, optional image conditioning, generation start/reset, and pause/resume. Directions favor one visible change, one continuing subject, and a stable setting.

The cosmic opening uses one interactive Three.js canvas with continuous camera travel, projected destination buttons, an original NASA Earth texture and San Francisco aerial imagery. Multiverse, galaxy and theater geometry and compressed scales are cinematic interpretation. Agency/reference images retain their classifications and credits. A connected model is paused during the opening. Entering the fictional train film starts an anchored live take; custom stories can start from their own prompt without an unrelated forced reference. The opening is not generated scientific footage or an exact physical zoom.

Primary references: [Dynamic overview](https://docs.reactor.inc/model-api-reference/visko-orbis-dynamic/overview), [schema](https://docs.reactor.inc/model-api-reference/visko-orbis-dynamic/schema), [prompt guide](https://docs.reactor.inc/model-api-reference/visko-orbis-dynamic/prompt-guide).

## Reactor: authorized sessions and media

The creator-only token endpoint calls `POST https://api.reactor.inc/tokens` with the server's `Reactor-API-Key` header. It requests one supported model, at most one session, and a maximum session duration of 900 seconds. The scoped JWT goes to the creator browser, where `@reactor-team/js-sdk` receives `main_video` and `main_audio` tracks.

The live hook distinguishes connection, priming, playback, pause, disconnection, and error states. Its readiness gates verify image acceptance when a reference is supplied, conditions readiness, generation start, and arriving frames. A build plugin preserves the SDK's paired JavaScript/WASM runtime assets. Command acknowledgements and subsequent chunk events are displayed separately from the actual video.

Spectators receive synchronized room state and votes; they watch the presenter's shared screen. They receive no session credential. The video export records the next ten seconds of player media with `MediaRecorder`, with a visible countdown and cancellation. It does not retrieve an earlier provider clip.

Real Dynamic and Stable media have been observed. A Stable session delivered 2560 × 1440 at 18 fps with image conditioning confirmed, and an actual ten-second browser take was saved and inspected. [Verification and recording](VERIFICATION.md)

Primary references: [authentication](https://docs.reactor.inc/authentication), [sessions](https://docs.reactor.inc/concepts/sessions), [Orbis API entry](https://www.reactor.inc/models/visko-orbis-dynamic/api).

## Nebius Token Factory: a director that remembers

`lib/cutline/director.ts` calls `https://api.tokenfactory.nebius.com/v1/chat/completions` using the default `openai/gpt-oss-120b` model. Its input combines the requested action, editable continuity memory, and the final five scenes along the active branch. The response must contain a title, narration, a visible scene direction, and exactly three next choices. Zod validates the response before it is saved as a beat tagged `nebius`.

A real authorized request passed on **12 September 2026**: HTTP 200 in **3,630 ms**, three valid choices, preserved character/coat/train/compass details, correct parent/version, and persistence across a fresh read. [Sanitized Nebius evidence](testing/nebius-live.json)

That standalone result verifies planning; its video status remained `draft`. A separate [combined rehearsal](testing/combined-live.json) subsequently verified an audience winner, Nebius planning, Orbis cue acknowledgement and a later movie chunk. This distinguishes the two observations without treating text success as proof of rendered video.

API planning defaults to `rehearsal`. The client selects Nebius when a personal key or usable shared configuration is supplied. Explicit Nebius mode without credentials fails; provider errors are surfaced rather than silently presented as successful AI direction. Shared server credentials require a presenter access code and atomic cross-browser hourly request caps. Personal keys stay in the current tab's memory and are not saved in stories.

Primary reference: [Token Factory quickstart](https://docs.tokenfactory.nebius.com/quickstart).

## Official starter attribution

Cutline incorporates code and lifecycle patterns from [Visko’s official hackathon starter](https://github.com/Visko-Platform/orbis-hackathon-starter), pinned to commit `6de7ad733e90967f25979afcfca55b73a71f064a`.

`lib/cutline/orbis/starter.ts` adapts the starter’s `OrbisMessage` type and `unwrapOrbisMessage` implementation. The live player calls this helper for every model message. The startup flow in `components/cutline/use-live-video.ts` adapts the starter’s readiness sequence: image upload → confirmed `image_accepted` → prompt → `conditions_ready` → start → verified image conditioning.

Cutline adds bounded event waits, cancellation, reference framing, audience voting, story persistence, and Dynamic live steering. The starter uses Stable; Cutline defaults to Dynamic. Its optional Google image-generation example is omitted: the product AI integrations are Visko, Reactor, and Nebius.

The upstream starter did not declare a license at this commit. Its adapted code is attributed separately and is not represented as Cutline-authored or relicensed under Cutline’s license. See [STARTER.md](STARTER.md) and [the scoped project license](../LICENSE).

## Evidence boundaries

The repository records real sponsor calls and media observations alongside application tests. A single observed timing is not a benchmark; command acceptance is not proof of exact visual compliance. Delivery resolution is not native generation resolution. The combined local rehearsal passed; public backend deployment remains unverified and two hosted CI runs failed on the same Worker proxy interruption. See [VERIFICATION.md](VERIFICATION.md).
