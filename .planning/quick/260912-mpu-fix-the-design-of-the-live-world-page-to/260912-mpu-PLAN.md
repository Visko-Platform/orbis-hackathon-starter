---
phase: quick-260912-mpu
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/family-world.css
  - app/live-world/page.tsx
  - app/components/LiveWorld.tsx
autonomous: false
requirements: [QUICK-MPU]

must_haves:
  truths:
    - "/live-world renders on the cream background (#fffdf7) with orange (#ff4d1f) primary buttons, not the gray/red modernist palette"
    - "All text on /live-world renders in Schibsted Grotesk, not Archivo"
    - "The scene kicker and both section labels (Steer the world, The path so far) are blue (--color-accent-2-700), not orange"
    - "The nav brand 'Family World' is a link to / rendered in the body text color with no underline"
    - "The first history entry ('Started') carries a blue accent-2 tag, later 'Landed' entries stay orange"
    - "/, /add-family and /explore-grandmas-world still render in the original gray/red/Archivo palette"
  artifacts:
    - path: "app/family-world.css"
      provides: "Page-scoped .live-world-theme token override block plus .fw-tag-accent-2"
      contains: ".family-world.live-world-theme"
    - path: "app/live-world/page.tsx"
      provides: "Schibsted Grotesk font binding, live-world-theme class, nav brand home link"
      contains: "Schibsted_Grotesk"
    - path: "app/components/LiveWorld.tsx"
      provides: "accent-2 role coloring for kicker/section labels and the Started tag"
      contains: "var(--color-accent-2-700)"
  key_links:
    - from: "app/live-world/page.tsx"
      to: "app/family-world.css .family-world.live-world-theme"
      via: "className containing both family-world and live-world-theme"
      pattern: "family-world live-world-theme"
    - from: "app/live-world/page.tsx Schibsted_Grotesk variable"
      to: "--font-heading / --font-body in the scoped override"
      via: "CSS variable --font-schibsted"
      pattern: "--font-schibsted"
    - from: "app/components/LiveWorld.tsx start()"
      to: "app/family-world.css .fw-tag-accent-2"
      via: "tagClass string on the Started history item"
      pattern: "fw-tag-accent-2"
---

<objective>
Reskin `/live-world` to the "Live World.dc.html" Claude Design import: warm cream/orange/blue
palette with Schibsted Grotesk, replacing the old modernist gray/red/Archivo look it currently
inherits from the shared `.family-world` base.

Purpose: The design file's token set was never ported into the codebase — only its markup was.
`/live-world` therefore renders with the *front page's* palette, which is why the page "looks
like it is missing its formatting". The fix is a page-scoped token override plus three
color-role corrections in the component, not a restructure.

Output: `app/family-world.css` gains a `.family-world.live-world-theme` override block and a
`.fw-tag-accent-2` tag class; `app/live-world/page.tsx` loads Schibsted Grotesk and opts into
the theme; `app/components/LiveWorld.tsx` uses the accent-2 (blue) role for its kicker,
section labels, and the "Started" tag.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@app/family-world.css
@app/live-world/page.tsx
@app/components/LiveWorld.tsx

**Project rule (AGENTS.md):** Next.js 16.3.5; repo warns APIs may differ from training data.
The only Next API this plan touches is `next/font/google`. The bundled doc
`node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md` was already checked for
this plan: the `Font({ subsets, variable })` → `className={font.variable}` pattern the repo
already uses for `Archivo` is still current, and weights may be omitted for variable fonts.
`Schibsted Grotesk` is present in Next 16.3.5's bundled `font-data.json` as a variable font
(`wght` 400–900, `latin` subset), so `Schibsted_Grotesk({ subsets: ["latin"], variable: ... })`
resolves without a `weight` array. Do not add a webfont `<link>`, `@import`, or a local font
file.

**Why the page-scoped class (do not skip this):** `app/family-world.css` `.family-world` is
shared by four pages — `/`, `/add-family`, `/live-world`, `/explore-grandmas-world`. Only
`/live-world` is being reskinned. Editing the base `.family-world` token block would silently
rebrand the other three. The override therefore lands on the compound selector
`.family-world.live-world-theme` (specificity 0,2,0 beats the base 0,1,0), and only
`app/live-world/page.tsx` adds the second class.

