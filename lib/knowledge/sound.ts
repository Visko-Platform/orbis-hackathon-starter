import { GoogleGenAI } from "@google/genai";

import { ENGINEER_MODEL } from "@/lib/knowledge/llm";
import { wordCount } from "@/lib/knowledge/text";

// A one-sentence sound caption for Orbis's set_audio_prompt: what the new scene
// sounds like, so the model's own ambience matches the picture.
const CAPTION_INSTRUCTION = `You write a one-sentence sound caption for a video model: what is HEARD in the
scene described, never what is seen. Ambience, music, footsteps, weather,
crowd, room tone. Under 25 words. No speech, no words spoken, no brand names.
Return the caption as plain text only.`;

// A sound caption for Orbis's set_audio_prompt: what the scene sounds like.
export async function writeSoundCaption(scene: string): Promise<string> {
  const response = await new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }).models.generateContent({
    model: ENGINEER_MODEL,
    contents: [{ text: `Scene: ${scene}` }],
    config: { systemInstruction: CAPTION_INSTRUCTION, temperature: 0.3, maxOutputTokens: 60, thinkingConfig: { thinkingBudget: 0 } },
  });
  const caption = (response.text ?? "").trim().replace(/\s+/g, " ");
  return wordCount(caption) <= 30 ? caption : "";
}
