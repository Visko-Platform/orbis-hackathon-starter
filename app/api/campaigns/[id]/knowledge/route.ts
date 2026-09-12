import { NextResponse } from "next/server";

import { loadKnowledge, saveKnowledge, UnknownCampaignError } from "@/lib/knowledge/store";
import { parseKnowledge } from "@/lib/knowledge/types";

const NO_STORE = { "Cache-Control": "no-store" };
type RouteContext = { params: Promise<{ id: string }> };

async function respondKnowledge(id: string, action: "read" | "write", body?: unknown) {
  try {
    if (action === "read") return NextResponse.json(await loadKnowledge(id), { headers: NO_STORE });
    await loadKnowledge(id); // unknown campaign → 404 before any write
    const saved = await saveKnowledge(parseKnowledge(body, id));
    return NextResponse.json(saved, { headers: NO_STORE });
  } catch (caught: unknown) {
    if (caught instanceof UnknownCampaignError) return NextResponse.json({ error: "Unknown campaign" }, { status: 404 });
    if (action === "write" && caught instanceof Error && !("code" in caught)) {
      // parseKnowledge names the offending field.
      return NextResponse.json({ error: `Invalid knowledge: ${caught.message}` }, { status: 400 });
    }
    console.error("knowledge route failed", { id, action }, caught);
    return NextResponse.json({ error: "Could not access product knowledge" }, { status: 500 });
  }
}

// The operator-editable product knowledge for one campaign.
export async function GET(_: Request, { params }: RouteContext) {
  const { id } = await params;
  return respondKnowledge(id, "read");
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const body: unknown = await request.json().catch(() => undefined);
  if (body === undefined) return NextResponse.json({ error: "Invalid knowledge: body is not JSON" }, { status: 400 });
  return respondKnowledge(id, "write", body);
}
