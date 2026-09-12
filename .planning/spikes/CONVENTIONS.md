# Spike Conventions

Patterns and stack choices established across spike sessions. New spikes follow these unless the
question requires otherwise.

## Stack

- Next.js 15 (App Router), React 19, Tailwind 4, TypeScript, pnpm — whatever `create-reactor-app`
  scaffolds, for the actual app. Don't swap any of these; the scaffold's value is that it's the
  vendor-maintained, all-wired-together default. No build tools, bundlers, Docker, or
  env-management systems beyond what the scaffold already provides.
- TypeScript for any standalone spike code artifact (`.ts`) even when a spike doesn't run a full
  app — e.g. spike 002's `steering.ts` is a standalone module tested via Node's
  `--experimental-strip-types`, not a bundler.
- Plain HTML/CSS/JS (no framework, no build step) for interactive comparison artifacts a human
  needs to page through — see spike 003's `003-storyline-comparison.html`. Dark, warm palette
  matching the project's archival-photo subject matter; sticky photo panel + tabbed panels for
  side-by-side comparison.
- `node --experimental-strip-types <file>.mjs` (Node 22+) for quickly self-testing a `.ts` module
  without adding a build toolchain.

## Structure

- Standard spikes: `.planning/spikes/NNN-descriptive-name/`.
- Comparison spikes: `.planning/spikes/NNNx-descriptive-name/` (letter suffix directly on the
  number, e.g. `003a-`, `003b-`, `003c-`), one directory per variant, built back-to-back. The
  head-to-head comparison table lives in the README of whichever variant was built *last* (not a
  separate shared file), cross-referenced from the other variants' READMEs.
- Shared assets used by multiple spikes in a comparison group (e.g. the seed photo referenced by
  all of 003a/b/c) live as loose files directly under `.planning/spikes/` with a shared-number
  prefix (`003-seed-photo.png`, `003-storyline-comparison.html`), not duplicated into each variant
  directory.
- App-level structure (once a spike produces real app code, as 001/002 did): `app/lib/<model>.ts`
  — thin wrapper re-exporting the typed per-model SDK (hooks, command senders, types) so
  components import from one local place instead of the long typed package names directly.
  `app/api/reactor/token/route.ts` — the one and only JWT-minting route; a Next.js `GET` route
  handler, server-only, `Cache-Control: no-store`.
- `lib/beats.ts`-shaped narration scripts: `export const baseScene: string` (set once, image-seed
  anchor) + `export const BEATS: { prompt: string; narration: string }[]` (used identically across
  spikes 003a/003b/003c — treat this as the fixed shape for any future storyline draft).

## Patterns

- **Content spikes get a `beats.ts`-shaped output**, matching this project's planned
  `lib/beats.ts` structure (ARCHITECTURE.md): an exported `baseScene` string plus an ordered
  `BEATS` array of `{ prompt, narration }` pairs, so spike output plugs directly into the real
  build without reshaping.
- **Ground every claim in real source content before drafting**, not placeholder text — spikes
  002/003 pulled actual cookbook source files and the actual Family-album hotspot JSON via `gh
  api` rather than summarizing from memory or guessing at plausible-sounding content.
- **Screen source content against PROJECT.md's Out of Scope list before drafting, not after** —
  spike 003 identified that one of the photo's 7 hotspots (`the-four-children`) is personal family
  narrative and excluded it from all three storyline variants before writing any beats, and caught
  a second, more subtle case (003c's beat 3) where a *different* hotspot's own text paraphrased
  back into the excluded content and required active rewriting, not just hotspot-level exclusion.
  Excluding a sensitive hotspot isn't enough on its own — check that no remaining beat paraphrases
  back into its specific claim, even genericized, and rewrite toward the general pattern instead.
- **When two parallel spike sessions collide on the same manifest/number (or the same file, e.g.
  `CONVENTIONS.md`), merge rather than overwrite:** keep the other session's content intact, add to
  it, and note the merge. Do not re-run or duplicate the other session's already-validated work.
  (This rule was violated once during this project's own wrap-up — an overwrite of this exact file
  — and corrected by re-merging; kept here as a concrete cautionary precedent, not just a rule.)
- **Auth:** server mints a session-scoped JWT via one `GET` route; client memoizes it in module
  scope and reuses it for the entire session lifetime (never refetches per action). Scope the
  token to one model + `max_sessions: 1` + a fixed `max_duration_seconds` for a single-presenter
  demo.
- **Steering:** compose `baseScene + ". " + directional` into one prompt string; if over a length
  budget, truncate only the directional tail, never the base scene. Re-steer the same running
  session via repeated `setPrompt()` calls — don't tear down and recreate sessions per beat.
- **Narration:** each beat pairs a steering `prompt` (camera/attention direction) with a spoken
  `narration` line condensed to one sentence. An atmosphere-first arc can legitimately leave a
  beat's `narration` empty (`""`) by design — that's a valid pattern, not a missing draft, when the
  goal is to let visual motion land before any spoken fact.

## Sourcing (added: composite-world spikes 004/005)

- **Never trust a search summary's or a filename/caption's claimed date/license for a historical
  image.** Verify directly against the file's own metadata (Wikimedia Commons:
  `action=query&prop=imageinfo&iiprop=extmetadata`, or the equivalent for other archives) before
  treating a photo as genuinely vintage or genuinely rights-clear. Hit this exact failure mode twice,
  independently, in one session (a 2014 photo miscaptioned as PD-vintage; a 2013 photo filenamed
  "1977"). Treat two-for-two as a pattern, not a coincidence — always check.
