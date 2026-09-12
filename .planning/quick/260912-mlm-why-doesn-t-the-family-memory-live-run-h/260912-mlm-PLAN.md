---
phase: quick-260912-mlm
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/lib/memory-pipeline.ts
  - app/lib/family-memory-store.ts
  - app/components/AddFamily.tsx
  - app/components/MemoryAutostart.tsx
  - app/lib/visko.ts
  - app/components/LiveWorldSession.tsx
  - app/components/Video.tsx
  - app/live-world/page.tsx
autonomous: true
requirements: [QUICK-MLM]

must_haves:
  truths:
    - "Saving a photo on /add-family stores a record carrying BOTH the restored anchor image and the grounded Orbis prompt"
    - "After saving, /add-family shows the grounded prompt under 'Their world' (today it is always blank)"
    - "Opening /live-world?memoryId=<id> in a NEW tab on the same browser shows that memory's header and controls, not 'This memory isn't ready in this browser tab'"
    - "Clicking Connect on /live-world starts that memory's world automatically — upload, setImage, setPrompt, start — with no further clicks"
    - "A signed-out visitor clicking Connect sees a plain 'sign in' message, not a JSON parse error"
    - "When storage genuinely holds no record for the id, the page says so in plain language and links /add-family"
    - "At 1440px the video renders as a 16:9 panel with the control rail beside it; nothing collapses to a sliver"
  artifacts:
    - path: "app/lib/memory-pipeline.ts"
      provides: "groundFamilyMemory returning the field name the store actually persists"
      contains: "groundedPrompt"
    - path: "app/lib/family-memory-store.ts"
      provides: "Browser-durable memory store with a compile-enforced grounded save type"
      contains: "localStorage"
    - path: "app/components/LiveWorldSession.tsx"
      provides: "Memory header + real two-column live layout"
      contains: "memoryId"
    - path: "app/components/Video.tsx"
      provides: "Overridable panel className so /live-world does not inherit /session's fitted-shell modifiers"
      contains: "className"
  key_links:
    - from: "app/components/AddFamily.tsx"
      to: "app/lib/family-memory-store.ts saveFamilyMemory"
      via: "grounded record carrying groundedPrompt"
      pattern: "groundedPrompt"
    - from: "app/components/MemoryAutostart.tsx"
      to: "app/lib/family-memory-store.ts loadFamilyMemory"
      via: "?memoryId= lookup that now resolves in a fresh tab"
      pattern: "loadFamilyMemory\\("
    - from: "app/live-world/page.tsx"
      to: "app/components/LiveWorldSession.tsx"
      via: "memoryId prop for the header"
      pattern: "LiveWorldSession memoryId"
---

<objective>
Fix `/live-world?memoryId=<id>` so a saved family memory actually runs, and fix the broken
layout of that page's live-session branch.

Root cause (traced, not guessed): `groundFamilyMemory()` in `app/lib/memory-pipeline.ts`
returns `{ anchorImage, prompt }`, but the record `AddFamily.tsx` persists is typed
`FamilyPhotoInput`, whose field is `groundedPrompt`. `AddFamily.tsx:158` does
`{ ...input, ...grounded }`, so the saved record carries a stray `prompt` key and
`groundedPrompt` stays **undefined**. TypeScript never catches it: spread properties skip
excess-property checking and `groundedPrompt` is optional (`npx tsc --noEmit` currently
exits 0). Downstream, `MemoryAutostart.tsx:63` gates on
`found?.anchorImage && found?.groundedPrompt` — so the lookup resolves to `"missing"`
**every single time, even in the tab that created the memory**, and the session never
starts. The same undefined field is why `/add-family` never shows the grounded prompt it
claims to show. Introduced in `f85079e` ("ground the Orbis prompt on Add Family").

Second, independent failure: the store is `sessionStorage`-backed, so even once the field
is fixed the URL only works in the exact tab that created it — a shared/reopened link (the
reported case, a production URL) finds nothing.

Third: the session branch of `/live-world` reuses `/session`'s fitted-shell CSS and a grid
whose columns never apply, so the page renders as a collapsed black strip with a stray
dark card under it — the reported "formatting is bad".

