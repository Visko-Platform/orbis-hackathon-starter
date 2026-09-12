import type { Campaign } from "@/lib/studio-data";

type Asset = Campaign["assets"][number];

function matches(asset: Asset, text: string) {
  return Boolean(asset.appearance) && (asset.cues ?? []).some((cue) => text.includes(cue.toLowerCase()));
}

/**
 * Appearance notes for the assets a live direction calls up, so a request
 * like "show me the back" is answered from the brand's own reference views.
 * With a running asset id, views of that product win over other products;
 * without one (or for an upload) every cued asset is eligible.
 */
export function matchProductNotes(campaign: Campaign, direction: string, assetId?: string): string[] {
  const text = direction.toLowerCase();
  const cued = campaign.assets.filter((asset) => matches(asset, text));
  const ofRunningProduct = assetId
    ? cued.filter((asset) => asset.id === assetId || asset.variantOf === assetId)
    : [];
  return (ofRunningProduct.length > 0 ? ofRunningProduct : cued).map((asset) => `${asset.label}: ${asset.appearance}`);
}

/** Appearance notes for named reference views, in the order given. */
export function productNotesFor(campaign: Campaign, assetIds: string[]): string[] {
  return assetIds
    .map((id) => campaign.assets.find((asset) => asset.id === id))
    .filter((asset): asset is Asset => Boolean(asset?.appearance))
    .map((asset) => `${asset.label}: ${asset.appearance}`);
}
