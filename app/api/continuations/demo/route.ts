import { NextResponse } from "next/server";

import { demoChips, demoFlowFor, resolveDemoStep, stepIndex } from "@/lib/demo/flows";
import { recordPromptVersion } from "@/lib/knowledge/audit";
import type { Engineered } from "@/lib/knowledge/engineer";
import { loadKnowledge } from "@/lib/knowledge/store";
import { validateEngineered } from "@/lib/knowledge/validate";
import { buildLiveDirectionBeats } from "@/lib/live-direction";
import { productNotesFor } from "@/lib/product-cues";
import { campaigns } from "@/lib/studio-data";

const NO_STORE = { "Cache-Control": "no-store" };

// One beat of a campaign's fixed demo path, chosen by bubble (stepId) or by
// matching the presenter's own words. The beat's brief is authored, so it is
// validated against the product knowledge but never rewritten.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const campaign = campaigns.find((item) => item.id === body?.campaignId);
  if (!body || !campaign || typeof body.currentPrompt !== "string" || body.currentPrompt.length > 4000 ||
    (body.stepId !== undefined && typeof body.stepId !== "string") ||
    (body.direction !== undefined && (typeof body.direction !== "string" || body.direction.length > 1200))) {
    return NextResponse.json({ error: "Choose a valid campaign and demo step." }, { status: 400 });
  }
  const flow = demoFlowFor(campaign.id);
  if (!flow) return NextResponse.json({ error: "This campaign has no demo path." }, { status: 404 });
  const step = body.stepId ? flow.steps.find((item) => item.id === body.stepId) : resolveDemoStep(flow, body.direction ?? "");
  if (!step) return NextResponse.json({ error: "No demo step matches that direction." }, { status: 422 });

  const knowledge = await loadKnowledge(campaign.id);
  const validation = validateEngineered(knowledge, step.brief);
  if (!validation.ok) {
    console.error("demo step conflicts with product knowledge", { campaignId: campaign.id, stepId: step.id, reasons: validation.reasons });
    return NextResponse.json({ error: `This demo step conflicts with the product knowledge: ${validation.reasons.join(", ")}.` }, { status: 500 });
  }

  const productNotes = productNotesFor(campaign, step.stateAssetIds);
  const beats = buildLiveDirectionBeats({
    direction: step.brief,
    mode: step.mode,
    currentPrompt: body.currentPrompt,
    brand: campaign.brand,
    preserveBrand: true,
    productAppearance: knowledge.product.appearance,
    productNotes,
  });
  const engineered: Engineered = { source: (body.direction ?? "").trim() || step.chip, text: step.brief, model: "passthrough", notes: productNotes, rejected: [] };
  const version = await recordPromptVersion({ campaignId: campaign.id, role: step.mode, engineered, prompt: beats.settled, outcome: "steer" });
  return NextResponse.json({
    outcome: "steer",
    step: { id: step.id, chip: step.chip, title: step.title, index: stepIndex(flow, step.id), total: flow.steps.length, assetId: step.assetId },
    prompt: beats.settled,
    actionPrompt: beats.action,
    productNotes,
    engineered,
    promptVersionId: version.id,
    nextChips: demoChips(flow, step.id).map((item) => ({ id: item.id, chip: item.chip })),
  }, { headers: NO_STORE });
}
