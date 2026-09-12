# Arena

A two-team battle prototype built on Visko Orbis Stable. Enter character ideas in the two chat panels, then generate one 16:9 opening image with both fighters on a random stage. During each 30-second turn, enter move ideas in those same panels. Orbis receives a new prompt for each turn while continuing the video stream.

## Run locally

Requires Node.js 20.9+, a Reactor key with Orbis Stable access, and an OpenRouter key for character creation, image generation, and move summaries.

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Set `REACTOR_API_KEY` and `OPENROUTER_API_KEY` in `.env.local`. Open <http://localhost:3000>, enter at least one fighter idea on each side, and click **Generate battlefield**. GLM 5.3 Flash `z-ai/glm-5.3-flash` combines each side's ideas into a fighter description and later summarizes moves; FLUX.2 Pro generates the opening image on a random stage. You can regenerate it during setup. Click **Begin battle** to connect Orbis and start from that image.

The two chat panels and battle state live in the host browser. Move ideas entered before a turn ends are combined into one action per side. The host resolves the turn automatically at the end of the window or with **Resolve turn**. HP and the outcome update independently of the video prompt.

If Reactor returns HTTP 429 because no server is available, the app retries twice and shows an error. Try connecting again when capacity returns.

## Battle rules

Each fighter starts at 100 HP. A summarized move containing a guard, shield, block, dodge, defense, or protection word is a guard action; other nonempty moves are attacks. An attack deals 18 damage. A guard deals 12 damage and reduces incoming damage by 7. A silent side holds position and deals no damage. Both actions resolve simultaneously, and HP never drops below zero. When either fighter reaches zero, the app sends a final defeat prompt, ends turn-taking, then pauses the stream after the reveal.

HP and match outcome are calculated by [`lib/battle-rules.ts`](lib/battle-rules.ts), independent of the generated video. The exact HP totals and defeat result are included in every successive Orbis prompt. The video is illustrative; it cannot guarantee a precise depiction of the rule outcome, so the HP display remains authoritative.

## Scope

Battle state lives in the host browser and resets on refresh. The token route keeps the Reactor API key on the server. Orbis may need several minutes to warm a new session after **Begin battle**. If Reactor reports no available capacity (HTTP 429), the app retries twice and then shows a clear message.

See [Orbis Stable's API reference](https://www.reactor.inc/models/visko-orbis-stable/api) for model details.
