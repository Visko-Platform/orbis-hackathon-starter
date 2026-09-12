# Adtractive

**An ad break the viewer can direct.**

The ad break is the last surface on the internet you cannot talk to. Everything else on a
page responds — you click, you search, you ask. A pre-roll is a wall: a file rendered months
before you arrived, and your only input is Skip.

Adtractive replaces it with an ad that is generated while it plays. The viewer steers the
scene, asks questions about the product, and gets real answers — inside a normal video
player, with the Sponsored badge and the Skip button still there. The advertiser keeps
control through an approved knowledge base that every prompt has to pass.

| | |
|---|---|
| **Live demo** | <https://orbis-ad.vercel.app/> |
| **Source** | <https://github.com/mian-abd/orbis-hackathon-adtractive> |
| **Built at** | Live Models Hackathon — Visko × Reactor × Nebius, Ferry Building, San Francisco |

---

## Built on the hackathon stack

This project runs on the partners' platforms end to end — it is not a mock.

### Visko — Orbis, the live model

[Orbis](https://www.reactor.inc/models/visko-orbis-stable) is Visko's real-time video
model: it generates video continuously and responds to new instructions as it runs.
Everything on screen in this app is Orbis output. We use `reactor/visko-orbis-stable`,
conditioned on a composed 16:9 starting frame, and steered mid-stream while the take is
live. The whole product idea depends on Orbis being *live* — a finished clip could not be
redirected mid-scene, and the ad could not adapt to the viewer.

### Reactor — the real-time generative video platform

[Reactor](https://www.reactor.inc) is how we reach Orbis, and it does the heavy lifting:

- **Auth** — our server exchanges a held API key for a short-lived, model-scoped JWT
  ([`app/api/token/route.ts`](app/api/token/route.ts)); the browser never sees the key.
- **Transport** — `@reactor-team/js-sdk` v3 opens the WebRTC session and delivers the
  `main_video` / `main_audio` tracks into `<ReactorView>`.
- **Command protocol** — `set_image` → `set_prompt` → `start`, then `set_prompt` again to
  steer, plus pause / resume / reset. Every command is confirmed against the model's own
  events (`image_accepted`, `conditions_ready`, `prompt_accepted`, `generation_started`)
  rather than assumed — see [`hooks/use-live-continuation.ts`](hooks/use-live-continuation.ts).

### Nebius — AI cloud partner

[Nebius](https://nebius.com) (NASDAQ: NBIS) is the event's AI cloud partner and provides
Builder Program credits to participants. It is **not** in this app's runtime path today —
the app is a Next.js front end talking to Reactor — so we are not claiming a Nebius
dependency we do not have. It is the natural host if this moves off serverless for the
persistent campaign, knowledge, and audit storage described in
[Known limits](#known-limits-and-honest-caveats).

Also used: **Google Gemini** — `gemini-3.5-flash` for prompt engineering, scene contracts,
and product-image description. Optional: without a key the operator's own words are used as
written.

---

## The idea

You cannot interact with something that has already been rendered. That single fact is why
video advertising is a monologue: the clip was finished long before the viewer arrived, so
the only interaction anyone could design was a Skip button.

Orbis removes the constraint. It generates video live and responds while it runs, which
makes the obvious thing possible for the first time — an ad the viewer can direct, and ask
questions of, while it plays. Skip stays on screen; the bet is that they stop pressing it.

The hard part is not the video. It is the leash: a generative model improvising a brand is
every marketing director's nightmare, so nothing reaches the model that was not built
server-side from approved records. This build works through the whole chain:

```
 product image ─┐
                ├─► composed 16:9 starting frame ─┐
 reference frame┘   (lib/placement-frame.ts)      │
                                                  ▼
 brand knowledge ─► guard ─► retrieve ─► engineer (Gemini) ─► validate ─► PromptVersion
 (approved facts,                                                             │
  appearance, rules)                                                          ▼
                                     Reactor JWT ─► set_image → set_prompt → start
                                                                              │
 live direction / demo beat ─► same guard+engineer path ─► set_prompt (steer) ─┤
                                                                              ▼
                                                          streaming video + audio
```

Two rules hold the whole thing together:

1. **The browser never authors a prompt.** Every prompt is built server-side from approved
   records and persisted as a `PromptVersion` before it is sent.
2. **The brand's own words win.** Forbidden claims, competitor names, and protected details
   are enforced before text reaches the model — not hoped for afterwards.

---

## Quickstart

Requirements: **Node.js 20.9+**, and a Reactor API key with access to
`reactor/visko-orbis-stable`.

```bash
git clone https://github.com/mian-abd/orbis-hackathon-adtractive.git
cd orbis-hackathon-adtractive
npm install
cp .env.example .env.local
npm run dev
```

Fill in `.env.local`:

```dotenv
REACTOR_API_KEY=your_reactor_api_key
GEMINI_API_KEY=your_gemini_api_key
```

`REACTOR_API_KEY` is required for live video. `GEMINI_API_KEY` is optional: without it
everything still runs, and operator text is used as written instead of being rewritten
against the knowledge base.

No Gemini key? Leave it out. Locally, every Gemini feature is served by the hosted site
(https://orbis-ad.vercel.app), which holds the key on the server. Set `ADTRACTIVE_HOSTED_AI=off`
to run fully offline, or `ADTRACTIVE_HOSTED_AI=always` if your own key fails (for example in a
region Gemini doesn't serve).

Open <http://localhost:3000>.

Optional — fetch the Rolex reference assets from rolex.com:

```bash
npm run assets:rolex
```

---

## The 3-minute demo

Two ways in. The **viewer demo** is the one that lands with an audience; the **studio** is
how the ad gets made.

### The viewer demo — `/watch`

1. Press **User demo** next to *Generate live* (or open `/watch`) and go fullscreen. A
   fictional video site starts playing an open-movie trailer.
2. At **8 seconds** the player hands over to an ad break. It appears instantly — because the
   live session began warming **6 seconds earlier**, while the video was still playing.
3. That ad is not a clip. It is Orbis generating live, and it is **interactive**: three
   bubbles walk the Rolex path, free text works too, and a direction ending in `?` is
   answered on screen from approved facts.
4. **Skip Ad** appears after 5 seconds, like any pre-roll, and hands back to the film.

`?adAt=<seconds>` moves the break; `?live=0` renders the break from a still without
connecting, which is the safe dry run when no provider session is free.

### The studio — how that ad is built

1. **Studio → 01 / PRODUCT** — pick **Rolex**. The Submariner is selected as the product.
2. **02 / PRODUCT INFO** — the Rolex knowledge seed is already loaded (approved appearance,
   boutique rules, forbidden claims). **Draft from product image** shows Gemini filling this
   in from a photo, for a brand that has none.
3. **Generate live** — Orbis starts from the composed frame. Watch the phase indicator; a
   cold provider session takes a moment to warm.
4. The director shows **ROLEX WALK · FIXED PATH** with one bubble: **Walk the street**. Then
   follow the beats — boutique → swap to the Datejust → show the case back → back on the
   wrist → walk out. Each beat lands as **two prompts**: an action beat, then the settled
   scene 3.6 s later, so the transition reads as a move rather than a jump cut.
5. **Type instead of clicking** — "show me the back" resolves to the *inspect* beat by cue
   matching; "make it rain" stays an open-ended pivot. Both carry the matching reference
   view's approved appearance.
6. **Ask a question** — end a direction with `?` ("how much is it?"). It is answered on
   screen from approved facts and is **never sent to the model**.
7. **Activity** — every decision, engineered prompt, and on-screen answer, exportable as JSON.

Full run-of-show, including what to say and how to recover from a stall:
**[docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md)**.

---

## What's in the build

**Live video** — Orbis through Reactor with acknowledged start, steer, pause, resume, reset,
and disconnect; model events are authoritative for every state the UI shows.

**Two-beat transitions** — a pivot sends an action prompt, then the settled scene
`TRANSITION_BEAT_MS` (3.6 s) later; a newer action cancels a pending settle
([`lib/live-direction.ts`](lib/live-direction.ts)).

**Product knowledge base** — per campaign: approved appearance, visual notes, facts,
never-say lines, competitors, protected changes. Edited in the inspector, seeded for every
brand, and stored as a file locally or in Vercel Blob in production. Details in
**[docs/KNOWLEDGE_DIRECTOR.md](docs/KNOWLEDGE_DIRECTOR.md)**.

**Prompt engineering with a receipt** — the scene brief and every direction are guarded,
matched against the visual notes, rewritten by Gemini for the role (opening / pivot /
refine), and validated. The UI shows *you said → what was sent*.

**Scene contract** — the lines that must stay true for the whole take: product lines from
the knowledge base, person and setting lines drafted from the brief or a real frame, plus the
operator's own. Every direction restates the contract, and pinned lines survive even a full
pivot ([`lib/knowledge/contract.ts`](lib/knowledge/contract.ts)).

**Fixed demo path** — an authored six-beat Rolex walk (street, boutique, swap, inspect,
wear, exit) that drives the interactive ad in the user demo: always three bubbles plus free
text, where "show the back" jumps to that beat. When fewer than three beats can follow, the
bubbles fill with **moments**: the easiest directions for the live model (a close-up on the
watch, a highlight across the crystal, checking the time, showing the dial, warmer light),
which keep the story exactly where it is. The studio itself stays a free-form director.

**User demo** — a "User demo" button next to "Generate live" opens `/watch`, a fictional
video site playing an open-movie trailer. Go fullscreen, and at 8 seconds the player pauses
under an interactive Rolex ad: the live Orbis take on the demo path with its bubbles, a
free-text field, and "Skip Ad" after 5 seconds. `?adAt=<seconds>` moves the break;
`?live=0` shows the ad with a still instead of connecting.

**Real brand assets** — 19 original assets across six campaigns: **Pepsi, McDonald's,
Nike, Rolex, BMW and Ray-Ban**, covering beverage, food, apparel, luxury, automotive and
eyewear. Pepsi, McDonald's, Nike and Rolex come from the brands' own media libraries; BMW
and Ray-Ban publish no open asset files, so those come from Wikimedia Commons with the
licence and photographer recorded. Every file's origin is in
[SOURCES.md](public/brands/SOURCES.md). No generated brand artwork.

**Scene library** — three browser-ready clips from Blender Foundation open movies, each a
different film and look: *Sintel* (fantasy animation), *Big Buck Bunny* (comedy animation)
and *Tears of Steel* (live action, two people on an Amsterdam canal bridge — the most
useful starting frame for placement work). Poster frames, attribution, and CC BY 3.0 labels
[here](public/scenes/SOURCES.md). Or upload your own clip (up to 250 MB) and scrub to a
frame, or a still (up to 10 MB).

**Audience matching** — four sample profiles (Urban explorer, Family night, Culture runner,
Collector) matched across six campaigns by affinity, then priority, then a deterministic ID
tie-break ([`app/api/continuations/eligible`](app/api/continuations/eligible/route.ts)).
BMW and Ray-Ban are eligible but deliberately ranked below Rolex and Nike, so the automatic
match stays stable while both are available to pick by hand. Sample logic for the demo, not
production ad targeting.

---

## Project map

| Area | Path | Responsibility |
|---|---|---|
| App shell | [`components/studio/studio-app.tsx`](components/studio/studio-app.tsx) | Navigation, draft state, run preparation, activity |
| Live stage | [`components/studio/continuation-stage.tsx`](components/studio/continuation-stage.tsx) | Player, transport, director, demo bubbles, overlays |
| Session state | [`hooks/use-live-continuation.ts`](hooks/use-live-continuation.ts) | Confirmed Reactor commands, events, timeouts, cancellation |
| Reactor glue | [`lib/orbis.ts`](lib/orbis.ts) | Model name, tracks, message envelope, JWT fetch |
| Frame composition | [`lib/placement-frame.ts`](lib/placement-frame.ts) | Composites the product onto the reference frame, or fits it 16:9 |
| Opening prompt | [`lib/continuation-prompt.ts`](lib/continuation-prompt.ts) | Asset- and knowledge-aware starting prompt |
| Live prompts | [`lib/live-direction.ts`](lib/live-direction.ts) | Pivot vs refine semantics, two-beat transitions |
| Product views | [`lib/product-cues.ts`](lib/product-cues.ts) | Maps "show the back" to the right approved reference view |
| Knowledge | [`lib/knowledge/`](lib/knowledge) | Types, seeds, store, guard, retrieval, engineer, validate, audit |
| Scene contract | [`lib/knowledge/contract.ts`](lib/knowledge/contract.ts) | What must stay true for the whole take; restated every direction |
| Frame capture | [`lib/frame-capture.ts`](lib/frame-capture.ts) | Pulls a real frame out of the running take |
| Demo path | [`lib/demo/flows.ts`](lib/demo/flows.ts) | Authored beats and moments, cue resolution, three-bubble selection |
| Demo path | [`lib/demo/client.ts`](lib/demo/client.ts) | Calls the beat and pivot routes from either surface |
| Viewer page | [`components/watch/`](components/watch) | The video site, the player, and the interactive ad break |
| Break timing | [`lib/watch/schedule.ts`](lib/watch/schedule.ts) | Prewarm, show, skip, and clock formatting as pure functions |
| Demo data | [`lib/studio-data.ts`](lib/studio-data.ts) | Campaigns, assets, audiences, scene titles |

### API

| Route | Purpose |
|---|---|
| `POST /api/token` | Exchanges the server-held Reactor key for a 1-hour, one-session, model-scoped JWT |
| `GET /api/continuations/eligible` | Picks the highest-affinity campaign for a profile and title |
| `POST /api/continuations/prepare` | Validates the selection, engineers the opening prompt, returns a run ID |
| `POST /api/continuations/pivot` | Guards, engineers, and validates a live direction — or answers a question as an overlay |
| `POST /api/continuations/demo` | Runs one authored beat or moment of a campaign's fixed demo path |
| `POST /api/continuations/contract` | Drafts the scene contract's person and setting lines |
| `GET,PUT /api/campaigns/[id]/knowledge` | Reads and writes a campaign's product knowledge |
| `POST /api/campaigns/[id]/knowledge/describe` | Drafts appearance and portrayal notes from a product image (Gemini vision) |
| `POST /api/sessions/release` | Releases the provider session when the viewer leaves the page |
| `GET /api/campaigns/[id]/suggestions` | Knowledge-derived direction suggestions |

---

## Deploying (Vercel)

```bash
vercel
vercel --prod
```

Set both environment variables in the Vercel project — `REACTOR_API_KEY` (required) and
`GEMINI_API_KEY` (optional) — as **server-side** variables. Never prefix them with
`NEXT_PUBLIC_`; that would ship the key in the client bundle.

Three things to know before relying on a deployment:

- **WebRTC must not be blocked.** The video arrives peer-to-peer from Reactor, not through
  your origin. Test a preview deployment end to end before demo day.
- **Connect a Blob store, or saved knowledge will not persist.**
  [`lib/knowledge/store.ts`](lib/knowledge/store.ts) writes to a local file under
  `data/knowledge/` in development and to [Vercel Blob](https://vercel.com/docs/vercel-blob)
  in production, switching automatically when `BLOB_READ_WRITE_TOKEN` is present (Vercel
  injects it once a Blob store is connected to the project). Without that store the disk is
  read-only and **Save product info** will fail; reads still fall back to the in-code seeds,
  so the demo itself keeps working.
- **The prompt-version audit log is local-only.**
  [`lib/knowledge/audit.ts`](lib/knowledge/audit.ts) skips writing when `VERCEL` is set, so
  `PromptVersion` records exist in development but not on the deployment. A durable audit
  trail needs a real datastore — see the platform plan.
- **Protect the token endpoint.** `/api/token` has no auth or rate limiting. Anyone who can
  reach the deployment can mint a session against your Reactor quota.

---

## Verify

```bash
npm run typecheck
npm test
npm run build
npm run test:api
```

`npm test` runs the domain, knowledge, and demo suites. `npm run test:api` needs the dev
server already running on port 3000.

Then one live smoke test: small still image → start a take → one pivot → pause → resume →
end → **disconnect**, so the provider session is released.

---

## Known limits and honest caveats

- This generates a **continuation** from one composed frame. It does not inpaint or rewrite
  every frame of an existing encoded movie.
- Generative video cannot guarantee a pixel-perfect logo after many chunks. Placement is a
  2D composite on the starting frame, not semantic surface tracking.
- `set_image` is only read at `start`. A different product mid-run means a `reset` and a
  visible discontinuity, which is why product changes are authored as beats.
- Directions are asynchronous. An acknowledgement means the model accepted the prompt, not
  that the visual result is guaranteed; it lands over the next chunks.
- One JWT is scoped to one live session, and provider capacity can return `429`.
- Audience profiles are synthetic, and activity history is browser-local — useful for a
  demo, not a tamper-proof audit log.
- No authentication, authorization, multi-tenancy, or persistent storage. This is a
  hackathon prototype.

The production architecture — rights windows, approvals, viewer-request guardrails, and the
full data model — is written up in
**[docs/DYNAMIC_AD_PLATFORM_PLAN.md](docs/DYNAMIC_AD_PLATFORM_PLAN.md)**.
For engineering handover, see **[HANDOVER.md](HANDOVER.md)**.

---

## Security

The Reactor and Gemini keys stay server-side; `.env.local` is gitignored. The browser gets
only a short-lived, model-scoped JWT. Source clips are decoded locally in the browser —
only the composed starting frame and the server-authored prompt are sent to Reactor.
Product questions are answered from approved facts on screen and never reach the model.

## Credits

Brand assets are the property of their respective owners (Pepsi, McDonald's, Nike, Rolex)
and are used here for a non-commercial hackathon demonstration; every file's origin is
recorded in [`public/brands/SOURCES.md`](public/brands/SOURCES.md). Demo footage is
© Blender Foundation, CC BY 3.0 — see [`public/scenes/SOURCES.md`](public/scenes/SOURCES.md).
No sponsorship or endorsement by any brand, or by Blender, Visko, Reactor, or Nebius, is
implied.
