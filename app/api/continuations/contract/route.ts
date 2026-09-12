import { NextResponse } from "next/server";

import {
  draftContractWithGemini,
  draftFromBrief,
  mergeDraft,
  parseContract,
  productLines,
  type SceneContract,
} from "@/lib/knowledge/contract";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/knowledge/describe";
import { hasGemini } from "@/lib/knowledge/llm";
import { loadKnowledge, UnknownCampaignError } from "@/lib/knowledge/store";
import { campaigns } from "@/lib/studio-data";

const NO_STORE = { "Cache-Control": "no-store" };

// Reads (or re-reads) the person and setting lines of a scene contract from the
// brief and, when attached, a frame of the take. Product lines are rebuilt from
// the knowledge base; pinned and custom lines are kept.
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Send multipart form data." }, { status: 400 });
  const campaign = campaigns.find((item) => item.id === form.get("campaignId"));
  const brief = String(form.get("brief") ?? "").trim();
  const keepProduct = form.get("keepProduct") !== "false";
  if (!campaign || !brief || brief.length > 1200) {
    return NextResponse.json({ error: "A valid campaign and a brief of 1–1,200 characters are required." }, { status: 400 });
  }
  let knowledge;
  try {
    knowledge = await loadKnowledge(campaign.id);
  } catch (caught: unknown) {
    if (caught instanceof UnknownCampaignError) return NextResponse.json({ error: "Unknown campaign" }, { status: 404 });
    throw caught;
  }

  let current: SceneContract = { lines: [] };
  const rawContract = form.get("contract");
  if (typeof rawContract === "string" && rawContract) {
    try {
      current = parseContract(JSON.parse(rawContract), knowledge);
    } catch (caught: unknown) {
      return NextResponse.json({ error: `Invalid contract: ${caught instanceof Error ? caught.message : String(caught)}` }, { status: 400 });
    }
  }

  const image = form.get("image");
  let picture: { bytes: Buffer; mimeType: string } | undefined;
  if (image instanceof File) {
    if (!ALLOWED_IMAGE_TYPES.includes(image.type)) return NextResponse.json({ error: "The frame must be a PNG, JPEG, or WebP image." }, { status: 400 });
    if (!image.size || image.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "The frame must be 10 MB or smaller." }, { status: 413 });
    picture = { bytes: Buffer.from(await image.arrayBuffer()), mimeType: image.type };
  }

  let draft = draftFromBrief(brief);
  let model: "gemini" | "passthrough" = "passthrough";
  if (hasGemini()) {
    try {
      draft = await draftContractWithGemini(knowledge, brief, picture);
      model = "gemini";
    } catch (caught: unknown) {
      console.error("contract: Gemini draft failed, using the brief", caught);
    }
  }

  const base: SceneContract = {
    lines: [...productLines(knowledge, keepProduct), ...current.lines.filter((line) => line.kind !== "product")],
  };
  const contract = mergeDraft(base, draft, picture ? "frame" : "brief", knowledge);
  return NextResponse.json({ contract, model, source: picture ? "frame" : "brief" }, { headers: NO_STORE });
}
