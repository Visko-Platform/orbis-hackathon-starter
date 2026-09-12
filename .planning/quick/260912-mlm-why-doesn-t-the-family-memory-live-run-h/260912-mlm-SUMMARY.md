---
phase: quick-260912-mlm
plan: 01
subsystem: ui
tags: [nextjs, typescript, localStorage, reactor-sdk, visko-orbis-stable, tailwind]

requires: []
provides:
  - "GroundedFamilyMemory type that compile-enforces the grounded-prompt field contract between memory-pipeline.ts, family-memory-store.ts, AddFamily.tsx, and MemoryAutostart.tsx"
  - "localStorage-backed family memory store (survives new tabs/reopened links) instead of sessionStorage"
  - "Legible failure states: storage-quota save failure, cross-device missing memory, signed-out Connect"
  - "Working two-column /live-world live-session layout with header, 16:9 video, and dark control rail"
affects: [live-world, add-family, family-memory-store]

tech-stack:
  added: []
  patterns:
    - "Compile-enforced contract types (GroundedFamilyMemory) instead of optional fields + runtime hope"
    - "Video panel className made overridable via prop with an unchanged default, so shell-specific Tailwind modifiers don't leak into pages without that shell"

key-files:
  created: []
  modified:
    - app/lib/family-memory-store.ts
    - app/components/AddFamily.tsx
    - app/components/MemoryAutostart.tsx
    - app/lib/visko.ts
    - app/components/LiveWorldSession.tsx
    - app/components/Video.tsx
    - app/live-world/page.tsx

key-decisions:
  - "Family worlds stay browser-local (localStorage, not a server store) — cross-device sharing is explicitly out of scope for this demo and stated as such in the missing-memory copy"
  - "GroundedFamilyMemory (required anchorImage + groundedPrompt) makes the exact regression that shipped in f85079e a compile error if it recurs"

requirements-completed: [QUICK-MLM]

duration: 10min
completed: 2026-09-12
---

# Quick Task 260912-mlm: Fix /live-world?memoryId= end-to-end Summary

**Compile-enforced grounded-prompt contract, localStorage-backed memory persistence, legible failure states, and a working two-column /live-world session layout.**

## Performance

- **Duration:** ~10 min (execution only; investigation of concurrent-session state included)
- **Started:** 2026-09-12T23:28:00Z
- **Completed:** 2026-09-12T23:35:00Z
- **Tasks:** 3/3 completed
- **Files modified:** 7 (plus one incidental same-repo remediation, see Deviations)

## Accomplishments

- A memory saved on `/add-family` now actually starts when `/live-world?memoryId=<id>` is opened in a fresh tab, on the same browser — the root-cause field-name mismatch (`prompt` vs `groundedPrompt`) is now a compile error if it ever recurs.
- Memories survive a reopened link / new tab (localStorage, not sessionStorage), with the raw uploaded photo trimmed from the stored record so a real phone photo doesn't blow the ~5MB per-origin quota.
- Every remaining failure mode states plainly what happened: a failed save blocks the "Enter their world" button with a visible message instead of producing a dead link; a memory absent on this device says so honestly (worlds are browser-local) instead of implying a bug; a signed-out visitor clicking Connect sees "Sign in to run a live world" instead of a raw JSON parse error.
- The `/live-world` live-session branch now renders a proper header (kicker + title), a real 16:9 video panel at every width, and a single dark control rail in a genuine two-column layout at `lg` that stacks on mobile.

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix the grounded-prompt contract so a saved memory can ever start** - `dea99a4` (feat)
2. **Task 2: Make a fresh load of the memory URL resolve, and make every failure legible** - `bbdcec0` (fix)
   - Incidental remediation commit (see Deviations) - `a4be57f` (fix)
3. **Task 3: Fix the /live-world live-session layout** - `b018e02` (feat)

**Plan metadata:** committed separately by the orchestrator after this summary.

## Files Created/Modified