**Authoritative token values** — transcribed from the `<style>` block of "Live World.dc.html"
(Claude Design project `868bef8e-ac73-4d10-8db7-6a61a92c86e8`). These are the source of truth;
type them exactly. Tokens the design does not list (`--color-neutral-100/200/400/500/600/800`,
`--font-heading-weight`, spacing, radii, shadows) are intentionally left inherited from the
base block.

```css
--font-heading: 'Schibsted Grotesk', 'Söhne', 'Helvetica Neue', Arial, sans-serif;
--font-body: 'Schibsted Grotesk', 'Söhne', 'Helvetica Neue', Arial, sans-serif;
--color-bg: #fffdf7;
--color-surface: #fff7e6;
--color-text: #14110f;
--color-divider: #14110f;
--color-accent: #ff4d1f;
--color-accent-100: #fff0e8;
--color-accent-200: #ffd6c4;
--color-accent-300: #ffb391;
--color-accent-400: #ff7f4f;
--color-accent-500: #ff4d1f;
--color-accent-600: #e83a0c;
--color-accent-700: #c22c05;
--color-accent-800: #8f2003;
--color-accent-900: #5c1402;
--color-accent-2: #2f6bff;
--color-accent-2-100: #e9efff;
--color-accent-2-300: #a3bcff;
--color-accent-2-700: #1f47b8;
--color-accent-2-800: #173689;
--color-accent-2-900: #0f245c;
--color-neutral-300: #e6e1d6;
--color-neutral-700: #5b554d;
--color-neutral-900: #14110f;
```

Plus, from the same `<style>` block: `a { color: var(--color-accent-2-700); }`,
`a:hover { color: var(--color-accent-2); }`, `body { text-wrap: pretty; }`.

**Color roles in this palette (the thing the current code gets wrong):** `--color-accent`
(orange) is reserved for primary actions and live status; `--color-accent-2` (blue) is the
kicker / section-label / link color. `LiveWorld.tsx` currently spends `--color-accent-700`
on all three labels, which in the new palette reads as a second orange instead of the
design's blue.

**Out of scope — do not touch:** `app/page.tsx`, `app/add-family/page.tsx`,
`app/explore-grandmas-world/page.tsx` (they keep the base palette on purpose), and
`app/components/LiveWorldSession.tsx` plus its children (`StatusBadge`, `EvolveScene`,
`Video`, `MemoryAutostart`). Those were checked: they use zero `fw-*` classes and carry their
own dark Tailwind "embedded live monitor" styling by design, so the reskin cannot leave them
inconsistent. The nav/footer chrome they sit inside lives in `app/live-world/page.tsx` and is
reskinned by this plan for both branches.

