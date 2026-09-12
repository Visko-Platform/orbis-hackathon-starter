---
spike: 013
name: cavite-orphan-detail
type: standard
validates: "Given the flagship cavite-1953 world's locked exclusion of orphan/parent-loss content and a new instruction to include an orphaned-young child detail, when the exclusion is lifted and a new evolution beat is added, then the beat is written to disclose the missing photographic record honestly rather than fabricate a false documentary likeness"
verdict: VALIDATED ✓
related: [002, 003a, 012]
tags: [storyline, narration, real-family, cavite, privacy, imagined-content]
---

# Spike 013: Cavite Flagship World, Orphan Detail Added

## What This Validates

Given the `cavite-1953` flagship scene's existing, deliberate exclusion of "four children / orphan
father" hotspot content (locked in spikes 002/003 as personal family narrative, out of scope for
the demo) and a new instruction from the user to include that an orphaned-very-young child was part
of this real family, and that no photograph of that child survives from the period ("so it was
imagined") — when the exclusion is lifted and a new evolution beat is added to the existing object
journey, does the beat honestly disclose the gap in the photographic record instead of presenting a
generated image as if it were a real archival photo?

## Requirement Reversal (recorded, not silently changed)

Spike 002/003's exclusion was itself a deliberate privacy decision, not an oversight — the README
for 003a states it explicitly: "Deliberately excludes the 'four children / orphan father' hotspot
(personal family narrative, out of scope)." On 2026-09-11 the user confirmed they want this
included after all — see `MANIFEST.md` Requirements for the exact wording and rationale. This spike
does not silently overwrite that decision; the original exclusion note stays in
`003a-storyline-object-journey/beats.ts` and in `my-orbis-app/app/lib/prompts.ts`'s own header
comment as the historical record of the original boundary, and the new beat is added as an
explicit, separate addition (`NEW_EVOLUTION`) rather than an in-place edit — so a future reader can
see both the original boundary and the later decision to lift it, not just the end state.

## Research

No external research needed — this is the presenter's own real family history, provided directly
by the user, not sourced from public records the way the composite worlds' facts are. The relevant
question for this spike wasn't historical accuracy, it was a content-honesty question already
worked out independently in spike 012 for the Leningrad great-grandmother: **what do you show for a
real person with no surviving photograph?**

Two options were considered:
1. Skip a visual entirely for this beat, letting narration alone carry the detail.
2. Generate an image and disclose plainly that it's an imagined likeness, not a record.

The user's own phrasing for this request ("so it was imagined") points at option 2 directly, and it
matches how the object-journey format works elsewhere in this scene (every beat pairs narration
with a concrete visual). Skipping the visual would break the format's own established pattern more
than it would protect anyone — the disclosure, not the absence of an image, is what does the actual
work here.

## How to Run

Read `beats.ts` in this directory. Compare against the `cavite-1953` scene's existing `evolutions`
array in `my-orbis-app/app/lib/prompts.ts` (unmodified by this spike) to see where `NEW_EVOLUTION`
would be appended on build day. Not wired into `prompts.ts` yet — standalone content spike, same
convention as 004/005/012.

## What to Expect

One new `Prompt`-shaped object, `NEW_EVOLUTION`, matching the exact shape already used by
`cavite-1953`'s other evolutions (`title`/`text`/`narration`), plus the two new optional fields
introduced by spike 012 (`imagined`, `imaginedDisclosure`). The narration states directly, in the
presenter's own spoken line, that no photograph of this child survives and that what's shown is an
imagined likeness — not buried in a code comment only Claude or a developer would read.

## Investigation Trail

1. First draft of the narration described the child's fate purely factually ("orphaned very
   young") without addressing the missing photo at all. Rejected: that draft would have let a
   generated child's-portrait beat sit in the same object-journey format as the other five beats —
   which are all grounded in the one real, verified 1953 photograph — with nothing in the UI or
   narration signaling that this one beat is categorically different (invented, not documented).
   That's exactly the kind of silent conflation the project's own established rule (never present
   an unconsented or undocumented subject as if photographically real) is meant to prevent, just
   applied to a beat instead of to sourcing a stranger's Commons photo.
2. Rewrote the narration to state the gap explicitly and in the presenter's own voice: "no
   photograph of them survives," "what you're seeing here is an imagined likeness, not a record."
   This mirrors spike 012's `imaginedDisclosure` field, confirming the field is genuinely reusable
   across both spikes rather than a one-off for Leningrad specifically.
3. Named the beat "The Child Who Isn't in the Photo" rather than something more generic like
   "Family Portrait" — the title itself carries part of the disclosure, so even a UI that only
   surfaces titles (not full narration) doesn't accidentally imply documentary authenticity.

## Results

**Verdict: VALIDATED ✓**

- Lifting a previously locked privacy exclusion is safe to do mechanically (one new evolution
  entry, original exclusion note left intact as historical record) but is not content-neutral — the
  new beat needed its own, separate honesty discipline (imagined vs. documented) that the original
  five beats never had to worry about, because they're all grounded in one real, verified photo.
- **Cross-spike finding, confirmed independently in both 012 and 013:** when a real family detail
  has no surviving photographic record, the fix is disclosure in-beat (title + narration + a
  structured `imagined`/`imaginedDisclosure` field), not omission and not a silently-undisclosed
  generated image. Recommend `Prompt`'s `imagined`/`imaginedDisclosure` fields (introduced in spike
  012) become a standing convention for any future beat in this codebase that lacks a real
  photographic anchor — see CONVENTIONS.md update.
- Impact on remaining work: none of spikes 001-011's other conclusions are affected. This spike
  only proposes one additive evolution entry for `cavite-1953`, gated behind the user's explicit
  2026-09-11 decision to lift the original exclusion.
