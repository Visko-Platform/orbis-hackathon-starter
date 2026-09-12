---
spike: 001
name: scaffold-orbis-sample-app
type: standard
validates: "Given the official create-reactor-app CLI and the visko-orbis-stable model, when scaffolded and booted without a live REACTOR_API_KEY, then the app installs, type-checks, builds, and serves a safe fallback instead of crashing"
verdict: VALIDATED
related: []
tags: [reactor, scaffold, nextjs, auth, pre-hackathon]
---

# Spike 001: Scaffold Orbis Sample App

## What This Validates

Given the official `create-reactor-app` CLI and the `visko-orbis-stable` model template,
when run today (2026-09-11, the day before the hackathon, with no Reactor API key issued yet),
then the scaffold succeeds, `pnpm install`/`pnpm build`/`pnpm dev` all work cleanly, and the
app's own "no API key" fallback path renders correctly rather than the app crashing or hanging —
de-risking the literal first build step of Phase 1 before event time pressure hits.

## Research

Project research (`.planning/research/STACK.md`, captured 2026-09-11) had already reverse-engineered
this template from the vendor's public GitHub source, without actually running the CLI. This spike
is the first real execution of that research against the live package/registry/template on the day
before the event.

| Approach | Tool/Library | Pros | Cons | Status |
|----------|-------------|------|------|--------|
| Official scaffold | `npx create-reactor-app <name> --model=visko-orbis-stable` | Zero hand-rolled WebRTC/auth plumbing; matches vendor-maintained template exactly | Template is resolved live from GitHub's default branch — could drift before event day | **Chosen** |
| Hand-rolled Next.js + raw `@reactor-team/js-sdk` | manual | Full control | Reinvents auth route, typed command surface, fallback UX for no reason in a 5.5h build | Rejected |

**Chosen approach:** official CLI scaffold, exactly as documented in STACK.md and PROJECT.md.

**Pre-flight check:** confirmed `reactor-team/create-reactor-app` is a **public** GitHub repo
(`GET /repos/reactor-team/create-reactor-app/contents/templates` → `200`, no auth), so no `--token`
flag or interactive prompt was expected — confirmed true in practice (see Results).

## How to Run

```bash
npx create-reactor-app my-orbis-app --model=visko-orbis-stable
cd my-orbis-app
pnpm build   # production build / typecheck
pnpm dev     # boot dev server on :3000
curl -s http://localhost:3000/                    # expect "Setup required" fallback, HTTP 200
curl -s http://localhost:3000/api/reactor/token    # expect {"error": "..."} , HTTP 500
```

## What to Expect

- Scaffold completes non-interactively (no token prompt, no project-name prompt — both were
  supplied as CLI args and the repo is public).
- `pnpm build` compiles, type-checks, and statically generates `/` and `/_not-found` with no errors.
- `pnpm dev` boots in ~1s.
- Without `REACTOR_API_KEY` set: home page renders a friendly "Setup required" screen (HTTP 200,
  not a crash/500), and `/api/reactor/token` returns `{"error":"REACTOR_API_KEY is not set on the
  server"}` with HTTP 500 — a clear, structured failure rather than an unhandled exception.

## Investigation Trail

1. **Confirmed repo is public** before running the CLI, to rule out needing `--token` —
   `api.github.com/repos/reactor-team/create-reactor-app/contents/templates` returned `200`
   unauthenticated.
2. **Ran the scaffold** at the project root: `npx create-reactor-app my-orbis-app
   --model=visko-orbis-stable`. Completed in ~12s (pnpm-based install, 55 packages, no prompts).
   Output confirmed a point STACK.md had flagged as a risk ("exact current SDK method
   names/shapes... may have shifted") — versions matched STACK.md's researched versions exactly:
   `@reactor-models/visko-orbis-stable@2.3.0`, `@reactor-team/js-sdk@3.0.0`, Next.js `15.5.24`,
   React `19.2.8`. No drift since 2026-09-11 research was captured.
3. **Inspected the generated tree** — matches STACK.md's predicted structure exactly:
   `app/lib/visko.ts` (thin wrapper exporting `sendSetPrompt`, `sendSetImage`, `sendSetSeed`,
   `sendSetResolution`, `sendSetAudioPrompt`, `sendSetAudioEnabled`, `sendStart`, `sendPause`,
   `sendResume`, `sendReset` — the exact command surface STACK.md had listed from a static read of
   the GitHub source), `app/api/reactor/token/route.ts` (the auth route), `ImageStarter.tsx`,
   `EvolveScene.tsx`, `PromptComposer.tsx`, `SnapClip.tsx`, plus four stock demo seed images in
   `public/images/` (not the project's own sanitized photo — that still needs to be swapped in
   during Phase 1's real build).
4. **Surprising find not in STACK.md:** a `SetupRequired.tsx` component and a server-side branch in
   `app/page.tsx` (`const hasKey = !!process.env.REACTOR_API_KEY; return hasKey ?
   <ViskoOrbisStableApp /> : <SetupRequired />`). STACK.md's research (based on reading source, not
   running it) didn't surface this fallback UX explicitly. This matters operationally: it means the
   app is safe to scaffold, build, and demo-boot *today*, a full day before the real API key is
   issued at event check-in, without risking an unhandled crash or a confusing blank screen.
5. **Verified the fallback live**, not just by reading the component:
   - `pnpm build` → clean compile, typecheck, and static generation (4 routes, no errors).
   - `pnpm dev` → ready in 1034ms.
   - `GET /` → HTTP 200, body contains "Setup required" (confirmed via `curl | grep`).
   - `GET /api/reactor/token` → HTTP 500, `{"error":"REACTOR_API_KEY is not set on the server"}` —
     confirms the token route's own guard clause (`if (!apiKey) return ...500`) fires correctly,
     not a generic unhandled-exception 500.
6. **Did not attempt:** live session connect, image upload, or `start()` — these require a real
   `rk_...` API key, which per PROJECT.md is only granted at on-site event check-in (2026-09-12).
   This spike stops at the boundary of what's provable without that credential.
7. Dev server was stopped (`pkill -f "next dev"`) after verification; confirmed port 3000 no longer
   responds.

## Results

**Verdict: VALIDATED ✓**

- Scaffold, install, build, and dev-boot all work cleanly today, with package versions exactly
  matching what STACK.md predicted from static source reading — zero drift in the ~0 days since
  that research was captured.
- The template's own no-API-key fallback (`SetupRequired.tsx` + the `hasKey` branch in
  `page.tsx`) is a previously-undocumented safety net: the scaffolded app is fully buildable and
  demo-safe to leave running *before* the real API key exists, which removes a "what if the app
  just crashes with no key" unknown that STATE.md had implicitly left open.
- Confirms STATE.md's Phase 1 blocker note ("confirm exact current SDK method names/shapes at
  build time") — resolved: no drift found.
- **Not yet provable** (needs the event-issued `rk_...` key, 2026-09-12): token-minting actually
  succeeding against `api.reactor.inc`, reaching session `ready` status, image upload via
  `uploadFile`/`setImage`, and a live generated video frame. These remain Phase 1's real
  success criteria and should be the very first thing attempted once the key is issued, reusing
  this exact scaffolded app (`my-orbis-app/` at the project root) rather than re-scaffolding.
- **Action for Phase 1 build:** `my-orbis-app/` now exists at the project root as the real starting
  point — copy the sanitized, 16:9-cropped Cavite City photo into `public/images/` (or wire
  `ImageStarter.tsx` to accept an upload) to replace the four stock demo images before the event.