- **Commons category browsing beats full-text search once you have one concrete, era-specific
  proper noun** to anchor on (a tram model, a market name, a building name) — generic scene
  descriptions ("kitchen," "apartment," "everyday life") return noise in full-text search.
- **Composite-world beats ground themselves in what's actually visible in the chosen reference
  photo**, not in generically-accurate-but-unpictured facts — draft the beats *after* finding the
  photo, not before (drafting first and retrofitting a photo produced a throwaway first pass in
  spike 004). Never assign a real, unconsented photograph subject an invented character's identity.
- **`worldMeta` shape** (spikes 004/005, for any future non-flagship world): a plain object
  exported alongside `baseScene`/`BEATS` — `{ id, grandmotherLabel, age, place, year, composite,
  compositeDisclosure, threeQuestions: { whereDidSheLive, whatWasEverydayLifeLike,
  whatDidSheExperience } }`. Keeps the flagship's plain `Scene` shape (no `worldMeta`) valid and
  unchanged; only landing-eligible worlds carry it.

## Real-family privacy: undocumented subjects (added: spikes 012-013)

- **A beat about a real, specific, named, deceased person who has no surviving photograph gets an
  `imagined: true` + `imaginedDisclosure: string` pair on the `Prompt`, not a silently-generated
  image treated as documentary.** The disclosure belongs in the spoken `narration` and the beat
  `title` too, not just the metadata field — a UI that only ever surfaces title/narration (not the
  raw data file) must still convey the gap.
- **Don't reuse the composite-world "invent a placeholder person" solution (004/005's `Babushka` in
  a real crowd photo) for a real person's missing photo.** Those are different problems: an
  atmospheric placeholder figure inhabiting someone else's real archival photo is not the same risk
  as inventing "what a specific, real, grieved family member looked like." Spike 012's
  great-grandmother beat anchors on a plausible *object* instead of a face for exactly this reason;
  spike 013's orphaned-child beat does generate an imagined portrait, but only because the family's
  own account has no name or identity to misrepresent and the disclosure is explicit in both title
  and narration. Judge each case on what's actually being invented and who could be harmed by an
  unlabeled version of it — don't apply one blanket rule mechanically.
- **A requirement reversal gets recorded, never silently applied.** When a locked decision from an
  earlier spike changes (e.g. "composite-only" or "exclude this content"), add a dated Requirements
  entry in MANIFEST.md stating what changed and why, and leave the original spike's files/notes
  intact as the historical record rather than editing them in place. Future spike sessions (and
  frontier-mode analysis) need to see both states, not just the current one.

## Multi-page localStorage spikes (added: spikes 008-010)

- **Serve, don't `file://`, any spike where multiple HTML pages hand data to each other via
  `localStorage`.** Chromium-based browsers partition `localStorage` per `file://` path, so two
  pages opened directly as files silently don't see each other's writes — no error, just an
  inconsistency that looks like a bug. `python3 -m http.server <port>` from the repo root, then
  browse to `http://localhost:<port>/.planning/spikes/<name>/`, puts every spike on one real origin.
  Single-page spikes (003, 006, 007) are unaffected and can stay `file://`.
- **Reusable browser-side data module pattern:** a plain ES module (`memory.js`, `worldProvider.js`,
  `gallery.js`) exporting pure functions plus thin `localStorage` read/write helpers, imported via
  `<script type="module">` directly — no bundler. Downstream spikes import the same module rather
  than re-implementing the shape, which is what makes a cross-spike integration test
  (`test-gallery.mjs` importing real `memory.js` + `worldProvider.js`) possible at all.
- **Node-side testing of browser-storage modules:** stub `globalThis.localStorage` with a tiny
  object-backed implementation (`getItem`/`setItem`/`removeItem`/`clear`) at the top of the test
  file, then `await import(...)` the real module — no jsdom dependency needed for modules that only
  touch `localStorage`, not the DOM.

## Upload → anchor image → grounded prompt pipeline (added: spikes 014-016)

