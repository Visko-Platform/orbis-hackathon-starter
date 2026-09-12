"use client";

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
  onProfileChange: (profileId: string) => void;
  onCampaignChange: (campaignId: string) => void;
  onAutomaticChange: (value: boolean) => void;
  onAssetSelected: (file: File) => void;
  onAssetIdChange: (id: string) => void;
};

export function CampaignPanel({ profiles, campaigns, selectedProfileId, campaign, automatic, assetId, assetName, uploadedPreview, disabled, onProfileChange, onCampaignChange, onAutomaticChange, onAssetSelected, onAssetIdChange }: Props) {
  return <section className="campaign-panel" aria-labelledby="campaign-title">
    <div className="inspector-heading"><div><span className="panel-eyebrow">01 / BRAND</span><h2 id="campaign-title">Choose a campaign</h2></div><span className="subtle-label">{campaigns.length} available</span></div>
    <div className="brand-selector" role="group" aria-label="Campaign"><>{campaigns.map((item) => <button key={item.id} type="button" disabled={disabled} className={campaign.id === item.id ? "selected" : ""} aria-pressed={campaign.id === item.id} aria-label={`Select ${item.brand} campaign`} onClick={() => onCampaignChange(item.id)}><img src={item.logo} alt={item.brand} /><span>{item.brand}</span>{campaign.id === item.id && <span className="selection-check"><Icon name="check" size={10} /></span>}</button>)}</></div>
    <div className="campaign-description"><h3>{campaign.campaign}</h3><span>{campaign.placement.label}</span></div>
    <div className="asset-label"><h3>Campaign assets</h3><span>Choose what appears</span></div>
    <div className="asset-grid">{campaign.assets.map((asset) => <button key={asset.id} type="button" disabled={disabled} aria-pressed={assetId === asset.id} className={`asset-choice ${assetId === asset.id ? "selected" : ""}`} onClick={() => onAssetIdChange(asset.id)}><div className={`asset-image ${asset.kind}`}><img src={asset.src} alt={asset.label} /></div><span>{asset.label}</span>{assetId === asset.id && <Icon name="check" size={12} />}</button>)}{uploadedPreview && <button type="button" className={`asset-choice ${assetId === "upload" ? "selected" : ""}`} disabled={disabled} onClick={() => onAssetIdChange("upload")} aria-pressed={assetId === "upload"}><div className="asset-image"><img src={uploadedPreview} alt={assetName} /></div><span>{assetName}</span></button>}</div>
    <label className={`upload-asset ${disabled ? "disabled" : ""}`}><Icon name="upload" size={15} /><span>Add your own artwork</span><input aria-label="Upload campaign artwork" type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled} onChange={(event) => { const file = event.target.files?.[0]; if (file) onAssetSelected(file); event.target.value = ""; }} /></label>
    <details className="audience-details"><summary>Audience personalization<span>{automatic ? "On" : "Manual"}</span></summary><div className="audience-options"><label className="switch-label"><input type="checkbox" checked={automatic} disabled={disabled} onChange={(event) => onAutomaticChange(event.target.checked)} /><span className="switch-track" />Match to audience</label><label className="field-label">Demo audience<select value={selectedProfileId} disabled={disabled || !automatic} onChange={(event) => onProfileChange(event.target.value)}>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label><p>Uses the selected demo audience’s interests to recommend a campaign.</p></div></details>
  </section>;
}