Purpose: the demo path "photo → living memory" is currently dead end-to-end for every
user-created memory. This is the one bug between a saved photo and a running world.
Output: a working, presentable `/live-world?memoryId=<id>`.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@AGENTS.md
@.planning/STATE.md

**This is Next.js 16.3.5 — not the Next.js in your training data.** Before touching
anything under `app/`, read the relevant guide in
`node_modules/next/dist/docs/01-app/` (resolved from the repo root). Heed deprecation
notices. Do not remove the `<!-- BEGIN:nextjs-agent-rules -->` block from `AGENTS.md`.

Files you will edit:
@app/lib/memory-pipeline.ts
@app/lib/family-memory-store.ts
@app/components/AddFamily.tsx
@app/components/MemoryAutostart.tsx
@app/components/LiveWorldSession.tsx
@app/components/Video.tsx
@app/live-world/page.tsx

Reference only — do not edit:
- `app/ViskoOrbisStableApp.tsx` — `/session`'s fitted shell (`lg:h-screen` +
  `lg:overflow-hidden`), the ONLY place `Video`'s `lg:h-full lg:aspect-auto` modifiers
  have a definite-height ancestor to resolve against.
- `app/components/ImageStarter.tsx` — canonical command order
  `uploadFile → await sendSetImage → await sendSetPrompt → await sendStart`.
  `MemoryAutostart.run()` already matches it; do not reorder.
- `app/components/LiveWorld.tsx` — the simulated seed branch. Its header
  (kicker + `<h1>` + status row, lines 177–229) is the shape Task 3 mirrors.
- `proxy.ts` — `/live-world` is deliberately public; `/api/reactor/token`,
  `/add-family`, `/api/nano-banana`, `/api/orbis-prompt` are gated. Do NOT add
  `/live-world` to the matcher: the seed/simulated scenes must stay viewable by judges
  without a login.
- `app/family-world.css` — the light `.family-world` theme (`--color-*`, `.fw-*`).
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix the grounded-prompt contract so a saved memory can ever start</name>
  <files>app/lib/memory-pipeline.ts, app/lib/family-memory-store.ts, app/components/AddFamily.tsx, app/components/MemoryAutostart.tsx</files>
  <action>
Repair the field-name mismatch AND make the same mistake a compile error next time.

1. `app/lib/memory-pipeline.ts` — rename `GroundedMemory.prompt` to `groundedPrompt`
   (both the type and the returned object literal at the end of `groundFamilyMemory`), so
   the pipeline's output field name matches the field the store persists. Update the
   doc comment above `GroundedMemory` to say the names are deliberately identical to
   `FamilyPhotoInput`'s so a spread-merge stays correct.

2. `app/lib/family-memory-store.ts` — add an exported type that makes the grounded fields
   REQUIRED, and narrow the save signature to it:
   a `GroundedFamilyMemory` = `FamilyPhotoInput` with `anchorImage: string` and
   `groundedPrompt: string` required, then `saveFamilyMemory(input: GroundedFamilyMemory)`.
   This is the regression guard: with it, `{ ...input, ...grounded }` fails to compile
   whenever the pipeline's field names drift, which is exactly what silently passed before.
   Keep `loadFamilyMemory` returning `FamilyPhotoInput | null` — records written by an
   older build really can lack the fields, so the runtime guard downstream must stay.

3. `app/components/AddFamily.tsx` — keep the `{ ...input, ...grounded }` merge (it is now
   type-checked) but let TS see the required fields; if the annotation needs changing, type
   `savedInput` as `GroundedFamilyMemory`. Do not reintroduce a manual field-by-field copy:
   the whole point is that the compiler now polices the merge. The existing
   `active?.input?.groundedPrompt` render block and the `p.input?.groundedPrompt` card
   summary need no change — they start working once the field is populated.

4. `app/components/MemoryAutostart.tsx` — keep the runtime guard on line 63
   (`found?.anchorImage && found?.groundedPrompt`) but drop the now-unnecessary non-null
   assertions in `run()` (`current.anchorImage!`, `current.groundedPrompt!`) by narrowing
   `MemoryLookup`'s object arm to `GroundedFamilyMemory`. Do not touch the command order in
   `run()` or the "never calls connect() itself" rule — both are deliberate.

