import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

import { DREAM_MODEL } from "@/lib/dream-director";

export const runtime = "nodejs";

const SYSTEM = `You name children's picture books. You are given the beats of a
story a child just made up, and optionally the child's first name.

Reply with ONE title: 2-6 words, title case, warm and playful, the kind of
thing printed on the cover of a picture book. Use the child's name only if it
makes the title better. No quotes, no subtitle, no punctuation at the end, no
emoji.

Return JSON only: {"title": string}`;

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY missing" }, { status: 500 });
  const { beats, name } = (await request.json()) as { beats?: string[]; name?: string };
  const lines = (beats ?? []).filter((b) => typeof b === "string" && b.trim()).slice(0, 24);
  if (!lines.length) return NextResponse.json({ error: "no beats" }, { status: 400 });

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: DREAM_MODEL,
      contents: [
        {
          text: `${name ? `CHILD'S NAME: ${name}\n\n` : ""}STORY BEATS:\n${lines.map((b, i) => `${i + 1}. ${b}`).join("\n")}`,
        },
      ],
      config: {
        systemInstruction: SYSTEM,
        temperature: 0.9,
        maxOutputTokens: 60,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    const parsed = JSON.parse(response.text?.trim() || "{}") as { title?: string };
    const title = (parsed.title || "").replace(/^["'“”]|["'“”.]+$/g, "").trim();
    if (!title) throw new Error("empty title");
    return NextResponse.json({ title: title.slice(0, 60) }, { headers: { "Cache-Control": "no-store" } });
  } catch (caught) {
    console.error("book-title failed", caught);
    return NextResponse.json({ error: "titler unavailable" }, { status: 502 });
  }
}
