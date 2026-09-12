"use client";

import type { RefObject } from "react";
import type { AudienceProfile, Campaign } from "@/lib/studio-data";
import { Icon } from "./icon";

type Props = {
  profiles: AudienceProfile[];
  campaigns: Campaign[];
  selectedProfileId: string;
  campaign: Campaign;
  automatic: boolean;
  assetId: string;
  assetName: string;
  uploadedPreview: string;
  disabled: boolean;
  // The product-image file input, so the empty stage can open it directly.
  uploadInputRef?: RefObject<HTMLInputElement | null>;
  onProfileChange: (profileId: string) => void;
  onCampaignChange: (campaignId: string) => void;
  onAutomaticChange: (value: boolean) => void;
  onAssetSelected: (file: File) => void;
  onAssetIdChange: (id: string) => void;
};

// 01 / PRODUCT: the brand, its product images, and the one to place. The
// selected image is composited onto a reference frame, or used as the
// starting frame on its own when no frame is added.
export function CampaignPanel({ profiles, campaigns, selectedProfileId, campaign, automatic, assetId, assetName, uploadedPreview, disabled, uploadInputRef, onProfileChange, onCampaignChange, onAutomaticChange, onAssetSelected, onAssetIdChange }: Props) {
  return <section className="campaign-panel" aria-labelledby="campaign-title">
    <div className="inspector-heading"><div><span className="panel-eyebrow">01 / PRODUCT</span><h2 id="campaign-title">Your product</h2></div><span className="subtle-label">{campaigns.length} brands</span></div>
    <div className="brand-selector" role="group" aria-label="Brand"><>{campaigns.map((item) => <button key={item.id} type="button" disabled={disabled} className={campaign.id === item.id ? "selected" : ""} aria-pressed={campaign.id === item.id} aria-label={`Select ${item.brand}`} onClick={() => onCampaignChange(item.id)}><img src={item.logo} alt={item.brand} /><span>{item.brand}</span>{campaign.id === item.id && <span className="selection-check"><Icon name="check" size={10} /></span>}</button>)}</></div>
    <div className="campaign-description"><h3>{campaign.campaign}</h3><span>{campaign.placement.label}</span></div>
    <label className={`upload-asset product-upload ${disabled ? "disabled" : ""}`}><Icon name="upload" size={15} /><span>Add product image</span><small>PNG, JPEG or WebP · up to 10 MB</small><input ref={uploadInputRef} aria-label="Add product image" type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled} onChange={(event) => { const file = event.target.files?.[0]; if (file) onAssetSelected(file); event.target.value = ""; }} /></label>
    <div className="asset-label"><h3>Product images</h3><span>Choose the one to place</span></div>
    <div className="asset-grid">{uploadedPreview && <button type="button" className={`asset-choice ${assetId === "upload" ? "selected" : ""}`} disabled={disabled} onClick={() => onAssetIdChange("upload")} aria-pressed={assetId === "upload"}><div className="asset-image"><img src={uploadedPreview} alt={assetName} /></div><span>{assetName}</span>{assetId === "upload" && <Icon name="check" size={12} />}</button>}{campaign.assets.map((asset) => <button key={asset.id} type="button" disabled={disabled} aria-pressed={assetId === asset.id} className={`asset-choice ${assetId === asset.id ? "selected" : ""}`} onClick={() => onAssetIdChange(asset.id)}><div className={`asset-image ${asset.kind}`}><img src={asset.src} alt={asset.label} /></div><span>{asset.label}</span>{assetId === asset.id && <Icon name="check" size={12} />}</button>)}</div>
    <details className="audience-details"><summary>Audience personalization<span>{automatic ? "On" : "Manual"}</span></summary><div className="audience-options"><label className="switch-label"><input type="checkbox" checked={automatic} disabled={disabled} onChange={(event) => onAutomaticChange(event.target.checked)} /><span className="switch-track" />Match to audience</label><label className="field-label">Demo audience<select value={selectedProfileId} disabled={disabled || !automatic} onChange={(event) => onProfileChange(event.target.value)}>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label><p>Uses the selected demo audience’s interests to recommend a brand.</p></div></details>
  </section>;
}
