import { NextResponse } from "next/server";

import { buildContinuationPrompt } from "@/lib/continuation-prompt";
import {
  audienceProfiles,
  campaigns,
  filmTitles,
  selectEligibleCampaign,
} from "@/lib/studio-data";

type PrepareBody = {
  profileId?: string;
  titleId?: string;
  campaignId?: string;
  selectionMode?: "auto" | "manual";
  sceneBrief?: string;
  assetId?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as PrepareBody | null;
  const profile = audienceProfiles.find((item) => item.id === body?.profileId);
  const title = filmTitles.find((item) => item.id === body?.titleId);
  const campaign = campaigns.find((item) => item.id === body?.campaignId);

  if (!profile || !title || !campaign) {
    return NextResponse.json(
      { error: "Profile, title, and campaign are required." },
      { status: 400 },
    );
  }

  if (body?.selectionMode && !["auto", "manual"].includes(body.selectionMode)) {
    return NextResponse.json({ error: "Invalid campaign selection mode." }, { status: 400 });
  }
  if (body?.sceneBrief !== undefined && (typeof body.sceneBrief !== "string" || !body.sceneBrief.trim() || body.sceneBrief.length > 1200)) {
    return NextResponse.json({ error: "Scene brief must contain 1–1,200 characters." }, { status: 400 });
  }
  if (body?.assetId !== undefined && body.assetId !== "upload" && !campaign.assets.some((asset) => asset.id === body.assetId)) {
    return NextResponse.json({ error: "Choose an asset belonging to the selected campaign." }, { status: 400 });
  }

  const eligible = selectEligibleCampaign(profile.id, title.id);
  if (!campaign.allowedTitles.includes(title.id) || (body?.selectionMode !== "manual" && (!eligible || eligible.id !== campaign.id))) {
    return NextResponse.json(
      { error: "The selected campaign is not eligible for this continuation." },
      { status: 409 },
    );
  }

  return NextResponse.json(
    {
      runId: crypto.randomUUID(),
      prompt: buildContinuationPrompt({ title, campaign, profile, sceneBrief: body?.sceneBrief, assetId: body?.assetId }),
      campaign,
      preparedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
