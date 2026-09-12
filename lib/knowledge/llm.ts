import { GoogleGenAI } from "@google/genai";

import type { Engine, EngineerContext } from "@/lib/knowledge/engineer";

export const ENGINEER_MODEL = "gemini-3.5-flash";

export function hasGemini(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

const SHARED_RULES = `Rules:
- Use only the approved product appearance and notes given below. Never add
  product features, colours, text, logos, slogans or claims that are not in them.
- Never mention any other brand.
- Keep to the actions the text asks for. Add no product interaction the
  operator did not ask for: the placement is production design, so nobody
  presents, praises or drinks/eats/wears the product unless the text says so.
- Write positively: avoid "no", "not", "without", "avoid".
- Plain text only, no headings, quotes or lists.`;

const INSTRUCTIONS = {
  opening: `You rewrite an operator's scene brief for a live video model that
continues a film moment from a reference frame in which the product is already
placed. Keep the operator's setting, action and camera. Where the product
belongs in the scene, describe it once as the approved appearance says and
name it by its approved name. Use the product notes only where they fit the
brief. Two to four sentences under 120 words, present tense.

${SHARED_RULES}`,
  pivot: `You rewrite a director's new direction as the scene the running video
transitions into. Keep everything the director asked for: setting, mood,
camera, action. When the product is to stay in the scene, place it naturally
and describe it once as the approved appearance says, by its approved name.
When told the direction drops the brand, do not mention the product at all.
One to three sentences under 80 words, present tense.

${SHARED_RULES}`,
  refine: `You rewrite a director's adjustment as one or two specific, visible
changes to the running scene. Keep the director's intent exactly. Name the
product by its approved name only when the change involves it. Do not restate
the rest of the scene; the model keeps what you do not change. Under 60 words,
present tense.

${SHARED_RULES}`,
} as const;

// Rewrites the operator's words with the product knowledge. The output is
// validated by the caller; the operator's own text is the fallback.
export class GeminiEngine implements Engine {
  private readonly client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  async rewrite({ knowledge, text, role, notes, keepProduct }: EngineerContext): Promise<string> {
    const product = knowledge.product;
    const response = await this.client.models.generateContent({
      model: ENGINEER_MODEL,
      contents: [
        {
          text: [
            `Product: ${product.name}`,
            product.appearance ? `Approved appearance: ${product.appearance}` : "",
            notes.length ? `Product notes:\n${notes.map((note) => `- ${note}`).join("\n")}` : "",
            keepProduct ? "The product stays in the scene." : "This direction drops the brand: do not mention the product.",
            `${role === "opening" ? "Operator's scene brief" : "Director's direction"}: ${text}`,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
      config: {
        systemInstruction: INSTRUCTIONS[role],
        temperature: 0.2,
        maxOutputTokens: 300,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    const output = response.text?.trim();
    if (!output) throw new Error("Gemini returned no text");
    return output;
  }
}
