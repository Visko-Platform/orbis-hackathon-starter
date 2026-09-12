import { NextResponse } from "next/server";

import { forwardToHostedAi } from "@/lib/hosted-ai";

import { ALLOWED_IMAGE_TYPES, describeProductImage, MAX_IMAGE_BYTES } from "@/lib/knowledge/describe";
import { hasGemini } from "@/lib/knowledge/llm";
import { loadKnowledge, UnknownCampaignError } from "@/lib/knowledge/store";

const NO_STORE = { "Cache-Control": "no-store" };

// Drafts appearance + visual notes from a product image. Nothing is saved.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // No working Gemini key here: let the hosted site answer (lib/hosted-ai.ts).
  const hosted = await forwardToHostedAi(request);
  if (hosted) return hosted;
  const { id } = await params;
  if (!hasGemini()) {
    return NextResponse.json({ error: "Drafting from an image needs GEMINI_API_KEY on the server." }, { status: 503 });
  }
  let knowledge;
  try {
    knowledge = await loadKnowledge(id);
  } catch (caught: unknown) {
    if (caught instanceof UnknownCampaignError) return NextResponse.json({ error: "Unknown campaign" }, { status: 404 });
    console.error("describe: knowledge unreadable", { id }, caught);
    return NextResponse.json({ error: "Could not load product knowledge" }, { status: 500 });
  }

  const form = await request.formData().catch(() => null);
  const image = form?.get("image");
  if (!(image instanceof File) || !ALLOWED_IMAGE_TYPES.includes(image.type)) {
    return NextResponse.json({ error: "Choose a PNG, JPEG, or WebP product image." }, { status: 400 });
  }
  if (!image.size || image.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "The product image must be 10 MB or smaller." }, { status: 413 });
  }

  try {
    const draft = await describeProductImage(knowledge, { bytes: Buffer.from(await image.arrayBuffer()), mimeType: image.type });
    return NextResponse.json({ ...draft, model: "gemini" }, { headers: NO_STORE });
  } catch (caught: unknown) {
    console.error("describe: Gemini failed", { id }, caught);
    return NextResponse.json({ error: "Could not describe the image. Write the appearance by hand." }, { status: 502 });
  }
}
