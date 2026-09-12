import { NextResponse } from "next/server";

import { recordPromptVersion } from "@/lib/knowledge/audit";
import { speakLines, writeVoiceover, type VoiceoverRole } from "@/lib/knowledge/dialogue";
import { hasGemini } from "@/lib/knowledge/llm";
import { loadKnowledge } from "@/lib/knowledge/store";
import { campaigns } from "@/lib/studio-data";

const NO_STORE = { "Cache-Control": "no-store" };
const ROLES: VoiceoverRole[] = ["opening", "pivot", "refine"];

// Narrator lines for the scene now on screen, spoken as a WAV. Nothing here
// reaches the video model; the words play in the browser over the take.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const campaign = campaigns.find((item) => item.id === body?.campaignId);
  const speakOnly = Boolean(body && Array.isArray(body.lines));
  if (!body || !campaign || (!speakOnly && (typeof body.scene !== "string" || !body.scene.trim() || body.scene.length > 4000 || !ROLES.includes(body.role))) || (body.direction !== undefined && typeof body.direction !== "string") ||
    (body.contractLines !== undefined && !Array.isArray(body.contractLines))) {
    return NextResponse.json({ error: "A campaign, a scene, and a role are required." }, { status: 400 });
  }
  if (!hasGemini()) return NextResponse.json({ error: "Voiceover needs GEMINI_API_KEY on the server." }, { status: 503 });

  const knowledge = await loadKnowledge(campaign.id);

  // Second phase: speak lines the client already has (they were written and validated here).
  if (Array.isArray(body.lines)) {
    const lines = body.lines.filter((l: unknown): l is string => typeof l === "string" && l.trim().length > 0).slice(0, 2);
    if (!lines.length) return NextResponse.json({ error: "No lines to speak." }, { status: 400 });
    try {
      const audio = (await speakLines(lines)).toString("base64");
      return NextResponse.json({ lines, audio, mimeType: "audio/wav", model: "gemini" }, { headers: NO_STORE });
    } catch (caught: unknown) {
      console.error("voiceover: speech failed", caught);
      return NextResponse.json({ error: "Could not synthesize the voiceover." }, { status: 502 });
    }
  }

  const contractLines = (body.contractLines ?? []).filter((l: unknown): l is string => typeof l === "string").slice(0, 12);
  let lines: string[] = [];
  try {
    lines = await writeVoiceover(knowledge, { scene: body.scene, direction: body.direction, contractLines, role: body.role });
  } catch (caught: unknown) {
    console.error("voiceover: writing lines failed", caught);
    return NextResponse.json({ error: "Could not write the voiceover." }, { status: 502 });
  }
  if (lines.length) await recordPromptVersion({ campaignId: campaign.id, role: "overlay", engineered: null, prompt: lines.join(" "), outcome: "overlay" });
  // First phase: lines only, so the caption can show while speech is synthesized.
  return NextResponse.json({ lines, audio: null, model: "gemini" }, { headers: NO_STORE });
}