- `app/lib/memory-pipeline.ts` - No change needed; the `prompt` → `groundedPrompt` rename (Task 1 step 1) had already landed via concurrent commit `1e82a9c` (task 260912-mjl) before this plan ran. Verified by grep before editing, per the dispatch note.
- `app/lib/family-memory-store.ts` - Added `GroundedFamilyMemory` (Task 1); swapped `sessionStorage` for `localStorage`, trimmed the raw `image` field before persisting, and changed `saveFamilyMemory` to return a `boolean` instead of swallowing write failures (Task 2 — see Deviations for how this specific edit reached HEAD).
- `app/components/AddFamily.tsx` - `savedInput` now typed as `GroundedFamilyMemory` so the `{ ...input, ...grounded }` merge is compile-checked (Task 1); a failed `saveFamilyMemory` now sets a visible error and does not mark the photo `saved` (Task 2).
- `app/components/MemoryAutostart.tsx` - `MemoryLookup`'s object arm narrowed to `GroundedFamilyMemory`, dropping the non-null assertions in `run()` (Task 1); rewrote the "missing" copy to state the real browser-local scoping instead of implying expiry (Task 2).
- `app/lib/visko.ts` - `fetchReactorToken` now detects the gated-route redirect a signed-out visitor's fetch follows (`r.redirected` / non-JSON `content-type`) and throws "Sign in to run a live world" instead of letting `r.json()` throw a raw `SyntaxError` (Task 2).
- `app/components/LiveWorldSession.tsx` - Replaced the dead inline grid (both children forced `gridColumn: "1 / -1"`, plus a stray `maxWidth: 420`) with real Tailwind responsive classes; added a kicker + `<h1>` header read from `localStorage` in a `useEffect` (never during render, to keep SSR/hydration in sync); wrapped the control column in one dark `bg-zinc-950`/`border-zinc-800` rail (Task 3).
- `app/components/Video.tsx` - Added an overridable `className` prop (default unchanged, so `/session` and the upload-test page are unaffected) so `/live-world` can drop the three `lg:` modifiers that only resolve against `/session`'s fitted shell (Task 3).
- `app/live-world/page.tsx` - Passes `memoryId` down via an inline ternary (`!memoryId || isSeedMemoryId(memoryId) ? <LiveWorld .../> : <LiveWorldSession memoryId={memoryId} />`) so TypeScript narrows it to `string` for `<LiveWorldSession>` (Task 3).

## Decisions Made

- Kept the plan's scoping decision: family worlds stay browser-local (localStorage), not server-side. Cross-device sharing is explicitly accepted as out of scope, and the missing-memory copy says so rather than implying a bug.
- `GroundedFamilyMemory = FamilyPhotoInput & { anchorImage: string; groundedPrompt: string }` — a regression guard so the exact class of bug that shipped in `f85079e` (a spread-merge silently producing an undefined field) is now a compile error.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking / process correction] Accidentally committed an unrelated concurrent session's WIP CSS**

