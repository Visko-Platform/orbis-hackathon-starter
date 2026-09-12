# Orbis Ad

A video-first workspace for dynamic, in-scene brand placements. Bring a film
clip or reference image, choose real campaign artwork, and direct a live Orbis
scene as it unfolds.

## What the hackathon build demonstrates

- A responsive Studio, Campaigns gallery, playable Scene library, and Activity history.
- Three bundled, browser-ready clips from Blender Foundation open movies, with
  poster frames, attribution, license labels, and [source links](public/scenes/SOURCES.md).
- Six original assets from Pepsi, McDonald's, and Nike, stored locally with
  [official source links](public/brands/SOURCES.md). No generated brand assets.
- Per-campaign artwork uploads and explicit asset selection.
- Video upload (up to 250 MB), scrubbing, crop/fit controls, and 16:9 frame capture;
  image uploads up to 10 MB are also supported.
- Original/placement comparison and artwork position/size controls.
- Manual campaign choice or optional matching against three sample audiences.
- Live video/audio through Reactor, with acknowledged start, pause, resume,
  reset, and disconnect controls.
- A free-form director: **Change direction** replaces the old scene brief;
  **Refine this scene** retains recent context. **Keep brand in scene** is optional.
- Local creative history with JSON export and model diagnostics.
- A per-campaign **product knowledge base** (appearance, visual notes, facts, never-say,
  protections) edited in the inspector, and **prompt engineering**: the scene brief and
  every live direction are rewritten with that knowledge before they reach Orbis, with a
  "You said → Sent" receipt. Product questions are answered on screen from approved facts.
  See [docs/KNOWLEDGE_DIRECTOR.md](docs/KNOWLEDGE_DIRECTOR.md).

This prototype generates a new continuation from a composed reference frame.
It does **not** rewrite every encoded frame of an existing movie or guarantee
pixel-perfect logos in generated frames. The Scene library includes three open-film
demo clips; you can also upload licensed footage to use as the starting point.

## Run locally

Requirements:

- Node.js 20.9 or newer
- A Reactor API key with access to `reactor/visko-orbis-stable`

Create `.env.local`:

```dotenv
REACTOR_API_KEY=your_reactor_api_key
GEMINI_API_KEY=your_gemini_api_key   # optional: prompt engineering and suggested directions
```

Then run:

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Demo flow

1. Choose a brand or **Add product image**. The image you choose is what gets
   placed; with no reference frame it is also the starting frame.
2. Under **Product info**, **Draft from product image** to fill in what it looks
   like, edit, add facts and never-say lines, and save.
3. Optionally add a reference frame: pick a playable clip in **Scene library**
   (it arrives with its poster frame ready to use, and you can scrub the source
   video for another frame) or upload your own clip/still. Review **Original**
   versus **Placement** and adjust the scene brief and artwork position.
4. Select **Generate live**. Startup can take time while the provider allocates
   and warms the model; the UI shows the current phase.
5. Type a new direction and select **Pivot live** (or press Ctrl/Cmd+Enter).
   Try a new setting, lighting, camera movement, or action. Use **Refine this
   scene** for smaller adjustments; uncheck **Keep brand in scene** when the
   new direction should also be free to change the sponsor.
6. Pause/resume or end the take. Disconnect when finished to release the session.
7. Review **Activity** and export the local creative history.

Directions are asynchronous. An acknowledgement means the model accepted the
prompt, not that the requested visual result is guaranteed. Video evolves over
subsequent generated chunks. See the
[Reactor model API](https://www.reactor.inc/models/visko-orbis-stable/api).

## Architecture

- `components/studio/` contains the product shell and focused workflow panels.
- `hooks/use-live-continuation.ts` owns Reactor connection and command state.
- `lib/studio-data.ts` defines campaigns, audience matching, scene briefs, and assets.
- `lib/placement-frame.ts` composites the actual artwork onto the reference frame.
- `lib/continuation-prompt.ts` builds the asset-aware opening prompt.
- `lib/live-direction.ts` builds full-pivot and context-preserving refinement prompts.
- `app/api/continuations/eligible` applies campaign selection rules.
- `lib/knowledge/` holds the knowledge base, guard, retrieval, prompt engineer, audit log,
  and suggestions; `app/api/campaigns/[id]/{knowledge,suggestions}` expose them.
- `app/api/continuations/prepare` validates the campaign/asset selection and creates a
  run identifier and prompt.
- `app/api/continuations/pivot` validates and composes a new live direction.
- `app/api/token` exchanges the server-held Reactor API key for a short-lived
  browser session token.

The product and production data model are described in
[`docs/DYNAMIC_AD_PLATFORM_PLAN.md`](docs/DYNAMIC_AD_PLATFORM_PLAN.md).
This implementation adds free-form live direction and manual brand selection
beyond that initial plan.
For another engineer taking ownership, see [`HANDOVER.md`](HANDOVER.md).

## Verify

```bash
npm test
npm run typecheck
npm run build
# With the app running on localhost:3000:
npm run test:api
```

## Security

The Reactor API key remains server-side and `.env.local` is ignored by Git.
The browser receives only a short-lived model-scoped JWT. Source clips are
decoded locally; the composed starting frame and scene prompts are sent to
Reactor when generating. Creative activity is stored in this browser's local
storage, not a server audit database. Artwork uploads and user-imported source
media stay in memory and must be reselected after a refresh. Bundled demo scenes
remain available from the Scene library.

This is a local hackathon prototype, not a multi-tenant hosted service. Add user
authentication, authorization, rate limits, persistent campaign/media storage,
and server-side audit records before exposing the token endpoint publicly.
