import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Gemini TTS returns raw 16-bit PCM @ 24kHz mono; wrap it as a WAV.
function wav(pcm: Buffer, sampleRate = 24000) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY missing" }, { status: 500 });
  const { text } = (await request.json()) as { text?: string };
  if (!text?.trim()) return NextResponse.json({ error: "no text" }, { status: 400 });

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [
        {
          text: `Read this children's story aloud like a warm, gentle bedtime narrator — unhurried, playful, a little wonder in the voice, with a soft pause between pages:\n\n${text.trim()}`,
        },
      ],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Leda" } } },
      } as any,
    });
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const audio = parts.find((p) => p.inlineData?.data)?.inlineData;
    if (!audio?.data) return NextResponse.json({ error: "no audio" }, { status: 502 });
    const pcm = Buffer.from(audio.data, "base64");
    const isWav = audio.mimeType?.includes("wav");
    return new Response(isWav ? pcm : wav(pcm), {
      headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" },
    });
  } catch (caught) {
    console.error("dream-voice failed", caught);
    return NextResponse.json({ error: "narrator unavailable", detail: String((caught as any)?.message ?? caught).slice(0, 600) }, { status: 502 });
  }
}
