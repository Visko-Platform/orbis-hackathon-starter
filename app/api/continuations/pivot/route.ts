import { NextResponse } from "next/server";
import { campaigns } from "@/lib/studio-data";
import { buildLiveDirection } from "@/lib/live-direction";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const campaign = campaigns.find((item) => item.id === body?.campaignId);
  if (!body || typeof body.direction !== "string" || !body.direction.trim() || body.direction.trim().length > 1200 ||
    !["refine", "pivot"].includes(body.mode) || typeof body.currentPrompt !== "string" || body.currentPrompt.length > 4000 ||
    typeof body.preserveBrand !== "boolean" || !campaign) {
    return NextResponse.json({ error: "Enter a direction between 1 and 1,200 characters and choose a valid campaign and direction mode." }, { status: 400 });
  }
  return NextResponse.json({ prompt: buildLiveDirection({ ...body, brand: campaign.brand }), mode: body.mode }, { headers: { "Cache-Control": "no-store" } });
}
