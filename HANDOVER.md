# Adtractive — Engineering Handover

## 1. Current status

Adtractive is a working local hackathon prototype for generating live,
brand-integrated video continuations from a user-supplied movie frame. The
current build supports:

- real Pepsi, McDonald's, Nike, and Rolex campaign assets;
- uploaded video or still-image source material;
- browser-side 16:9 frame capture and artwork compositing;
- manual campaign selection or deterministic sample-audience matching;
- live Visko Orbis video and picture-driven audio through Reactor;
- free-form full-scene pivots and context-preserving refinements;
- pause, resume, reset, disconnect, local activity history, and JSON export;
- a per-campaign product knowledge base edited in the studio, prompt engineering
  of the scene brief and every direction against it (Gemini, optional), on-screen
  answers to product questions, knowledge-derived suggested directions, and a
  server-side prompt-version log (`docs/KNOWLEDGE_DIRECTOR.md`).

The production build and automated tests pass. A live test has also covered
image upload, Orbis start, a complete scene pivot, pause, resume, end, and
disconnect.

Repository: <https://github.com/mian-abd/Orbis-ad>
Live deployment: <https://orbis-ad.vercel.app/>

Built at the Live Models Hackathon (Visko x Reactor x Nebius). The live video is
Visko's Orbis model, reached through the Reactor platform; see the README for what
each partner provides and what this build does and does not use.

## 2. Start the project

Requirements:

- Node.js 20.9 or newer;
- npm;
- a Reactor API key authorized for `reactor/visko-orbis-stable`.

Create `.env.local` from `.env.example` and set:

```dotenv
REACTOR_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here   # optional; without it prompts are used as written
```

Then run:

```bash
npm install
npm run assets:rolex
npm run dev
```

`npm run assets:rolex` downloads the Rolex product images listed in
`public/brands/SOURCES.md` from Rolex's media CDN; the other brand files are
committed.

Open <http://localhost:3000>.

Never commit `.env.local`, a token response, or a browser JWT. The file is
already ignored by Git.

## 3. Demo walkthrough

1. In **Studio**, choose Pepsi, McDonald's, Nike, or Rolex under **01 / PRODUCT**, or
   **Add product image** (PNG, JPEG, WebP). The chosen image is what gets placed;
   without a reference frame it is also the starting frame.
2. Under **02 / PRODUCT INFO**, press **Draft from product image** to fill what it
   looks like and how it is shown from the image, edit anything, add facts and
   never-say lines, and **Save product info**.
3. Optionally open **03 / REFERENCE FRAME** to place the product into a clip
   frame or still, and **04 / SCENE BRIEF** to change what happens in the scene.
4. Select **Generate live** and wait for the live output. A cold provider
   session can take time to warm.
5. Enter a direction such as "Warmer light, move closer to the product."
   **Change direction** replaces the setting; **Refine this scene** changes only
   the named details. The receipt shows what you typed and what was sent after
   prompt engineering. End a direction with "?" to ask a product question; it is
   answered on screen from the saved facts and never sent to the model.
6. Leave **Keep [brand] in scene** enabled to restate the sponsor, or disable it
   for an unconstrained pivot.
7. Demonstrate pause/resume, then end and disconnect the take.
8. Open **Activity** to show or export the browser-local history.

The **Scene library** is live: each card loads its real clip and poster frame
directly into Studio as the reference frame, alongside the chosen product image.
Three CC BY 3.0 Blender Foundation clips ship with the app.

### Rolex demo path

`lib/demo/flows.ts` holds an authored six-beat walk (street → boutique → swap →
inspect → wear → exit). Each beat is a structured director's brief (`scene`:
setting, camera, what happens step by step, light, product, brand marks, never)
rendered in that fixed order into the direction, so a short bubble like "Enter
the boutique" injects a complete description of the facade, the interior, the
camera move, the sequence of movements and what must not happen. The flow has a
fixed cast, a per-beat watch ledger (on the wrist,
in his hands, on the tray) and static brand marks, all restated as a continuity
line in both transition beats; the ledger is told as a change from the beat the
take was on (`fromStepId`, else the previous beat), so a swapped watch is never
called "the same watch as before". Every view note is two-faced: a dial on one
side, the plain steel back on the other, one face visible at a time. Each beat
declares the state it needs (`requires`: place, watch on the wrist or in his
hands); bubbles offer only beats that fit, and the route answers 409 with what
the beat needs when a typed cue asks for one that does not. `POST
/api/continuations/demo` runs one beat,
validated against the product knowledge but never rewritten, and returns the
scene contract the beat leaves the take under. The path is presented to viewers
in the user demo's interactive ad (below); the studio's director panel has no
bubbles and sends every direction as written.

## 4. Runtime architecture

```text
Source clip/still
      │ browser decode and 16:9 capture
      ▼
Reference frame + selected campaign artwork
      │ canvas compositing
      ▼
Asset-aware opening prompt ── POST /api/continuations/prepare
      │
      ├─ POST /api/token ── server-held key ── Reactor JWT
      ▼
set_image → set_prompt → start → streamed video/audio
                              │
Director input → POST /api/continuations/pivot → set_prompt
                              │
                              ▼
                    next generated chunks morph
```

