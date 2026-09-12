---
phase: quick-260912-mpu
plan: 01
subsystem: live-world-theming
tags: [css, next-font, design-import]
dependency-graph:
  requires: []
  provides:
    - ".family-world.live-world-theme CSS override block (app/family-world.css)"
    - ".fw-tag-accent-2 tag class"
    - "Schibsted Grotesk font binding for /live-world"
  affects:
    - app/live-world/page.tsx
    - app/components/LiveWorld.tsx
tech-stack:
  added:
    - "next/font/google Schibsted_Grotesk"
  patterns:
    - "Page-scoped theme override via compound CSS class (.family-world.live-world-theme) rather than editing the shared base token block"
key-files:
  created: []
  modified:
    - app/family-world.css
    - app/live-world/page.tsx
    - app/components/LiveWorld.tsx
decisions: []
metrics:
  duration: "~15 min"
  completed: "2026-09-12"
---

# Phase quick-260912-mpu Plan 01: Fix the design of the live-world page Summary

Reskinned `/live-world` from the shared modernist gray/red/Archivo palette to its own
cream/orange/blue Schibsted Grotesk theme via a page-scoped CSS override, leaving `/`,
`/add-family`, and `/explore-grandmas-world` untouched.

## What Was Built

**Task 1 — `app/family-world.css`:** Appended a `.family-world.live-world-theme` compound-selector
override block containing every token from the "Live World.dc.html" Claude Design import (cream
`--color-bg: #fffdf7`, orange `--color-accent` ramp, blue `--color-accent-2` ramp, warm neutrals),
plus `text-wrap: pretty` and four scoped link-color rules (bare `a`, `a:hover`, `.fw-nav a`
re-assertion, `.fw-nav a:hover` re-assertion). Also added a standalone `.fw-tag-accent-2` class
with `--color-neutral-100`/`-800` fallbacks. The base `.family-world` token block (`#f3f2f2`
background, `#ec3013` accent) is untouched — verified byte-for-byte via the automated gate.

**Task 2 — `app/live-world/page.tsx` and `app/components/LiveWorld.tsx`:**
- `page.tsx` now loads `Schibsted_Grotesk` (variable font, no `weight` array) bound to
  `--font-schibsted` instead of `Archivo`; the root div carries both `family-world` and
  `live-world-theme` classes; the nav brand changed from a plain `<span>` to a home-linking
  `<a href="/" className="fw-nav-brand" style={{ color: "var(--color-text)", textDecoration:
  "none", fontSize: 18 }}>`. Page remains a server component (no `"use client"` directive, no
  `next/link`).
- `LiveWorld.tsx` received exactly the 4 edits named in the plan: the seed "Started" history
  entry's `tagClass` changed from `fw-tag-accent` to `fw-tag-accent-2`; all three
  `var(--color-accent-700)` inline styles (scene kicker, "Steer the world" label, "The path so
  far" label) changed to `var(--color-accent-2-700)`. The "Landed" tag mapping in `tick()` stays
  `fw-tag-accent` (orange) as designed. Verified via `git show` diff: exactly 8 changed lines (4
  additions + 4 deletions).

`npm run typecheck` exits 0.

## Deviations from Plan

### Auto-fixed Issues

None — no bugs, missing functionality, or blocking issues required a Rule 1/2/3 fix in this
plan's own code.

### Environment-driven commit entanglement (not a plan deviation, but material to review)

This phase ran **without worktree isolation**, directly on the shared branch
`romy-ilano-family-video-memories`, with other Claude sessions actively committing concurrently.
This caused two race conditions during execution, both resolved without altering the plan's
intended code:

1. **`app/family-world.css` (Task 1):** After staging my Task 1 addition, a concurrent session's
   `git commit` (no pathspec) swept my staged content into its own commit (`bbdcec0`). That
   session then noticed the unexpected diff and reverted it in a follow-up commit (`a4be57f`),
   believing it was an accidental inclusion of unrelated work. I detected the file had reverted
   on disk (via the harness's mid-session file-changed notice), re-applied the identical Task 1
   content, and committed it as its own atomic commit `a84586d` with a note explaining the
   history. Final content is byte-identical to what Task 1 specifies; verified via the automated
   gate.

2. **`app/live-world/page.tsx` (Task 2):** A concurrent session (`260912-mlm`) was editing the
   same file's same `return` block at the same time (narrowing `memoryId` for
   `<LiveWorldSession>`). Both sets of changes were interleaved on adjacent/shared lines and
   could not be cleanly split via file-level `git add`. That session's commit `b018e02` (made
   with an explicit pathspec, deliberately avoiding `app/family-world.css` and
   `app/components/LiveWorld.tsx` which it knew were my WIP) ended up carrying both its own
   `memoryId`-narrowing edit and my Schibsted Grotesk / `live-world-theme` / nav-brand-anchor
   edits, since it also needed to touch `page.tsx`. I verified post-hoc that all of Task 2's
   required `page.tsx` content is present and correct, then committed the remaining file
   (`LiveWorld.tsx`) as my own atomic commit `8d5224e`, documenting the interleave in its message.

No plan-intended code was lost, altered, or diluted by either race — both are documented here
for traceability, and the automated verification gates for both tasks pass against the final
committed state.

### Deferred item (self-resolved, not fixed by this plan)

`npm run typecheck` briefly failed mid-execution
(`app/live-world/page.tsx(85,29): error TS2322: ... memoryId ... IntrinsicAttributes`) because
the concurrent `260912-mlm` session had added a `memoryId` prop pass-through to
`<LiveWorldSession>` before updating that component's prop signature. This was explicitly
out-of-scope for this plan (`LiveWorldSession.tsx` is listed as "do not touch" in the plan's
context) and was logged to `deferred-items.md` in this directory rather than fixed. The
concurrent session subsequently completed its own fix (commit `b018e02`) and typecheck now
passes cleanly — no action was needed from this plan.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1 | `a84586d` | app/family-world.css |
| 2 | `8d5224e` (LiveWorld.tsx) + content in concurrent `b018e02` (page.tsx, see Deviations) | app/live-world/page.tsx, app/components/LiveWorld.tsx |

## Checkpoint Reached

Task 3 is `type="checkpoint:human-verify"` with `gate="blocking"`. Execution stopped here as
required — no self-approval performed. See the completion message for full verification steps.

## Known Stubs

None.

## Threat Flags

None — this plan's threat register (T-mpu-01/02/03) was fully addressed by the mitigations
already built into Task 1/2 (compound-selector scoping, `next/font/google` self-hosting,
same-origin relative nav link). No new surface introduced beyond what the plan anticipated.

## Self-Check: PASSED

- FOUND: app/family-world.css (contains `.family-world.live-world-theme`, `.fw-tag-accent-2`)
- FOUND: app/live-world/page.tsx (contains `Schibsted_Grotesk`, `live-world-theme`, nav brand anchor)
- FOUND: app/components/LiveWorld.tsx (3x `var(--color-accent-2-700)`, 0x `var(--color-accent-700)`, 1x `fw-tag-accent-2`, 1x `fw-tag-accent`)
- FOUND: commit a84586d (`git log --oneline --all | grep a84586d`)
- FOUND: commit 8d5224e (`git log --oneline --all | grep 8d5224e`)
- `npm run typecheck` exits 0
