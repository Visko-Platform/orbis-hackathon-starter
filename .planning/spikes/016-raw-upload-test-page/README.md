---
spike: 016
name: raw-upload-test-page
type: standard
validates: "Given both routes/prompts from spikes 014/015 wired together, when opened as an internal raw test page mirroring orbis-hackathon-starter's UI pattern (upload -> edit preview -> grounded prompt preview -> one button), then a developer can run the full pipeline end-to-end without going through the polished creation flow"
verdict: VALIDATED (wiring) — Gemini leg render PENDING
related: [014, 015]
tags: [ui, wiring, orbis, internal, security]
---

# Spike 016: Raw Upload Test Page

## What This Validates

Given the spike 014/015 API routes and prompts wired together, when opened as one internal page
mirroring `orbis-hackathon-starter`'s raw demo shape, then a developer can run the whole
upload → anchor image → grounded prompt → live Orbis stream pipeline end-to-end, with every raw
prompt visible, without touching the (not-yet-built) polished creation flow.

## Research

`orbis-hackathon-starter`'s `components/nano-banana-example.tsx` + `hooks/use-orbis-session.ts` +
`components/orbis-demo.tsx` is the reference shape: one `<details>` panel, side-by-side
source/output image previews, the raw prompts shown as plain text, one button that runs the
whole pipeline and feeds the result into the same session's `start` chain.

