import { GoogleGenAI } from "@google/genai";

import { guardInput } from "@/lib/knowledge/guard";
import { ENGINEER_MODEL } from "@/lib/knowledge/llm";
import { wordCount } from "@/lib/knowledge/text";
import type { CampaignKnowledge } from "@/lib/knowledge/types";
import { validateEngineered } from "@/lib/knowledge/validate";

// Voiceover: a narrator's line or two, written from the product knowledge and
// the scene the video is in, then spoken with Gemini's TTS voice and played
// over the take. Orbis keeps generating its own ambience underneath; the words
// come from us because the model's audio is picture-driven and carries no
// reliable speech.
export const TTS_MODEL = "gemini-2.5-flash-preview-tts";
export const NARRATOR_VOICE = "Charon";
export const MAX_LINES = 2;
export const MAX_LINE_WORDS = 24;
const PCM_SAMPLE_RATE = 24_000;

export type VoiceoverRole = "opening" | "pivot" | "refine";
export type VoiceoverContext = { scene: string; direction?: string; contractLines?: string[]; role: VoiceoverRole };

const LINES_INSTRUCTION = `You write voiceover for a live brand film: the words of an unseen narrator
speaking over the scene described. One or two short lines, each under ${MAX_LINE_WORDS}
words, that fit exactly what is on screen now and say something true about
the product from the approved facts and notes. Understated, present tense,
like a good commercial: an observation, not a pitch. Name the product at most
once. Rules: use only the approved information; no other brands; no prices
unless given; no health or superiority claims; avoid "no", "not", "without".
Return JSON: {"lines": ["..."]} and nothing else.`;

const CAPTION_INSTRUCTION = `You write a one-sentence sound caption for a video model: what is HEARD in the
scene described, never what is seen. Ambience, music, footsteps, weather,
crowd, room tone. Under 25 words. No speech, no words spoken, no brand names.
Return the caption as plain text only.`;

export function sanitizeLines(knowledge: CampaignKnowledge, raw: unknown): string[] {
  const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const items = Array.isArray(body.lines) ? body.lines : [];
  const kept: string[] = [];
  for (const item of items) {
    if (typeof item !== "string") continue;
    const text = item.trim().replace(/\s+/g, " ");
    if (!text || wordCount(text) > MAX_LINE_WORDS) continue;
    if (!guardInput(knowledge, text).ok) continue;
    if (!validateEngineered(knowledge, text).ok) continue;
    kept.push(text);
    if (kept.length === MAX_LINES) break;
  }
  return kept;
}

function client() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

export async function writeVoiceover(knowledge: CampaignKnowledge, ctx: VoiceoverContext): Promise<string[]> {
  const response = await client().models.generateContent({
    model: ENGINEER_MODEL,
    contents: [
      {
        text: [
          `Product: ${knowledge.product.name}`,
          knowledge.product.appearance ? `Approved appearance: ${knowledge.product.appearance}` : "",
          knowledge.facts.length ? `Approved facts:\n${knowledge.facts.map((f) => `- ${f}`).join("\n")}` : "",
          knowledge.visualNotes.length ? `Product notes:\n${knowledge.visualNotes.map((n) => `- ${n}`).join("\n")}` : "",
          ctx.contractLines?.length ? `What stays true in this take:\n${ctx.contractLines.map((l) => `- ${l}`).join("\n")}` : "",
          `Moment: ${ctx.role === "opening" ? "the film begins" : ctx.role === "pivot" ? "the scene has just changed" : "a small adjustment to the scene"}`,
          ctx.direction ? `Director's words: ${ctx.direction}` : "",
          `Scene on screen: ${ctx.scene}`,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
    config: {
      systemInstruction: LINES_INSTRUCTION,
      temperature: 0.7,
      maxOutputTokens: 200,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: "application/json",
      responseSchema: { type: "object", properties: { lines: { type: "array", items: { type: "string" } } }, required: ["lines"] },
    },
  });
  return sanitizeLines(knowledge, JSON.parse(response.text ?? "{}"));
}

// A sound caption for Orbis's set_audio_prompt: what the scene sounds like.
export async function writeSoundCaption(scene: string): Promise<string> {
  const response = await client().models.generateContent({
    model: ENGINEER_MODEL,
    contents: [{ text: `Scene: ${scene}` }],
    config: { systemInstruction: CAPTION_INSTRUCTION, temperature: 0.3, maxOutputTokens: 60, thinkingConfig: { thinkingBudget: 0 } },
  });
  const caption = (response.text ?? "").trim().replace(/\s+/g, " ");
  return wordCount(caption) <= 30 ? caption : "";
}

// PCM 16-bit mono at 24 kHz, as the TTS model returns it, wrapped as a WAV file.
export function pcmToWav(pcm: Buffer, sampleRate = PCM_SAMPLE_RATE): Buffer {
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

export async function speakLines(lines: string[]): Promise<Buffer> {
  const response = await client().models.generateContent({
    model: TTS_MODEL,
    contents: [{ text: `Read this calmly, as a film narrator, with a short pause between sentences: ${lines.join(" ")}` }],
    config: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: NARRATOR_VOICE } } } },
  });
  const part = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part?.inlineData?.data) throw new Error("TTS returned no audio");
  return pcmToWav(Buffer.from(part.inlineData.data, "base64"));
}
