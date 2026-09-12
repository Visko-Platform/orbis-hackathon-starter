---
spike: 004
name: composite-world-cambodia
type: standard
validates: "Given verified public-domain historical research on an ordinary early-1960s Phnom Penh childhood and a rights-clear reference image, when scripted as an object-journey `beats.ts` entry labeled explicitly composite, then produce a demo-ready world + a sourcing/legitimacy trail"
verdict: VALIDATED (content + sourcing) ✓ — render quality PENDING (no live API key until event check-in)
related: [003a, 006]
tags: [storyline, narration, composite, sourcing, cambodia]
---

# Spike 004: Composite World — Phnom Penh, 1964

## What This Validates

Given verified public-domain historical research on an ordinary early-1960s Phnom Penh childhood
(market, home, school, street, food, music) and a rights-clear reference image, when scripted as an
object-journey `beats.ts` entry labeled explicitly composite, then it produces a demo-ready world
plus a sourcing/legitimacy trail that survives scrutiny — this is the second of the pivot's two new,
non-personal "worlds," and the riskiest part of the whole pivot: can a world that isn't the
presenter's real family be built honestly, without accidentally presenting invented material as
someone's authentic family history, and without the Khmer Rouge era becoming the story's shadow?

## Research

**Historical grounding (general, verified across multiple sources):**
- Cambodia's 1955-1970 constitutional-monarchy period under Norodom Sihanouk is widely remembered
  (both by Cambodians and Cambodia scholarship) as the *Sangkum* — a "golden age," Phnom Penh dubbed
  the "Pearl of Asia." This is exactly the pre-1965 window the user asked for: ordinary, not
  Khmer-Rouge-adjacent (the Khmer Rouge took power in 1975, a full decade after this scene).
- Central Market (Psar Thmei) is a real, well-documented Art Deco landmark completed in 1937 — this
  fact is solid, but it does **not** appear in the reference photo that ended up winning (see
  Investigation Trail), so it was cut from the final beats rather than forced in.

**Image sourcing (the actual hard part):**
- First lead: NIU/ASU's "Palgen Photo Collection" (SEADL digital library) — a real academic archive
  of 1950s-60s Cambodia photography. Could not verify licensing/browse specific images; the site is
  JS-rendered and didn't return usable content via fetch. **Not used** — noted as a fallback lead if
  more time exists on build day, not a dead end to re-attempt tonight.
