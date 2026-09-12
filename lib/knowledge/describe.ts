import { GoogleGenAI } from "@google/genai";

import { ENGINEER_MODEL } from "@/lib/knowledge/llm";
import { sanitizeSuggestions } from "@/lib/knowledge/suggest";
import type { CampaignKnowledge } from "@/lib/knowledge/types";

// Drafts the appearance and visual notes from a product image so the operator
// can add a product with one upload and then correct the words. Drafts only:
// nothing is saved until the operator presses Save.
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export type ProductDraft = { appearance: string; visualNotes: string[] };

export const DESCRIBE_INSTRUCTION = `You describe a product from one photo for a video prompt writer.
Describe only what is visible: the kind of product, its shape, colours,
materials, packaging, and where the logo or label sits. Write the appearance
as one or two plain sentences under 60 words, naming the product by the name
given. Then write two to four short visual notes about how the product is
presented in the photo (for example which side faces the camera, what it
stands on, condensation, an open lid), each under 15 words.
Rules: no claims about taste, quality, health or price; no slogans; no other
brands; avoid "no", "not", "without". Return JSON only.`;

export function buildDescribeContent(knowledge: CampaignKnowledge): string {
  return [
    `Product name: ${knowledge.product.name}`,
    knowledge.product.appearance ? `Current appearance text (improve or replace): ${knowledge.product.appearance}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

// Keeps the draft inside the same limits the knowledge parser enforces.
export function sanitizeDraft(knowledge: CampaignKnowledge, raw: unknown): ProductDraft {
  const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const appearance = typeof body.appearance === "string" ? body.appearance.trim().replace(/\s+/g, " ").slice(0, 600) : "";
  const notes = Array.isArray(body.visualNotes) ? body.visualNotes.filter((n): n is string => typeof n === "string") : [];
  return { appearance, visualNotes: sanitizeSuggestions(knowledge, notes).slice(0, 4) };
}

export async function describeProductImage(
  knowledge: CampaignKnowledge,
  image: { bytes: Buffer; mimeType: string },
): Promise<ProductDraft> {
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await client.models.generateContent({
    model: ENGINEER_MODEL,
    contents: [
      { text: buildDescribeContent(knowledge) },
      { inlineData: { mimeType: image.mimeType, data: image.bytes.toString("base64") } },
    ],
    config: {
      systemInstruction: DESCRIBE_INSTRUCTION,
      temperature: 0.2,
      maxOutputTokens: 400,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: { appearance: { type: "string" }, visualNotes: { type: "array", items: { type: "string" } } },
        required: ["appearance", "visualNotes"],
      },
    },
  });
  const draft = sanitizeDraft(knowledge, JSON.parse(response.text ?? "{}"));
  if (!draft.appearance) throw new Error("Gemini returned no appearance");
  return draft;
}