**Do not restructure `LiveWorld.tsx`.** The state machine, the circular status dot
(`borderRadius: "50%"`), the grid layout, and the markup already match the design. Line 30's
`done: [..., "var(--color-accent-2)", ...]` is already correct (blue "Run finished") and must
stay. Only the edits named in Task 2 are in scope.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add the page-scoped Live World palette to family-world.css</name>
  <files>app/family-world.css</files>
  <action>
    Append a new section at the end of `app/family-world.css` — do not modify the existing
    `.family-world { ... }` token block or any base rule above it.

    Open the section with a comment explaining the scoping: that these tokens come from the
    "Live World" Claude Design import (Live World.dc.html), that they apply only where
    `app/live-world/page.tsx` adds `live-world-theme` beside `family-world`, and that the
    other three `.family-world` pages deliberately keep the modernist base palette.

    Declare every token from the "Authoritative token values" block in `<context>` on the
    compound selector `.family-world.live-world-theme`, with two adaptations:
    - `--font-heading` and `--font-body` lead with `var(--font-schibsted)` instead of the
      literal `'Schibsted Grotesk'` family name, then keep the design's remaining stack
      (`'Söhne', 'Helvetica Neue', Arial, sans-serif`). This mirrors how the base block binds
      `var(--font-archivo)`; Task 2 supplies that variable via `next/font/google`.
    - Add `text-wrap: pretty;` as a declaration on the same selector — that is this
      codebase's equivalent of the design's `body { text-wrap: pretty; }`, since
      `.family-world` is the page root here and `globals.css` owns the real `body`.

    Then add the design's link colors as four rules, in this order, all prefixed with
    `.family-world.live-world-theme`: a bare `a` rule setting `color: var(--color-accent-2-700)`;
    an `a:hover` rule setting `color: var(--color-accent-2)`; a `.fw-nav a` rule re-asserting
    `color: inherit`; and a `.fw-nav a:hover` rule re-asserting `color: var(--color-accent)`.
    The last two are load-bearing, not redundant: the scoped bare-`a` rule outranks the base
    `.fw-nav a { color: inherit }`, and without the re-assertion the nav's "← Exit world"
    button and the new brand link would turn blue instead of keeping the nav's existing
    inherit/accent behavior.

    Separately, add a `.fw-tag-accent-2` rule next to the existing `.fw-tag-accent` /
    `.fw-tag-neutral` pair in the tags section, mirroring how `.fw-tag-accent` is built:
    `background: var(--color-accent-2-100, var(--color-neutral-100));` and
    `color: var(--color-accent-2-800, var(--color-neutral-800));`. The fallbacks matter — the
    base `.family-world` palette defines `--color-accent-2` but not the `-100`/`-800` steps,
    so an unscoped use of this class on another page would otherwise render transparent-on-
    transparent. Leave this rule unscoped (it is only ever rendered inside the themed page,
    and the fallbacks make it safe anywhere).

    Keep the file's existing formatting idiom: two-space indentation, one declaration per
    line, `/* — section — */` comment style for the new block.
  </action>
  <verify>
    <automated>cd /Users/romy/Documents/GitHub/_meetups/orbis-hackathon-starter && CSS=app/family-world.css && SRC=$(grep -v '^\s*[/*]' $CSS) && echo "$SRC" | grep -q '\.family-world\.live-world-theme' && test "$(echo "$SRC" | grep -c -- '--color-accent-2-700: #1f47b8')" = "1" && echo "$SRC" | grep -q -- '--color-bg: #fffdf7' && echo "$SRC" | grep -q -- '--color-accent: #ff4d1f' && echo "$SRC" | grep -q -- '--color-accent-2-800: #173689' && echo "$SRC" | grep -q -- '--color-neutral-700: #5b554d' && echo "$SRC" | grep -q 'var(--font-schibsted)' && echo "$SRC" | grep -q 'text-wrap: pretty' && echo "$SRC" | grep -q '\.fw-tag-accent-2' && echo "$SRC" | grep -q -- '--color-bg: #f3f2f2' && echo "$SRC" | grep -q -- '--color-accent: #ec3013' && echo PASS</automated>
  </verify>
  <done>
    `app/family-world.css` contains a `.family-world.live-world-theme` block carrying every
    design token (cream bg, orange accent ramp, blue accent-2 ramp, warm neutrals),
    `text-wrap: pretty`, the four scoped link rules, and a `.fw-tag-accent-2` class with
    fallbacks — while the base `.family-world` block still declares `#f3f2f2` and `#ec3013`
    untouched.
  </done>
</task>

