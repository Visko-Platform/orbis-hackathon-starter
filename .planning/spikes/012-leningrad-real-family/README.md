---
spike: 012
name: leningrad-real-family
type: standard
validates: "Given spike 005's composite/fictional Leningrad world and a real great-grandmother family detail the storyteller has never met, when the world is converted to real family narrative and a new object-anchored beat is added, then the world's composite disclosure requirement is correctly retired and the new detail is handled without fabricating an invented likeness for a real, specific, deceased person"
verdict: VALIDATED ✓
related: [005, 006, 013]
tags: [storyline, narration, real-family, russia, privacy, imagined-content]
---

# Spike 012: Leningrad World, Converted to Real Family

## What This Validates

Given spike 005's Leningrad, 1980s world — built and documented as a *composite/fictional*
portrait with an invented "Babushka" figure placed in a real, dated street photograph — and a new
instruction that this is actually a real family's story, including a great-grandmother
("Prababushka") who died of starvation during the Siege of Leningrad and whom the storyteller never
met: when the world's `composite` flag and UI disclosure requirement are retired and a new beat is
added for the great-grandmother detail, does the result stay honest about what's real vs.
illustrative, and does it avoid the trap of fabricating an invented photographic likeness for a
real, specific, deceased person?

## Requirement Reversal (recorded, not silently changed)

Spike 004/005/006 established a hard requirement: non-flagship worlds must be clearly labeled
composite/fictional, never presented as a real family's authentic history. On 2026-09-11 the user
confirmed this world should instead be **real** — see `MANIFEST.md` Requirements for the exact
wording and rationale. This spike does not relitigate that decision; it implements it and checks
what breaks when it's applied.

**What changed:**
- `worldMeta.composite` flips from `true` to `false`.
- `worldMeta.compositeDisclosure` (UI copy asserting fictionality) is replaced with
  `worldMeta.realFamilyNote`, which makes a narrower, still-honest claim: the *person* (Babushka,
  Prababushka) is real, but the street photograph is still only illustrative period setting, not a
  claim about this family's exact address or the literal identities of the pedestrians pictured in
  someone else's archival photo. That second-order distinction survives the reversal — dropping
  "this world is fictional" does not mean "this street photo is now a documentary photo of this
  family." Those are two separate claims and only one of them changed.

**What did NOT change:** the underlying street photograph's sourcing/licensing facts from spike
005 (CC BY 2.0, Vladimir Fedotov, captioned "1980s" not an exact year) are unaffected by whether the
*person* in the world is real or invented — the photo's own provenance doesn't change based on who
the app says lived there.

## Research

No new historical research was required — the Siege of Leningrad's 1941-1944 famine and civilian
starvation deaths are well-documented historical fact (independently verifiable, not something this
spike needed to source an image or a citation for, since no image of Prababushka is used). The one
open research question was practical, not historical: **how does an "object-journey" storyline
handle a beat where the emotional subject has no surviving photograph at all** — not even a
composite/invented one is appropriate, because unlike spike 004/005's invented "Babushka" placed in
a real crowd photo, Prababushka is not a placeholder for atmosphere — she is a specific, real,
named, deceased relative. Inventing a face for her would misrepresent a real person the same way the
project already refuses to do for a stranger's unconsented archival photo (see MANIFEST.md's
"never assign a real, unconsented photograph subject an invented identity" rule) — the same
discipline, applied here in the opposite direction: don't assign a *real* person an *invented*
photographic identity either.

**Resolution:** anchor the beat on a surviving *object type* (a wartime bread-ration card) instead
of a face. This keeps the beat inside the established object-journey convention (every beat has one
concrete visual referent) without ever rendering "what Prababushka might have looked like."

## How to Run

Read `beats.ts` in this directory. Compare against
`.planning/spikes/005-composite-world-russia/beats.ts` (unmodified, kept as the historical record of
the original composite framing) to see exactly what changed. Not wired into the running app yet —
standalone content spike, same convention as 004/005.

## What to Expect

- `worldMeta` with `composite: false`, a `realFamilyNote` replacing the old
  `compositeDisclosure`, and a new `greatGrandmother` object capturing the Prababushka detail
  (label, relationship, fate, `everMet: false`, note).
- The original 6 beats from spike 005, unchanged in content (the street/tram/wires/bell
  tower/coats/loudspeaker beats describe the *environment*, which doesn't need to change just
  because the person in it is now real rather than invented).
- One new 7th beat, "A Ration Card, Kept" — object-anchored, `imagined: true`, with an
  `imaginedDisclosure` string explaining exactly what is and isn't documented.

## Investigation Trail

1. Started by asking whether `composite: false` alone was a sufficient fix. It isn't — the
   `compositeDisclosure` UI copy string is written entirely in terms of "this is not a real family";
   simply deleting it would leave the world with no explanatory copy at all, and the *photo vs.
   person* distinction (see above) would get lost along with it. Wrote `realFamilyNote` as a
   deliberate replacement, not a deletion, to carry that distinction forward.
2. Considered generating an "imagined portrait" of Prababushka the same way spike 013 does for the
   Cavite orphaned child, then rejected it: the two cases aren't equivalent. The Cavite child is
   anonymous within the family's own telling (no name is given in the source material) and the
   family themselves control and consent to that speculative image. Prababushka is named,
   specific, and the subject of an inherited grief — inventing "what she looked like" risks the
   family later feeling the app fabricated a false memory of her, which is a materially different
   harm than an unnamed generic child portrait. This asymmetry is the actual finding of this spike,
   not just a style choice — see CONVENTIONS.md update.
3. Landed on the ration-card object anchor specifically because it's independently, generically
   plausible (ration cards from besieged Leningrad are a well-documented historical object class)
   without asserting it IS a specific surviving artifact this specific family owns, unless the real
   user later confirms one exists — the narration says "this is the one object the family still has
   of her," which is a factual claim this spike cannot itself verify and flags as such in
   `imaginedDisclosure`.

## Results

**Verdict: VALIDATED ✓**

- The composite → real conversion is mechanically simple (three `worldMeta` fields) but has a real
  content trap: deleting the composite disclosure without replacing it would silently drop the
  photo-vs-person distinction that still matters post-conversion.
- **Key finding, worth carrying forward:** "real person with no surviving photo" and "invented
  person placed in a real photo" are not the same problem and should not use the same solution.
  Composite worlds (004/005) invent a *person* to inhabit a *real* photo. This spike's beat instead
  keeps the person real and named, and invents an *object*, not a face — because the person is real,
  specific, and grieved, inventing their likeness would misrepresent them in a way inventing an
  atmospheric placeholder figure does not.
  This is the same underlying privacy discipline as spike 013's orphaned-child beat, arrived at
  independently and worth stating as one shared rule (see CONVENTIONS.md).
- Impact on remaining work: none of spikes 001-011's other conclusions are affected. This spike only
  touches the Leningrad world's metadata and adds one new beat.
