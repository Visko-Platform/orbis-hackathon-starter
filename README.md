# Orbis Manipulation Lab

Synthetic robot-manipulation episodes on the public Reactor-hosted Visko Orbis
Stable API. Pick an embodiment and a task, generate the start frame the robot
acts on, and let the director steer Orbis through the manipulation one 1.8 s
chunk at a time — checking each phase against what is actually on screen before
it moves on. Out the back: a minute-long episode and a machine-readable
manifest.

The original minimal starter is still here, at `/starter`.

## Requirements

- Node.js 20.9 or newer
- A Reactor API key with access to Visko Orbis Stable
- One model provider key — **OpenAI or Gemini** — for start frames, grounded
  planning and cue checking

## Run locally

```bash
cp .env.example .env.local
# Add your Reactor key and ONE of OPENAI_API_KEY / GEMINI_API_KEY.
npm install
npm run dev
```

Open <http://localhost:3000>.

Keys stay server-side. The browser only ever receives the short-lived Reactor
JWT and the images the model routes return.

## Model provider

The lab needs exactly two model capabilities — make an image, and answer a
question about an image as JSON — so `lib/vision-provider.ts` abstracts them and
both vendors implement the same interface. Routes never name a vendor.

Selection: `LAB_PROVIDER` if set, otherwise OpenAI when `OPENAI_API_KEY` is
present, otherwise Gemini. Within a provider, model ids are tried newest-first
(`gpt-image-1.5` → `gpt-image-1-mini` → `gpt-image-1`; `gpt-5-mini` → `gpt-5` →
`gpt-4.1-mini`), so a retired id falls through instead of breaking the app. Pin
one with `LAB_IMAGE_MODEL` / `LAB_TEXT_MODEL`.

Two vendor details the abstraction absorbs: OpenAI's strict structured outputs
require `additionalProperties: false` and every key in `required` at every
level, which `toStrictSchema` adds to the shared schemas; and OpenAI's image
models offer 1536x1024 as their widest landscape, which Orbis resizes to 16:9
without cropping.

## The flow

The whole point of the app is that a good manipulation episode is not one
prompt. It is a start frame, a phase script, and a controller that keeps the
run pointed at the task.

**1 — Embodiment and task.** Eight robots (Franka Panda, UR5e, xArm 7, ALOHA
bimanual, Unitree G1, Stretch 3, Spot with arm, Shadow Hand) and eleven
manipulation tasks (pick and place, stacking, drawers and cabinet doors, peg
insertion, pouring, wiping, cloth folding, bimanual handover, button pressing,
colour sorting). Tasks an embodiment cannot plausibly do are disabled — the
handover needs two arms. Each robot carries an `appearance` string that
conditions the image model and `motion` / `contact` strings that are injected
into every steering prompt, so the embodiment stays the same robot across the
whole run.

**Where you say what to interact with and what to do.** The **what the robot
acts on** block in step 1 has three fields:

- **Object to interact with** — e.g. `blue ceramic mug`
- **Target / destination** — e.g. `stainless steel dish rack`
- **Instruction** — e.g. `pick up the blue ceramic mug and stand it upside down
  in the dish rack`

Leave them blank to use the chosen task's defaults. Fill them in and they
propagate everywhere: the start-frame image prompt, every phase's action
sentence, every success cue, and the manifest's `language_instruction`. Pick
**Custom task — describe it yourself** from the task dropdown to drop the
catalog script entirely and fit a generic eight-phase manipulation arc to your
own instruction.

