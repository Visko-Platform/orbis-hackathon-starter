import { NextResponse } from "next/server";

import { recordPromptVersion } from "@/lib/knowledge/audit";
import { afterPivot, contractClause, type ContractLine, draftContractWithGemini, draftFromBrief, lineId, MAX_CONTRACT_LINES, parseContract, type SceneContract, validateLine } from "@/lib/knowledge/contract";
import { writeSoundCaption } from "@/lib/knowledge/dialogue";
import { engineerPrompt, RefusedError } from "@/lib/knowledge/engineer";
import { MAX_INPUT_CHARS } from "@/lib/knowledge/guard";
import { GeminiEngine, hasGemini } from "@/lib/knowledge/llm";
import { isFactQuestion, retrieveFacts } from "@/lib/knowledge/retrieve";
import { loadKnowledge } from "@/lib/knowledge/store";
import { buildLiveDirectionBeats, MAX_CURRENT_PROMPT_CHARS } from "@/lib/live-direction";
import { matchProductNotes } from "@/lib/product-cues";
import { campaigns } from "@/lib/studio-data";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const campaign = campaigns.find((item) => item.id === body?.campaignId);
  if (!body || typeof body.direction !== "string" || !body.direction.trim() || body.direction.trim().length > MAX_INPUT_CHARS ||
    !["refine", "pivot"].includes(body.mode) || typeof body.currentPrompt !== "string" || body.currentPrompt.length > MAX_CURRENT_PROMPT_CHARS ||
    typeof body.preserveBrand !== "boolean" || !campaign ||
    (body.assetId !== undefined && (typeof body.assetId !== "string" || body.assetId.length > 100))) {
    return NextResponse.json({ error: "Enter a direction between 1 and 1,200 characters and choose a valid campaign and direction mode." }, { status: 400 });
  }
  const knowledge = await loadKnowledge(campaign.id);
  const direction: string = body.direction.trim();

  // The scene contract the take is running under, if the client has one.
  let contract: SceneContract | null = null;
  if (body.contract !== undefined && body.contract !== null) {
    try {
      contract = parseContract(body.contract, knowledge);
    } catch (caught: unknown) {
      return NextResponse.json({ error: `Invalid contract: ${caught instanceof Error ? caught.message : String(caught)}` }, { status: 400 });
    }
  }

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
      contract: contract?.lines.map((line) => line.text) ?? [],
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
    contractClause: contractClause(contract),
  });
  const version = await recordPromptVersion({ campaignId: campaign.id, role: body.mode, engineered, prompt: beats.settled, outcome: "steer", contract });
  // A pivot drops the unpinned setting lines; re-read them from the new scene so
  // later refinements have a setting to hold onto.
  let nextContract = contract ? afterPivot(contract, { mode: body.mode, keepProduct: body.preserveBrand }) : null;
  if (nextContract && body.mode === "pivot") {
    let draft = draftFromBrief(engineered.text);
    if (hasGemini()) {
      try {
        draft = await draftContractWithGemini(knowledge, engineered.text);
      } catch (caught: unknown) {
        console.error("pivot: contract draft failed, using the direction", caught);
      }
    }
    // People and pinned lines survived afterPivot; only the setting is re-read.
    const settings = draft.setting
      .map((text): ContractLine => ({ id: lineId("setting"), kind: "setting", text: text.trim(), pinned: false, source: "brief" }))
      .filter((line) => line.text && validateLine(knowledge, line.text) === null);
    nextContract = { lines: [...nextContract.lines, ...settings].slice(0, MAX_CONTRACT_LINES) };
  }
  // What the new scene sounds like, for Orbis's audio prompt. Optional.
  let audioPrompt = "";
  if (hasGemini()) {
    try { audioPrompt = await writeSoundCaption(engineered.text); } catch (caught: unknown) { console.error("pivot: sound caption failed", caught); }
  }
  return NextResponse.json({ outcome: "steer", prompt: beats.settled, actionPrompt: beats.action, audioPrompt, productNotes, mode: body.mode, engineered, promptVersionId: version.id, contract: nextContract }, { headers: NO_STORE });
}
