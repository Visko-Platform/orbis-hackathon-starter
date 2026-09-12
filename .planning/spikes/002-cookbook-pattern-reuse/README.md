---
spike: 002
name: cookbook-pattern-reuse
type: standard
validates: "Given fast-h3-streaming-app's token route + steering-composition pattern, when adapted to Orbis-Stable's confirmed command surface, then produce ready-to-copy code plus a does/doesn't-transfer map"
verdict: VALIDATED
related: [001]
tags: [reactor, code-reuse, auth, steering]
---

# Spike 002: Cookbook Pattern Reuse

*Related to Spike 001 (scaffold-orbis-sample-app, built in a parallel session): that spike proves
the vendor scaffold itself boots; this spike audits a second source (the reactor-cookbook) for
patterns worth layering on top of that scaffold once Phase 1 build begins.*

## What This Validates

Given the `reactor-team/reactor-cookbook` repo's `fast-h3-streaming-app` example (the closest
architectural analog to this project — real-time prompt steering, native audio, persistent
context, JWT-scoped auth), when its patterns are compared against this project's confirmed
Orbis-Stable architecture (`.planning/research/STACK.md`, `ARCHITECTURE.md`), then a concrete,
ready-to-copy reuse map should emerge: what transfers verbatim, what needs adaptation, and what
doesn't apply at all.

## Research

**Repo:** `reactor-team/reactor-cookbook` (public, Apache-2.0, "developers copy files verbatim" —
confirmed from the repo's `AGENTS.md`). No Orbis-Stable example exists in it; the two examples are:

| Example | Model | Pattern demonstrated |
|---|---|---|
| `fast-h3-streaming-app` | FastH3 | JWT-scoped token route, live prompt-steering mid-generation, native audio track, persistent "prop" instructions composed into prompts, clip-queue continuity, before/after staging UI |
| `world-model-arcade` | LingBot World 2 | Walkable 3D world, controller/HUD input, multi-game architecture |

`world-model-arcade` is the genre this project already moved *away* from (Marble/splat world →
live steerable video, per PROJECT.md's Context section) — it shares almost nothing reusable with
an Orbis-Stable steering demo and was excluded from further comparison.

`fast-h3-streaming-app` was compared file-by-file against this project's confirmed Orbis-Stable
plan:

| Cookbook file (FastH3) | This project's plan (Orbis-Stable) | Verdict |
|---|---|---|
| `app/api/reactor/token/route.ts` — mints a JWT scoped to `FAST_H3_MODEL`, `max_sessions: 3`, `Cache-Control: no-store`, returns only `{jwt, expiresAt}` | `app/api/token/route.ts` — same shape, model swapped to `reactor/visko-orbis-stable`, `max_sessions: 1` (single presenter, single session) | **Reuse directly, minor param change.** See `route.ts` in this spike. |
| `h3-studio.tsx` → `propDirection()` / `fitPrompt()` — compose a persistent instruction + directional text into one prompt, capped to FastH3's 800-char limit | `SessionDemo.tsx` steering — Orbis-Stable's single `setPrompt({prompt})` call, re-steered at each ~1.4s chunk boundary | **Adapt the idea, not the code.** See `steering.ts` in this spike — same "base scene + directional beat" composition idea, ported to a plain function instead of component-local closures. |
| `h3-contract.ts` → `FastH3ClipInfo`, `continue_from_clip_id`, generation/playout/history queue | No equivalent — Orbis-Stable has no discrete "clips" to queue; it's one continuous chunked stream | **Does not transfer.** Building a clip-queue for Orbis-Stable would be solving a problem this model doesn't have. |
| `h3-studio.tsx` → `queuedProps`/`textCues` drag-and-drop multi-prop layering | This project needs exactly one persistent base scene (the seed photo's scene) | **Does not transfer** — unnecessary complexity for a single-scene demo. |
| `h3-studio.tsx` → `storyHistoryRef` + OpenAI story-planning integration | Narration is presenter-authored (`lib/beats.ts`), not model-generated | **Out of scope entirely** — no OpenAI dependency needed. |
| `h3-studio.tsx` → audio toggle (`toggleAudio()`, localStorage-persisted mute state) | Orbis-Stable also exposes `setAudioEnabled`/`setAudioPrompt` (per STACK.md) | **Reuse the toggle *pattern*** (mute state + `<audio>` element routing) once Phase 2's UI is built — not urgent for Phase 1. |
| `h3-studio.tsx` → status phase labels + colored-dot indicator, buffering chip | This project's planned `StatusBadge.tsx` (ARCHITECTURE.md) | **Reuse the *pattern*** (human-readable phase labels beat raw status strings) — deferred to Phase 2 UI work, noted as a v2 nicety (maps to REQUIREMENTS.md's DEMO-05). |

**Gap discovered:** FastH3's prompt cap is a confirmed, contract-level constant (800 chars, from
`h3-contract.ts`). Orbis-Stable's own max prompt length is **not confirmed anywhere** in this
project's existing research (STACK.md/ARCHITECTURE.md don't mention one). `steering.ts` below
uses a conservative 480-char placeholder and flags it explicitly for re-verification once
`@reactor-models/visko-orbis-stable`'s TypeScript types are actually installed at build time.