- Second lead, initially promising then rejected: `File:Phnom Penh.- le Marché Central.jpg` on
  Wikimedia Commons. A web-search summary claimed this was a public-domain vintage photo. Checking
  Commons' own API metadata directly (`action=query&prop=imageinfo&iiprop=extmetadata`) showed the
  photo was actually taken **2014-02-01** by a modern photographer (self-published, marked PD) — a
  present-day photo of the market building, not a 1960s photo of it. **This is the spike's single
  most important finding:** an AI web-search summary asserted a fact ("public domain, author died
  1971") that direct verification of the primary source contradicted. Always check the file's own
  metadata before trusting a search summary's claim about provenance or license.
- Winning candidate: `File:Phnom Penh street scene November 1964.jpg` on Wikimedia Commons — a real,
  dated (1964-11-02), high-resolution color photo by Don Christie, licensed **CC BY-SA 4.0**
  (attribution + share-alike required; both satisfiable for a hackathon demo/repo). Verified via
  Commons' own `imageinfo`/`extmetadata` API, not a search summary. Downloaded to
  `../004-seed-photo-candidate.jpg` (4917×3253) and **cropped to `../phnom-penh-1964.jpg`
  (832×480, 16:9)** — top-heavy crop (removed 487px from the top canopy, kept the full bottom edge)
  to preserve every beat's subject: the monk, cyclo, sedan, and crossing child all survive the crop.
  Ready to drop into `my-orbis-app/public/images/` as-is on build day. Needs 3-4 words of
  attribution in the demo's credits per CC BY-SA 4.0.

## How to Run

Read `beats.ts` in this directory. Not wired into the running app yet (per this project's
convention: content spikes ship as standalone `beats.ts`-shaped files first; wiring into
`prompts.ts` is a separate, deliberate step — see the `cavite-1953` scene's own history, wired in a
follow-up commit after spike 003a won).

Open `../004-seed-photo-candidate.jpg` to see the actual reference image the beats describe.

## What to Expect

A `baseScene` string plus 6 ordered beats, each pairing a steering `prompt` with a spoken
`narration` line, describing real, visible elements of the actual photo (whitewashed tree trunks, a
monk on his almsround, a cyclo, a vintage sedan, a child crossing the street, a wide recap) — not
generic or invented imagery. `worldMeta` carries the three-question intro content and the explicit
composite disclosure string for spike 006's landing screen to consume.

## Investigation Trail

1. Started from the user's own brief ("market, home, school, street life, food, music") and drafted
   a first pass of beats around Psar Thmei's dome, a krama, and num banh chok noodles — all real,
   verified general facts, but **invented as a scene**, not grounded in an actual photograph. This
   would have repeated the mistake spike 003 explicitly warned against ("ground every claim in real
   source content ... not placeholder text").
2. Searched for a rights-clear reference photo. First candidate (2014 "Marché Central" PD photo)
   looked good from a web-search summary alone; checking Commons' own metadata directly overturned
   it — it's a modern photo, not a vintage one. Rejected.
3. Found `Phnom Penh street scene November 1964.jpg` — verified via direct API call to be genuinely
   dated, genuinely CC BY-SA 4.0, genuinely showing ordinary Sangkum-era street life (monk, cyclo,
   vintage car, barefoot child, whitewashed trees). Downloaded and visually inspected it.
4. **Rewrote all 6 beats from scratch** to describe what's actually in this photo instead of the
   first pass's generic Sangkum imagery — Psar Thmei's dome doesn't appear in this photo, so it was
   cut even though the underlying fact (built 1937) is accurate; using it would have been
   "voiceover for a different photo," the exact anti-pattern the user is trying to avoid by pivoting
   toward "beautiful paths" over invented pageantry.
5. Deliberately did **not** name the real barefoot child in the photo as "Yay" (the invented
   grandmother) — the narration for that beat stays on general facts about children crossing streets
   in that era, not an identity claim about a real, unconsented photograph subject. This is a
   privacy/honesty boundary this project already holds for its *own* family's photos (spike 003's
   "four children" exclusion); it applies with equal force to a stranger's archival photo.

## Results

**Verdict: VALIDATED (content + sourcing) ✓ — render quality PENDING.**

- Content and legitimacy: validated. A genuinely composite, genuinely labeled, genuinely
  fact-grounded world is buildable in this session's timeframe, following the same object-journey
  shape as the flagship. The single biggest risk the user flagged — "you don't want invented AI
  material accidentally presented as someone's authentic family history" — is addressed by (a) a
  real, dated, licensed source photo instead of an invented one, and (b) explicit
  `compositeDisclosure` copy plus never assigning the real photo's real bystanders an invented
  identity.
- **Surprise:** the biggest risk in this spike wasn't cultural sensitivity (the user had already
  reasoned through that well) — it was **provenance laundering through an AI search summary**. A
  plausible-sounding claim about a photo's date/license was wrong, and would have shipped wrong if
  not checked against the primary source's own metadata API. Treat this as a standing practice for
  any future sourcing spike, not a one-off.
- **Deferred, not skipped:** actual Orbis-Stable render-quality verification for this image (does it
  image-anchor as well as Cavite's photo did?) cannot happen tonight — no live Reactor API key
  exists until event check-in tomorrow (per PROJECT.md constraints). This is the same shape of
  deferral spike 001 already established for the missing-key case; it is not a new risk, just a
  second instance of an already-known one. The 16:9 crop is already done
  (`../phnom-penh-1964.jpg`, 832×480, drop-in ready for `my-orbis-app/public/images/`) — build-day
  task is now just running it through the real session and confirming within the first 15 minutes
  of build time, before investing further polish in this world.
