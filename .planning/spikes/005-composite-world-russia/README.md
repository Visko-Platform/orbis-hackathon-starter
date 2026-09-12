---
spike: 005
name: composite-world-russia
type: standard
validates: "Given verified public-domain historical research on an early-1980s Leningrad household childhood and a rights-clear reference image, when scripted the same way, then produce a demo-ready world + a sourcing/legitimacy trail"
verdict: VALIDATED (content + sourcing) ✓ — render quality PENDING (no live API key until event check-in)
related: [003a, 004, 006]
tags: [storyline, narration, composite, sourcing, russia]
---

# Spike 005: Composite World — Leningrad, 1980s

## What This Validates

Given verified public-domain historical research on an early-1980s Leningrad household childhood
(apartment/kitchen, school, tram, neighborhood shop, grandparents' routines) and a rights-clear
reference image, when scripted the same object-journey way as spikes 003a/004, then it produces a
demo-ready world plus a sourcing/legitimacy trail — applying the same method spike 004 validated to
a second, architecturally and climatically distinct culture, to confirm the pattern generalizes
rather than being a one-off fit for Cambodia specifically.

## Research

**Historical grounding (verified across multiple sources):**
- By the 1980s, most Leningrad families had moved out of the classic multi-family *kommunalka*
  (communal apartment) and into their own separate flat, typically in a mass-produced panel
  apartment block built from the 1960s onward — this is a real correction to the user's own brief,
  which suggested "apartment/kitchen" without specifying which era of Soviet housing. A kommunalka
  would have been the more common setting a generation earlier; a separate family flat is the more
  historically accurate choice for **1984** specifically. Reflected in `worldMeta` and the beats
  (no kommunalka imagery used).
- Leningrad had the largest tram network in the world by the late 1980s (~340 km of unduplicated
  track) — trams were not a novelty but the default way most residents got around.
- Public street/courtyard loudspeakers carrying state radio broadcasts (news, the anthem, morning
  exercise instructions) were a genuine, widespread fixture of Soviet urban life — a distinctive,
  low-risk period detail with no personal-privacy or sensitive-history overhang.
- Many of the city's pre-revolutionary church buildings survived the Soviet period standing, even
  while repurposed for secular use (warehouses, pools, museums) — used here only as a general,
  softly-stated fact about the skyline, not a claim about any specific building's exact history
  (see Investigation Trail — the exact church in the reference photo was not identified with
  confidence, so the narration stays general).

**Image sourcing:**
- Winning candidate on the first search: `File:Leningrad 1980s.jpg` on Wikimedia Commons — a real
  black-and-white street photo (tram, apartment row, church bell tower, pedestrians in coats,
  overhead wires, a corner-mounted loudspeaker), captioned "Syezzhinskaya Linia, Vasilievsky Island,
  Leningrad, 1980s" by photographer Vladimir Fedotov, sourced from Flickr and licensed **CC BY 2.0**
  (attribution only). Verified via Commons' own `imageinfo`/`extmetadata` API. Downloaded to
  `../005-seed-photo-candidate.jpg` (1024×664) and **cropped to `../leningrad-1980s.jpg`
  (832×480, 16:9)** — trimmed from top and bottom, keeping the tram, wires, bell tower, coated
  pedestrians, and street loudspeaker all in frame. Ready to drop into
  `my-orbis-app/public/images/` as-is on build day.
- **Honesty gap, disclosed rather than hidden:** the photo's own caption gives a decade ("1980s"),
  not an exact year. This spike targets 1984 to match the user's original pitch, but that specific
  year is this project's choice, not a fact the photo itself proves. Framed in copy as "the 1980s"
  in `worldMeta.year` context, not asserted as a verified exact date the way spike 004's 1964 photo
  legitimately can be.
- Unlike spike 004, this was a fast, clean hit on the first specific search — no false lead to
  reject. Worth noting as a finding in its own right: sourcing difficulty is not uniform across the
  two composite worlds, and a future third/fourth world shouldn't assume either outcome by default.

## How to Run

Read `beats.ts` in this directory. Not wired into the running app yet — standalone content spike,
same convention as 004.

Open `../005-seed-photo-candidate.jpg` to see the actual reference image the beats describe.

## What to Expect

A `baseScene` string plus 6 ordered beats (tram, overhead wires, bell tower, coated pedestrians,
street loudspeaker, wide recap), each grounded in what's actually visible in the photo, plus
`worldMeta` carrying the three-question intro content and composite disclosure for spike 006.

## Investigation Trail

1. Applied spike 004's corrected method from the start this time: search for a real, dated,
   rights-clear photo **before** drafting any beats, rather than drafting first and retrofitting a
   photo after (which is what produced 004's throwaway first draft).
2. First targeted search (`Leningrad kitchen apartment` on Commons full-text search) returned
   irrelevant noise — Commons' full-text search is weak for compound descriptive queries. Second
   attempt, narrower and category-based (`Category:LM-49 in Saint Petersburg` — the actual Leningrad
   tram model), surfaced `Leningrad 1980s.jpg` directly inside a well-scoped category rather than
   full-text search. **Finding worth carrying into spike 006/future sourcing work:** category
   browsing on Commons outperforms full-text search once you know one concrete, era-specific proper
   noun to anchor on (a tram model, a market name, a building name) — searching generic scene
   descriptions ("kitchen," "apartment," "everyday life") does not.
3. Rejected a second candidate found in the same category
   (`Vasilevskii ostrov, 1977 (9548980935).jpg`) after checking its metadata: despite "1977" in the
   filename, its actual EXIF timestamp is 2013 — almost certainly a modern photo of a plaque,
   memorial, or retro-styled sign referencing 1977, not an actual 1977 photograph. Same failure mode
   as spike 004's rejected Marché Central photo: a filename or caption implying vintage provenance
   that the file's own metadata contradicts. Two-for-two on this exact failure mode across two
   independent sourcing sessions — strong enough evidence to treat "check the metadata, not just the
   filename/caption" as a hard rule for any future image sourcing, not a one-off gotcha.
4. Wrote the 6 beats directly from what's visible in the winning photo (tram, wires, bell tower,
   coats, loudspeaker), the same discipline spike 004 landed on after its false start.

## Results

**Verdict: VALIDATED (content + sourcing) ✓ — render quality PENDING.**

- The object-journey method and the composite-labeling discipline from spike 004 generalize cleanly
  to a second, unrelated culture and era — this was not a Cambodia-specific fit.
- **Two-for-two pattern confirmed:** in both composite-world spikes, the first "vintage-looking"
  photo candidate a search surfaced turned out, on metadata inspection, to be a modern photo
  misleadingly captioned/named. Recommend this becomes a standing convention (see
  CONVENTIONS.md update): never accept a search result's or filename's claimed date/license for a
  historical image without checking the file's own metadata directly.
- Same deferred item as spike 004: real Orbis-Stable render-quality verification needs the live API
  key issued at tomorrow's event check-in. The 16:9 crop is already done (`../leningrad-1980s.jpg`,
  832×480) — build-day task is now just test-rendering it early, alongside 004's photo.