<task type="auto">
  <name>Task 2: Load Schibsted Grotesk, opt /live-world into the theme, fix accent roles</name>
  <files>app/live-world/page.tsx, app/components/LiveWorld.tsx</files>
  <action>
    In `app/live-world/page.tsx`:

    Replace the `Archivo` import from `next/font/google` with `Schibsted_Grotesk`, and replace
    the `archivo` constant with `const schibsted = Schibsted_Grotesk({ subsets: ["latin"],
    variable: "--font-schibsted" })`. Omit the `weight` array — Schibsted Grotesk is a variable
    font (wght 400–900) so the whole range including the base block's
    `--font-heading-weight: 800` is available. Drop `Archivo` entirely from this file rather
    than loading both: the scoped override replaces `--font-heading`/`--font-body`, so
    `--font-archivo` would be dead weight shipped to the browser. Leave the other three pages'
    `Archivo` imports alone.

    Change the root element's className to `` `family-world live-world-theme ${schibsted.variable}` ``.
    Both classes are required — `family-world` still supplies every base rule (layout,
    buttons, inputs, nav, spacing), `live-world-theme` only overrides tokens.

    Convert the nav brand from `<span className="fw-nav-brand">Family World</span>` to an
    anchor `<a href="/" className="fw-nav-brand" style={{ color: "var(--color-text)",
    textDecoration: "none", fontSize: 18 }}>Family World</a>`, matching the design's
    `<a href="Front Page.dc.html" class="nav-brand" style="color: var(--color-text);
    text-decoration: none;">`. The inline `fontSize: 18` is required, not cosmetic padding:
    the base `.fw-nav a { font-size: 14px }` (specificity 0,1,1) outranks
    `.fw-nav-brand { font-size: 18px }` (0,1,0), so without it the brand would visibly shrink
    the moment it becomes an anchor. Keep it a plain `<a>` — no `next/link`, no client
    component; this page is a server component and must stay one.

    In `app/components/LiveWorld.tsx` make exactly four edits, nothing else:

    1. In `start()` (the `setHistory([...])` seed entry), change `tagClass: "fw-tag-accent"` to
       `tagClass: "fw-tag-accent-2"`, matching the design script's `tagClass: 'tag-accent-2'`
       for the initial "Started" entry.
    2. Leave the `tick()` mapping that sets landed entries to `"fw-tag-accent"` unchanged —
       "Landed" stays orange by design.
    3. Change all three `color: "var(--color-accent-700)"` inline styles to
       `color: "var(--color-accent-2-700)"`: the `SCENE.kicker` span, the "Steer the world"
       section label, and the "The path so far" section label. After this edit no
       `var(--color-accent-700)` reference remains in the file.
    4. Nothing else. Do not touch the `STATUS_META` colors, the `--color-accent-300` overlay
       labels, the layout, or the state machine.
  </action>
  <verify>
    <automated>cd /Users/romy/Documents/GitHub/_meetups/orbis-hackathon-starter && npm run typecheck && P=app/live-world/page.tsx && L=app/components/LiveWorld.tsx && grep -q 'Schibsted_Grotesk' $P && ! grep -q 'Archivo' $P && grep -q 'family-world live-world-theme' $P && grep -q 'schibsted.variable' $P && grep -q 'href="/" className="fw-nav-brand"' $P && ! grep -q 'use client' $P && ! grep -q 'next/link' $P && test "$(grep -c 'var(--color-accent-2-700)' $L)" = "3" && test "$(grep -c 'var(--color-accent-700)' $L)" = "0" && test "$(grep -c '"fw-tag-accent-2"' $L)" = "1" && test "$(grep -c '"fw-tag-accent"' $L)" = "1" && ! grep -rq 'live-world-theme' app/page.tsx app/add-family/page.tsx app/explore-grandmas-world/page.tsx && echo PASS</automated>
  </verify>
  <done>
    `npm run typecheck` exits 0. `/live-world`'s page binds Schibsted Grotesk to
    `--font-schibsted`, carries both theme classes, and renders the brand as a home link at
    18px; `LiveWorld.tsx` has exactly three accent-2-700 labels, zero accent-700 references,
    one `fw-tag-accent-2` (Started) and one `fw-tag-accent` (Landed); no other page gained the
    theme class.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    `/live-world` now renders in the "Live World.dc.html" design palette: cream page
    (`#fffdf7`), warm surfaces, solid black rules, orange (`#ff4d1f`) primary buttons and live
    status dot, blue (`#2f6bff` family) kicker/section labels and links, all in Schibsted
    Grotesk. The nav brand is a link home. The first history row ("Started") wears a blue tag;
    later "Landed" rows stay orange. `/`, `/add-family` and `/explore-grandmas-world` were left
    on the old gray/red/Archivo palette on purpose.
  </what-built>
  <how-to-verify>
    1. Run `npm run dev`, open http://localhost:3000/live-world
    2. Background should read as warm cream, not light gray; body text near-black `#14110f`;
       the horizontal rules and the footer border solid black, not translucent gray.
    3. Typography should be Schibsted Grotesk — noticeably different letterforms from the
       front page's Archivo. Compare side by side with http://localhost:3000/ in another tab.
    4. The kicker above the headline (e.g. "Cavite City, Philippines"), plus the "STEER THE
       WORLD" and "THE PATH SO FAR" labels, should all be **blue**. If any of them is orange,
       the accent-role fix did not land.
    5. Click "Enter their world →". The status dot should pulse **orange** while priming and
       stay orange while live; the first row in "The path so far" should show a **blue**
       "Started" tag with legible dark-blue text on a pale blue chip (not an invisible /
       transparent chip).
    6. Steer once. The queued row's tag is the neutral gray chip; when it lands it flips to the
       **orange** accent chip. Let the run finish (or click through) — "Run finished" status
       dot is blue.
    7. Top-left "Family World" should be a link with no underline, in the body text color (not
       blue, not orange), at the same size it was before, and clicking it goes to `/`.
       "← Exit world" on the right should still look and behave as it did.
    8. Regression check — open http://localhost:3000/, http://localhost:3000/add-family and
       http://localhost:3000/explore-grandmas-world. All three must still be the **gray
       background / red accent / Archivo** design, completely unchanged.
    9. Optional: visit `/live-world?memoryId=not-a-seed` to render the real-session branch and
       confirm the reskinned nav/footer chrome frames its dark panels without looking broken.
  </how-to-verify>
  <resume-signal>Type "approved" or describe what rendered wrong (include which of steps 2–9)</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| build → browser | `next/font/google` fetches and self-hosts the Schibsted Grotesk files at build time |