- **Found during:** Task 2, immediately after committing `bbdcec0`.
- **Issue:** This is a shared working tree with other concurrent agent sessions (working on unrelated quick tasks 260912-mt7 and 260912-mpu) operating on the same filesystem, not isolated worktrees. Task 2's commit was made via `git add <task files>` followed by a bare `git commit -m ...` — which commits the **whole index**, not just the added files. At that exact moment, another session had a large "Live World theme override" CSS block staged (but not yet committed) in `app/family-world.css`, and that got swept into commit `bbdcec0` under this task's message.
- **Fix:** Restored `app/family-world.css` to its pre-`bbdcec0` content in a follow-up commit (`a4be57f`), scoped with an explicit pathspec (`git commit -m ... -- app/family-world.css`) so only that one file's revert was committed. This put the concurrent session's CSS work back into their own uncommitted working state; they subsequently committed it themselves as `a84586d` ("feat(260912-mpu): add page-scoped Live World palette tokens"), confirming no work was lost.
- **Files modified:** `app/family-world.css` (reverted, then independently re-committed by the other session).
- **Verification:** `git show --stat a84586d` shows the concurrent session's own commit restoring their change under their own task id; `git diff a4be57f -- app/family-world.css` was empty immediately after the fix, confirming full removal from this task's commit.
- **Commit:** `a4be57f`
- **Process correction applied for the remainder of this plan:** Task 3's commit (`b018e02`) used `git commit -m "..." -- <explicit file list>` instead of a bare `git commit`, so only this task's three files were included even though `app/components/LiveWorld.tsx` (another concurrent session's in-progress, uncommitted edit) was sitting dirty in the same working tree at commit time.

**2. [Rule 1 - Bug, already resolved by concurrent activity] `groundFamilyMemory()`'s `prompt` → `groundedPrompt` rename**

- **Found during:** Task 1, pre-edit verification (per the dispatch note's instruction to grep before editing).
- **Issue:** The plan's Task 1 step 1 called for renaming `GroundedMemory.prompt` to `groundedPrompt` in `app/lib/memory-pipeline.ts`. This had already been done by a concurrent session's commit `1e82a9c` ("fix(260912-mjl): rename groundFamilyMemory's prompt field to groundedPrompt") before this execution started.
- **Fix:** No code change needed for that step; verified via `grep -c "groundedPrompt"` / `grep -c "prompt: string"` per the plan's own automated verify commands (both passed), then proceeded directly to steps 2–4 (the compile-enforced `GroundedFamilyMemory` type and its downstream usage).
- **Files modified:** None (verification only).
- **Commit:** N/A (no change required).

**3. [Rule 3 - Blocking, already resolved by concurrent activity] `family-memory-store.ts`'s localStorage/trim/boolean-return rewrite**

- **Found during:** Task 2, after making the intended edit and checking `git status`.
- **Issue:** While this plan's Task 2 step 1 was being implemented for `app/lib/family-memory-store.ts` (swap to `localStorage`, trim the raw `image` field, return `boolean`), a concurrent session committed `fdedbf9` ("fix: persist family memories in localStorage without the raw photo") to the same shared working tree. Because both sessions were editing the identical file with an identical fix (the working tree is shared, not per-agent-isolated), the concurrent commit's content ended up matching this plan's intended edit exactly.
- **Fix:** No further edit was needed — `git diff HEAD -- app/lib/family-memory-store.ts` was empty after `fdedbf9` landed, confirming the file already satisfied Task 2 step 1's `done` criteria. Task 2's own commit (`bbdcec0`) covers only the remaining steps (AddFamily.tsx, MemoryAutostart.tsx, visko.ts) and documents this in its commit message.
- **Files modified:** None beyond what `fdedbf9` (a different session) already committed.
- **Commit:** N/A (already satisfied by `fdedbf9`).

---

**Total deviations:** 3 (1 process-correction fix for an accidental commit-scope mistake, 2 no-op confirmations that concurrent-session work already satisfied plan requirements).
**Impact on plan:** No scope creep. All three plan tasks are fully implemented and independently verified (`npx tsc --noEmit`, `npm run build`, and all plan-specified grep checks pass). The one process mistake (sweeping unrelated staged CSS into a commit) was caught and corrected within the same execution, with zero data loss confirmed by the other session's subsequent independent commit.

## Issues Encountered

This execution ran in a shared git working tree with multiple other concurrent agent sessions actively editing overlapping files in real time (not isolated per-agent worktrees) — including `app/lib/memory-pipeline.ts`, `app/lib/family-memory-store.ts` (both already-completed by concurrent sessions before or during this run), `app/family-world.css`, and `app/components/LiveWorld.tsx` (unrelated concurrent theme/copy work, left untouched). Every edit in this plan was verified against fresh file reads immediately before editing rather than the plan's original diff snippets, per the dispatch note's instruction. One commit-scope mistake occurred (see Deviations #1) and was corrected in the same execution with no data loss.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`/live-world?memoryId=<id>` is now end-to-end functional and presentable: saved memories persist across tabs/reopened links, autostart on Connect, and render inside a real two-column layout with header, 16:9 video, and dark control rail. Remaining human-verification items from the plan (visual checks at 1440px/390px, actual signed-out Connect flow, a real save → copy URL → new tab → Connect walkthrough) were not executed as browser interactions in this session — all automated verification (`npx tsc --noEmit`, `npm run build`, and every plan-specified grep check) passed. No blockers for closing this quick task; a live human click-through is recommended before the presentation slot given the concurrent-session activity documented above.

---
*Phase: quick-260912-mlm*
*Completed: 2026-09-12*

## Self-Check: PASSED

All 7 modified files confirmed present on disk; all 4 task/remediation commit hashes (`dea99a4`, `bbdcec0`, `a4be57f`, `b018e02`) confirmed in `git log`.
