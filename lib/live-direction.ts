export type DirectionMode = "refine" | "pivot";

type DirectionInput = {
  direction: string;
  mode: DirectionMode;
  currentPrompt: string;
  brand: string;
  preserveBrand: boolean;
  // Approved product appearance; restated when the brand stays in the scene.
  productAppearance?: string;
  /** "Label: appearance" lines for product views the direction calls up. */
  productNotes?: string[];
  // Scene contract clause ("Keep true: …"); when present it carries the appearance too.
  contractClause?: string;
  /** An authored physical action for the action beat, used instead of "the scene transforms into" wording. */
  actionDirection?: string;
  /** What carries over unchanged from the previous shot (cast, which watch is where, fixed brand marks). */
  continuity?: string;
};

const RIGID_BODY_RULE =
  "Rigid-body rule: the product is one solid object. When it is handled, turned over, or put on, it rotates as a single piece, keeps its exact proportions, and never bends, stretches, melts, doubles, or merges with hands, clothing, or the background. Turning it over swaps which face is visible; it never makes both faces plain.";

/** A direction without its closing punctuation, so templates can end the sentence themselves. */
function sentence(text: string) {
  return text.trim().replace(/[.!?]+$/, "");
}

/** Orbis applies a prompt at the next chunk boundary (~1.8 s); the action beat gets two chunks. */
export const TRANSITION_BEAT_MS = 3_600;

/** Ceiling for the running prompt a route accepts back from the client; a sanity check, not a budget. */
export const MAX_CURRENT_PROMPT_CHARS = 16_000;

function fidelityLine(input: DirectionInput) {
  const notes = input.productNotes ?? [];
  if (notes.length === 0) return null;
  return `Product views in this shot, exactly as in the brand's reference photos: ${notes.join(" ")} Each note describes one face or state of the watch it names; a watch always has its dial on one face and its plain steel case back on the other, only one face is visible at a time, and the dial face is never plain steel. ${RIGID_BODY_RULE}`;
}

// Used by both beats, so the scene contract is restated in the action beat as well as the settled prompt.
function brandLine(input: DirectionInput) {
  const appearance = input.preserveBrand && input.productAppearance && !input.contractClause ? ` The product looks like this: ${input.productAppearance}` : "";
  const clause = input.contractClause ? ` ${input.contractClause}` : "";
  return input.preserveBrand
    ? `Keep ${input.brand} naturally present within the new environment. Preserve recognizable brand artwork; avoid ad breaks or promotional title cards.${appearance}${clause}`
    : `The new direction is authoritative, including any requested changes to products, sponsor, or branding.${clause}`;
}

export function buildLiveDirection(input: DirectionInput) {
  const direction = sentence(input.direction);
  const continuity = input.continuity?.trim();
  const scene = input.mode === "pivot"
    ? continuity
      ? `New creative direction. Transition the running video into this scene: ${direction}. This replaces the previous setting, lighting, and camera instructions; the continuity below carries over unchanged. Let the visual transition unfold continuously.`
      : `New creative direction. Transition the running video into this scene: ${direction}. This replaces the previous setting, narrative, lighting, and camera instructions. Let the visual transition unfold continuously.`
    : `Current scene context: ${input.currentPrompt.slice(-2000)}\nDirector's latest adjustment, which takes precedence over earlier conflicting details: ${direction}. Maintain continuity for elements not changed by this adjustment.`;
  return [scene, continuity ? `Continuity: ${continuity}` : null, fidelityLine(input), brandLine(input),
  "Photorealistic cinematic motion. Respond to the director's request in the next generated sequence."].filter(Boolean).join("\n");
}

/**
 * A pivot lands as two prompts. The action beat asks for a large, visible
 * change right now, with no continuity or steady-camera language that would
 * make the model conservative. The settled prompt then holds the new scene.
 * Refinements are small by definition and get no action beat.
 */
export function buildLiveDirectionBeats(input: DirectionInput) {
  const settled = buildLiveDirection(input);
  if (input.mode !== "pivot") return { action: null, settled };
  const direction = sentence(input.direction);
  const motion = input.actionDirection?.trim();
  const opening = motion
    // A handled object: describe the physical motion, never a scene "transforming".
    ? [`Right now, in one continuous take, ${motion.charAt(0).toLowerCase()}${motion.slice(1)}${/[.!?]$/.test(motion) ? "" : "."}`,
      "The motion is physical and already under way: every object keeps its solid shape and proportions while it moves, and the camera follows it smoothly."]
    : [`Right now, in one continuous camera move, the scene transforms into: ${direction}.`,
      "The change is large and clearly visible within the next moments: the environment, light, and framing are already moving toward it."];
  const continuity = input.continuity?.trim();
  const action = [
    ...opening,
    continuity ? `Continuity: ${continuity}` : null,
    fidelityLine(input),
    brandLine(input),
    "Photorealistic cinematic motion, one continuous take, no cuts.",
  ].filter(Boolean).join("\n");
  return { action, settled };
}
