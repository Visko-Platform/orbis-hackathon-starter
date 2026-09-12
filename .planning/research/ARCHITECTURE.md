# Architecture Research

**Domain:** Live, presenter-steered generative video demo (Reactor / Visko Orbis-Stable, Next.js single-page app)
**Researched:** 2026-09-11
**Confidence:** MEDIUM-HIGH — core scaffold/auth/session-lifecycle pattern is confirmed directly from `docs.reactor.inc` and a public model API reference page (Helios); the Orbis-Stable-specific image/video-seed command names are inferred from the platform's shared SDK pattern plus the underlying Visko Orbis model's public playground copy, not from an Orbis-Stable-specific API page (that page returns 404 / requires login as of 2026-09-11).

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER (client, public)                     │
├─────────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌─────────────────┐  ┌────────────────────┐    │
│  │ Seed picker /   │  │ Reactor session  │  │ Steering UI         │    │
│  │ static asset    │→ │ client (SDK):    │← │ (preset "beat"      │    │
│  │ (photo/clip)    │  │ connect, upload, │  │ buttons + fallback   │    │
│  │                 │  │ setPrompt/Image, │  │ free-text input,     │    │
│  │                 │  │ start/stop       │  │ start/stop controls) │    │
│  └────────────────┘  └────────┬─────────┘  └────────────────────┘    │
│                                │ WebRTC (video track + data channel)  │
│                       ┌────────▼─────────┐                           │
│                       │ <video> element   │  live rendered stream     │
│                       └──────────────────┘                           │
├─────────────────────────────────────────────────────────────────────┤
│                    NEXT.JS SERVER (private, holds secret)             │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ app/api/token/route.ts                                          │  │
│  │  - reads REACTOR_API_KEY from server env (never sent to client) │  │
│  │  - POSTs to https://api.reactor.inc/tokens with                 │  │
│  │    Reactor-API-Key header + authorization_details scoping        │  │
│  │    (model match, max_sessions)                                   │  │
│  │  - returns short-lived JWT (valid up to 6h) to the browser        │  │
│  └───────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                     REACTOR HOSTED INFRA (external)                  │
│  ┌──────────────┐   issues JWT   ┌────────────────────────────────┐ │
│  │ /tokens API  │◄───────────────┤ Orbis-Stable session runtime     │ │
│  └──────────────┘                │ (WebRTC media server, chunked    │ │
│                                   │ generation ~33 frames/chunk)     │ │
│                                   └────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

There is no application database, no user accounts, and no persistence layer in this project — the only two "components" that matter are the one Next.js API route (secret-holder) and the one client page (session driver + UI). Everything generative happens inside Reactor's hosted infra; the app is a thin, single-purpose client for it.

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|-------------------------|
| `app/api/token/route.ts` (server) | Hold `REACTOR_API_KEY` in server-only env var; exchange it for a short-lived JWT on request; never expose the raw key | Next.js Route Handler, `POST` to `https://api.reactor.inc/tokens` with `Reactor-API-Key` header + `authorization_details` (scope to `models.match: ["reactor/orbis-stable"]`, `max_sessions: 1-3`) |
| Reactor session client (client) | Own the entire session lifecycle: connect with JWT, upload seed asset (if supported), send `setPrompt`/`setImage`/`setConditioning`, `start`/`stop`/`pause`, listen for track + status + chunk/error events | `@reactor-models/<model-slug>` SDK class (e.g. an `OrbisStableModel`, mirroring the public `HeliosModel` pattern), instantiated client-side only |
| Video renderer (client) | Attach the received `MediaStreamTrack` to a `<video>` element and play it | `onTrackReceived` handler → `videoRef.current.srcObject = new MediaStream([track])` |
| Steering UI (client) | Let the presenter fire preset "next beat" prompts in sequence, with a free-text fallback, plus start/stop; visually reflect `status` (connecting/ready/live/error) | React state machine keyed off SDK `statusChanged` events; buttons call `session.setPrompt(...)`, wired to an ordered array of beat strings |
| Seed asset store (client, static) | Hold the sanitized photo (and/or a short reenactment clip) as a static public asset for upload at session start | `public/seed.jpg` (and/or `public/seed.mp4`), fetched client-side and passed to `session.uploadFile(blob)` |
| Reactor hosted infra (external) | Run the actual Orbis-Stable model, terminate WebRTC, generate video in ~1.4s chunks, apply steering commands at chunk boundaries | Not something you build — treat as a black box behind the SDK |

