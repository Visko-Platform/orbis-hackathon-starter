import { NextResponse } from "next/server";

import { summarizeBattleMoves } from "@/lib/openrouter";

type Team = "crimson" | "azure";
type Submission = { team: Team; text: string };

const MAX_SUBMISSIONS = 60;
const MAX_TEXT = 240;

export async function POST(request: Request) {
  let body: { submissions?: Submission[]; round?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!Array.isArray(body.submissions) || body.submissions.length > MAX_SUBMISSIONS) {
    return NextResponse.json({ error: "Invalid submissions" }, { status: 400 });
  }

  const submissions = body.submissions.filter(
    (item): item is Submission =>
      item &&
      (item.team === "crimson" || item.team === "azure") &&
      typeof item.text === "string" &&
      item.text.trim().length > 0 &&
      item.text.length <= MAX_TEXT,
  );
  const byTeam = (team: Team) =>
    submissions.filter((item) => item.team === team).map((item) => item.text.trim());
  const crimson = byTeam("crimson");
  const azure = byTeam("azure");
  if (!crimson.length && !azure.length) {
    return NextResponse.json({ error: "Both teams are silent" }, { status: 400 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === "replace_with_your_openrouter_api_key") {
    return NextResponse.json({ error: "OPENROUTER_API_KEY is not configured" }, { status: 503 });
  }

  let moves;
  try {
    moves = await summarizeBattleMoves(apiKey, crimson, azure);
  } catch {
    const fallbackMove = (messages: string[]) =>
      messages.length ? messages.slice(-3).join("; ").slice(0, 240) : "Hold position";
    moves = { crimson: fallbackMove(crimson), azure: fallbackMove(azure) };
  }

  const scenePrompt =
    `Continue the same single uninterrupted cinematic battle shot, with the same two focal fighters, positions, and battlefield as before. ` +
    `The Crimson fighter on the left attempts: ${moves.crimson}. ` +
    `The Azure fighter on the right attempts: ${moves.azure}. ` +
    `Show these actions visibly in a dramatic but coherent sequence. Keep both sides in frame. No cuts, no text, no new characters.`;

  return NextResponse.json(
    { moves, scenePrompt },
    { headers: { "Cache-Control": "no-store" } },
  );
}
