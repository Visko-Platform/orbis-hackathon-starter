import type { AudienceProfile, Campaign, FilmTitle } from "@/lib/studio-data";

export function buildContinuationPrompt({
  title,
  campaign,
  profile,
}: {
  title: FilmTitle;
  campaign: Campaign;
  profile: AudienceProfile;
}) {
  const continuity = title.continuity;

  return [
    `Continue directly from the supplied final frame of ${title.title}, ${title.moment}.`,
    `Setting: ${continuity.setting}.`,
    `Camera: ${continuity.camera}.`,
    `Lighting: ${continuity.lighting}.`,
    `Story action: ${continuity.objective}.`,
    campaign.placement.instruction,
    `Preserve exactly: ${continuity.protected.join(", ")}.`,
    `The ${campaign.brand} placement is environmental production design, not an ad break. No one addresses it, holds it toward camera, or speaks a product claim. Do not add any other brand, text, logo, cut, title card, or transition. Cinematic, photorealistic, coherent motion, one continuous take.`,
    `Selection context: consented demo profile ${profile.name}; never depict or mention the profile itself.`,
  ].join(" ");
}
