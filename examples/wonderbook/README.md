# WonderBook — Little voices. Big adventures.

An interactive fairy-tale storybook by team **jvc** for the Live Models Hackathon.
Children suggest a topic, choose what happens next, and ask questions while
GPT writes the story and Orbis steers a continuous video scene.

- **Live demo:** https://live-models-hackathon-production.up.railway.app/
- **Source repository:** https://github.com/denemlabs/live-models-hackathon
- **Team:** jvc
- **Submission branch:** [`WonderBook-jvc`](https://github.com/denemlabs/orbis-hackathon-starter/tree/WonderBook-jvc)
- **Source snapshot:** [`1a1da9c`](https://github.com/denemlabs/live-models-hackathon/commit/1a1da9ccdcf664db16b1cae7e356f9f2edbf4431)

This directory is a standalone React / Vite / Express application with its own
dependencies and commands. The repository root remains the Next.js starter.

## Run locally

Requires **Node.js 24**. From the repository root:

```sh
cd examples/wonderbook
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. If running the root starter at the same time, use
`PORT=3001 npm run dev` for WonderBook.

Without API keys, illustrated sample mode works locally. Sample mode uses
prewritten stories and illustrations, not generated video. The bundled welcome
forest animation is decorative and is hidden when a story starts.

## Enable live stories

Set your own keys in the ignored `.env.local` file:

```dotenv
OPENAI_API_KEY=your-openai-key
REACTOR_API_KEY=your-reactor-key
ELEVENLABS_API_KEY=your-elevenlabs-key
```

Open **Grown-up settings**, enable live processing, and enter a topic. Choose a
numbered option or record a spoken answer to continue. Typing is always available;
no camera is used. Microphone access is requested only for voice features.

- OpenAI supplies structured stories, prepared choice prompts, moderation, and
  transcription. The story model defaults to `gpt-4.1-mini`.
- Reactor must grant access to `reactor/visko-orbis-stable`. An optional
  `REACTOR_API_KEY_BACKUP` can use a separate account with independent capacity.
- ElevenLabs supplies narration, with OpenAI TTS as a fallback. Optional live
  storyteller calls require ElevenLabs Agents access in addition to TTS access.
- The starter's optional Gemini image kickoff is not required here.

Never put API keys in client code or commit `.env.local`. The browser receives
scoped, short-lived session tokens. See `.env.example` for optional settings.

## Orbis integration

1. The app prepares an Orbis connection while GPT writes the first page.
2. `server/videoSessions.ts` owns token minting, a single tracked session,
   heartbeat cleanup, replacement, and backup-account selection.
3. `src/useOrbis.ts` declares both required receiving tracks (`main_video` and
   `main_audio`), adopts the server-created session, and exposes startup progress.
4. `src/orbisProtocol.ts` disables Orbis audio, sends `set_prompt`, waits for
   `conditions_ready`, then sends `start`. It handles correlated replies,
   model events, cancellation, and command deadlines.
5. Selecting a prepared option immediately sends its moderated visual prompt
   through `set_prompt` on the existing stream while GPT writes the next page.
   Freeform answers require GPT interpretation before video steering. Explicit
   appearance changes reset generation so the new scene can take effect.
6. Narration waits for a displayed video frame. A ready connection is retained
   briefly between stories and released when idle or when the page closes.
7. Narration restores playback mode after microphone capture on supported
   browsers; replay stops active recording before audio starts.

The live stream is asynchronous. Orbis cold starts can take minutes; startup
progress is shown, and failures are not silently presented as generated video.
A prompt acknowledgement confirms receipt, not that its visual action is visible.

## Project map

| Path | Purpose |
| --- | --- |
| `src/App.tsx` | Topic intake, choices, microphone answers, and UI |
| `src/useOrbis.ts`, `src/orbisProtocol.ts` | Video lifecycle and prompt steering |
| `server/app.ts`, `server/videoSessions.ts` | Server APIs and Reactor sessions |
| `shared/story.ts` | Story schema, model instructions, and choice plans |
| `server/narration.ts`, `server/storyteller.ts` | Narration and storyteller calls |
| `tests/` | API, session, prompt, narration, and UI helper regression tests |
| `public/` | Welcome media, sample illustrations, and brand assets |

## Validate and deploy

```sh
npm test
npm run build
npm start
```

On Railway, set the service **root directory** to `examples/wonderbook`, use
`npm run build` and `npm start`, and configure `/healthz` as the healthcheck.
Set keys in service variables. Mount persistent storage and set
`VIDEO_SESSION_STORE=/data/video-session.json` for cleanup across restarts.
The current session registry is designed for one service instance.

## Prototype scope

This is a supervised hackathon prototype. Age and accessibility preferences are
parent-selected; it does not infer emotions from eyes or voice. Stories,
recordings, and profiles are not stored by the app. Enabled providers receive
the text/audio needed for their feature and apply their own data policies.
Moderation does not guarantee that every generated image or story is suitable.

## References

- [Organizer starter](https://github.com/Visko-Platform/orbis-hackathon-starter)
- [Orbis Stable API](https://www.reactor.inc/models/visko-orbis-stable/api)
