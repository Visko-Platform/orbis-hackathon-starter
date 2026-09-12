---
quick_id: 260912-keg
status: complete
---

# Summary: Add the "Add Family" page (Claude Design import)

Ported the "Add Family" page from Claude Design project `868bef8e-ac73-4d10-8db7-6a61a92c86e8`
(`Add Family.dc.html`) as a real Next.js route at `/add-family`: a fuller, multi-photo
alternative to the single-photo "Add someone" tile already inline on the front page. Users
drop one or several family photographs, select one at a time, answer who/where/when plus two
optional context questions, save each one, and get an "Enter their world →" link per saved
photo.

## What changed

- `app/components/AddFamily.tsx` (new, 687 lines) — `"use client"` component translating the
  design's `class Component extends DCLogic` state machine 1:1 into React state/handlers:
  multi-file drag-and-drop upload (`FileReader.readAsDataURL` per file, functional state
  updates since readers resolve independently), a thumbnail grid with active/saved states, a
  per-photo answer form (`who`/`place`/`year`/`scene`/`context`) that resets `saved` to
  `false` on any edit, `parseTime()` decade/year regex parsing, `toInput()` building the
  `FamilyPhotoInput` scaffolding contract, and a "Ready to enter" saved-photo list with
  place · year meta, a summary line, and Edit/Enter-their-world actions.
- `app/add-family/page.tsx` (new, 111 lines) — Server Component route shell matching the
  sibling `app/explore-grandmas-world/page.tsx` structure: Archivo font config, `family-world`
  wrapper, nav (`← Back to the family` → `/`), hero copy from the design, and the `<AddFamily />`
  composition between the hero `<hr>` and footer.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Avoided setState-inside-updater anti-pattern in `removeActive`**
- **Found during:** Task 1
- **Issue:** A literal translation of the design's `removeActive` (single `setState` call
  computing both the next `photos` and `activeId` from one updater) doesn't map cleanly to
  two separate `useState` atoms without nesting a `setActiveId` call inside the `setPhotos`
  updater function — a React anti-pattern that can double-fire under Strict Mode.
- **Fix:** Read `photos`/`activeId` directly from component scope (this handler only runs
  from a click, well after render, so the closure values are current) and issue two plain
  `setPhotos(rest)` / `setActiveId(...)` calls instead of one nested state-setter.
- **Files modified:** `app/components/AddFamily.tsx`
- **Commit:** f397583

No other deviations — behavior (including the intentional-looking "quirks" the plan called
out, like `update()` resetting `saved: false` on every edit) matches the plan and the original
design 1:1.

### T-KEG-03 mitigation (per plan, not a deviation)

`onSave` logs `FamilyPhotoInput` to the console with the base64 `image` field replaced by a
short `"[data URL, N chars]"` marker instead of the design's raw inline base64 dump, per the
plan's explicit Task 1 instruction and the threat register's `mitigate` disposition.

## Verification

- `npm run typecheck` — clean, no errors, both tasks.
- `npm run build` — succeeds; route output includes `○ /add-family` (static).
- Grep gates from the plan, all passing:
  - `app/components/AddFamily.tsx` starts with `"use client";` and is a named `AddFamily`
    export.
  - `encodeURIComponent` appears (used for both the form's "Enter their world →" href and the
    saved-list card hrefs).
  - No `Schibsted`, `#ff4d1f`, `#2f6bff`, or `accent-2-700` tokens present — the shared
    `family-world.css` tokens (Archivo, `#ec3013` accent, `--color-accent-700`) are used
    throughout instead, per `NOTES.md`'s documented deviation from the design's page-local
    style override.
  - `app/add-family/page.tsx` imports `components/AddFamily`.
  - `git diff --name-only -- proxy.ts app/page.tsx app/components/FamilyGallery.tsx
    app/family-world.css` is empty — none of those files were touched.
- `git status --short` after both commits shows no changes to `app/components/AddFamily.tsx`
  or `app/add-family/page.tsx` beyond what was committed; the only other working-tree entries
  are pre-existing, unrelated files not in scope for this task (`.planning/config.json`,
  `.planning/v1.0-v1.0-MILESTONE-AUDIT.md`, `AGENTS.md`, `CLAUDE.md`, the panorama image
  assets).
- Human check (per `human_verify_mode: end-of-phase`, deferred to the user — steps 1-10 in
  `260912-keg-PLAN.md`'s `<verification>` section): `npm run dev`, visit `/add-family`, confirm
  Archivo/`#ec3013` styling, drag-and-drop of two images, per-photo answer isolation, save →
  "Ready to enter" card, edit-reverts-to-unsaved, remove/reselect behavior, nav back-link, and
  the redacted console log on save. Not run in this environment (no browser/dev-server
  automation available); left for the user to confirm visually.

## Known gaps (explicitly out of scope per the plan)

- The front page nav (and `FamilyGallery`) does **not** link to `/add-family` yet — reachable
  by direct URL only, per `NOTES.md`'s scoping decision. A separate follow-up task if wanted.
- No backend: no API route, no persistence. `toInput`/`FamilyPhotoInput` are UI-local
  scaffolding exactly as in the design; nothing is sent anywhere.
- `/session` does not consume `memoryId` yet — a known, pre-existing gap shared with
  `FamilyGallery.tsx`'s identical link pattern.

## Self-Check: PASSED

- `app/components/AddFamily.tsx` — FOUND
- `app/add-family/page.tsx` — FOUND
- Commit `f397583` (Task 1) — FOUND in `git log --oneline --all`
- Commit `12c8ca1` (Task 2) — FOUND in `git log --oneline --all`
