---
quick_id: 260912-orb
status: complete
---

# Summary: Wire Add Family into the Orbis world model

`app/components/AddFamily.tsx` (`/add-family`) collected a photo plus who/where/when/context
answers, then only `console.log`-ed the result and linked to `/session?memoryId=...` — a query
param nothing consumed. This wires that hand-off up to the same photo → live Orbis-Stable
session pipeline `app/internal/upload-test/UploadTestApp.tsx` (spike 016) exercises by hand:
Nano Banana restore/reframe → Gemini-grounded prompt (`/api/orbis-prompt`) → Visko Orbis Stable
`setImage` + `setPrompt` + `start`.

## What changed

- `app/lib/family-memory-store.ts` (new) — sessionStorage-backed handoff. `saveFamilyMemory`/
  `loadFamilyMemory` persist/read a `FamilyPhotoInput` (moved here from `AddFamily.tsx`) keyed
  by photo id, plus `dataUrlToFile` to turn the stored `data:` URL photo back into a `File`.
  sessionStorage (not a server store) is enough — it only needs to survive the same-tab
  navigation from `/add-family` to `/session`.
- `app/components/AddFamily.tsx` — `onSave` now also calls `saveFamilyMemory(input)` (the
  redacted console log stays, per T-KEG-03). Local `ParsedTime`/`FamilyPhotoInput` type defs
  moved into the new lib module.
- `app/components/MemoryAutostart.tsx` (new) — mounted in `ViskoOrbisStableApp`'s sidebar,
  following the same self-organizing pattern as `ImageStarter`/`StatusBadge` (reads connection
  state itself, renders null when idle). Reads `?memoryId=`, looks up the stored memory, and —
  once the presenter has manually clicked Connect and the session is `ready` (never
  auto-connects, per the app's own rule) — runs the restore → ground → start pipeline
  automatically. Shows inline status while running, an "expired" notice with a link back to
  `/add-family` if the id isn't in this tab's sessionStorage, and a retry button on failure.
- `app/lib/memory-prompt.ts` / `app/api/orbis-prompt/route.ts` — `/add-family` only collects one
  free-text "place" field (e.g. "Cavite City, Philippines"), but the route required separate
  `city`/`country` fields. Added an optional `place` field as an alternative to `city`+`country`
  (either satisfies validation); `buildMemoryContext` prefers `place` when given. Backward
  compatible — `UploadTestApp.tsx`'s existing `city`/`country` callers are untouched.
- `app/ViskoOrbisStableApp.tsx` — renders `<MemoryAutostart />` (wrapped in `<Suspense>` per
  Next's `useSearchParams` guidance) between `StatusBadge` and `NowPlaying`; updated the
  SETUP-phase component list in the file's own layout comment.

## Design choices worth noting

- All Gemini/Reactor calls happen from `/session` (already gated behind Google sign-in via
  `proxy.ts`), not from the public `/add-family` page — so no change was needed to the auth
  gate, and `/add-family` stays reachable without login exactly as before.
- Missing optional fields (place/year/memory) fall back to generic text
  ("a place remembered by the family", "an earlier era", "A quiet family moment, remembered
  fondly.") rather than blocking the pipeline — `/add-family` only requires "who" before saving.

## Verification

- `npm run typecheck` — clean.
- `npm run build` — succeeds; `/session` stays dynamic (`ƒ`), confirming the new
  `useSearchParams` usage doesn't force static prerendering issues.
- Not run: a live Reactor/Gemini smoke test (no `REACTOR_API_KEY`/`GEMINI_API_KEY` in this
  environment) — left for the user to confirm with keys configured, per `npm run dev`.

## Known gaps (out of scope here)

- `FamilyGallery.tsx`'s "Add someone" tile still doesn't save into `family-memory-store.ts`, so
  its `/session?memoryId=...` links still fall through to `MemoryAutostart`'s "expired" state
  rather than starting a session. A separate follow-up if wanted.
- No persistence beyond the current browser tab (sessionStorage) — closing the tab between
  `/add-family` and `/session` loses the memory, by design (see `family-memory-store.ts`).