## Recommended Project Structure

```
family-video-memories/                 # from `npx create-reactor-app . --model=orbis-stable`
├── app/
│   ├── api/
│   │   └── token/
│   │       └── route.ts        # ONLY server code that touches REACTOR_API_KEY
│   ├── layout.tsx
│   └── page.tsx                 # single page: mounts <SessionDemo />
├── components/
│   ├── SessionDemo.tsx           # owns Reactor session lifecycle + <video>
│   ├── SteeringPanel.tsx         # ordered "beat" buttons + free-text fallback + start/stop
│   └── StatusBadge.tsx           # connecting/ready/live/error indicator (de-risks live demo)
├── lib/
│   └── beats.ts                  # ordered array of pre-written prompt strings (the "script")
├── public/
│   ├── seed.jpg                  # sanitized photo, reused from World Hackathon repo
│   └── seed.mp4                  # (optional) short sanitized reenactment clip, if used as seed
├── .env.local                    # REACTOR_API_KEY=rk_... (server-only, gitignored)
└── package.json                  # @reactor-models/orbis-stable or generic @reactor-team/js-sdk
```

### Structure Rationale

- **`app/api/token/route.ts` isolated as the only server file that matters:** every other file in the app is static/client — this keeps the "what could leak the API key" surface to one file you can review in seconds before going on stage.
- **`components/SessionDemo.tsx` as a single owner of session state:** avoids splitting session lifecycle (connect/status/track) across multiple components, which is where race conditions ("sent `set_prompt` before `ready`") come from in a rushed build.
- **`lib/beats.ts` as a plain data file, not hardcoded JSX:** lets you edit the presenter's "script" (the sequence of steering prompts) independently of UI code, and edit it live during rehearsal without touching component logic.
- **`public/seed.*` as static assets, not a CMS/DB:** this is a single-session, single-presenter demo — there is no reason to build any content-management or upload UI; the seed is fixed at build time and just needs to be small enough to bundle/serve fast (see Integration Points).

## Architectural Patterns

### Pattern 1: Server-mints-JWT, client-owns-session

**What:** The only server-side responsibility is a single `POST` route that turns `REACTOR_API_KEY` into a scoped, short-lived JWT. Everything else — connecting, uploading the seed, sending commands, rendering video — happens entirely in the browser.
**When to use:** Any Reactor app, always. This is not optional or a "for small apps" simplification — it's the platform's stated security model (API key must never reach client code).
**Trade-offs:** Pro: trivially simple, no session state to manage server-side, no server-side scaling concerns. Con: the JWT is scoped by `authorization_details` at mint time (e.g. `max_sessions`), so if you need tighter per-demo control (e.g. one-shot tokens, short TTL for a stage demo) that logic belongs in the token route, not in a "trust the client" pattern.

**Example:**
```typescript
// app/api/token/route.ts
export async function POST() {
  const r = await fetch("https://api.reactor.inc/tokens", {
    method: "POST",
    headers: {
      "Reactor-API-Key": process.env.REACTOR_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      authorization_details: [{
        type: "session",
        resources: { models: { match: ["reactor/orbis-stable"] } },
        constraints: { max_sessions: 2 },
      }],
    }),
  });
  const { jwt } = await r.json();
  return Response.json({ jwt });
}
```

### Pattern 2: Status-gated command sequencing

**What:** Never call `setPrompt`/`setImage`/`start` until the SDK reports `status === "ready"`. Commands sent before that are silently dropped or rejected (`onCommandError`).
**When to use:** Every session start, and every reconnect. Also relevant when the presenter mashes buttons before the video has actually attached.
**Trade-offs:** Adds a small amount of state-machine complexity (idle → connecting → ready → live → ended/error) but is the single most common cause of "nothing happened when I clicked start" bugs in live demos.

