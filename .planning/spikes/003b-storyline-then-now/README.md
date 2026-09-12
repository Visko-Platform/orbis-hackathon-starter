---
spike: 003b
name: storyline-then-now
type: comparison
validates: "Given the same hotspots, when scripted as a 'this photo, alive' transformation arc, then produce concrete steering beats + narration"
verdict: WINNER (for Core Value fit) — see head-to-head in Results
related: [002, 003a, 003c]
tags: [storyline, narration, privacy]
---

# Spike 003b: Storyline — This Photo, Alive

## What This Validates

Given the same privacy-screened hotspot set as 003a, when scripted as an atmosphere-first
"then→now" transformation arc — leaning directly into the Core Value statement rather than
touring individual objects — then a concrete `beats.ts`-shaped script should emerge that proves
"photo becomes living memory" as the *first* thing the audience feels, before any history is
spoken.

## Research

Same source and privacy screen as 003a (`the-four-children` hotspot excluded across all of
003a/b/c). This storyline draws lightly on `cavite-city-1953` (place history, spoken as
scene-setting context rather than object-pointing) and `sari-sari-store`, and deliberately opens
with a **silent** first beat — pure motion, `narration: ""` — before any spoken fact, on the
theory that the audience needs to see the photo move before being told what it means.

## How to Run

Open `.planning/spikes/003-storyline-comparison.html`, select the "003b · This Photo, Alive" tab,
and page through the 6 beats. Note the blue-bordered "Presenter opens with" line — the only one
of the three storylines with a scripted spoken intro before the first steering beat.

## What to Expect

Beat 1 has empty narration by design (see Investigation Trail below) — this is intentional, not a
missing draft.

## Investigation Trail

1. First draft narrated every beat, including beat 1. On review, narrating over the very first
   motion — the moment that's supposed to prove the demo's whole premise — undercuts it: the
   audience's attention is split between watching the photo move and processing a spoken fact in
   the same 1-2 seconds. Cut beat 1's narration entirely and let the motion land alone.
2. Considered opening directly on a `setPrompt` beat with no separate presenter line at all, but a
   completely silent cold-open risks reading as "did anything happen." Added `INTRO_NARRATION` —
   a single spoken line *before* the first steering command — to prime the audience's attention
   without competing with the actual first visual change.
3. Deliberately used only 2 of the historically-dense hotspots (`cavite-city-1953`,
   `sari-sari-store`) rather than trying to cover all 4 non-excluded content hotspots like 003a
   does — cramming in more facts here would work against the "atmosphere first" premise this arc
   is testing.

## Results

**Verdict: WINNER on Core Value fit** (full 3-way comparison below).

This arc's strength: it is the only one of the three that puts the "photo → living memory" moment
itself first, unnarrated, which most directly demonstrates the project's actual thesis rather than
describing it. Its risk, flagged for rehearsal: with only 2 of 4 available historical facts used,
if the presenter improvises or the demo runs short, this storyline has the least content-depth
buffer of the three — worth padding with 1-2 more optional beats from `cement-step` or
`galvanized-iron-panels` if the slot runs long.

### Head-to-Head (003a vs 003b vs 003c)

| Dimension | 003a Object Journey | 003b This Photo, Alive | 003c Neighborhood in Motion |
|---|---|---|---|
| Matches Core Value ("photo → living memory") | Medium — reads as a tour | **Strongest** — leads with pure motion | Medium — reads as a scene, not a transformation |
| Legible to a first-time audience | **Strongest** — every line has an obvious visual referent | Medium — some beats (breeze, light shift) are subtle and easy to miss if not called out | Weakest — 2 beats ("customers," "children's laughter") describe things that may be hard to render distinctly on a live model |
| Historical content depth | **Strongest** — 4 distinct facts, each tied to a visible object | Weakest — only 2 facts, by design (see Investigation Trail) | Medium — 4-5 facts but more abstract (density, tingi economy) than object-based |
| Privacy safety | Clean — no proximity to the excluded hotspot | Clean | Clean — explicitly generic "children's laughter," not the specific excluded narrative |
| Risk if steering lags behind narration | Low — each beat is short and can be repeated/held | **Highest** — atmosphere beats (breeze, smoke, light) depend on the model rendering subtle motion convincingly; if it doesn't, the narration has less to visually anchor to | Medium — human-activity beats (serving customers, pedicab) are more demanding renders than a static sign or roof |
| Best fit for a rehearsed, reliable stage demo | Yes — most forgiving if steering timing drifts | Only if Orbis-Stable reliably renders subtle atmospheric motion (verify in Phase 1/3 rehearsal, not assumed) | Only if human-activity prompts render convincingly (verify in rehearsal) |

**Recommendation for Phase 3:** lead with **003a (Object Journey)** as the reliability-first
choice given the hackathon's tight rehearsal window and Phase 3's own risk list (PITFALLS.md
warns explicitly against "unpredictable live prompt-steering discovered for the first time on
stage"). If Phase 1/2 rehearsal shows Orbis-Stable renders atmospheric motion (breeze, smoke,
light shifts) convincingly and reliably, **003b's opening beat is worth splicing onto the front of
003a's script** as a cold-open — this is not mutually exclusive with 003a's later object-pointing
beats. 003c is the richest social-history content but carries the most rendering risk of the
three; treat it as a stretch goal only if 003a/b prove solid early.