| browser → /live-world | `memoryId` query param already crosses here; unchanged by this plan |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-mpu-01 | Tampering | Font delivery for `/live-world` | mitigate | Use `next/font/google`, which downloads and self-hosts the font at build time — no runtime third-party request, no injected `<link>`/`@import` to fonts.googleapis.com |
| T-mpu-02 | Denial of service | Shared `app/family-world.css` regression breaking `/`, `/add-family`, `/explore-grandmas-world` | mitigate | All new tokens land on the compound `.family-world.live-world-theme` selector; Task 1's gate asserts the base `#f3f2f2`/`#ec3013` tokens survive and Task 2's gate asserts no other page adopted the class; checkpoint step 8 is a human regression pass |
| T-mpu-03 | Information disclosure | New nav brand `<a href="/">` | accept | Relative same-origin path, no `target="_blank"`, no referrer or tabnabbing surface added |

No package installs in this plan (no `npm install`), so no supply-chain (T-mpu-SC) legitimacy
gate applies — Schibsted Grotesk ships through the already-installed `next` package's bundled
Google font catalog.
</threat_model>

<verification>
- `npm run typecheck` exits 0
- `app/family-world.css`'s base `.family-world` token block is byte-identical to before
- Every design token from the `<context>` block appears exactly once under
  `.family-world.live-world-theme`
- `app/live-world/page.tsx` is still a server component (no `"use client"`, no `next/link`)
- `LiveWorld.tsx` changed only in the four ways named in Task 2 — `git diff` on that file
  shows 4 changed lines, no structural edits
- No `fw-*` class or family-world token was added to `LiveWorldSession.tsx` or its children
</verification>

<success_criteria>
- `/live-world` visually matches the "Live World.dc.html" import: cream/orange/blue palette,
  Schibsted Grotesk, blue kicker and section labels, blue "Started" tag
- Nav brand is a working home link styled per the design
- `/`, `/add-family`, `/explore-grandmas-world` render exactly as before (human-confirmed)
- No new dependencies, no new routes, no component restructuring
</success_criteria>

<output>
Create `.planning/quick/260912-mpu-fix-the-design-of-the-live-world-page-to/260912-mpu-SUMMARY.md` when done
</output>