**Example:**
```typescript
const [status, setStatus] = useState<"idle"|"connecting"|"ready"|"live"|"error">("idle");

session.on("statusChanged", (s) => setStatus(s.status));
session.on("trackReceived", (track) => {
  videoRef.current!.srcObject = new MediaStream([track]);
});
session.on("commandError", (e) => setStatus("error")); // surface, don't swallow

async function startSession() {
  if (status !== "ready") return; // guard
  if (seedFileRef) await session.setConditioning({ image: seedFileRef, prompt: beats[0] });
  else await session.setPrompt({ prompt: beats[0] });
  await session.start();
  setStatus("live");
}
```

### Pattern 3: Preset "beat" list drives steering, free text is the escape hatch

**What:** The primary steering control is an ordered list of pre-written prompt strings ("beats") rendered as buttons; tapping the next one calls `setPrompt`. A single free-text input sits alongside as a fallback for improvisation or recovery, not as the primary interface.
**When to use:** Any live, on-stage, timed demo where reliability and pacing matter more than flexibility.
**Trade-offs:** Pro: presenter never mistypes on stage, prompts can be pre-tested for visual quality before the demo, pacing matches rehearsed narration. Con: less adaptable if the model responds unexpectedly to a beat — the free-text fallback covers that case without requiring a UI rebuild.

## Data Flow

### Session Lifecycle Flow (full sequence)

```
1. Page load
   → client fetches POST /api/token (own server route)
   → server exchanges REACTOR_API_KEY for scoped JWT via
     POST https://api.reactor.inc/tokens
   → JWT returned to client (never the raw API key)

2. Client connects
   → const session = new OrbisStableModel()  // or generic SDK client
   → await session.connect(jwt)
   → status: idle → connecting

3. (If image/video seed is used) Client uploads seed asset
   → fetch("/seed.jpg") → blob
   → const fileRef = await session.uploadFile(blob)
   → held in component state until "ready"

4. Session becomes ready
   → "statusChanged" fires with status === "ready"
   → UI unlocks the steering panel (buttons enabled)

5. Presenter taps "Start" (first beat)
   → if seeded: await session.setConditioning({ image: fileRef, prompt: beats[0] })
     else:        await session.setPrompt({ prompt: beats[0] })
   → await session.start()
   → status: ready → live

6. Video track received
   → "trackReceived" fires with a MediaStreamTrack
   → videoRef.current.srcObject = new MediaStream([track])
   → <video autoPlay playsInline> renders the live stream

7. Presenter steers live (repeat as narration progresses)
   → tap next beat button (or type free text)
   → await session.setPrompt({ prompt: beats[i] })
   → SDK applies at next chunk boundary (~1.4s @ 24fps, not instant)
   → (optional) onChunkComplete fires per ~33-frame chunk, useful for a
     subtle "steering applied" UI cue if you have time to add it

8. Presenter stops
   → await session.stop()  (or session.pause() if a resume is wanted)
   → status: live → ended
   → video element can be cleared / session torn down
```

### Where source material enters the flow

