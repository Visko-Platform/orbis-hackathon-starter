"use client";

import type { AudienceProfile, Campaign } from "@/lib/studio-data";

type Props = {
  profiles: AudienceProfile[];
  selectedProfileId: string;
  campaign: Campaign | null;
  rationale: string;
  assetName: string;
  onProfileChange: (profileId: string) => void;
  onAssetSelected: (file: File) => void;
};

export function CampaignPanel({
  profiles,
  selectedProfileId,
  campaign,
  rationale,
  assetName,
  onProfileChange,
  onAssetSelected,
}: Props) {
  return (
    <section className="panel campaign-panel" aria-labelledby="campaign-title">
      <div className="panel-heading">
        <div>
          <span className="step-number">02</span>
          <div>
            <h2 id="campaign-title">Audience & campaign</h2>
            <p>Resolve one approved placement from explicit profile signals.</p>
          </div>
        </div>
        <span className="status-chip approved">Consent on</span>
      </div>

      <div className="profile-list" role="radiogroup" aria-label="Demo audience profile">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            type="button"
            className={`profile-option ${selectedProfileId === profile.id ? "selected" : ""}`}
            role="radio"
            aria-checked={selectedProfileId === profile.id}
            onClick={() => onProfileChange(profile.id)}
          >
            <span className="profile-avatar">{profile.initials}</span>
            <span>
              <strong>{profile.name}</strong>
              <small>{profile.detail}</small>
            </span>
            <span className="radio-mark" aria-hidden="true" />
          </button>
        ))}
      </div>

      <div className="selection-line">
        <span>Selected placement</span>
        <span>Highest eligible priority</span>
      </div>

      {campaign ? (
        <div className="campaign-result">
          <div
            className="brand-tile"
            style={{ background: campaign.accent, color: campaign.ink }}
            aria-label={`${campaign.brand} campaign`}
          >
            <strong>{campaign.brand}</strong>
          </div>
          <div className="campaign-copy">
            <span className="campaign-kicker">{campaign.category} · priority {campaign.priority}</span>
            <h3>{campaign.campaign}</h3>
            <p>{campaign.placement.label}</p>
          </div>
          <span className="approval-mark">Approved</span>
        </div>
      ) : (
        <div className="campaign-empty">No eligible campaign. The scene will remain unbranded.</div>
      )}

      <p className="selection-rationale">{rationale || "Checking campaign permissions…"}</p>

      {campaign && (
        <label className="asset-drop">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onAssetSelected(file);
            }}
          />
          <span>
            <strong>{assetName || `Add approved ${campaign.brand} artwork`}</strong>
            <small>PNG, JPG or WebP · composited into the handoff zone</small>
          </span>
          <span className="asset-action">{assetName ? "Replace" : "Choose file"}</span>
        </label>
      )}
    </section>
  );
}
