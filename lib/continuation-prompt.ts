import type { CampaignKnowledge } from "@/lib/knowledge/types";
import type { AudienceProfile, Campaign, FilmTitle } from "@/lib/studio-data";

export function buildContinuationPrompt({
  title,
  campaign,
  profile,
  sceneBrief,
  assetId,
  knowledge,
}: {
  title: FilmTitle;
  campaign: Campaign;
  profile: AudienceProfile;
  sceneBrief?: string;
  assetId?: string;
  // Approved product knowledge; adds the product's appearance and protections.
  knowledge?: CampaignKnowledge;
}) {
  const continuity = title.continuity;
  const asset = campaign.assets.find((item) => item.id === assetId);
  const appearance = asset?.appearance ? ` ${asset.label}: ${asset.appearance}` : "";
  const placement = assetId === "upload"
    ? `Integrate the supplied ${campaign.brand} artwork into a plausible surface in this environment. Preserve its recognizable design as part of the scene.`
    : asset?.integration
      ? `${asset.integration}${appearance}`
      : asset?.kind === "product"
        ? `Integrate the ${asset.label} shown in the reference as a physical product naturally present in the scene. Preserve its recognizable packaging or appearance, with realistic scale and lighting.${appearance}`
        : asset?.kind === "campaign"
          ? `Integrate the supplied ${asset.label} artwork as a background poster on an existing surface. Keep it secondary to the action.`
          : campaign.placement.instruction;
  const productReference = knowledge?.product.appearance
    ? `Product reference: ${knowledge.product.appearance}`
    : "";
  const protections = knowledge?.protectedChanges.length
    ? `Keep true throughout: ${knowledge.protectedChanges.join("; ")}.`
    : "";

  return [
    "Continue directly from the supplied reference frame. Respect the visible subject, composition, and environmental placement.",
    sceneBrief?.trim() || `Setting: ${continuity.setting}. Camera: ${continuity.camera}. Lighting: ${continuity.lighting}. Story action: ${continuity.objective}.`,
    placement,
    productReference,
    protections,
    "Preserve the visible character identity and wardrobe unless the director explicitly changes them.",
    `The ${campaign.brand} placement is environmental production design, not an ad break. No one addresses it, holds it toward camera, or speaks a product claim. Do not add any other brand, text, logo, cut, title card, or transition. Cinematic, photorealistic, coherent motion, one continuous take.`,
    `Selection context: consented demo profile ${profile.name}; never depict or mention the profile itself.`,
  ].filter(Boolean).join(" ");
}