- **`app/lib/<purpose>.ts` per prompt-generation concern** — `upload-anchor.ts` (Nano Banana edit
  prompt) and `memory-prompt.ts` (Gemini grounding system instruction + a `buildMemoryContext()`
  helper), each exporting its model id and prompt/instruction as named constants, mirroring how
  `orbis-hackathon-starter` splits `lib/nano-banana.ts` from `lib/orbis-prompt.ts`. One file, one
  Gemini call's worth of prompt content — don't merge them even though both feed the same pipeline.
- **A user-uploaded photo is never assumed to already be 16:9 or clean.** Any edit prompt touching
  a real upload (not a curated/archival photo) needs three things at once: restoration language,
  an explicit identity-lock clause (never retouch/reshape/invent a real person), and 16:9
  normalization via outward background extension — never crop, never let Orbis's own no-crop
  resize silently squash a non-16:9 upload. See `upload-anchor.ts`.
- **A memory-grounding instruction that takes structured fields (person/place/year/memory) needs
  its own real-person identity guard**, distinct from the image-edit prompt's — the grounding step
  can just as easily invent a name/identity for someone in the photo as the edit step can invent a
  face. State it in the system instruction itself, not just relied-on via the upstream anchor
  image already being "safe." See `memory-prompt.ts`.
- **Reuse `@google/genai`'s ignored-postinstall-script pattern**: `pnpm install` will refuse to run
  `@google/genai`'s and `protobufjs`'s build scripts by default (`ERR_PNPM_IGNORED_BUILDS`).
  Inspect what the scripts actually do before approving (`grep -A5 '"scripts"' node_modules/<pkg>/
  package.json`, then check whether the referenced file even exists in the published package —
  `@google/genai`'s `prepare` script pointed at a repo-only file that doesn't ship, i.e. a no-op)
  rather than blindly running `pnpm approve-builds --all`.

## Middleware allowlist gotcha (added: spike 016)

- **`middleware.ts`'s `config.matcher` in this app is an explicit allowlist, not a
  blanket-except-a-few pattern — confirm which one it currently is before adding a route,** since
  it has changed shape at least once already (blanket "everything except `api/auth`/static" early
  on, narrowed to `["/session/:path*", "/api/reactor/:path*"]` once the public teaser page at `/`
  was added). Under the allowlist shape, any new page or API route is publicly reachable by
  default until its own matcher entry is added — this is NOT a redundant safety net you'd only
  notice was missing under attack; a plain `curl` GET on the new route during normal dev testing
  shows it immediately (a bare `200` with the full page/JSON instead of a `302` to sign-in). Spike
  016 hit this directly: `/internal/upload-test` plus its two new Gemini-backed API routes
  rendered/responded with no auth at all on first test, which would have let anyone burn
  `GEMINI_API_KEY` quota with no login. Fixed by adding the new paths to the matcher and
  re-verifying every relevant route (old and new) with `curl` on both GET and POST before calling
  the spike done.
- **Any billable/keyed server route (Gemini, Reactor, or otherwise) added to this app must be
  matched by `middleware.ts` in the same commit that adds the route** — treat "did I update the
  matcher" as part of the definition of done for a new API route here, not a follow-up.

## Working alongside concurrent sessions (added: direction-pivot spikes 004-007)

- When another session is actively wiring real app code in the same shared checkout, **build
  UI/architecture spikes as standalone mockups** (plain HTML/CSS/JS, same as any other UX-comparison
  spike) instead of touching the live app files — even for a spike whose eventual destination *is*
  the live app. Document the exact integration point and any wiring gaps found in the README instead
  of wiring it live. Wire for real as its own deliberate follow-up commit once the spike's findings
  are confirmed, same pattern spike 003a's storyline used before being wired into `prompts.ts`.
- A quick cross-session status check (who's touching what) before starting is cheap insurance
  against a real collision on demo night.

## Tools & Libraries

- `create-reactor-app@2.2.0` — official scaffold CLI, confirmed working against live npm/GitHub.
- `@reactor-team/js-sdk@3.0.0` + `@reactor-models/visko-orbis-stable@2.3.0` — the confirmed
  version pairing; don't mix an older typed package with js-sdk 3.x (ack/broadcast behavior
  changed in 3.x).
- Avoid: building on `hls.js` as the primary video path (it's a template dependency, not the
  primary WebRTC transport); porting `reactor-cookbook`'s FastH3 clip-queue or multi-prop layering
  machinery (no Orbis-Stable equivalent).
- `gh api repos/<owner>/<repo>/contents/<path>` (with an `Authorization: token $(gh auth token)`
  header for files >1MB, since the Contents API's inline `.content` field is empty above that
  size) — used to pull real reference content (cookbook source, hotspot JSON, the seed photo)
  directly from GitHub rather than guessing.
- `gh api repos/<owner>/<repo>/git/trees/<branch>?recursive=1` — fastest way to get a full file
  tree for scoping what's actually in an unfamiliar repo before diving into individual files.