The browser decodes source media locally. Only the composed reference image
and prepared prompt are sent to Reactor when generation starts.

## 5. Important files

| Area | File | Responsibility |
| --- | --- | --- |
| App composition | `components/studio/studio-app.tsx` | Navigation, draft state, run preparation, assets, history |
| Live stage | `components/studio/continuation-stage.tsx` | Player, transport, pivot/refine director UI |
| Source ingest | `components/studio/source-clip-panel.tsx` | Video/image validation, seeking, crop/fit, frame capture |
| Campaign UI | `components/studio/campaign-panel.tsx` | Campaign, asset, upload, and audience controls |
| Live state | `hooks/use-live-continuation.ts` | Confirmed commands, events, timeouts, cancellation, connection state |
| Opening prompt | `lib/continuation-prompt.ts` | Scene and selected-asset-aware starting prompt |
| Live prompts | `lib/live-direction.ts` | Full pivot versus contextual refinement semantics |
| Frame composition | `lib/placement-frame.ts` | Places the actual selected image onto the starting frame |
| Demo data | `lib/studio-data.ts` | Scene briefs, audience profiles, campaigns, source URLs |
| Token exchange | `app/api/token/route.ts` | Mints a one-hour, one-session, model-scoped JWT |
| Knowledge base | `lib/knowledge/` | Per-campaign knowledge (seeds, store, guard, retrieval, prompt engineer, audit, suggestions) |
| Knowledge UI | `components/studio/knowledge-panel.tsx` | 04 / KNOWLEDGE inspector section |
| Knowledge API | `app/api/campaigns/[id]/knowledge`, `…/knowledge/describe`, `…/suggestions` | Read/write knowledge; draft from an image; suggested directions |
| Scene contract | `lib/knowledge/contract.ts`, `app/api/continuations/contract` | What stays true per take; restated in every direction |
| Product design | `docs/DYNAMIC_AD_PLATFORM_PLAN.md` | Production roadmap, APIs, ERD, viewer-director design |

Brand files and their original download URLs are documented in
`public/brands/SOURCES.md`.

## 6. API behavior

### `POST /api/token`

Uses the server-held Reactor key to request a scoped JWT. Upstream bodies are
not exposed to the browser. The route applies a 20-second timeout and maps
authentication, capacity, and provider failures to safe messages.

### `GET /api/continuations/eligible`

Inputs: `profileId`, `titleId`. Returns the highest-affinity eligible campaign
with priority and ID tie-breaks. This is sample logic, not production ad
targeting.

### `POST /api/continuations/prepare`

Validates title, profile, campaign, selection mode, scene brief, and asset
ownership. Returns a run ID and an asset-aware opening prompt. Manual mode lets
the operator select any campaign allowed for that title; automatic mode
enforces the deterministic audience match.

### `POST /api/continuations/pivot`

Validates a direction of 1–1,200 characters, campaign, mode, context, and brand
preservation flag. A pivot intentionally drops the previous scene description.
A refinement carries the most recent context forward. The completed Orbis
prompt remains below the hook's 4,000-character limit. The direction is first
engineered against the campaign knowledge (see `docs/KNOWLEDGE_DIRECTOR.md`);
the response carries `outcome` ("steer" or "overlay" for a product question),
`engineered` (source, text, model, notes, rejected) and `promptVersionId`.
Refused directions (competitor, injection, forbidden claim) return 400; a
question with no approved answer returns 422.

A pivot returns two prompts. `actionPrompt` is an action beat with no
continuity language, sent first so the change is visible at the next chunk
boundary; `prompt` is the settled scene, sent about 3.6 seconds (two chunks)
later by the live hook. A newer direction cancels a pending settle. A
refinement returns `actionPrompt: null`. When the direction names a product
view the campaign has a reference for ("show the back", "open the clasp"), the
matching asset's appearance is added to both beats as `productNotes`.

### User demo: the viewer's watch page (`/watch`)

The "User demo" button next to "Generate live" opens `/watch` in a new tab
and releases the studio's live session first (one session per key). The
page is a fictional video site ("ViewTube", `components/watch/`) playing the
Sintel trailer from `public/scenes` (CC BY 3.0, credited). Go fullscreen,
watch, and at `adAt` (default 8 s, `?adAt=<seconds>`) the player pauses
under an interactive Rolex ad: the Orbis take on the Rolex demo path, warmed
up 6 s earlier (`lib/watch/schedule.ts`), with the next bubbles from
`demoChips`, a free-text field (a cue runs that beat, a question is answered
on screen, anything else is a pivot carrying the scene contract) and
"Skip Ad" after 5 s, which releases the session and resumes the video.
`?live=0` shows the ad with the campaign still instead of connecting. The
browser-side requests both the studio and the ad use live in
`lib/demo/client.ts`. The "Up next" thumbnails are frames cut from the same
open-movie clips (`public/scenes/thumbs`).

Closing, refreshing, or leaving either page ends the live session
server-side: `hooks/use-release-on-unload.ts` sends the session id as a
beacon (which outlives the page) to `POST /api/sessions/release`, which
deletes it with the API key, so the next take does not wait for the old
session to time out.