## How to Run

```bash
cd .planning/spikes/001-cookbook-pattern-reuse
node --experimental-strip-types test-steering.mjs
```

## What to Expect

Five test cases print to stdout: basic composition, advancing through a full beat script,
clamping past the end of the beat list, truncating an overlong directional clause while
preserving the base scene, and a pathological case where the base scene alone exceeds the
character budget.

## Investigation Trail

1. Started by assuming the cookbook might have an Orbis-Stable-specific example — it doesn't.
   Confirmed via the GitHub tree API (`git/trees/main?recursive=1`) that only two examples exist,
   neither Visko/Orbis. Adjusted scope to "which *pattern*, not which *file*, transfers."
2. Fetched the four most load-bearing cookbook source files directly (token route, `h3-studio.tsx`,
   `h3-contract.ts`, `cooking-props.ts`) rather than relying on the repo's own README summaries —
   the README describes examples at a high level and doesn't mention the clip-queue/prop-layering
   architecture, which turned out to be the most important thing to *not* copy.
3. Initially planned to port `fitPrompt()` verbatim; on inspection, H3's version is bound to a
   fixed 800-char contract constant and clip-queue state that doesn't exist for Orbis-Stable — so
   the adaptation is a rewritten function with the same *intent* (truncate the tail, never the
   base scene) rather than a copy-paste.
4. Wrote `route.ts` first since it's the lowest-risk, highest-confidence port (nearly identical
   shape confirmed independently by both the cookbook and this project's own STACK.md research on
   the create-reactor-app scaffold's own token route — two independent sources agree on the
   pattern, which is a good reuse signal).
5. Tested `steering.ts`'s edge cases specifically because the workflow warns against declaring
   victory on a single happy-path run: verified the truncation preserves base-scene continuity
   (the actual design goal, not just "doesn't crash"), and verified the pathological case where
   even the base scene alone overflows the budget still returns a bounded string rather than
   throwing.

## Results

**Verdict: VALIDATED.**

- The token-route pattern reuses **directly**, with a one-line model-slug swap and a tightened
  `max_sessions` (this project is single-session; the cookbook's example anticipates concurrent
  testers). This corroborates STACK.md's independently-researched Orbis-Stable token route almost
  exactly — two unrelated sources (the vendor's own scaffold template, and the cookbook's
  hand-written FastH3 example) converge on the same auth shape, which is a strong signal this is
  the platform's actual intended pattern, not one team's idiosyncratic choice.
- The steering-composition *idea* (persistent base + swappable directional clause, truncate the
  tail not the base) reuses well; the *code* does not, because it's entangled with FastH3's
  clip-queue model, which has no Orbis-Stable equivalent.
- Two non-urgent UI patterns (audio-mute toggle, phase-label status badge) are worth revisiting
  during Phase 2, not Phase 1 — noted in the reuse table above rather than built now, to avoid
  scope creep into this spike.
- One real gap surfaced: Orbis-Stable's actual max prompt length is unconfirmed. This is now a
  flagged action item for Phase 1 (verify against installed package types), not a silent
  assumption baked into `steering.ts`.
- **Impact on remaining spikes:** none of the storyline spikes (002a/b/c) depend on this — they
  produce beat *content*, which plugs into `steering.ts`'s `beats: string[]` interface regardless
  of which narrative arc wins.
