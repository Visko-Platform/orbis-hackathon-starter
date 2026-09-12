import { GoogleGenAI } from "@google/genai";

import { guardInput } from "@/lib/knowledge/guard";
import { ENGINEER_MODEL } from "@/lib/knowledge/llm";
import { wordCount } from "@/lib/knowledge/text";
import type { CampaignKnowledge } from "@/lib/knowledge/types";

// Quick-pick directions built from the product knowledge. They fill the
// direction box; sending still goes through the prompt engineer.
export const MAX_SUGGESTIONS = 6;
const MAX_SUGGESTION_WORDS = 10;

export type SuggestionSet = { suggestions: string[]; source: "gemini" | "default" };

export function sanitizeSuggestions(knowledge: CampaignKnowledge, raw: string[]): string[] {
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const item of raw) {
    const text = item.trim().replace(/\s+/g, " ").replace(/[.!]$/, "");
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    if (wordCount(text) > MAX_SUGGESTION_WORDS) continue;
    if (!guardInput(knowledge, text).ok) continue;
    seen.add(key);
    kept.push(text);
    if (kept.length === MAX_SUGGESTIONS) break;
  }
  return kept;
}

export function defaultSuggestions(knowledge: CampaignKnowledge): string[] {
  const name = knowledge.product.name;
  return sanitizeSuggestions(knowledge, [
    `Move closer to the ${name} placement`,
    "Warm evening light across the scene",
    "Pull back into a wider shot",
    `Someone walks past the ${name} and glances at it`,
    "Rain begins and the street reflects the lights",
    "Slow the camera down",
  ]);
}

const SUGGEST_INSTRUCTION = `You write short directions a film director might give to steer a live video
in which a product is naturally placed. Each is 3 to 10 words, imperative, about
one visible change: camera, light, setting, action, or how the product is
handled, served or seen. Ground them in the product info given; invent no
features or claims. Never mention other brands. Avoid "no", "not", "without".
Return a JSON array of ${MAX_SUGGESTIONS} strings and nothing else.`;

export async function suggestWithGemini(knowledge: CampaignKnowledge): Promise<string[]> {
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await client.models.generateContent({
    model: ENGINEER_MODEL,
    contents: [
      {
        text: [
          `Product: ${knowledge.product.name}`,
          knowledge.product.appearance ? `Appearance: ${knowledge.product.appearance}` : "",
          knowledge.visualNotes.length ? `Notes:\n${knowledge.visualNotes.map((n) => `- ${n}`).join("\n")}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
    config: {
      systemInstruction: SUGGEST_INSTRUCTION,
      temperature: 0.6,
      maxOutputTokens: 300,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: "application/json",
      responseSchema: { type: "array", items: { type: "string" } },
    },
  });
  const parsed: unknown = JSON.parse(response.text ?? "[]");
  if (!Array.isArray(parsed)) throw new Error("Gemini suggestions were not an array");
  return sanitizeSuggestions(knowledge, parsed.filter((item): item is string => typeof item === "string"));
}