`my-orbis-app` already has the equivalent building blocks, just not wired into a raw page:
`ImageStarter.tsx` (upload → `uploadFile` → `setImage`), `lib/visko.ts` (typed `send*` helpers),
`Video.tsx` (track rendering), `EvolveScene.tsx` (free-form post-start steering — reusable as-is,
since it renders null until a run has started and falls back to a free-text box for any prompt
it doesn't recognize as a curated scene).

| Approach considered | Pros | Cons | Status |
|---|---|---|---|
| Build a standalone HTML/JS mockup (this project's usual UI-spike convention) | Zero collision risk with concurrent app work | This spike's whole point is a live pipeline test against real `/api/nano-banana`, `/api/orbis-prompt`, and Orbis — a static mockup can't exercise any of that | Rejected |
| Fold the raw pipeline directly into the existing `/session` sidebar (`ImageStarter`, `PromptComposer`) | No new route | Mixes a developer-only raw test with the presenter-facing demo surface; risks regressing the polished flow mid-hackathon | Rejected |
| **New route `/internal/upload-test`, own client tree, reusing `lib/visko.ts` + `Video`/`EvolveScene`** | Isolated from the presenter flow and from concurrent front-page work (`family-world.css`, `GoogleSignInButton.tsx`); reuses proven session plumbing instead of re-implementing it | One new route to keep gated (see Results — this is exactly where this spike caught a real bug) | **Chosen** |

**Chosen approach:** `app/internal/upload-test/page.tsx` (server component, same
`REACTOR_API_KEY`/`GEMINI_API_KEY` presence checks as `/session`) rendering
`UploadTestApp.tsx` (client) — its own `<ViskoOrbisStableProvider>` sharing the module-scoped
token cache (extracted from `ViskoOrbisStableApp.tsx` into `lib/visko.ts` as
`fetchReactorToken`, see Investigation Trail), a form for
relationship/age/city/country/year/memory + file input, a **Run pipeline** button chaining
`/api/nano-banana` → `/api/orbis-prompt` → `uploadFile`/`sendSetImage`/`sendSetPrompt`/`sendStart`,
both raw prompts always visible, and a small timestamped event log.

## How to Run

1. `cd my-orbis-app && pnpm install` (adds `@google/genai`, already done this session).
2. Add `REACTOR_API_KEY` (already present) and `GEMINI_API_KEY` (not yet present — see
   `.env.local`) to `.env.local`.
3. `pnpm dev`, sign in with the allowlisted Google account, open `/internal/upload-test`.
4. Upload a photo, fill in the memory fields, click **Connect** (top bar) if you want the live
   Orbis stream too, then **Run pipeline**.

## What to Expect

- Without `GEMINI_API_KEY`: the amber banner at the top says so; **Run pipeline** fails at the
  editing stage with a clear error, logged in the event log.
- With `GEMINI_API_KEY` but not connected: edit + grounding steps run and their outputs display;
  the pipeline stops before the Orbis stage with a log line saying so.
- With `GEMINI_API_KEY` and connected: the pipeline runs end-to-end and the stream starts from
  the anchor image with the grounded prompt; `EvolveScene`'s free-text box appears once started,
  letting you steer further without leaving the page.
- Visiting `/internal/upload-test` (or POSTing to `/api/nano-banana` / `/api/orbis-prompt`)
  while signed out redirects to Google sign-in, identically to `/session`.

## Observability

A visible, timestamped event log (`log` state in `UploadTestApp.tsx`, capped at 20 entries) marks
every pipeline stage transition and every caught error — the cheapest version of this project's
"forensic log layer" convention, appropriate for a single-developer interactive page rather than
a high-volume/headless spike.

## Investigation Trail

- **Token-fetcher duplication.** `ViskoOrbisStableApp.tsx` had its memoized `fetchToken()` defined
  as a private module-scope function, not exported. Rather than duplicate ~30 lines of
  token-caching logic into the new page (which would also mean two independent caches for what
  should conceptually be "the presenter's one JWT"), extracted it into `lib/visko.ts` as
  `fetchReactorToken` and updated `ViskoOrbisStableApp.tsx` to import it. Zero behavior change for
  `/session`; confirmed via `tsc --noEmit` and a clean dev-server boot.
- **Auth-gating regression, caught and fixed this session.** Read `middleware.ts` once early in
  this session (via a since-deleted worktree, working the unrelated PRD task) and it was a
  blanket "everything except `api/auth`/static" matcher. By the time this spike built and curl-
  tested the new page, a concurrent change to this same checkout (visible in `git status` as
  uncommitted `family-world.css` + `GoogleSignInButton.tsx` — someone actively building the
  public-teaser/sign-in redesign) had **already landed** a narrower allowlist matcher
  (`/session/:path*`, `/api/reactor/:path*`) before this spike's own edits — root `/` was made
  intentionally public as part of that other work, which is correct, but the new allowlist had no
  entry for anything this spike was about to add. First curl test of `/internal/upload-test`
  returned a bare `200` with the full page rendered — no sign-in redirect — and the same for both
  new API routes. That would have shipped a publicly callable `GEMINI_API_KEY`-spending endpoint.
  Fixed by adding `/internal/:path*`, `/api/nano-banana/:path*`, `/api/orbis-prompt/:path*` to the
  matcher; re-tested all five routes (`/`, `/session`, `/internal/upload-test`,
  `/api/nano-banana`, `/api/orbis-prompt`) on both GET and POST — the three new entries now 302 to
  sign-in exactly like `/session`, and `/` still correctly stays public.
- **No live `GEMINI_API_KEY` this session** (confirmed via a non-printing presence check on
  `.env.local` — `REACTOR_API_KEY` present, `GEMINI_API_KEY` absent), so the Gemini leg of the
  pipeline is wiring-verified (correct request shape, correct error surfacing, correctly gated)
  but not render-verified. The Orbis leg (`uploadFile`/`setImage`/`setPrompt`/`start`) reuses
  `/session`'s already-working, already-keyed code path unchanged, so it did not need separate
  live verification here.

## Results

**Verdict: VALIDATED (wiring) — Gemini leg render PENDING.**

The page, both new API routes, and the two new prompt modules type-check cleanly
(`tsc --noEmit`, exit 0) and are reachable and now correctly gated behind the same Google
allowlist as `/session` (verified via `curl` GET+POST against all five relevant routes on the
running dev server). `@google/genai@2.22.0` installed cleanly (its and `protobufjs`'s ignored
build scripts inspected — both inert/no-op for a published-package install — then approved).

The most important finding from this spike isn't about prompts at all: **this checkout's
auth boundary is being actively edited by concurrent work, and any new route added here must be
added to `middleware.ts`'s matcher explicitly** — it is no longer a blanket-except pattern that
new routes fall under for free. Recorded as a standing convention below.

## Checkpoint: Human Verification Needed

Once `GEMINI_API_KEY` is added to `my-orbis-app/.env.local`:

1. Restart `pnpm dev`, sign in, open `/internal/upload-test`.
2. Upload a real (ideally non-16:9, ideally somewhat aged) family photo, fill in the memory
   fields, run the pipeline.
3. Check specifically: does the anchor image preserve every real person's identity? Does it
   actually reach 16:9 by extension rather than returning the original dimensions? Does the
   grounded prompt stay faithful to the photo and avoid inventing an identity for anyone in it?

Does this match expectations — anything surprising in either direction?
