# Stack Research

**Domain:** Real-time steerable video app on Reactor's Orbis-Stable model (WebRTC live-video demo, Next.js)
**Researched:** 2026-09-11
**Confidence:** HIGH overall (verified against the vendor's own public GitHub source, live npm registry, and the actual `visko-orbis-stable` template source code — not just marketing docs). One area (live per-second billing rate) is LOW/unconfirmed and flagged below.

**Primary source of truth used:** `github.com/reactor-team/create-reactor-app`, specifically `templates/visko-orbis-stable/` — this is the *actual scaffolded output*, including working code, a model-specific `README.md`, and a `skill/SKILL.md` written by Reactor for agents extending it. This is materially more reliable than the marketing/docs pages, which are thinner and partly summarized/gated. Package versions were cross-checked live against the npm registry (`registry.npmjs.org`) on 2026-09-11, days after these packages were published — so this is as current as it gets for a platform that launched 2026-09-01.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `create-reactor-app` (CLI) | `2.2.0` (latest on npm, confirmed) | Scaffolds the whole app in one command | Official Reactor CLI; clones a maintained per-model Next.js template from `reactor-team/create-reactor-app` on GitHub. Zero reason to hand-roll the WebRTC/auth plumbing yourself in a 5.5-hour build. **HIGH confidence** (verified via `npm registry` + GitHub repo contents). |
| Next.js | `^15.5.0` (App Router) | Frontend framework + server-side API route for JWT minting | **Confirmed, not assumed**: the template's own README states "one runnable Next.js app per model Reactor serves on the API." Every non-Python template is "Standalone Next.js 15 + React 19 + Tailwind v4 + TypeScript." The scaffold gives you `app/api/reactor/token/route.ts` for free — the exact server-side JWT exchange you need, already wired to `.env`. **HIGH confidence.** |
| React | `^19.1.0` | UI | Ships with the Next.js template; use the typed hooks, don't fight it. **HIGH confidence.** |
| `@reactor-team/js-sdk` | `^3.0.0` (latest published: `3.0.2`, 2026-09-09) | Base Reactor SDK — WebRTC session lifecycle, generic `Reactor` class, `sendCommand`, recording (`SnapClip`) | The low-level SDK all models are built on. You mostly won't call it directly if you use the typed package below — except for clip recording, which is deliberately only on the base SDK. **HIGH confidence.** |
| `@reactor-models/visko-orbis-stable` | `^2.3.0` (latest on npm, published 2026-09-01 — the same day Orbis launched) | **Typed** per-model SDK: `ViskoOrbisStableProvider`, `useViskoOrbisStable()`, and named command methods (no hand-written wire strings) | This is the one that actually matters for your demo. It gives you `setPrompt`, `setImage`, `setSeed`, `setResolution`, `setAudioEnabled`, `start`, `pause`, `resume`, `reset` as real typed methods, plus typed message hooks (`useViskoOrbisStableState`, `...CommandError`, `...ChunkComplete`, etc.) and a ready-made `<ViskoOrbisStableMainVideoView audioTrack="main_audio" />` component. **HIGH confidence — this is literally what the scaffold installs.** |

### Model slug — the two names you need (verified, not guessed)

| Context | Exact value | Source |
|---|---|---|
| **CLI scaffold flag** | `visko-orbis-stable` | Folder name in `reactor-team/create-reactor-app/templates/` — confirmed via GitHub API listing. The CLI's own README states "a folder name there is a public identifier" and maps 1:1 by default. |
| **Runtime `MODEL_NAME` used server-side for the JWT scope** | `reactor/visko-orbis-stable` | Literal constant in the scaffolded `app/api/reactor/token/route.ts`: `const MODEL_NAME = "reactor/visko-orbis-stable";` |

**Command to run:**
```bash
npx create-reactor-app family-memory-demo --model=visko-orbis-stable
```
This is **HIGH confidence** — pulled directly from the CLI's source repo, not inferred. (Note: the sibling model `visko-orbis-dynamic` also exists as a template folder if resolution-switching becomes relevant, but Orbis-Stable remains the right primary choice per your PROJECT.md.)

### Supporting Libraries (already in the generated template — don't add these yourself, they come for free)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@reactor-team/ui` | `^1.4.1` | Design tokens/components used by some templates | Only if you keep the scaffold's visual shell; safe to rip out if you want your own styling (Family Album's hotspot pattern, etc.) |
| `hls.js` | `^1.6.0` | Present in the `visko-orbis-stable` template's deps | Likely a fallback/alt playback path; the primary path is the WebRTC `MediaStreamTrack` via `ViskoOrbisStableMainVideoView`, not HLS — don't build around HLS. |
| `zustand` | `^5.0.6` | Lightweight client state | Used internally by the template's UI composition; keep if convenient, not required for the core steering pipeline. |
| Tailwind CSS | `^4.1.0` | Styling | Ships pre-configured; fastest path to a passable-looking demo UI in a one-day hackathon — don't swap for a different CSS approach. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| pnpm | Package manager | Template's own `pnpm-lock.yaml` + README recommends pnpm ("pnpm (recommended) or npm"). Node 16+ required (in practice, use a current LTS). |
| `.env` / `.env.example` | Holds `REACTOR_API_KEY=rk_...` | Server-only — **never** expose this to the client. The scaffold's `.gitignore` should already exclude `.env`; double-check before any public commit given this repo's privacy constraints. |

## Installation

```bash
# Scaffold (this is the entire "install" step — SDKs come pre-wired)
npx create-reactor-app family-memory-demo --model=visko-orbis-stable
cd family-memory-demo
cp .env.example .env
# edit .env: REACTOR_API_KEY=rk_... (from reactor.inc/account/api-keys)
pnpm install
pnpm dev
# open the URL pnpm prints (README warns: "it may not be 3000")
```

No manual `npm install @reactor-team/js-sdk` or typed-package step is needed — the template's `package.json` already pins `@reactor-team/js-sdk@^3.0.0`, `@reactor-models/visko-orbis-stable@^2.3.0`, Next.js, React, Tailwind. Resist the urge to add packages beyond what you need for narration/UI polish; time budget is 5.5 hours.

## Auth Flow — Exact Request/Response (verified from actual generated code)

**Server-side (Next.js API route, `app/api/reactor/token/route.ts`, generated by the scaffold — GET, not POST, at the app layer):**

```ts
export async function GET() {
  const res = await fetch("https://api.reactor.inc/tokens", {
    method: "POST",
    headers: {
      "Reactor-API-Key": process.env.REACTOR_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      expires_after: 60 * 60, // 1 hour; server caps at 6h
      authorization_details: [{
        type: "session",
        resources: { models: { match: ["reactor/visko-orbis-stable"] } },
        constraints: { max_sessions: 10 },
      }],
    }),
  });
  const { jwt, expires_at } = await res.json();
  return NextResponse.json({ jwt, expires_at }, { headers: { "Cache-Control": "private, no-store" } });
}
```

- **Runtime confirmed:** this is a Next.js App Router API route (server component / route handler) — exactly what `create-reactor-app` generates. **HIGH confidence** (this is literal source, not a summary).
- **Critical gotcha (this will bite you if you skip it):** the JWT is **session-scoped** — it may only act on sessions *it itself created*. The client **must memoize one token in module scope** and reuse it for the entire session lifetime (uploads, ICE renegotiation, etc.), not re-fetch per request. The scaffold does this for you via a `fetchToken()` resolver passed to `<ViskoOrbisStableProvider jwtToken={fetchToken}>` — **do not replace this with a naive `fetch` per call**, or you'll get `403 "this token is session-scoped and is not authorized for this resource"` mid-demo.
- API key format: `rk_...`, obtained at `reactor.inc/account/api-keys`. Never send it to the browser — only the minted JWT reaches the client.

## The Critical Question: Does Orbis-Stable Accept an Image or Video Seed?

**Answer: YES to image. NO to video. This is now resolved, not open — confidence HIGH (verified in actual shipped source code, not marketing copy).**

- **Image seed: supported**, via an explicit (non-atomic) three-step chain:
  ```ts
  const ref = await uploadFile(file);      // returns FileRef
  await setImage({ image: ref });          // awaited call IS the "decoded" ack (js-sdk 3.0+)
  await setPrompt({ prompt: "..." });
  await start();
  ```
  The uploaded image anchors the **first chunk** of generation; later chunks inherit it through the model's own rolling history. **Constraint: the image is resized to 832×480 with no crop** — a non-16:9 source image will squash. This directly affects your source-material choice: **crop/pad the Cavite City photo to 16:9 before the demo**, or it will visibly distort.
  - Source: `templates/visko-orbis-stable/README.md` and `app/components/ImageStarter.tsx` in `reactor-team/create-reactor-app` (verbatim, not paraphrased).
- **Video seed: NOT supported by Orbis-Stable's Reactor-exposed API.** There is no `set_video`, `seed_video`, or video-continuation command in the model's command surface (`setPrompt`, `setImage`, `setSeed`, `setResolution`, `setAudioPrompt`, `setAudioEnabled`, `start`, `pause`, `resume`, `reset` — that is the complete list, confirmed from the shipped `app/lib/visko.ts` wrapper). "Image-to-video" is explicitly the ceiling; no "video-to-video" or "video continuation" command exists for this model on Reactor.
- **Gap between the underlying Visko Orbis 1.0 research model and Reactor's product API, now confirmed:** the arXiv paper (2607.26694) describes the underlying Orbis architecture as supporting **T2V, I2V, *and* V2V (video) continuation**, with a bounded multi-scale memory carrying state across chunks. Reactor's `visko-orbis-stable` product wrapper exposes only the **T2V and I2V** paths — the V2V/video-continuation capability described in the paper is either reserved for a different Reactor model (e.g. `x2`, which is explicitly a video-to-video streaming editor) or simply not yet exposed for Orbis-Stable specifically. **This means your ~193MB of raw MP4 reenactment clips cannot be used as a literal starting-video seed for Orbis-Stable** — only the sanitized *photo* can be used as a pixel-level seed. If you want the clip content represented at all, the only path is translating it into a **text prompt description** (e.g. "a woman stirring a pot over a charcoal stove on a narrow barrio street, postwar Philippines"), not feeding the video file itself.
- **Practical decision for your build:** treat the sanitized Cavite City barrio-cooking photo as your image seed (crop to 16:9 first), and treat the reenactment clip only as *narration reference material* for the presenter, not as an API input.

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Hand-rolling WebRTC (`getUserMedia`/`RTCPeerConnection`) yourself | Reactor's SDK already manages the whole connection lifecycle (`disconnected → connecting → waiting → ready`, ICE renegotiation, track subscription); reinventing this burns hours you don't have | `<ViskoOrbisStableProvider>` + `useViskoOrbisStable()` from the scaffold |
| Looking for a `setConditioning({ prompt, image })` atomic call on Orbis-Stable | That atomic helper exists on **Helios** (0.9+), not on Orbis-Stable — porting Helios patterns here will silently no-op or error | The explicit `setImage` → `setPrompt` → `start` chain, in that order |
| Treating `image_accepted` / `prompt_accepted` etc. as broadcast events you subscribe to (a pattern you may see in older Reactor examples or generic `sendCommand` docs) | On `@reactor-team/js-sdk` **3.x**, these acks are the **correlated reply to the awaited call itself** — they no longer broadcast as generic `message` events. Listening for a broadcast will "fire, but for any call of that command on this connection, and never on a second client." | `const accepted = await setImage({ image: ref })` — the resolved await **is** the ack |
| A fresh `fetch("https://api.reactor.inc/tokens")` on every action | Session-scoped JWTs are single-use-for-lifetime; re-minting mid-session causes `403` on every subsequent hop | Module-scope memoized token resolver (already in the scaffold) |
| Assuming the video seed path exists because the arXiv paper mentions V2V | Confirmed gap: Reactor's exposed `visko-orbis-stable` command surface has no video-input command | Text-prompt description of clip content, or image-only seeding |
| Building your own RTMP/HLS streaming pipeline | `hls.js` is a template dependency but not the primary path; the real transport is WebRTC via the SDK's video/audio tracks | `ViskoOrbisStableMainVideoView` |
| Committing `.env` or the raw API key to the (public) repo | This is a public hackathon repo with an explicit privacy boundary already in PROJECT.md | Confirm `.gitignore` excludes `.env`; keep `rk_...` out of any commit, screenshot, or on-stage screen share |

## Stack Patterns by Variant

**If you want live scene-morphing (the model's "hero feature") during narration:**
- Just call `setPrompt({ prompt })` again while `status === "ready"` and generation has started — no restart needed. It morphs at the next ~1.8s chunk boundary rather than cutting. This is the core "steer it live" mechanic your demo needs — build your UI around a simple text box / preset buttons calling this, per the `EvolveScene` component pattern in the template.

**If resolution, seed, or audio-enable need to change:**
- These are **start-time only** settings (`setResolution`, `setSeed`, `setAudioEnabled`) — call them *before* `start()`, not mid-run. Changing them mid-stream is a no-op until the next `start`/`reset`.

**If you skip the image seed entirely and go text-only:**
- Simpler build (skip `uploadFile`/`ImageStarter` component), but loses the literal "photo comes alive" pixel continuity — the demo becomes "text describes the memory" rather than "this photo becomes a memory." Given your Core Value statement, keep the image seed; it's the differentiator over a plain text-to-video demo.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@reactor-team/js-sdk@^3.0.0` | `@reactor-models/visko-orbis-stable@^2.3.0` | This is the exact pairing shipped in the template's `package.json` on 2026-09-11 — don't mix an older typed package with js-sdk 3.x; the ack/broadcast behavior changed in 3.x and older typed packages may assume the old broadcast pattern. |
| Next.js `^15.5.0` | React `^19.1.0`, Tailwind `^4.1.0` | Standard current Next.js 15 App Router pairing; no special notes. |
| `create-reactor-app@2.2.0` | Templates resolved live from the **default branch** of `reactor-team/create-reactor-app` on GitHub, not bundled in the npm package | A template fix ships instantly without a CLI release — meaning the exact file contents you get on hackathon day may differ slightly from what's quoted here if the repo is updated between now (2026-09-11) and event day (2026-09-12). Re-check `templates/visko-orbis-stable/README.md` on the day if anything behaves unexpectedly. |

## Latency, WebRTC, and On-Stage Practicalities (verified from the template's own "reality check" notes — this is the most operationally important section for a live demo)

- **Transport:** WebRTC (`MediaStreamTrack`s for `main_video` + `main_audio`, delivered via the SDK's connection object) — not HLS/RTMP for the interactive path. Marketing claims "**<1s round-trip latency**" and "sub-50ms streaming" platform-wide; treat these as best-case, warm-pod numbers, not what you'll see on a cold connection.
- **Cold start is minutes, not seconds** — confirmed in the model's own SKILL.md: "Startup is minutes. One live session per deployment; the SR model compiles, then the model runs three warmup chunks before it answers commands." A crashed/hard-exited client can hold the pod as a "zombie" for ~1–2 minutes before it's reaped.
- **Warm reconnect is fast** — once a pod is warm, connect measured at ~10s in the vendor's own recent test runs; the README explicitly flags this discrepancy so you don't mistake a cold first-connect for a broken build.
- **First chunk is always empty** — `frames_emitted: 0` on chunk 1 (super-resolution priming); first visible picture lands ~2 chunks in, roughly 3.7–4 seconds after `start()`. Build a "priming…" loading state into your UI rather than treating a blank video element as broken.
- **429 "no capacity" is a busy signal, not a failure** — "one live session per deployment"; the SDK auto-retries. **Operational implication for the hackathon: warm up your connection well before your 5:00 PM slot**, and be aware that concurrent Orbis-Stable usage from ~100 other approved builders on the same shared platform could produce capacity contention right before presentations. Do a full dry run (connect → seed → steer → stop) at least 15–20 minutes before your slot, and consider leaving a session "ready" (not necessarily generating) shortly before you go on, rather than cold-connecting live on stage.
- **Browser requirements:** standard modern-browser WebRTC support (`getUserMedia`-equivalent is handled by the SDK, not called directly by you) — no special browser flags found in docs. Test on the actual presentation laptop/browser beforehand; don't assume Chrome-on-your-dev-machine behavior matches the venue AV setup (screen mirroring, external display, Wi-Fi bandwidth for stage-side venue Wi-Fi in particular, since this is bandwidth-sensitive live video).

## Billing / Session-Length Practicalities

- **Model:** per-session-second billing while a session is connected/held on a GPU — you're billed for wall-clock connected time, not just active generation, and a "recoverable" disconnect keeps billing while the GPU is reserved for reconnect. **Confidence: MEDIUM** (from `docs.reactor.inc/resources/billing`, a docs page, not the template source).
- **Credits:** account balance in credits, 10,000 credits = $1 USD; promotional/signup credits expire in 90 days, purchased credits in 365 days; max account balance $10,000 in credits. **Confidence: MEDIUM.**
- **Orbis-Stable's actual per-second rate: UNCONFIRMED / LOW confidence.** The public pricing page lists Visko Orbis Stable's rate as "TBD — check the Dashboard for live pricing" as of 2026-09-11. One third-party tool-directory summary claimed "1 credit = 1 second of Orbis Stable" (i.e. ~$0.0001/sec), but this is an unofficial secondary source and conflicts with the official page's "TBD" framing — **do not plan your demo's session-length budget around this number**. **Action item: check the actual per-second rate in the Reactor dashboard at event check-in**, and set a hard client-side or manual disconnect timer (the docs' own hackathon tip: "set a hard timeout, e.g. five minutes," and disconnect immediately after each demo run rather than leaving sessions idle).
- **Nebius Builder Program credits:** confirmed to exist as a real program (Nebius AI Cloud / Token Factory / Tavily / Academy credits for builders), but **no public source ties a specific credit amount to *this* event** (the "Live Models Hackathon," Visko x Reactor x Nebius, Sept 12 2026) — general Nebius hackathon precedent (a different, separately-branded Nebius x NVIDIA hackathon) shows a pattern of ~$25 + $25 promo-code credits, but that is **not the same event** and should not be assumed to apply here. **Confirm Reactor API key issuance and any Nebius/Orbis credit allotment at on-site check-in** — this was already flagged as a constraint in PROJECT.md and remains correct.

## Sources

- `github.com/reactor-team/create-reactor-app` (public GitHub repo, vendor-maintained) — **HIGH confidence**, primary source for: CLI flags, generated project structure/framework, exact model slugs, full command surface for `visko-orbis-stable`, the token-route implementation, image-seeding chain, ack/broadcast behavior on js-sdk 3.x, and all "reality check" latency/capacity notes. Fetched 2026-09-11 directly from the repo's `main` branch via GitHub's raw content + API.
- `registry.npmjs.org` (live npm registry queries) — **HIGH confidence** — used to confirm current published versions of `create-reactor-app` (2.2.0), `@reactor-team/js-sdk` (3.0.2), `@reactor-models/visko-orbis-stable` (2.3.0), `@reactor-team/ui` (1.4.1), and their publish dates (all within days of the hackathon).
- `docs.reactor.inc` (`/overview`, `/quickstart`, `/api-reference/overview`, `/model-api-reference/overview`, `/model-api-reference/visko-orbis-stable/*`, `/sdk-reference/using-the-sdk`, `/resources/billing`) — **MEDIUM confidence**: content matches and corroborates the GitHub source above wherever both were checked, but was accessed via an AI-summarizing fetch rather than raw HTML, and one page (`/api-reference/overview`) showed a login-gate URL in search results even though content was retrievable — **treat any single unconfirmed doc-only detail as needing live re-verification at the event.**
- `reactor.inc/models`, `reactor.inc` marketing pages — **MEDIUM confidence** — used for the model catalog list and headline latency claims ("<1s round-trip," "sub-50ms"); marketing superlatives, not measured guarantees.
- `arxiv.org/abs/2607.26694` / `arxiv.org/html/2607.26694v1` (Visko Orbis 1.0 paper) — **HIGH confidence for what the underlying research model claims** (T2V/I2V/V2V, 4K/24fps, hour-scale memory) — but this describes Visko's own research model, not necessarily everything Reactor's product API exposes; used specifically to identify the confirmed research-vs-product gap on video seeding.
- PR Newswire / Yahoo Finance / The Robot Report coverage of Visko's Sept 1, 2026 $10M pre-seed + Orbis launch — **MEDIUM confidence** — corroborates the Reactor/Visko distribution partnership and launch timing context.
- No public source found for hackathon-specific Nebius credit amounts for this exact event — flagged as **LOW confidence / needs on-site confirmation**.

---
*Stack research for: Reactor / Orbis-Stable live steerable video hackathon build*
*Researched: 2026-09-11*