### `POST /api/continuations/contract`

Multipart: `campaignId`, `brief`, the current `contract` as JSON, optional
`image`. Returns the scene contract with person and setting lines re-drafted
from the brief and the frame; product lines rebuilt from the knowledge base;
pinned and custom lines kept. `prepare` returns the initial contract and
`pivot` accepts, restates, and advances it (`docs/KNOWLEDGE_DIRECTOR.md`).

### `GET` / `PUT /api/campaigns/:id/knowledge`, `GET /api/campaigns/:id/suggestions`

Operator-editable product knowledge (validated field by field; seeded for the
three demo campaigns; saved per machine under `data/knowledge/`) and up to six
suggested directions built from it.

## 7. State and persistence

- Source clips, captured frames, and custom artwork are held in browser memory.
  They disappear on refresh.
- Activity is stored under `orbis-ad-activity-v2` in local storage, capped at
  150 entries.
- Campaign and source selections are locked while a take is starting or live.
- The active run keeps its prepared campaign even if the workspace draft later
  changes.
- Model events are authoritative for started, paused, resumed, reset, and prompt
  acceptance states.
- This prototype has no database, users, server audit log, or object storage.

## 8. Verification

Run before every handoff or deployment:

```bash
npm test
npm run typecheck
npm run build
```

With `npm run dev` already running:

```bash
npm run test:api
```

The domain and API suites cover campaign matching, all local campaign assets,
asset-aware prompts, pivot/refine semantics, prompt limits, message envelopes,
request validation, and malformed input.

For a live smoke test, use a small still image, start a take, send one pivot,
pause, resume, end, and disconnect. Disconnect after testing so the provider
session is released.

## 9. Known boundaries

- The app generates a continuation from one composed frame. It does not
  inpaint or rewrite every frame of an existing encoded movie.
- Generative video cannot guarantee a pixel-perfect logo after many chunks.
- Artwork placement on the starting image is a rectangular 2D composition,
  not semantic surface tracking or relighting.
- The Scene library bundles three browser-ready, CC BY 3.0 demo clips from
  Blender Foundation open movies. Attribution and exact download URLs live in
  `public/scenes/SOURCES.md`.
- Audience profiles are synthetic examples and run entirely in the browser.
- Activity history is useful for a demo but is not a tamper-proof audit log.
- There is no authentication or rate limiting around the local token endpoint.
- One JWT is scoped to one live session. Provider capacity can return `429`.
- The knowledge base and prompt engineering are file-backed and lexical
  (no database, embeddings, or approval states). The product-state grid and
  anchor-frame parts of the platform plan are not in this build.

## 10. Recommended next work

1. Add authentication, workspaces, roles, and server-side rate limiting.
2. Persist brands, campaigns, assets, rights, scenes, runs, and prompt versions
   in PostgreSQL; move media to object storage with signed access.
3. Add real film-ingest jobs: metadata extraction, contact sheets, handoff
   frames, and continuity review.
4. Add brand approval states and enforce rights windows, territory, title,
   placement surface, frequency, and campaign budgets server-side.
5. Extend the knowledge layer: embeddings for retrieval, approval states, a
   database for knowledge and prompt versions, and the product-state grid.
6. Add placement tracking or a video inpainting/compositing provider for
   frame-level integration into existing clips.
7. Replace browser-local history with append-only server events and exportable
   reports.
8. Add accessibility and cross-browser automation, load tests, observability,
   and cost/session dashboards.

## 11. Deployment checklist

- Configure `REACTOR_API_KEY` (required) and `GEMINI_API_KEY` (optional) as
  server-side secrets. Never prefix either with `NEXT_PUBLIC_`.
- Connect a Vercel Blob store before relying on saved knowledge:
  `lib/knowledge/store.ts` uses a local file in development and Vercel Blob in
  production, switching on `BLOB_READ_WRITE_TOKEN`. Without a connected store the
  disk is read-only and **Save product info** fails; reads still fall back to the
  in-code seeds. `lib/knowledge/audit.ts` skips writing entirely when `VERCEL` is
  set, so the prompt-version log is a development-only record today.
- Use Node.js 20.9+ and run `npm ci && npm run build`.
- Put authentication and rate limiting in front of `/api/token`.
- Confirm the deployment supports WebRTC and does not block Reactor traffic.
- Set a Content Security Policy that allows only required Reactor and asset
  origins; remove or self-host the Google Font if external fonts are disallowed.
- Confirm commercial rights and territorial rules for every uploaded title and
  campaign asset.
- Run the automated suite and one live smoke test in the target environment.
- Disconnect the smoke-test session and verify no secret appears in logs or
  client bundles.

## 12. Ownership checklist

- [ ] New owner can run the app locally.
- [ ] New owner has an independently issued Reactor credential.
- [ ] Environment variables are configured outside Git.
- [ ] Automated and live smoke tests pass.
- [ ] Brand and title approvals are documented for the intended demo.
- [ ] Provider capacity and session-cost expectations are understood.
- [ ] Production gaps above have named owners before public deployment.
