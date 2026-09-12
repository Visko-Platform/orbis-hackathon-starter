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
};

/** Orbis applies a prompt at the next chunk boundary (~1.8 s); the action beat gets two chunks. */
export const TRANSITION_BEAT_MS = 3_600;

function fidelityLine(input: DirectionInput) {
  const notes = input.productNotes ?? [];
  return notes.length > 0 ? `Product fidelity, exactly as in the brand's reference views: ${notes.join(" ")}` : null;
}

function brandLine(input: DirectionInput) {
  const appearance = input.preserveBrand && input.productAppearance ? ` The product looks like this: ${input.productAppearance}` : "";
  return input.preserveBrand
    ? `Keep ${input.brand} naturally present within the new environment. Preserve recognizable brand artwork; avoid ad breaks or promotional title cards.${appearance}`
    : "The new direction is authoritative, including any requested changes to products, sponsor, or branding.";
}

export function buildLiveDirection(input: DirectionInput) {
  const direction = input.direction.trim();
  const scene = input.mode === "pivot"
    ? `New creative direction. Transition the running video into this scene: ${direction}. This replaces the previous setting, narrative, lighting, and camera instructions. Let the visual transition unfold continuously.`
    : `Current scene context: ${input.currentPrompt.slice(-2000)}\nDirector's latest adjustment, which takes precedence over earlier conflicting details: ${direction}. Maintain continuity for elements not changed by this adjustment.`;
  return [scene, fidelityLine(input), brandLine(input),
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
  const direction = input.direction.trim();
  const action = [
    `Right now, in one continuous camera move, the scene transforms into: ${direction}.`,
    `The change is large and clearly visible within the next moments: the environment, light, and framing are already becoming ${direction}.`,
    fidelityLine(input),
    brandLine(input),
    "Photorealistic cinematic motion, one continuous take, no cuts.",
  ].filter(Boolean).join("\n");
  return { action, settled };
}
