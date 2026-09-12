import { NextRequest, NextResponse } from "next/server";

import {
  audienceProfiles,
  filmTitles,
  selectEligibleCampaign,
} from "@/lib/studio-data";

export async function GET(request: NextRequest) {
  const profileId = request.nextUrl.searchParams.get("profileId") ?? "";
  const titleId = request.nextUrl.searchParams.get("titleId") ?? "";
  const profile = audienceProfiles.find((item) => item.id === profileId);
  const title = filmTitles.find((item) => item.id === titleId);

  if (!profile || !title) {
    return NextResponse.json(
      { error: "A valid profileId and titleId are required." },
      { status: 400 },
    );
  }

  const campaign = selectEligibleCampaign(profile.id, title.id);
  if (!campaign) {
    return NextResponse.json({ campaign: null, rationale: "Unbranded fallback" });
  }

  const matches = campaign.segments.filter((segment) =>
    profile.affinities.includes(segment),
  );

  return NextResponse.json({
    campaign,
    rationale: `Matched ${matches.join(" + ")} affinity with an approved ${campaign.placement.surface} placement.`,
  });
}
