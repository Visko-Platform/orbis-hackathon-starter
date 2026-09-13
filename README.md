# Family World: Video Memories

Inspired by https://family-world-flax.vercel.app

A [Live Models Hackathon](https://luma.com/gh4256ju?tk=ebBaE2) submission (Visko x Reactor x
Nebius, Sept 12, 2026) built on top of the [Orbis hackathon starter](https://github.com/Visko-Platform/orbis-hackathon-starter).
It turns archival family photos into explorable, animated experiences — swapping the static
3D-world generator from the [World Hackathon](https://github.com/romyilano/world_hackathon) idea
for a **live, steerable video model** (Visko Orbis Stable via Reactor), so a family memory can be
animated and interacted with in real time instead of just walked through.

## Requirements

- Node.js 20.9 or newer
- A Reactor API key with access to Visko Orbis Stable
- A Google Gemini API key with access to Nano Banana
- A Google OAuth client (for the presenter-only login gate)

## Run locally

```bash
cp .env.example .env.local
# Fill in the values below in .env.local.
npm install
npm run dev
```

Open <http://localhost:3000>.

```dotenv
REACTOR_API_KEY=your_reactor_api_key
GEMINI_API_KEY=your_gemini_api_key
AUTH_SECRET=generate_with_npx_auth_secret
AUTH_GOOGLE_ID=your_google_oauth_client_id
AUTH_GOOGLE_SECRET=your_google_oauth_client_secret
```

Keep all keys server-side. Never prefix any of them `NEXT_PUBLIC_`.

## Access model

- `/` is a public teaser landing page — anyone, judges included, can view it without logging in.
- `/session` renders the real Reactor app and is gated behind Google sign-in (see `auth.ts`,
  `middleware.ts`). Only the presenter's own Google account may sign in.
- `/api/reactor/token` mints billable Reactor session tokens and is gated the same way — this is
  the actual access-control boundary for the whole site, since Vercel Deployment Protection alone
  cannot cover a project's assigned production domain.
- `/internal/*` plus `/api/nano-banana` and `/api/orbis-prompt` are developer-only test surfaces
  and are also gated, since they burn `GEMINI_API_KEY` with no login otherwise.
- `/add-family` is gated the same way: saving a photo there calls `/api/nano-banana` and
  `/api/orbis-prompt` directly to restore the photo and ground an Orbis prompt in it, so only the
  signed-in presenter can add a family member.

## Keyless deploy

The app builds and serves successfully with `REACTOR_API_KEY` unset — `/session` renders a
"Setup required" landing page instead of crashing, so the site can go live before the event key
is issued.

### ⚠️ Before adding the Reactor key

Once `REACTOR_API_KEY` is set, `/api/reactor/token` becomes a live, billable token-mint route
behind the Google-login gate above. Before adding the key in production:

- Confirm the Google OAuth allowlist in `auth.ts` matches who should be able to sign in.
- Consider also enabling Vercel Deployment Protection as defense in depth.
- Remove the key again after the demo if billing is a concern.

## Project files

- `app/page.tsx` — public teaser landing ("Family World" design).
- `app/session/page.tsx` — gated entry point for the live Reactor app.
- `app/ViskoOrbisStableApp.tsx` — the Reactor/Orbis session UI.
- `app/SetupRequired.tsx` — fallback shown when `REACTOR_API_KEY` is unset.
- `app/components/` — gallery, header, prompt composer, and session UI pieces.
- `app/api/reactor/token/route.ts` — server-side Reactor token exchange.
- `app/api/nano-banana/route.ts` / `app/api/orbis-prompt/route.ts` — Gemini-grounded
  image-to-prompt pipeline.
- `app/lib/` — prompt and memory-prompt helpers.
- `auth.ts` / `middleware.ts` — NextAuth Google login gate and route matcher.
- `.env.example` — documents the required environment variables.

## Documentation

- [How Add Family turns a photo into an Orbis prompt](docs/memory-prompt-pipeline.md) — which
  form fields reach Gemini, what blank fields fall back to, and why the photo outranks the
  typed memory.

For the complete command parameters, message schemas, tracks, and current model behavior, see the
public Reactor documentation:

- [Visko Orbis Stable API](https://www.reactor.inc/models/visko-orbis-stable/api)
- [Visko Orbis Dynamic API](https://www.reactor.inc/models/visko-orbis-dynamic/api)
- [Gemini image generation and editing](https://ai.google.dev/gemini-api/docs/image-generation)
