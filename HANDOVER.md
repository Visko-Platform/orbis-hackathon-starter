# Orbis Ad — Engineering Handover

## 1. Current status

Orbis Ad is a working local hackathon prototype for generating live,
brand-integrated video continuations from a user-supplied movie frame. The
current build supports:

- real Pepsi, McDonald's, and Nike campaign assets;
- uploaded video or still-image source material;
- browser-side 16:9 frame capture and artwork compositing;
- manual campaign selection or deterministic sample-audience matching;
- live Visko Orbis video and picture-driven audio through Reactor;
- free-form full-scene pivots and context-preserving refinements;
- pause, resume, reset, disconnect, local activity history, and JSON export.

The production build and automated tests pass. A live test has also covered
image upload, Orbis start, a complete scene pivot, pause, resume, end, and
disconnect.

Repository: <https://github.com/mian-abd/Orbis-ad>

## 2. Start the project

Requirements:

- Node.js 20.9 or newer;
- npm;
- a Reactor API key authorized for `reactor/visko-orbis-stable`.

Create `.env.local` from `.env.example` and set:

```dotenv
REACTOR_API_KEY=your_key_here
```

Then run:

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

Never commit `.env.local`, a token response, or a browser JWT. The file is
already ignored by Git.

## 3. Demo walkthrough

1. In **Studio**, choose Pepsi, McDonald's, or Nike.
2. Choose a logo, product image, or campaign image. A custom PNG, JPEG, or
   WebP can also be added to the active campaign.
3. Under **Source & reference frame**, upload a clip and scrub to a frame, or
   upload a still image.
4. Compare **Original** and **Placement**. Expand **Scene brief & placement**
   to adjust the prompt and artwork position.
5. Select **Generate live** and wait for the live output. A cold provider
   session can take time to warm.
6. Enter a direction such as “Move into a neon rooftop garden at night.”
   **Change direction** replaces the old setting and story instructions;
   **Refine this scene** preserves recent context and changes only the named
   details.
7. Leave **Keep [brand] in scene** enabled to restate the sponsor constraint,
   or disable it for a fully unconstrained creative pivot.
8. Demonstrate pause/resume, then end and disconnect the take.
9. Open **Activity** to show or export the browser-local history.

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
prompt remains below the hook's 4,000-character limit.

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
- The long-term viewer-request guardrail and campaign knowledge base described
  in the platform plan are design work, not implemented runtime features.

## 10. Recommended next work

1. Add authentication, workspaces, roles, and server-side rate limiting.
2. Persist brands, campaigns, assets, rights, scenes, runs, and prompt versions
   in PostgreSQL; move media to object storage with signed access.
3. Add real film-ingest jobs: metadata extraction, contact sheets, handoff
   frames, and continuity review.
4. Add brand approval states and enforce rights windows, territory, title,
   placement surface, frequency, and campaign budgets server-side.
5. Implement the viewer-director layer from the platform plan so public viewer
   text is resolved against an approved campaign knowledge base before model
   steering.
6. Add placement tracking or a video inpainting/compositing provider for
   frame-level integration into existing clips.
7. Replace browser-local history with append-only server events and exportable
   reports.
8. Add accessibility and cross-browser automation, load tests, observability,
   and cost/session dashboards.

## 11. Deployment checklist

- Configure `REACTOR_API_KEY` as a server secret.
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
