---
phase: quick-260912-mt7
plan: 01
subsystem: ui
tags: [css, specificity, family-world, buttons, accessibility]

# Dependency graph
requires: []
provides:
  - Anchor-rendered primary buttons in Family World match button-rendered primaries (near-white text on red)
affects: [family-world, explore-grandmas-world, live-world, family-gallery]

# Tech tracking
tech-stack:
  added: []
  patterns: [CSS specificity escalation over !important for cascade fixes]

key-files:
  created: []
  modified: [app/family-world.css]

key-decisions:
  - "Used a three-class selector (.family-world .fw-btn.fw-btn-primary, specificity 0,3,0) instead of !important to outrank both .family-world a (0,1,1) and .family-world a:hover (0,2,1) — a two-class fix would still lose to the :hover rule."
  - "Used var(--color-bg) rather than a literal white to keep anchor- and button-rendered primaries pixel-identical with the existing button style."

requirements-completed: [QUICK-MT7]

# Metrics
duration: 6min
completed: 2026-09-12
---

# Quick Task 260912-mt7: Fix invisible red-on-red primary button text Summary

**Added a single CSS rule (`.family-world .fw-btn.fw-btn-primary { color: var(--color-bg); }`) to outrank the `.family-world a` / `a:hover` link-color rules, fixing invisible text on anchor-rendered primary buttons at rest and on hover.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-09-12T23:24:00Z (approx)
- **Completed:** 2026-09-12T23:30:34Z
- **Tasks:** 1 completed
- **Files modified:** 1

## Accomplishments
- Anchor-rendered primary buttons ("Enter their live world", "Add your family", gallery launch buttons) now show near-white (`--color-bg`, #f3f2f2) text on the red `--color-accent` background instead of invisible red-on-red.
- Fix holds through the hover state (`.family-world a:hover` no longer repaints the text red).
- No `!important` introduced; fix is a pure CSS specificity escalation (0,3,0) targeted only at `.fw-btn-primary` combined with `.fw-btn`.
- Ghost, secondary buttons, and ordinary inline text links are untouched.

## Task Commits

Each task was committed atomically:

1. **Task 1: Raise .fw-btn-primary text-color specificity above the .family-world link rules** - `9524dda` (fix)

**Plan metadata:** Orchestrator handles the docs commit (SUMMARY.md, STATE.md) separately — not included in this executor's commits per constraints.

## Files Created/Modified
- `app/family-world.css` - Added `.family-world .fw-btn.fw-btn-primary { color: var(--color-bg); }` (with explanatory comment) immediately after the existing `.fw-btn-primary:active` rule and before `.fw-btn-secondary`.

## Decisions Made
- Three-class selector chosen over a two-class one specifically because the two-class form `(0,2,0)` would still lose to `.family-world a:hover` `(0,2,1)`, leaving the hover state broken. See plan `<diagnosis>` for the full specificity table.
- `var(--color-bg)` used instead of a literal white/`#fff` to stay pixel-identical with the pre-existing `<button>`-rendered primaries, which already display this color via line 127's rule.

## Deviations from Plan

None — plan executed exactly as written. One verification-script nuance is worth noting (not a deviation from the plan's intended change):

### Verification Note (not a plan deviation)

The plan's automated verify step 6 (`test "$(git diff --name-only -- app/ | grep -c .)" = "1"`) failed when run literally, because the working tree already had pre-existing, unrelated uncommitted changes to `app/components/AddFamily.tsx`, `app/components/MemoryAutostart.tsx`, and `app/lib/visko.ts` from prior work sessions (visible in git status before this task started). These files were not touched by this task and were not staged or committed here. A scoped check confirms the actual change is exactly one file:

```
git diff --stat -- app/family-world.css
 app/family-world.css | 4 ++++
 1 file changed, 4 insertions(+)
```

All other automated verify steps (1-5, and `npm run build`) passed as written with no modification needed.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The CSS fix is complete and committed (`9524dda`).
- Human-check steps from the plan (visual/hover confirmation on `/explore-grandmas-world` and `/`) were not run by this executor since they require a running dev server and human eyes; they are reported below for the user to spot-check:
  1. Run `npm run dev`, visit http://localhost:3000/explore-grandmas-world — "Enter their live world" buttons should show near-white text on red, clearly readable.
  2. Hover that button — background darkens to `#dd2b0f`, text should stay near-white.
  3. Visit http://localhost:3000 — "Add your family" primary button should be readable.
  4. Confirm ordinary inline text links elsewhere are still red, not white.
- No blockers for other in-flight work; the pre-existing unrelated uncommitted changes noted above remain in the working tree exactly as they were found (not modified, not committed by this task).

---
*Phase: quick-260912-mt7*
*Completed: 2026-09-12*

## Self-Check: PASSED

- FOUND: app/family-world.css
- FOUND: .planning/quick/260912-mt7-fix-button-font-color-buttons-using-fw-b/260912-mt7-SUMMARY.md
- FOUND: commit 9524dda
