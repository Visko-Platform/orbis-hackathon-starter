---
spike: 003c
name: storyline-neighborhood-in-motion
type: comparison
validates: "Given the same hotspots, when scripted as a 'daily life in motion' arc, then produce concrete steering beats + narration"
verdict: STRETCH GOAL — richest content, highest rendering risk (see head-to-head in 003b/README.md)
related: [002, 003a, 003b]
tags: [storyline, narration, privacy]
---

# Spike 003c: Storyline — Neighborhood in Motion

## What This Validates

Given the same privacy-screened hotspot set as 003a/003b, when scripted as a social-density and
daily-commerce arc — foregrounding the barrio's human activity rather than individual objects or
pure atmosphere — then a concrete `beats.ts`-shaped script should emerge, and the full 3-way
comparison across 003a/b/c should surface which arc actually fits this project's constraints
(reliability under a tight rehearsal window, privacy safety, historical depth).

## Research

Same source and privacy screen as 003a/003b. This storyline draws most heavily on `barrio-density`
and `sari-sari-store`, with `cavite-city-1953`'s eskinita/tingi-economy details woven into the
narration rather than spoken as standalone facts.

**Privacy note beyond the standard exclusion:** the `barrio-density` hotspot's own source text
observes "the four children on the step ... are visible from at least four windows" — a direct
reference back into the excluded `the-four-children` hotspot. Beat 3 ("children's laughter drifts
faintly from a side alley") was written to evoke the *general* social-density fact (children
watched communally across households) **without** referencing the photograph's actual children or
any family-specific framing — it's ambient scene-setting, not a pointer back to the excluded
content. This is the one storyline where the privacy boundary required active rewriting rather
than simple hotspot exclusion, and is worth flagging for whoever reviews narration against
SAFE-01 in Phase 3.

## How to Run

Open `.planning/spikes/003-storyline-comparison.html`, select the "003c · Neighborhood in Motion"
tab, and page through the 6 beats.

## What to Expect

Six beats, the most of the three storylines, reflecting this arc's denser social content. Compare
directly against 003a/003b using the tab switcher — the comparison page keeps all three loaded
simultaneously for exactly this kind of side-by-side read.

## Investigation Trail

1. First draft of beat 3 was closer to the original hotspot text ("a child could be watched from
   any of half a dozen kitchens") — on review, this paraphrases *the specific claim from the
   excluded family hotspot* even though it avoids naming the father. Rewrote to describe the
   *general social pattern* (density enables communal childcare) as an ambient, unattributed
   observation, not a callback to this photo's specific children.
2. Tried an earlier version of beat 5 (pedicab) as a wide establishing shot instead of a specific
   "driver calls out for a fare" — the more specific version tested better paired with narration
   because it gives the audience something concrete happening at the moment the fact is spoken,
   consistent with 003a's stronger legibility pattern.
3. Considered a 7th beat wrapping the whole arc back to the Coca-Cola sign (tying to 003a) for a
   combined "best of both" version — held off, since the spike's job is to produce 3 *distinct*
   comparison points, not a pre-merged hybrid; hybridization is a Phase 3 decision, not a spike
   deliverable.

## Results

**Verdict: richest historical content, highest rendering risk** — see the full head-to-head table
in `003b-storyline-then-now/README.md#head-to-head-003a-vs-003b-vs-003c` (written there since 003b
was the third and final storyline built, per the workflow's "build back-to-back, then head-to-head
comparison" convention).

Summary for this storyline specifically: two of its six beats (customers being served, children's
laughter) describe things that are more demanding for a live generative model to render
convincingly and distinctly than 003a's static objects (a sign, a roof) — this is a real
production-readiness risk, not just a content judgment, and should be verified empirically during
Phase 1/3 rehearsal before committing to this arc for the live stage demo. The privacy-rewrite
required for beat 3 (see Research above) is also a signal that this arc sits closest to the
excluded personal-narrative content and deserves the most careful SAFE-01 review if selected.

**Recommendation:** treat as a stretch-goal storyline, not the primary Phase 3 script. See
003b's README for the full comparison and Phase 3 recommendation (lead with 003a, optionally
splice 003b's cold-open).