Two finer controls sit downstream of that. Each phase in step 3 has an
**editable action sentence** — open a phase and rewrite it to change exactly
what happens in those seconds; the steering prompt recomposes around it. And
during a run, the **nudge box** under the player sends a free-text correction
into the live phase at the next chunk boundary ("the gripper missed, close on
the mug handle itself").

**2 — Start frame.** Orbis conditions the episode on one image, so everything
the robot will touch has to be visible in it. Generate one from the composed
scene prompt, or bring a photo of your real bench and let the image model stage
the chosen robot and props into it. The seed drives domain randomization —
lighting, surface finish, clutter and palette vary while the robot and task stay
fixed, which is the reason to generate a batch rather than one take.

**3 — Episode plan.** The task skeleton becomes chunk-aligned phases. With a
start frame present, the planner rewrites the skeleton against what is actually
in that frame: real object colours, real positions, real geometry. Each phase
gets three things — a one-sentence action, a **success cue** describing what must
be visibly true when it ends, and a recovery clause.

**Roll.** The director counts `chunk_complete` events and sends the next phase
prompt one chunk before its boundary. Near the end of each phase it grabs a
frame off the `<video>` element and asks Gemini whether the cue is actually
visible. A negative verdict extends the phase and re-steers with a correction,
once per phase. Phase transitions, verdicts and corrections all land in the
director log and in the exported manifest.

## Why prompts are composed the way they are

Orbis morphs the whole picture at each chunk boundary, so a steering prompt is
never a delta. Sending "now lift the block" on its own is what makes the robot,
the table and the lighting drift mid-episode. Every prompt this app sends
restates, in order:

1. the **scene anchor** — the unchanging visual truth of the start frame,
2. the embodiment's **motion** signature,
3. the one-sentence **action** for this phase (the only part that changes),
4. an optional **correction** from the verifier,
5. the **contact clause** — reach before closing, close before the object moves,
   the object moves only while held, open before it is left behind,
6. the task instruction, and
7. the **continuity clause** — camera locked, one take, no duplicate arms or
   objects, gravity respected.

See `lib/episode.ts`. That file is where to go first if episodes are drifting.

## Export

- **MP4** — `requestClip()` plus `downloadClipAsFile()` assemble the HLS
  fragments into a flat file.
- **Manifest JSON** — `orbis-manipulation-episode/v1`: the
  `language_instruction`, embodiment, task, scene and randomization draw, seed,
  every phase with its chunk range, steering prompt and cue verdict, plus the
  full director timeline. Field names follow open robot-learning episode
  metadata conventions so it maps onto an existing loader.

## Running without a provider key

The lab degrades instead of failing. Planning falls back to catalog phase
prompts, cue checking logs `Check skipped` and the run continues, and with no
start frame Orbis runs text-to-video. You still get a chunk-steered episode and
a manifest — the framing is just much worse, which is a good demonstration of
why the start frame matters.

## Connection errors

Reactor's transport errors arrive as raw JSON; `use-episode-director.ts` maps
the common ones to something readable:

- `no available capacity` — Orbis has no free server. Reactor-side queue, not a
  setup problem. Wait and connect again.
- `quota_exceeded` / `concurrent_sessions` — one concurrent Orbis session is
  allowed. A tab left connected blocks the next connect.

## Documented model behavior

- A prompt is required before `start`; the reference image is optional.
- A 16:9 reference image works best. Other aspect ratios are resized without
  cropping and may appear distorted.
- After connection, treat `state.available_resolutions` as authoritative and
  send the selected value exactly as given. `set_resolution` applies from the
  next `start`, not during the active run.
- Orbis emits chunks about every 1.8 seconds (~33 frames at 18 fps, generated at
  832x480). The first chunk emits no frames while the upscaler primes; the first
  picture typically arrives ~2 chunks in.
- Commands are asynchronous. Use model events such as `state`,
  `prompt_accepted`, `resolution_accepted`, `generation_started`,
  `chunk_complete`, and `command_error` as the source of truth.
- `set_seed` and `set_audio_enabled` are sent best-effort; a rejection does not
  fail the run.
- `pause` takes effect after the current chunk. `resume` continues the same
  generation, and `reset` clears the current prompt and image.
- Sessions are limited to one concurrent session per model by default. A tab
  left connected will block the next connect with a 429 `quota_exceeded`.

## Project files

### Lab

- `lib/robots.ts` — the robot catalog and its model-facing descriptors.
- `lib/tasks.ts` — manipulation tasks as phase skeletons with success cues.
- `lib/scenes.ts` — environments, camera rigs, and the randomization axes.
- `lib/episode.ts` — episode types, chunk-timeline math, prompt composition.
- `lib/lab-prompts.ts` — system instructions and shared response schemas.
- `lib/vision-provider.ts` — the OpenAI/Gemini abstraction and model fallbacks.
- `lib/manifest.ts` — the exported episode record.
- `hooks/use-episode-director.ts` — the controller: chunk counting, phase
  advancement, frame capture, cue verification, recovery, clip capture.
- `components/episode-config-panel.tsx` — step 1.
- `components/start-frame-panel.tsx` — step 2.
- `components/plan-panel.tsx` — step 3 and the live phase read-out.
- `components/lab-stage.tsx` — player, transport, director log, export.
- `components/manipulation-lab.tsx` — provider and layout.
- `app/api/scene-image/route.ts` — start-frame generation and editing.
- `app/api/episode-plan/route.ts` — start-frame-grounded phase planning.
- `app/api/verify-frame/route.ts` — closed-loop cue checking.

### Shared and starter reference

- `app/api/token/route.ts` performs the server-side token exchange.
- `lib/orbis.ts` contains the public model configuration and message helpers.
- `app/starter/page.tsx` hosts the original starter demo.
- `components/orbis-demo.tsx`, `orbis-player.tsx`, `orbis-controls.tsx`,
  `nano-banana-example.tsx` and `hooks/use-orbis-session.ts` are the original
  starter, unchanged.
- `app/api/nano-banana/route.ts` and `app/api/orbis-prompt/route.ts` back the
  starter's livestreaming example.
- `dog.png` is the Nano Banana source image.
- `.env.example` documents the environment variables.

For the complete command parameters, message schemas, tracks, and current model
behavior, use the public Reactor documentation:

- [Visko Orbis Stable API](https://www.reactor.inc/models/visko-orbis-stable/api)
- [Visko Orbis Dynamic API](https://www.reactor.inc/models/visko-orbis-dynamic/api)
- [Gemini image generation and editing](https://ai.google.dev/gemini-api/docs/image-generation)
