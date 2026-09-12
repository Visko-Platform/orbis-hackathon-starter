export type DirectionMode = "refine" | "pivot";

export function buildLiveDirection(input: {
  direction: string;
  mode: DirectionMode;
  currentPrompt: string;
  brand: string;
  preserveBrand: boolean;
  // Approved product appearance; restated when the brand stays in the scene.
  productAppearance?: string;
  // Scene contract clause ("Keep true: …"); when present it carries the appearance too.
  contractClause?: string;
}) {
  const direction = input.direction.trim();
  const scene = input.mode === "pivot"
    ? `New creative direction. Transition the running video into this scene: ${direction}. This replaces the previous setting, narrative, lighting, and camera instructions. Let the visual transition unfold continuously.`
    : `Current scene context: ${input.currentPrompt.slice(-2000)}\nDirector's latest adjustment, which takes precedence over earlier conflicting details: ${direction}. Maintain continuity for elements not changed by this adjustment.`;
  const appearance = input.preserveBrand && input.productAppearance && !input.contractClause ? ` The product looks like this: ${input.productAppearance}` : "";
  const clause = input.contractClause ? ` ${input.contractClause}` : "";
  return [scene, input.preserveBrand
    ? `Keep ${input.brand} naturally present within the new environment. Preserve recognizable brand artwork; avoid ad breaks or promotional title cards.${appearance}${clause}`
    : `The new direction is authoritative, including any requested changes to products, sponsor, or branding.${clause}`,
  "Photorealistic cinematic motion. Respond to the director's request in the next generated sequence."].join("\n");
}
