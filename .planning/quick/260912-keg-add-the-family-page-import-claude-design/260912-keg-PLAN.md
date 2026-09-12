---
quick_id: 260912-keg
status: planned
autonomous: true
files_modified:
  - app/components/AddFamily.tsx
  - app/add-family/page.tsx
must_haves:
  truths:
    - "Visiting /add-family renders the 'Add your family' page in the shared Family World style (Archivo, #ec3013 accent) with nav, two-column workflow, and footer"
    - "User can drop or browse several photographs at once; each becomes a thumbnail, and the first one added becomes the selected photo"
    - "Selecting a thumbnail loads that photo into the large preview and its own answers into the form; edits never bleed across photos"
    - "'Reconstruct their world' stays disabled until 'Who is this?' has a value; after saving, that photo reads 'Ready' and the button becomes an 'Enter their world →' link to /session?memoryId=..."
    - "A 'Ready to enter' section lists every saved photo with who, place · year, a summary, an 'Enter their world →' link, and an 'Edit' button that reselects it"
    - "'Remove photo' deletes the active photo and selects the next remaining one, or none if the grid is empty"
    - "Nav '← Back to the family' returns to /"
  artifacts:
    - path: "app/components/AddFamily.tsx"
      provides: "Client component: multi-photo upload, per-photo answer form, saved list"
      min_lines: 300
      contains: '"use client"'
    - path: "app/add-family/page.tsx"
      provides: "Server Component route shell at /add-family (nav, hero, footer, metadata)"
      min_lines: 60
  key_links:
    - from: "app/add-family/page.tsx"
      to: "app/components/AddFamily.tsx"
      via: "import { AddFamily }"
      pattern: "from \\\"\\.\\./components/AddFamily\\\""
    - from: "app/add-family/page.tsx"
      to: "app/family-world.css"
      via: "stylesheet import + .family-world wrapper div"
      pattern: "family-world"
    - from: "app/components/AddFamily.tsx"
      to: "/session"
      via: "href built with encodeURIComponent(photo.id)"
      pattern: "/session\\?memoryId="
---

# Quick Task 260912-keg: Add the "Add Family" page (Claude Design import)

Import the "Add Family" page from Claude Design project
`868bef8e-ac73-4d10-8db7-6a61a92c86e8` (file `Add Family.dc.html`) and implement it
as a real Next.js route at `/add-family` in this repo (Family World / Family Video
Memories app).

<objective>
Ship a standalone `/add-family` page: a fuller, multi-photo alternative to the
single-photo "Add someone" tile already inline on the front page. The user drops one
or several family photographs, selects one at a time, answers who/where/when plus two
optional context questions, saves each one, and gets an "Enter their world →" link per
saved photo.

Purpose: the design's richer intake flow (multi-photo grid + per-photo metadata +
"Ready to enter" list) exists in the design system but has no implementation.
Output: `app/components/AddFamily.tsx` (client) + `app/add-family/page.tsx` (server shell).
</objective>

<context>
Design source (saved locally — the `DesignSync` MCP is not available to executors):
@.planning/quick/260912-keg-add-the-family-page-import-claude-design/design-source/Add Family.dc.html
@.planning/quick/260912-keg-add-the-family-page-import-claude-design/design-source/NOTES.md

Established conventions to match:
@app/page.tsx
@app/explore-grandmas-world/page.tsx
@app/components/FamilyGallery.tsx
@app/family-world.css

Repo facts verified during planning:
- Next.js **16.3.5**, React 19.2.3, TypeScript 5.9.3. Per `AGENTS.md`, this is NOT the
  Next.js in your training data — read `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`
  and `05-server-and-client-components.md` before writing the route. (Notable Next 16
  change already confirmed: Middleware is now **Proxy**, `proxy.ts` at repo root.)
- The app lives at the **repo root**, NOT under `my-orbis-app/`. Older quick-task history
  says otherwise; it predates a repo migration. All paths in this plan are repo-root-relative
  and correct.
- `proxy.ts` gates only `/session/*`, `/api/reactor/*`, `/internal/*`, `/api/nano-banana/*`,
  `/api/orbis-prompt/*`. `/add-family` is therefore **public by default — do not touch `proxy.ts`**.
- Scripts available: `npm run typecheck` (`tsc --noEmit`) and `npm run build`. There is no
  test runner in this repo.
- No new dependencies are needed. Do not install anything.
</context>

## DC → React translation reference

