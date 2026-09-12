import { randomInt } from "node:crypto";

import { NextResponse } from "next/server";

import { summarizeBattleCharacters, generateBattleImage } from "@/lib/openrouter";

export const runtime = "nodejs";

const STAGES = [
  "a crumbling stone bridge above a glowing abyss",
  "a moonlit forest clearing beneath colossal ancient trees",
  "a storm-battered colosseum of black marble",
  "the ruined courtyard of a frozen citadel",
  "a volcanic causeway with distant lava falls",
  "a desert temple half buried in golden sand",
  "a rain-soaked harbor under a violet sky",
  "a floating island surrounded by clouds and waterfalls",
];

export async function POST(request: Request) {
  let body: { crimsonIdeas?: unknown; azureIdeas?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const validIdeas = (value: unknown): value is string[] =>
    Array.isArray(value) && value.length > 0 && value.length <= 12 &&
    value.every((idea) => typeof idea === "string" && idea.trim().length > 0 && idea.length <= 240);
  if (!validIdeas(body.crimsonIdeas) || !validIdeas(body.azureIdeas)) {
    return NextResponse.json({ error: "Each fighter needs 1 to 12 character ideas of up to 240 characters" }, { status: 400 });
  }
  const crimsonIdeas = body.crimsonIdeas.map((idea) => idea.trim());
  const azureIdeas = body.azureIdeas.map((idea) => idea.trim());

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === "replace_with_your_openrouter_api_key") {
    return NextResponse.json({ error: "OPENROUTER_API_KEY is not configured" }, { status: 503 });
  }
  let operation = "character summary";
  try {
    const characters = await summarizeBattleCharacters(apiKey, crimsonIdeas, azureIdeas).catch(() => ({
      crimson: crimsonIdeas.slice(-4).join("; ").slice(0, 320),
      azure: azureIdeas.slice(-4).join("; ").slice(0, 320),
    }));
    const stage = STAGES[randomInt(STAGES.length)];
    const prompt = `Create a single cinematic fantasy battle opening frame, landscape 16:9. Exactly TWO focal fighters face each other from a medium-wide distance, both fully visible from head to toe and separated by open ground. On the LEFT, the Crimson fighter: ${characters.crimson}. Give this fighter recognizable crimson accents. On the RIGHT, the Azure fighter: ${characters.azure}. Give this fighter recognizable azure accents. The stage is ${stage}. Dynamic ready-to-fight poses, dramatic environmental lighting, detailed but readable silhouettes, consistent scale, no victory or defeat yet. No other people, no duplicate fighters, no text, no logos, no border or panels.`;
    operation = "image generation";
    const image = await generateBattleImage(apiKey, prompt);
    return NextResponse.json(
      { image: `data:${image.mediaType};base64,${image.base64}`, stage, characters },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (caught) {
    const error = caught instanceof Error ? `${operation}: ${caught.message}` : `Could not complete ${operation}`;
    return NextResponse.json({ error }, { status: 502 });
  }
}
