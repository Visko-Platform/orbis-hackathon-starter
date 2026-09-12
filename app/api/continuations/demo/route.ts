import { NextResponse } from "next/server";

import { demoContract } from "@/lib/demo/contract";
import { canFollow, demoChips, demoContinuity, demoFlowFor, findMoment, followReason, momentAsStep, previousStep, resolveDemoStep, stepAssetIds, stepIndex, watchIdentity, type DemoMoment, type DemoStep } from "@/lib/demo/flows";
import { recordPromptVersion } from "@/lib/knowledge/audit";
import { parseContract, type SceneContract } from "@/lib/knowledge/contract";
import { MAX_INPUT_CHARS } from "@/lib/knowledge/guard";
import type { Engineered } from "@/lib/knowledge/engineer";
import { loadKnowledge } from "@/lib/knowledge/store";
import { validateEngineered } from "@/lib/knowledge/validate";
import { writeSoundCaption } from "@/lib/knowledge/dialogue";
import { hasGemini } from "@/lib/knowledge/llm";
import { buildLiveDirectionBeats, MAX_CURRENT_PROMPT_CHARS } from "@/lib/live-direction";
import { productNotesFor } from "@/lib/product-cues";
import { campaigns } from "@/lib/studio-data";

const NO_STORE = { "Cache-Control": "no-store" };

// One beat of a campaign's fixed demo path, chosen by bubble (stepId) or by
// matching the presenter's own words. The beat's brief is authored, so it is
// validated against the product knowledge but never rewritten.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const campaign = campaigns.find((item) => item.id === body?.campaignId);
  if (!body || !campaign || typeof body.currentPrompt !== "string" || body.currentPrompt.length > MAX_CURRENT_PROMPT_CHARS ||
    (body.stepId !== undefined && typeof body.stepId !== "string") ||
    (body.fromStepId !== undefined && body.fromStepId !== null && (typeof body.fromStepId !== "string" || body.fromStepId.length > 100)) ||
    (body.direction !== undefined && (typeof body.direction !== "string" || body.direction.length > MAX_INPUT_CHARS))) {
    return NextResponse.json({ error: "Choose a valid campaign and demo step." }, { status: 400 });
  }
  const flow = demoFlowFor(campaign.id);
  if (!flow) return NextResponse.json({ error: "This campaign has no demo path." }, { status: 404 });
  // A bubble or the viewer's words name a beat of the path or a moment (a small refinement that keeps the story where it is).
  const named: DemoStep | DemoMoment | null = body.stepId
    ? flow.steps.find((item) => item.id === body.stepId) ?? findMoment(flow, body.stepId)
    : resolveDemoStep(flow, body.direction ?? "");
  if (!named) return NextResponse.json({ error: "No demo step matches that direction." }, { status: 422 });
  const isMoment = !("state" in named);
  const beat = isMoment ? flow.steps.find((item) => item.id === body.fromStepId) ?? null : named;
  if (isMoment && !beat) return NextResponse.json({ error: "A moment needs the beat the take is on (fromStepId)." }, { status: 400 });
  if (body.assetId !== undefined && (typeof body.assetId !== "string" || !campaign.assets.some((asset) => asset.id === body.assetId))) {
    return NextResponse.json({ error: "assetId must name a view of this campaign." }, { status: 400 });
  }
  // A moment keeps the face the take shows, as long as it is a view of the watch the beat shows.
  const shown = beat && body.assetId && watchIdentity(campaign, body.assetId) === watchIdentity(campaign, beat.assetId) ? body.assetId : null;
  const step: DemoStep = isMoment ? momentAsStep(named, beat as DemoStep, shown) : named;

  // A beat only runs from a state it can follow: no showing the back of a watch he is not wearing.
  const fromStep = body.fromStepId ? previousStep(flow, step, body.fromStepId) : null;
  if (!canFollow(fromStep, step)) {
    return NextResponse.json({ error: `That does not follow from where the take is. ${followReason(step, campaign)}` }, { status: 409, headers: NO_STORE });
  }

  const knowledge = await loadKnowledge(campaign.id);
  // The contract the take was running under; only the operator's own lines carry into the beat's.
  let previous: SceneContract | null = null;
  if (body.contract !== undefined && body.contract !== null) {
    try {
      previous = parseContract(body.contract, knowledge);
    } catch (caught: unknown) {
      return NextResponse.json({ error: `Invalid contract: ${caught instanceof Error ? caught.message : String(caught)}` }, { status: 400 });
    }
  }
  const validation = validateEngineered(knowledge, step.brief);
  if (!validation.ok) {
    console.error("demo step conflicts with product knowledge", { campaignId: campaign.id, stepId: step.id, reasons: validation.reasons });
    return NextResponse.json({ error: `This demo step conflicts with the product knowledge: ${validation.reasons.join(", ")}.` }, { status: 500 });
  }

  // The ledger's watches and any extra views are described exactly; the
  // general appearance is left out so nothing invites a blend. The beat's
  // continuity line restates the cast, ledger and marks, so the contract
  // clause is not added here; the contract is returned for the take's state
  // and for free directions that follow the beat.
  const productNotes = productNotesFor(campaign, stepAssetIds(step));
  const contract = demoContract(flow, step, campaign, knowledge, previous);
  const beats = buildLiveDirectionBeats({
    direction: step.brief,
    mode: step.mode,
    currentPrompt: body.currentPrompt,
    brand: campaign.brand,
    preserveBrand: true,
    productNotes,
    actionDirection: step.action,
    // The ledger is told as a change from the beat the take was on (the client names it; else the previous beat).
    continuity: demoContinuity(flow, step, campaign, fromStep ?? previousStep(flow, step)),
  });
  const engineered: Engineered = { source: (body.direction ?? "").trim() || step.chip, text: step.brief, model: "passthrough", notes: productNotes, rejected: [] };
  const version = await recordPromptVersion({ campaignId: campaign.id, role: step.mode, engineered, prompt: beats.settled, outcome: "steer", contract });
  let audioPrompt = "";
  if (hasGemini()) {
    try { audioPrompt = await writeSoundCaption(step.brief); } catch (caught: unknown) { console.error("demo: sound caption failed", caught); }
  }
  return NextResponse.json({
    audioPrompt,
    outcome: "steer",
    // A moment leaves the take on the beat it came from; the client keeps offering bubbles from there.
    step: { id: step.id, chip: step.chip, title: step.title, kind: isMoment ? "moment" : "beat", beatId: (beat ?? step).id, index: stepIndex(flow, (beat ?? step).id), total: flow.steps.length, assetId: step.assetId },
    prompt: beats.settled,
    actionPrompt: beats.action,
    productNotes,
    engineered,
    promptVersionId: version.id,
    contract,
    nextChips: demoChips(flow, (beat ?? step).id, undefined, isMoment ? step.id : null).map((item) => ({ id: item.id, chip: item.chip })),
  }, { headers: NO_STORE });
}
