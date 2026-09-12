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

  const eligible = selectEligibleCampaign(profile.id, title.id);
  if (!eligible || eligible.id !== campaign.id) {
    return NextResponse.json(
      { error: "The selected campaign is not eligible for this continuation." },
      { status: 409 },
    );
  }

  return NextResponse.json(
    {
      runId: crypto.randomUUID(),
      prompt: buildContinuationPrompt({ title, campaign, profile }),
      campaign,
      preparedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