Do not change the Gemini routes, the pipeline's network calls, or the prompt text.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
    <automated>cd /Users/romy/Documents/GitHub/_meetups/orbis-hackathon-starter &amp;&amp; grep -v '^\s*[/*]' app/lib/memory-pipeline.ts | grep -c "groundedPrompt"</automated>
    <automated>cd /Users/romy/Documents/GitHub/_meetups/orbis-hackathon-starter &amp;&amp; test "$(grep -v '^\s*[/*]' app/lib/memory-pipeline.ts | grep -c 'prompt: string')" = "0"</automated>
    <human-check>On /add-family, add a photo, fill in "Who is this?", click "Reconstruct their world". The grounded prompt text now appears under the "Their world" label on that same page (before this fix it was always blank).</human-check>
  </verify>
  <done>`npx tsc --noEmit` exits 0; `memory-pipeline.ts` exports `groundedPrompt` and no longer exports a bare `prompt` field; `saveFamilyMemory` requires both grounded fields; saving on /add-family renders the grounded prompt.</done>
</task>

<task type="auto">
  <name>Task 2: Make a fresh load of the memory URL resolve, and make every failure legible</name>
  <files>app/lib/family-memory-store.ts, app/components/AddFamily.tsx, app/components/MemoryAutostart.tsx, app/lib/visko.ts</files>
  <action>
Scoping decision to implement and document in the store's header comment: family worlds stay
**browser-local** — the photo bytes are never uploaded to our server — but they must survive a
new tab, a reopened link, and a closed tab, not just the one tab that created them. That means
`localStorage`, not a server store. A cross-DEVICE share still cannot work and is accepted for
this demo; the missing-state copy below must say so honestly rather than implying a bug.

1. `app/lib/family-memory-store.ts`:
   - Swap `window.sessionStorage` for `window.localStorage` in both `saveFamilyMemory` and
     `loadFamilyMemory`. Rewrite the file-header comment: the old one justifies
     sessionStorage as "enough for a same-tab handoff to /session" — that reasoning is what
     broke the shared link, so replace it with the decision above.
   - Persist a TRIMMED record. `localStorage` is ~5MB per origin and the record currently
     holds TWO base64 data URLs (`image`, the raw upload, plus `anchorImage`). Only the
     anchor is needed to run the world, so strip `image` before writing (keep every other
     field: `id`, `anchorImage`, `groundedPrompt`, `person`, `place`, `time`,
     `sceneDescription`, `familyContext`). `AddFamily`'s own thumbnails read component state
     (`p.src`), not the store, so nothing on screen regresses.
   - Stop swallowing write failures. `saveFamilyMemory` currently catches and ignores —
     a quota-exceeded write therefore "succeeds" and only surfaces later as a dead
     /live-world page. Return `boolean` (or throw) so the caller can react; keep the
     try/catch so a disabled-storage browser does not crash the save.

