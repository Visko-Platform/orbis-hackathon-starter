export type DirectionMode = "refine" | "pivot";

export function buildLiveDirection(input: {
  direction: string;
  mode: DirectionMode;
  currentPrompt: string;
  brand: string;
  preserveBrand: boolean;
}) {
  const direction = input.direction.trim();
  const scene = input.mode === "pivot"
    ? `New creative direction. Transition the running video into this scene: ${direction}. This replaces the previous setting, narrative, lighting, and camera instructions. Let the visual transition unfold continuously.`
    : `Current scene context: ${input.currentPrompt.slice(-2000)}\nDirector's latest adjustment, which takes precedence over earlier conflicting details: ${direction}. Maintain continuity for elements not changed by this adjustment.`;
  return [scene, input.preserveBrand
    ? `Keep ${input.brand} naturally present within the new environment. Preserve recognizable brand artwork; avoid ad breaks or promotional title cards.`
    : "The new direction is authoritative, including any requested changes to products, sponsor, or branding.",
  "Photorealistic cinematic motion. Respond to the director's request in the next generated sequence."].join("\n");
}
