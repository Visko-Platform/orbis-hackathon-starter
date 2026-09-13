import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

import { DREAM_MODEL, DREAM_SYSTEM_INSTRUCTION } from "@/lib/dream-director";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY missing" }, { status: 500 });
  }
  const { world, said, name } = (await request.json()) as {
    world?: string;
    said?: string;
    name?: string;
  };
  if (!said?.trim()) {
    return NextResponse.json({ error: "nothing said" }, { status: 400 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: DREAM_MODEL,
      contents: [
        {
          text: `${name ? `CHILD: ${name}\n\n` : ""}WORLD:\n${world || "(empty — this is the first thing)"}\n\nCHILD SAID:\n${said.trim()}`,
        },
      ],
      config: {
        systemInstruction: DREAM_SYSTEM_INSTRUCTION,
        temperature: 0.4,
        maxOutputTokens: 400,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    const text = response.text?.trim() || "";
    const parsed = JSON.parse(text) as {
      safe?: boolean;
      prompt?: string;
      nudge?: string;
    };
    if (typeof parsed.safe !== "boolean" || typeof parsed.prompt !== "string") {
      throw new Error("bad shape");
    }
    return NextResponse.json(
      { safe: parsed.safe, prompt: parsed.prompt, nudge: parsed.nudge || "" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (caught) {
    console.error("dream-prompt failed", caught);
    return NextResponse.json({ error: "director unavailable", detail: String((caught as any)?.message ?? caught).slice(0, 600) }, { status: 502 });
  }
}