The `<script type="text/x-dc" data-dc-script>` block at the bottom of `Add Family.dc.html`
is the Claude Design preview's state machine (`class Component extends DCLogic`). It is not
runnable here — translate its logic to React state/handlers. Template syntax in the markup:
`{{ expr }}` is a binding, `sc-if value="{{ cond }}"` is a conditional block, and
`sc-for list="{{ arr }}" as="x"` is a repeater.

Class mapping (design's bare classes → this repo's already-ported `fw-*` classes in
`app/family-world.css`): `nav`→`fw-nav`, `nav-brand`→`fw-nav-brand`, `btn`→`fw-btn`,
`btn-primary`→`fw-btn-primary`, `btn-ghost`→`fw-btn-ghost`, `field`→`fw-field`,
`input`→`fw-input`, `grayscale`→`fw-grayscale`, and the design's inline-styled `<hr>` →
`className="fw-hr"`.

<tasks>

<task type="auto">
  <name>Task 1: Port the Add Family state machine to a client component</name>
  <files>app/components/AddFamily.tsx (new)</files>
  <action>
Create `app/components/AddFamily.tsx` as a `"use client"` component exporting a named
`AddFamily` function (match `FamilyGallery`'s named-export style, not a default export).
It renders everything from the design between the hero `<hr>` and the footer: the two
column sections (`1 · Photographs`, `2 · Tell us what you know`) inside the design's
`display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr))`
container, plus the conditional `<hr>` + `Ready to enter` section, returned from a
fragment (same composition pattern `FamilyGallery` uses).

Types to declare at the top of the file (these are the contracts the rest of the file is
written against, so define them first):
- `Answers` — `who`, `place`, `year`, `scene`, `context`, all `string`.
- `Photo` — `id: string`, `src: string` (data URL), `label: string`, `a: Answers`,
  `saved: boolean`, `input?: FamilyPhotoInput`.
- `FamilyPhotoInput` — `id: string`, `image: string`, `person?: { nameOrRelationship: string }`,
  `place?: string`, `time?: ParsedTime`, `sceneDescription?: string`, `familyContext?: string`.
- `ParsedTime` — `userText: string`, `approximateYear?: number`, `decade?: string`.
- Module const `EMPTY_ANSWERS: Answers` with all five fields empty (the design's `blank()`).

State (three `useState` atoms plus one `useRef`): `photos: Photo[]`, `activeId: string | null`,
`drag: boolean`, `fileRef` on the hidden `<input type="file" accept="image/*" multiple>`.

Behaviors, translated 1:1 from `renderVals()` — preserve these exactly, including the
details that look like bugs but are the design's intent:
- `addFiles(files)`: `Array.from(files ?? [])`, keep only entries where
  `file.type.startsWith("image/")`, and read each with `FileReader.readAsDataURL`
  (same approach as `FamilyGallery.readFile`). Because several readers resolve
  independently, every state write inside `onload` MUST be a functional update:
  `setPhotos(prev => [...prev, photo])`, `setActiveId(prev => prev ?? photo.id)`,
  `setDrag(false)`. Photo id is `"p" + Date.now() + Math.random().toString(36).slice(2, 6)`;
  `label` is the filename with its extension stripped (`/\.[^.]+$/`).
- `update(id, patch)`: merges the patch into that photo's `a` **and resets `saved` to
  `false`** — editing a saved photo deliberately invalidates its "Ready" state. Do not
  "fix" this.
- `parseTime(text)`: trimmed empty input returns `undefined`. Otherwise match decade
  `/\b(1[89]|20)(\d)0s\b/` and year `/\b(1[89]|20)\d{2}\b/`, returning `userText` (the
  trimmed input), `approximateYear` (`Number(yearMatch[0])` when a year matched), and
  `decade` (the decade match, else the year's first three digits + `"0s"`, else `undefined`).
- `toInput(photo)`: builds `FamilyPhotoInput` — trimmed `who` becomes
  `person.nameOrRelationship` (omit the whole `person` object when blank), trimmed
  `place`/`scene`/`context` map to `place`/`sceneDescription`/`familyContext` with `undefined`
  when blank, and `time` is `parseTime(a.year)`.
- Derived values: `active` (`photos.find(p => p.id === activeId) ?? null`), `a`
  (`active?.a ?? EMPTY_ANSWERS`), `complete` (`!!active && !!a.who.trim()` — only `who`
  gates the save), `savedList` (`photos.filter(p => p.saved)`).
- `progressLabel`: `"None yet"` when there are no photos, otherwise
  `"{n} photograph{s} · {m} described"` with correct singular/plural on "photograph".
- `gateNote`: no active photo → `"Add a photograph on the left to begin."`; active and saved
  → `"Their world is ready."`; active and complete → `"Everything else is optional."`;
  otherwise → `"Just tell us who this is to begin."`.
- Dropzone: `dropBg` is `var(--color-accent-100)` while dragging else `transparent`;
  `dropBorder` is `var(--color-accent)` while dragging else `var(--color-divider)`;
  `dropHint` is `"Release to add."` while dragging, else
  `"We'll prepare each photograph for the world."` once photos exist, else
  `"Or tap to browse. Add one or several at once."`. Keep the design's
  `tabIndex={0}`, `role="button"`, `aria-label="Drop family photographs or tap to browse"`,
  click-to-browse, and Enter/Space `onKeyDown` handler. Keep the small 12px accent square.
- Thumbnail buttons: `aria-pressed` on the active one; border `var(--color-accent)` when
  active else `var(--color-bg)`; caption shows `label` plus a state label —
  `"Ready"` when saved, `"Selected"` when active, empty otherwise — coloured
  `var(--color-accent-300)` when saved else `var(--color-neutral-300)`. Clicking sets `activeId`.
- Form: all five controls are `disabled={!active}` and controlled by `a.*` with `onChange`
  writing through `update(active.id, { field: e.target.value })`. Keep the design's exact
  labels, placeholders, helper text, `htmlFor`/`id` pairs (`who`, `place`, `year`, `scene`,
  `context`), the 2-column grid with `who`/`scene`/`context` spanning `1 / -1`, and the
  `rows={5}` / `minHeight: 120` textarea.
- Submit: `onSave` prevents default, no-ops when `!complete`, computes `toInput(active)`,
  and marks that photo `saved: true` with its `input` stored on the record. The submit
  button renders only while the active photo is unsaved and is `disabled={!complete}`; once
  saved it is replaced by an `<a className="fw-btn fw-btn-primary">Enter their world →</a>`.
  **Deviation from the design, deliberate (see T-KEG-03):** the design does
  `console.log('FamilyPhotoInput', input)` with the full base64 image inline. Log the same
  shape but with the image redacted (e.g. spread `input` and replace `image` with a short
  `"[data URL, N chars]"` marker) so family photo bytes are not dumped into the console.
- `removeActive`: drops the active photo and sets `activeId` to the first remaining photo's
  id, or `null` when none remain.
- Saved cards: `meta` is `[place, year]` filtered on `.trim()` joined with `" · "`, falling
  back to `"Place and time to be reconstructed"`; `summary` is trimmed `scene`, else trimmed
  `context`, else `"A little information was enough to begin."`; the card links to
  `/session?memoryId=` + `encodeURIComponent(photo.id)` and has an "Edit" ghost button that
  sets `activeId`.

Styling rules:
- Reuse the `fw-*` classes per the mapping table above. Do NOT add the design file's
  page-local `<helmet><style>` override (Schibsted Grotesk font, `#ff4d1f` orange /
  `#2f6bff` blue accents) — NOTES.md documents this as a deliberate rejection in favour of
  the shared `family-world.css` tokens every other page uses.
- The design's section-number labels use `var(--color-accent-2-700)`, which does not exist
  in `family-world.css`. Use `var(--color-accent-700)` instead — the same token the
  sibling pages use for their uppercase eyebrow labels.
- Everything else stays as inline style objects mirroring the design's inline styles,
  matching how `FamilyGallery.tsx` already does it.
- The design's editor-only `grayscale` prop (`this.props.grayscale ?? true`) has no runtime
  surface here: apply `fw-grayscale` unconditionally to photo images, as `FamilyGallery` does.
  Do not add a component prop for it.
- Every `<img>` needs the `{/* eslint-disable-next-line @next/next/no-img-element -- ... */}`
  comment above it, following `FamilyGallery.tsx`'s precedent for data-URI images.

Do NOT modify `FamilyGallery.tsx`, `app/page.tsx`, `app/family-world.css`, or `proxy.ts`.
Do NOT add an API route — there is no endpoint to POST `FamilyPhotoInput` to yet, and that
matches the original design's own scope.
  </action>
  <verify>
    <automated>npm run typecheck</automated>
    <automated>grep -q '^"use client";' app/components/AddFamily.tsx</automated>
    <automated>grep -v '^\s*//' app/components/AddFamily.tsx | grep -c 'encodeURIComponent' | grep -qv '^0$'</automated>
    <automated>grep -v '^\s*//' app/components/AddFamily.tsx | grep -c 'Schibsted\|#ff4d1f\|#2f6bff\|accent-2-700' | grep -q '^0$'</automated>
  </verify>
  <done>
`app/components/AddFamily.tsx` exists, is a `"use client"` component with a named
`AddFamily` export, type-checks clean, contains no Schibsted Grotesk / orange / blue
override tokens, and builds `/session?memoryId=` hrefs with `encodeURIComponent`.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add the /add-family route shell and compose the page</name>
  <files>app/add-family/page.tsx (new)</files>
  <action>
Before writing, read `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`
and `05-server-and-client-components.md` — this repo is on Next 16.3.5 and `AGENTS.md`
requires checking the shipped docs rather than relying on training data.

Create `app/add-family/page.tsx` as a Server Component (no `"use client"`), structured
exactly like the sibling `app/explore-grandmas-world/page.tsx`:
- Import `type { Metadata } from "next"`, `{ Archivo } from "next/font/google"`,
  `"../family-world.css"`, and `{ AddFamily } from "../components/AddFamily"`.
- Configure Archivo identically to the siblings: `subsets: ["latin"]`,
  `weight: ["400", "600", "800"]`, `variable: "--font-archivo"`.
- `export const metadata: Metadata = { title: "Add your family" };`
- Default-export a component returning `<div className={`family-world ${archivo.variable}`}>`
  wrapping nav → main → footer.

Nav (`className="fw-nav"`, `paddingInline: "clamp(20px, 5vw, 72px)"`):
- `<span className="fw-nav-brand">Family World</span>` — brand is a plain span on the
  siblings, not a link.
- The design's uppercase middle label `Add your family` (12px, `letterSpacing: "0.08em"`,
  `textTransform: "uppercase"`, `color: "var(--color-neutral-700)"`,
  `marginLeft: "auto"`, `marginRight: "var(--space-4)"`), matching `app/page.tsx`'s tagline span.
- `<a href="/" className="fw-btn fw-btn-ghost" style={{ whiteSpace: "nowrap" }}>← Back to the family</a>`.
  The design's `Front Page.dc.html` target translates to `/` (see NOTES.md routing table).

Main (`flex: 1`, `display: "flex"`, `flexDirection: "column"`,
`padding: "0 clamp(20px, 5vw, 72px)"`, `maxWidth: 1280`, `width: "100%"`, `margin: "0 auto"`):
- Hero section: grid `repeat(auto-fit, minmax(280px, 1fr))`, `gap: "28px clamp(24px, 4vw, 72px)"`,
  `padding: "48px 0 36px"`, `alignItems: "end"`. `<h1>` reads `Add your family` at
  `clamp(36px, 5vw, 68px)` / `lineHeight: 1.04` / `margin: "0 0 0 -0.05em"` (the `.family-world`
  stylesheet already supplies the heading font and weight — do not restate them). Beside it,
  the design's two paragraphs verbatim: the bolded
  "Add a few family photographs and tell us what you know." and the
  `var(--color-neutral-700)` "A place, an approximate year, and even a small memory are
  enough to begin. Family World uses those fragments to reconstruct a world you can explore."
  in a `maxWidth: "52ch"` column.
- `<hr className="fw-hr" />`
- `<AddFamily />`

Footer: same inline style as the siblings' footer (`padding: "20px clamp(20px, 5vw, 72px)"`,
13px, `var(--color-neutral-700)`, space-between, wrap) plus the design's
`borderTop: "2px solid var(--color-divider)"`, with the design's copy: `Family World` on the
left and `We'll prepare each photograph for the world.` on the right.

Escape apostrophes in JSX text as `&apos;` the way the sibling pages do, so
`react/no-unescaped-entities` stays quiet.

Do NOT add a link to `/add-family` from `app/page.tsx`'s nav — NOTES.md scopes that as a
separate follow-up decision. The route is reachable by direct URL for now; call this out in
the task summary as a known, deliberate gap.
Do NOT touch `proxy.ts`: `/add-family` is unmatched there and is public by design, like `/`
and `/explore-grandmas-world`.
  </action>
  <verify>
    <automated>npm run typecheck</automated>
    <automated>npm run build 2>&amp;1 | grep -q '/add-family'</automated>
    <automated>grep -q 'components/AddFamily' app/add-family/page.tsx</automated>
    <automated>git diff --name-only -- proxy.ts app/page.tsx app/components/FamilyGallery.tsx app/family-world.css | grep -q . &amp;&amp; exit 1 || exit 0</automated>
  </verify>
  <done>
`npm run build` succeeds and lists `/add-family` in its route output; the page imports and
renders `AddFamily`; `proxy.ts`, `app/page.tsx`, `FamilyGallery.tsx`, and `family-world.css`
are untouched.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Local filesystem → browser | User-selected image files are read into memory as data URLs by `FileReader` |
| Client state → navigation URL | Locally generated photo ids are interpolated into `/session?memoryId=...` |
| Client state → devtools console | The computed `FamilyPhotoInput` is logged (design scaffolding, no endpoint exists) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-KEG-01 | Tampering | `addFiles` in `AddFamily.tsx` | mitigate | Keep the design's `file.type.startsWith("image/")` filter; render only via `<img src=...>` (never inline SVG, `<object>`, or `dangerouslySetInnerHTML`), so an SVG data URL cannot execute script |
| T-KEG-02 | Tampering | `/session?memoryId=` href construction | mitigate | Wrap the id in `encodeURIComponent`, matching `FamilyGallery.tsx`; ids are locally generated and never user-typed |
| T-KEG-03 | Information disclosure | `console.log('FamilyPhotoInput', ...)` | mitigate | Redact the base64 `image` field before logging so family photo bytes never land in console/log capture (deliberate deviation from the design, specified in Task 1) |
| T-KEG-04 | Denial of service | Many/large images held as data URLs in React state | accept | Client-local, presenter-controlled demo surface; a size/count cap is not worth the friction at this scope |
| T-KEG-05 | Information disclosure | Family photos + narrative answers | accept | Nothing leaves the browser — no API route, no persistence, state clears on reload (same posture as the shipped `FamilyGallery` flow) |
| T-KEG-SC | Tampering | npm/pip/cargo installs | accept | No package installs in this task — no new dependencies are added, so the supply-chain surface is unchanged |
</threat_model>

<verification>
Automated:
- `npm run typecheck` — clean.
- `npm run build` — succeeds, route list includes `/add-family`.
- `git status` shows only `app/components/AddFamily.tsx` and `app/add-family/page.tsx` as
  new files (plus the `AGENTS.md`/`CLAUDE.md` files `next dev` regenerates).

Human check (deferred to end of task, per `human_verify_mode: end-of-phase`):
1. `npm run dev`, open `http://localhost:3000/add-family`.
2. Page uses the same Archivo type and red `#ec3013` accent as `/` — NOT orange/blue, NOT
   Schibsted Grotesk.
3. Drag two image files onto the dropzone at once (border/background should highlight while
   dragging): both appear as thumbnails, the first is "Selected".
4. Fill "Who is this?" for the first photo — the submit button enables and the gate note
   changes to "Everything else is optional."
5. Submit: the photo flips to "Ready", the button becomes "Enter their world →", and a
   "Ready to enter" card appears below with place · year and the summary line.
6. Click the second thumbnail: the large preview and all five fields swap to that photo's
   (empty) answers, and the first photo's answers are still intact when you switch back.
7. Edit a saved photo's "Who is this?" field — it reverts to unsaved (intended behavior).
8. "Remove photo" removes the active photo and selects the next one.
9. "← Back to the family" returns to `/`; "Enter their world →" navigates to
   `/session?memoryId=...` (which redirects to Google login — expected, `/session` is gated).
10. Check the devtools console on save: `FamilyPhotoInput` is logged with the image redacted,
    not as a wall of base64.
</verification>

## Explicitly out of scope

- Wiring the front page nav (or `FamilyGallery`) to link to `/add-family` — NOTES.md scopes
  that as a separate follow-up decision. The route is reachable by direct URL only.
- Any backend: no API route, no persistence, no prompt construction. `toInput` /
  `FamilyPhotoInput` stay UI-local scaffolding, exactly as in the design.
- Making `/session` actually consume `memoryId` — a known, separately-tracked gap that
  `FamilyGallery` already shares.
- Re-porting `_ds/modernist-.../styles.css`; it already exists as `app/family-world.css`.
- Changing `proxy.ts` auth matching.

<output>
Create `.planning/quick/260912-keg-add-the-family-page-import-claude-design/260912-keg-SUMMARY.md`
when done, following the format of the sibling `260912-g80-SUMMARY.md`.
</output>
