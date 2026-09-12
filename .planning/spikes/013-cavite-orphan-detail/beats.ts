// Spike 013 — adds a new evolution beat to the "cavite-1953" flagship scene
// in my-orbis-app/app/lib/prompts.ts, per the user's explicit decision on
// 2026-09-11 to lift spike 002/003's "four children / orphan father" content
// exclusion for this world (see MANIFEST.md Requirements for the recorded
// reversal and rationale).
//
// Shape matches the `Prompt` / `Scene["evolutions"]` entries already in
// prompts.ts — this is a drop-in addition to the existing `cavite-1953`
// scene's `evolutions` array, appended after "Wide Barrio Shot". Not wired
// into prompts.ts by this spike; standalone content spike per this
// project's convention (004/005/012 built the same way).
//
// REAL FAMILY, NOT COMPOSITE — same flagship family as the rest of
// cavite-1953. This beat surfaces that a child in the household was
// orphaned very young. Per the user's framing ("so it was imaged" ->
// imagined), no photograph of that child exists from the period — the
// family's one surviving photo (the sari-sari storefront) does not
// picture them. This is the second spike (after 012's ration-card beat)
// to use the `imagined` disclosure field: rather than claim a fabricated
// child's portrait as documentary, the beat is written to disclose the
// gap openly in narration, matching this project's established rule that
// a real, unconsented photograph's actual subjects are never assigned an
// invented identity — the same discipline applies in reverse here: a real
// family member with no surviving photograph is never presented AS IF a
// generated image were an authentic record of them.

export interface Prompt {
  title: string;
  text: string;
  narration?: string;
  imagined?: boolean;
  imaginedDisclosure?: string;
}

/** Append to SCENES["cavite-1953"].evolutions after "Wide Barrio Shot". */
export const NEW_EVOLUTION: Prompt = {
  title: "The Child Who Isn't in the Photo",
  text: "The same barrio street, the same sari-sari storefront and concrete step. A single, softly lit portrait study of a young child in 1950s Filipino barrio clothing stands just off to the side of the storefront, at the edge of where the alley opens up, looking back toward the camera. Gentle, still, a single unbroken take.",
  narration:
    "One of the children in this household was orphaned very young — young enough that no photograph of them survives from this time. The storefront photo this world is built from doesn't picture them at all. What you're seeing here is an imagined likeness, not a record: we don't know what they looked like as a child. We only know they were there.",
  imagined: true,
  imaginedDisclosure:
    "No photograph of this child from the 1950s exists. This beat is a generated, imagined portrait standing in for a real person the family has no picture of — it is not presented as a documentary likeness, and UI copy accompanying this beat must say so plainly.",
};