- **If Orbis-Stable session accepts `setImage`/`setConditioning` (image seed):** inject at step 3–5. Upload happens once, right after `connect`, before or bundled into the first `start` call. This is the ideal path — it directly uses the sanitized photo.
- **If it accepts a starting video (per Visko Orbis's own "feed a video and the same world continues" capability):** same injection point, `uploadFile` on an `.mp4` blob instead of `.jpg`; check the ~193MB clip library needs trimming to a short (5-15s) clip first — large uploads risk eating stage time and network headroom.
- **If Orbis-Stable turns out to be text-prompt-only for this event** (the confirmed fallback per PROJECT.md's open question): the photo/clip never enters the SDK at all. Instead, write a rich text description of the seed content (subject, setting, era, action) and pass it as the *first* `beats[0]` prompt via `setPrompt`. In that case, still display the sanitized photo as a static `<img>` next to the video output — purely for presenter narration/audience context, decoupled from the generation pipeline.
- **Either way, decide this at the very start of the build (see Build Order below)** — it determines whether `SessionDemo.tsx` needs an upload step at all, which changes the shape of the state machine.

### Steering UI State

```
[beats: string[]]  (lib/beats.ts, e.g. 5-8 short prompts in narration order)
      ↓ (index pointer, advances on tap)
[SteeringPanel] → session.setPrompt({ prompt: beats[i] }) → [SessionDemo status]
      ↑                                                            ↓
[free-text input] ──(escape hatch, same call)──────────────────────┘
```

Keep the beat index and free-text input as two ways to reach the *same* `setPrompt` call — do not build two separate code paths for "preset" vs "custom" prompts; they should differ only in where the string comes from.

## Scaling Considerations

This app has no traditional scaling curve — it's a single presenter, single session, one time slot. Reframe "scale" as **demo robustness under stage conditions**:

| Concern | Rehearsal (you, quiet wifi) | Stage (you, event wifi, time pressure) | If it breaks live |
|---------|------------------------------|------------------------------------------|---------------------|
| Network/WebRTC quality | Usually fine | Event wifi is the single biggest risk to a live video demo — test on the actual venue network if at all possible, well before your slot | Have a pre-recorded screen capture of a successful run as a fallback video to show if live connection fails |
| JWT/token minting | One `/api/token` call, works | Same, but token TTL (up to 6h) means you can mint once early and not re-mint mid-demo | Keep the token route idempotent/cheap so a retry costs nothing |
| Seed upload size | `.jpg` is trivial; if using a trimmed `.mp4` clip, keep it under ~10-20MB, not the full 193MB library | Large uploads over venue wifi during the live demo are a bad idea | Pre-upload/pre-warm the seed asset before going on stage, not during the countdown |
| Command timing (chunk boundaries) | Commands apply within ~1.4s, feels instant in rehearsal | Under time pressure, presenter may tap beats faster than chunks resolve | Rehearse the actual tap cadence against real chunk latency, not against assumptions |

### Scaling Priorities

1. **First and only real risk: does a session establish and render video at all.** Nothing else in this table matters until this works once, reliably, on your machine.
2. **Second: does it survive the venue network.** A demo that works on home wifi but not conference wifi is a common last-mile failure for WebRTC apps — budget explicit test time on-site before your slot, not just at home.

## Anti-Patterns

### Anti-Pattern 1: Minting the JWT client-side, or embedding the API key as a `NEXT_PUBLIC_*` env var

**What people do:** Under time pressure, skip the server route and just call `https://api.reactor.inc/tokens` directly from the browser with the raw API key, or expose the key via a `NEXT_PUBLIC_REACTOR_API_KEY`.
**Why it's wrong:** The key becomes visible in browser devtools/network tab; anyone at the hackathon (or anyone who later views the deployed demo, or the public repo if `.env.local` gets committed) can extract and use your credits. This is explicitly the thing Reactor's own docs warn against.
**Do this instead:** Always route through `app/api/token/route.ts`. Confirm `.env.local` is gitignored (it is, by default, in `create-reactor-app`'s scaffold) before your first commit.

### Anti-Pattern 2: Sending commands before `status === "ready"`

**What people do:** Call `setPrompt`/`start` immediately after `connect()` resolves, assuming connect = ready.
**Why it's wrong:** `connect` establishes the WebRTC/session handshake; `ready` is a separate, later state. Commands sent early are dropped or error, and on stage this reads as "nothing happened," which is the worst failure mode for a live demo (silent, not obviously debuggable in the moment).
**Do this instead:** Gate all command-sending UI (including button `disabled` state) on the `statusChanged` → `ready` event, and surface a visible status badge so you (the presenter) always know the true state, not just what you assume it is.

### Anti-Pattern 3: Building the freeform prompt-typing UI as the primary steering interface for a live demo

**What people do:** Ship a plain text input as the only way to steer, planning to type live prompts on stage.
**Why it's wrong:** Typing accurately, under time pressure, in front of an audience, while also narrating out loud, is a well-known live-demo failure mode — typos, slow typing, and split attention between keyboard and audience all degrade the demo's pacing and polish.
**Do this instead:** Pre-write 5-8 "beat" prompts in narration order (see Pattern 3), render them as large tap-targets, and keep free text only as a secondary/recovery input.

### Anti-Pattern 4: Treating the 193MB reenactment clip library as something to wire in wholesale

**What people do:** Try to make the full clip library selectable/uploadable at demo time, or bundle it into the app's static assets.
**Why it's wrong:** Eats build time on a UI feature (asset picker) that isn't the risky part of this project, and risks large-file upload/network issues during the actual live demo.
**Do this instead:** Pick one photo and, if needed, one short (trim to 5-15s) clip *before* the build starts (per PROJECT.md's Active requirements), commit only that trimmed asset to `public/`, and never expose an in-demo asset-selection UI.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Reactor `/tokens` API | Server-to-server `POST` from `app/api/token/route.ts`, `Reactor-API-Key` header, `authorization_details` body scoping model + max sessions | Confirmed from `docs.reactor.inc`; JWT valid up to ~6h, so minting can happen once per page load, not per command |
| Reactor Orbis-Stable session (WebRTC) | Client-side SDK (`connect`, `uploadFile`, `setPrompt`/`setImage`/`setConditioning`, `start`/`stop`/`pause`, event listeners) | Confirmed lifecycle/event names from the public Helios API reference page, which the project's own docs cite as the generic example; Orbis-Stable's dedicated API reference page is gated/404'd publicly as of 2026-09-11, so the exact method names for that specific model should be re-verified against the actual npm package's TypeScript types once installed at the event |
| Static seed assets | Served from Next.js `public/`, no CDN/DB needed | Keep the video seed short and small; do not point directly at the ungitignored 193MB R2 bucket at runtime |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `app/api/token/route.ts` ↔ `SessionDemo.tsx` | One `fetch("/api/token")` call, returns `{ jwt }` | The only client↔server boundary in the whole app; keep it that thin |
| `SessionDemo.tsx` ↔ `SteeringPanel.tsx` | Props/callbacks: `SessionDemo` owns the `session` instance and `status`; `SteeringPanel` is presentation-only and calls back up (`onBeatSelected(prompt)`) rather than holding its own session reference | Avoids two components racing to call SDK methods independently |
| `lib/beats.ts` ↔ `SteeringPanel.tsx` | Plain array import | Lets you edit the presenter's script without touching component code, useful for last-hour rehearsal tweaks |

## Sources

- `docs.reactor.inc` (Overview / quickstart) — scaffold command, server/client split, `/tokens` endpoint, `Reactor-API-Key` header, event names (`trackReceived`, `statusChanged`), `set_prompt`/`start` command pattern, JWT lifetime (up to 6h). Pulled 2026-09-11. Confidence: HIGH (first-party docs, directly fetched).
- `https://www.reactor.inc/models/helios/api` — full public code sample for a Reactor model's SDK: `connect`, token exchange with `authorization_details`, `setPrompt`, `start`, `pause`/`resume`, `uploadFile`, `setImage`, `setImageStrength`, `setConditioning`, `onChunkComplete`, `onCommandError`, chunking at 33 frames (~1.4s @ 24fps). Pulled 2026-09-11. Confidence: HIGH (first-party, publicly accessible without login) for the *pattern*; MEDIUM for assuming Orbis-Stable exposes the identical method set, since PROJECT.md itself notes Helios is "the docs' generic example," not Orbis-Stable's own page.
- `https://viskoorbis.com/` (Visko Orbis playground/marketing page) — confirms the underlying model accepts text, still-image ("drop a still ... model holds identity, wardrobe, and room while motion begins"), and existing-video ("feed a video and the same world continues") seeds, plus a "steer while it runs" live-prompt-update workflow. Pulled 2026-09-11. Confidence: MEDIUM (marketing/product copy, not an API reference; strong directional signal that image/video seeding exists at the model level, consistent with PROJECT.md's independent research).
- `www.reactor.inc/models/orbis-stable` and `docs.reactor.inc/model-api-reference/orbis-stable/*` — attempted directly; both returned 404 or a login wall as of 2026-09-11. This is the confirmed open question already logged in PROJECT.md and should be re-checked first at the event (or once dashboard/docs access is granted).
- PROJECT.md (this repo) — synthesizes prior first-party research pulled 2026-09-11 from `docs.reactor.inc` and `reactor.inc/models`; treated here as an already-verified source rather than re-derived from scratch.

---
*Architecture research for: Reactor / Orbis-Stable live-steered video demo (hackathon, solo, ~5.5h build)*
*Researched: 2026-09-11*
