import { NextResponse } from "next/server";

import { recordPromptVersion } from "@/lib/knowledge/audit";
import { engineerPrompt, RefusedError } from "@/lib/knowledge/engineer";
import { GeminiEngine, hasGemini } from "@/lib/knowledge/llm";
import { isFactQuestion, retrieveFacts } from "@/lib/knowledge/retrieve";
import { loadKnowledge } from "@/lib/knowledge/store";
import { buildLiveDirectionBeats } from "@/lib/live-direction";
import { matchProductNotes } from "@/lib/product-cues";
import { campaigns } from "@/lib/studio-data";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const campaign = campaigns.find((item) => item.id === body?.campaignId);
  if (!body || typeof body.direction !== "string" || !body.direction.trim() || body.direction.trim().length > 1200 ||
    !["refine", "pivot"].includes(body.mode) || typeof body.currentPrompt !== "string" || body.currentPrompt.length > 4000 ||
    typeof body.preserveBrand !== "boolean" || !campaign ||
    (body.assetId !== undefined && (typeof body.assetId !== "string" || body.assetId.length > 100))) {
    return NextResponse.json({ error: "Enter a direction between 1 and 1,200 characters and choose a valid campaign and direction mode." }, { status: 400 });
  }
  const knowledge = await loadKnowledge(campaign.id);
  const direction: string = body.direction.trim();

  // A question about the product is answered on screen from approved facts,
  // never turned into a prompt.
  if (isFactQuestion(direction)) {
    const facts = retrieveFacts(knowledge, direction);
    if (!facts.length) return NextResponse.json({ error: "No approved fact answers that question." }, { status: 422 });
    await recordPromptVersion({ campaignId: campaign.id, role: "overlay", engineered: null, prompt: null, outcome: "overlay" });
    return NextResponse.json({ outcome: "overlay", answer: facts.join(" "), mode: body.mode }, { headers: NO_STORE });
  }

  let engineered;
  try {
    engineered = await engineerPrompt(knowledge, direction, body.mode, {
      engine: hasGemini() ? new GeminiEngine() : undefined,
      keepProduct: body.preserveBrand,
    });
  } catch (caught: unknown) {
    if (caught instanceof RefusedError) return NextResponse.json({ error: caught.message }, { status: 400 });
    throw caught;
  }

  // Product views the director's own words call up ("show the back") come
  // from the campaign's reference assets and ride along in both beats.
  const productNotes = matchProductNotes(campaign, direction, body.assetId);
  const beats = buildLiveDirectionBeats({
    direction: engineered.text,
    mode: body.mode,
    currentPrompt: body.currentPrompt,
    brand: campaign.brand,
    preserveBrand: body.preserveBrand,
    productAppearance: knowledge.product.appearance,
    productNotes,
  });
  const version = await recordPromptVersion({ campaignId: campaign.id, role: body.mode, engineered, prompt: beats.settled, outcome: "steer" });
  return NextResponse.json({ outcome: "steer", prompt: beats.settled, actionPrompt: beats.action, productNotes, mode: body.mode, engineered, promptVersionId: version.id }, { headers: NO_STORE });
}
