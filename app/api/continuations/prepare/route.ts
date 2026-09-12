import { NextResponse } from "next/server";

import { buildContinuationPrompt } from "@/lib/continuation-prompt";
import { recordPromptVersion } from "@/lib/knowledge/audit";
import { draftContractWithGemini, draftFromBrief, mergeDraft, productLines } from "@/lib/knowledge/contract";
import { engineerPrompt, RefusedError } from "@/lib/knowledge/engineer";
import { GeminiEngine, hasGemini } from "@/lib/knowledge/llm";
import { loadKnowledge } from "@/lib/knowledge/store";
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

  // Prompt engineering: the operator's brief is rewritten with the approved
  // product knowledge before it is wrapped into the continuation prompt.
  const knowledge = await loadKnowledge(campaign.id);
  const continuity = title.continuity;
  const brief = body?.sceneBrief?.trim() || `Setting: ${continuity.setting}. Camera: ${continuity.camera}. Lighting: ${continuity.lighting}. Story action: ${continuity.objective}.`;
  let engineered;
  try {
    engineered = await engineerPrompt(knowledge, brief, "opening", hasGemini() ? { engine: new GeminiEngine() } : {});
  } catch (caught: unknown) {
    if (caught instanceof RefusedError) return NextResponse.json({ error: caught.message }, { status: 400 });
    throw caught;
  }

  // Scene contract: product lines from the knowledge base, person and setting
  // lines drafted from the engineered brief. Restated in every direction.
  let draft = draftFromBrief(engineered.text);
  if (hasGemini()) {
    try {
      draft = await draftContractWithGemini(knowledge, engineered.text);
    } catch (caught: unknown) {
      console.error("prepare: contract draft failed, using the brief", caught);
    }
  }
  const contract = mergeDraft({ lines: productLines(knowledge, true) }, draft, "brief", knowledge);

  const runId = crypto.randomUUID();
  const prompt = buildContinuationPrompt({ title, campaign, profile, sceneBrief: engineered.text, assetId: body?.assetId, knowledge });
  const version = await recordPromptVersion({ campaignId: campaign.id, runId, role: "opening", engineered, prompt, outcome: "start", contract });

  return NextResponse.json(
    { runId, assetId: body?.assetId ?? "", prompt, campaign, preparedAt: new Date().toISOString(), engineered, promptVersionId: version.id, contract },
    { headers: { "Cache-Control": "no-store" } },
  );
}
