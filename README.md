# Orbis Ad

Orbis Ad is a continuity studio for dynamic product placement in licensed film
moments. A studio operator selects a source clip and handoff frame, chooses a
consented audience profile, and launches a sponsor-integrated live continuation
through Visko Orbis on Reactor.

## What the hackathon build demonstrates

- Browser-based licensed clip upload, scrubbing, and 16:9 handoff capture
- A built-in synthetic handoff for rehearsals without source media
- Three film moments and three consented sample audience profiles
- Deterministic campaign eligibility for Pepsi, McDonald's, and Nike examples
- Optional upload of approved brand artwork
- Brand-conditioned handoff composition and continuity-safe prompt assembly
- Live Orbis video/audio streaming, pause, reset, and approved prompt steering
- Title library, campaign inventory, and an in-session audit ledger
- Responsive studio interface for desktop and mobile

The first version is a clip-to-live continuation product. It does not modify
the encoded frames of the source clip. The selected frame becomes the visual
anchor for a newly generated, continuous scene.

## Run locally

Requirements:

- Node.js 20.9 or newer
- A Reactor API key with access to `reactor/visko-orbis-stable`

Create `.env.local`:

```dotenv
REACTOR_API_KEY=your_reactor_api_key
```

Then run:

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Demo flow

1. Open **Studio** and select a licensed title moment.
2. Upload a licensed clip and scrub to the handoff, or select **Use demo
   handoff** for the synthetic rehearsal frame.
3. Switch among the three consented audience profiles and observe the selected
   eligible campaign.
4. Optionally upload approved sponsor artwork. Without an upload, the demo
   renders a typed brand treatment in the approved placement zone.
5. Select **Start live continuation**. The server prepares the locked prompt,
   mints a short-lived scoped Reactor token, uploads the conditioned frame, and
   starts Orbis.
6. Use one of the three approved story beats to steer the next live chunk.
7. Open **Audit ledger** to show model and operator events.

## Architecture

- `components/studio/` contains the product shell and focused workflow panels.
- `hooks/use-live-continuation.ts` owns Reactor connection and command state.
- `lib/studio-data.ts` defines the current film, campaign, placement, profile,
  and story-beat domain model.
- `lib/continuation-prompt.ts` builds the server-controlled continuity prompt.
- `app/api/continuations/eligible` applies campaign selection rules.
- `app/api/continuations/prepare` validates the locked selection and creates a
  run identifier and prompt.
- `app/api/token` exchanges the server-held Reactor API key for a short-lived
  browser session token.

The product and production data model are described in
[`docs/DYNAMIC_AD_PLATFORM_PLAN.md`](docs/DYNAMIC_AD_PLATFORM_PLAN.md).

## Security

The Reactor API key remains server-side and `.env.local` is ignored by Git.
The browser receives only a short-lived model-scoped JWT. Raw free-form prompt
steering is not exposed in the operator UI; only predefined story beats can be
sent during a run.