2. `app/components/AddFamily.tsx` — treat a failed save as a failed save: if
   `saveFamilyMemory` reports failure, set that photo's existing `error` state to a plain
   message ("Couldn't store this world in this browser — it may be out of space. Try a
   smaller photo.") and do NOT mark the photo `saved: true`, so the user never gets an
   "Enter their world →" button that leads nowhere.

3. `app/components/MemoryAutostart.tsx` — rewrite the `lookup === "missing"` copy to match
   the real scoping: worlds live on the device that made them, so a link opened on another
   phone or computer will not find one. Keep the `/add-family` link. Keep it short; Task 3
   restyles the container.

4. `app/lib/visko.ts` `fetchReactorToken` — `/live-world` is public but
   `/api/reactor/token` is gated, so a signed-out visitor's token fetch follows the
   middleware redirect to the NextAuth sign-in HTML page: `r.ok` is `true`, and
   `r.json()` throws `SyntaxError: Unexpected token '<'`. Before parsing, detect that case
   (`r.redirected === true`, or a response whose `content-type` is not JSON) and throw
   `new Error("Sign in to run a live world")` instead. StatusBadge already surfaces
   `lastError`, so no UI change is needed. Leave the module-scope token memoization and the
   `no-store` fetch exactly as they are — Reactor binds sessions to the minting token.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
    <automated>cd /Users/romy/Documents/GitHub/_meetups/orbis-hackathon-starter &amp;&amp; test "$(grep -v '^\s*[/*]' app/lib/family-memory-store.ts | grep -c 'sessionStorage')" = "0"</automated>
    <automated>cd /Users/romy/Documents/GitHub/_meetups/orbis-hackathon-starter &amp;&amp; grep -v '^\s*[/*]' app/lib/visko.ts | grep -c "redirected"</automated>
    <human-check>1. Sign in, save a family member on /add-family, click "Enter their world →". 2. Copy the /live-world?memoryId=... URL, open it in a NEW tab: the page shows that memory and its Connect control — NOT "This memory isn't ready in this browser tab". 3. Click Connect: the world uploads, primes, and starts on its own. 4. In a private/incognito window (signed out), open the same URL and click Connect: the status panel reads "Sign in to run a live world", not a JSON parse error.</human-check>
  </verify>
  <done>No `sessionStorage` left in the store; a memory saved in one tab loads in a new tab on the same browser and autostarts on Connect; a storage-quota failure blocks the "Enter their world" button with a visible message; a signed-out Connect shows a sign-in message.</done>
</task>

<task type="auto">
  <name>Task 3: Fix the /live-world live-session layout</name>
  <files>app/components/Video.tsx, app/components/LiveWorldSession.tsx, app/live-world/page.tsx</files>
  <action>
Four concrete defects in the `<LiveWorldSession>` branch, all layout:

1. **The video panel collapses at ≥1024px.** `Video.tsx`'s root className ends with
   `lg:h-full lg:aspect-auto lg:max-h-full` — modifiers that exist for `/session`'s
   `lg:h-screen lg:overflow-hidden` fitted shell. `/live-world` has no definite-height
   ancestor, so at `lg` the panel loses `aspect-video` and falls back to the bare
   `<video>` element's intrinsic height: a short black strip. Fix: give `Video` an optional
   `className` prop defaulting to today's exact string (so `/session` is untouched), and
   have `LiveWorldSession` pass the same string WITHOUT the three `lg:` modifiers, so the
   panel keeps its 16:9 box at every width.

2. **The two-column grid is dead.** The wrapper declares
   `gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)"` but BOTH child sections set
   `gridColumn: "1 / -1"`, so the columns never apply — and the controls section's
   `maxWidth: 420` then leaves a narrow card floating under a full-bleed video. Replace the
   inline grid with Tailwind responsive classes on the wrapper (single column by default,
   `lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]` at `lg`), drop both `gridColumn: "1 / -1"`
   overrides and the `maxWidth: 420`, and keep `min-w-0` on both children so the video
   cannot overflow its track. Inline styles cannot express a breakpoint — use classes here.

3. **No header.** The seed branch renders kicker + `<h1>` + status row before the video
   (`LiveWorld.tsx` lines 177–229); the session branch renders nothing, so the page jumps
   from the nav bar straight into a black box. Have `live-world/page.tsx` pass `memoryId`
   down — write the branch inline so TypeScript narrows it to `string`:
   `{!memoryId || isSeedMemoryId(memoryId) ? <LiveWorld memoryId={memoryId} /> : <LiveWorldSession memoryId={memoryId} />}`
   Then in `LiveWorldSession`, read the stored memory **in a `useEffect`** (never during
   render — `localStorage` is unavailable during SSR and a render-time read causes a
   hydration mismatch; `MemoryAutostart` already documents this "pending" pattern) and
   render a header mirroring the seed branch: kicker built from
   `person.nameOrRelationship · place · time.userText` (skip empty parts), an `<h1>` title
   ("Their world, live" or the person's name), and `<hr className="fw-hr" />` beneath.
   Render a neutral placeholder while the lookup is pending so the first client render
   matches the server's. This is display only — `MemoryAutostart` keeps its own lookup and
   remains the single owner of the start pipeline.

4. **Stray dark cards on a light page.** `StatusBadge` / `MemoryAutostart` / `EvolveScene`
   keep their dark "embedded live monitor" Tailwind styling on purpose (see the comment in
   `LiveWorldSession.tsx`) — but on the light `.family-world` page they currently read as
   accidents. Wrap the control column in one deliberate dark surface (e.g. a
   `bg-zinc-950`/`border-zinc-800` block with padding and matching corner treatment) so the
   panels sit inside a designed monitor rail that visually belongs to the black video panel.
   Do not restyle the individual panels — `/session` shares them.

Do not change `MemoryAutostart`'s pipeline, the provider wiring, or `proxy.ts`.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
    <automated>npm run build</automated>
    <automated>cd /Users/romy/Documents/GitHub/_meetups/orbis-hackathon-starter &amp;&amp; test "$(grep -v '^\s*[/*]' app/components/LiveWorldSession.tsx | grep -c '1 / -1')" = "0"</automated>
    <human-check>Open /live-world?memoryId=&lt;a saved id&gt; at a 1440px-wide window: a header (kicker + title) sits above a proper 16:9 video panel, with the control rail as one dark block beside it — no collapsed black strip, no orphan card. Narrow the window to ~390px: the layout stacks to one column and stays readable. Then open /live-world (no memoryId) and confirm the seed/simulated experience is unchanged.</human-check>
  </verify>
  <done>`npm run build` succeeds; the session branch renders a header, a 16:9 video, and a single dark control rail in a real two-column layout at `lg` that stacks on mobile; the seed branch and `/session` are visually unchanged.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → `/api/reactor/token` | Gated by `proxy.ts`; mints a billable, session-scoped Reactor JWT |
| browser localStorage → device disk | Restored family-photo bytes now persist past tab close |
| shared `/live-world?memoryId=` link → recipient | Public route, no auth on the page itself |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-MLM-01 | Information disclosure | `family-memory-store.ts` (sessionStorage → localStorage) | mitigate | Persist only the restored `anchorImage` + prompt, never the raw uploaded `image`; bytes stay on-device and are never sent to our server (Task 2). Residual: the anchor survives tab close on a shared computer — accepted for a hackathon demo, recorded here so a "forget this world" control is an explicit follow-up, not an oversight. |
| T-MLM-02 | Information disclosure | shared `/live-world?memoryId=` URL | accept | The id is a local key, not a capability: a recipient's browser has no record for it and sees the missing-state copy. No server lookup exists to leak against. |
| T-MLM-03 | Elevation of privilege | `fetchReactorToken` vs. public `/live-world` | mitigate | Keep `/live-world` out of the `proxy.ts` matcher so the seed scenes stay public, and keep `/api/reactor/token` gated; the new redirect guard fails closed with a sign-in message rather than parsing the auth page (Task 2). No change to token scoping or memoization. |
| T-MLM-SC | Tampering | npm/pip/cargo installs | n/a | This plan installs no packages — every change is to existing source files. Package Legitimacy Gate does not apply. |
</threat_model>

<verification>
- `npx tsc --noEmit` exits 0 (and would now FAIL if the grounded-field names drifted again).
- `npm run build` succeeds.
- End-to-end on a real session: /add-family save → copy URL → new tab → Connect → the
  world primes and plays, steerable from the rail.
- Signed-out visit to the same URL reports a sign-in requirement, not a parse error.
- `/live-world` with no `memoryId`, and `/session`, are unchanged.
</verification>

<success_criteria>
A memory saved on `/add-family` runs when its `/live-world?memoryId=<id>` URL is opened
fresh in another tab on the same browser, and that page looks like the rest of Family
World: header, 16:9 video, one dark control rail. Every remaining failure mode — no record
on this device, storage full, not signed in — states plainly what happened and what to do.
</success_criteria>

<output>
Create `.planning/quick/260912-mlm-why-doesn-t-the-family-memory-live-run-h/260912-mlm-SUMMARY.md` when done
</output>
