import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

import { getTheme, type ThemeId } from "@/lib/dream-style";

export const runtime = "nodejs";

// Paints the first frame of a page as a flat picture-book illustration so
// Orbis starts (and stays) in that style.
export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY missing" }, { status: 500 });
  const { scene, theme } = (await request.json()) as { scene?: string; theme?: ThemeId };
  if (!scene?.trim()) return NextResponse.json({ error: "no scene" }, { status: 400 });

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [
        {
          text: `Draw a single wide 16:9 illustration. STYLE: ${getTheme(theme).style} SCENE: ${scene.trim()} Fill the whole frame; no borders, no text, no watermark.`,
        },
      ],
      config: { imageConfig: { aspectRatio: "16:9" } } as any,
    });
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const out = parts.find((p) => p.inlineData?.data)?.inlineData;
    if (!out?.data) return NextResponse.json({ error: "no image" }, { status: 502 });
    return new Response(Buffer.from(out.data, "base64"), {
      headers: { "Cache-Control": "no-store", "Content-Type": out.mimeType || "image/png" },
    });
  } catch (caught) {
    console.error("dream-image failed", caught);
    return NextResponse.json({ error: "painter unavailable", detail: String((caught as any)?.message ?? caught).slice(0, 600) }, { status: 502 });
  }
}
