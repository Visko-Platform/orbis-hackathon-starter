---
spike: 003a
name: storyline-object-journey
type: comparison
validates: "Given the 6 sanitized Cavite hotspots, when scripted as an 'object journey' arc, then produce concrete steering beats + narration"
verdict: WINNER (for legibility) — see head-to-head in Results
related: [002, 003b, 003c]
tags: [storyline, narration, privacy]
---

# Spike 003a: Storyline — Object Journey

## What This Validates

Given the real hotspot content for the Cavite sari-sari-1953 photo (Family-album source, 7
hotspots across 5 topics), when 4 of the 6 privacy-safe hotspots are scripted as an ordered
"object journey" — the camera/attention moving from one material-culture detail to the next —
then a concrete `beats.ts`-shaped script with paired steering prompts and narration lines should
emerge, ready to plug into `lib/beats.ts` per ARCHITECTURE.md's recommended structure.

## Research

Source content pulled directly from `romyilano/Family-album`'s
`src/data/photos/cavite-sari-sari-1953.json` (7 hotspots: `coca-cola-sign`, `sari-sari-store`,
`the-four-children`, `cavite-city-1953`, `cement-step`, `galvanized-iron-panels`,
`barrio-density`).

**Privacy screen applied first, before any drafting:** `the-four-children` frames one child as
"the user's father... an orphan among his cousins" — this is explicitly personal family narrative
per PROJECT.md's Out of Scope ("Personal family narrative/stories — keep only historical/cultural
context"). It is excluded from all three storyline spikes (003a/b/c), not just this one.

This storyline uses `coca-cola-sign`, `sari-sari-store`, `cement-step`, and
`galvanized-iron-panels` — the four hotspots with the clearest single visual referent in the
frame, each ordered to match how a viewer's eye would naturally travel across the photo (sign →
counter → step → roofline). `cavite-city-1953` and `barrio-density` are deliberately held back
for storylines 003b/003c so the three arcs don't converge on the same content.

## How to Run

Open `.planning/spikes/003-storyline-comparison.html` in a browser, select the "003a · Object
Journey" tab, and page through the 5 beats with Prev/Next.

## What to Expect

Each beat pairs a `setPrompt()`-ready directional clause (compatible with spike 002's
`composePrompt()`) with a spoken narration line drawn near-verbatim from the hotspot's
`shortDescription`, condensed to a single spoken sentence.

## Investigation Trail

1. First draft tried to narrate all 4 hotspots' full `paragraphs` content — far too long for a
   spoken beat in a 2-3 minute demo slot. Condensed each to one sentence, keeping only the fact
   most legible on-camera (e.g., cement's "first pour was a step" rather than the full postwar
   cement-industry history).
2. Considered including `cavite-city-1953` (broader place history) as a 5th beat, but it has no
   single object in-frame to point the steering prompt at — it would read as narration disconnected
   from what the audience sees changing. Moved it to storyline 003b instead, where atmosphere
   carries more of the narrative weight than object-pointing.

## Results

**Verdict: WINNER on legibility** (see 003c's head-to-head write-up for the full 3-way comparison).

This arc's strength is that every narration line has an obvious on-screen referent — an audience
member who's never seen the photo before can follow "the sign → the counter → the step → the
roof" without needing prior context. Its weakness: it reads more like a guided tour than a "living
memory," which is a slightly weaker match to the project's stated Core Value ("photo → living,
steerable memory") than storyline 003b.
