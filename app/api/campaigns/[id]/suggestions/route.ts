import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { forwardToHostedAi } from "@/lib/hosted-ai";

import { hasGemini } from "@/lib/knowledge/llm";
import { loadKnowledge, UnknownCampaignError } from "@/lib/knowledge/store";
import { defaultSuggestions, type SuggestionSet, suggestWithGemini } from "@/lib/knowledge/suggest";

// One model call per knowledge content; a save changes the key.
const cache = new Map<string, SuggestionSet>();
const MIN_USEFUL = 3;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // No working Gemini key here: let the hosted site answer (lib/hosted-ai.ts).
  const hosted = await forwardToHostedAi(request);
  if (hosted) return hosted;
  const { id } = await params;
  let knowledge;
  try {
    knowledge = await loadKnowledge(id);
  } catch (caught: unknown) {
    if (caught instanceof UnknownCampaignError) return NextResponse.json({ error: "Unknown campaign" }, { status: 404 });
    console.error("suggestions: knowledge unreadable", { id }, caught);
    return NextResponse.json({ error: "Could not load product knowledge" }, { status: 500 });
  }

  const key = `${id}:${createHash("sha1").update(JSON.stringify(knowledge)).digest("hex")}`;
  const cached = cache.get(key);
  if (cached) return NextResponse.json(cached, { headers: { "Cache-Control": "no-store" } });

  let result: SuggestionSet = { suggestions: defaultSuggestions(knowledge), source: "default" };
  if (hasGemini()) {
    try {
      const suggestions = await suggestWithGemini(knowledge);
      if (suggestions.length >= MIN_USEFUL) result = { suggestions, source: "gemini" };
      else console.warn(`suggestions: Gemini returned ${suggestions.length} usable, using defaults`);
    } catch (caught: unknown) {
      console.error("suggestions: Gemini failed, using defaults", caught);
    }
  }
  cache.set(key, result);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
