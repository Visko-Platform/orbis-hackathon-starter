import { GoogleGenAI } from "@google/genai";

import { guardInput } from "@/lib/knowledge/guard";
import { ENGINEER_MODEL } from "@/lib/knowledge/llm";
import { containsPhrase, wordCount } from "@/lib/knowledge/text";
import type { CampaignKnowledge } from "@/lib/knowledge/types";

// The scene contract: what must stay true for the whole take. Product lines
// come from the knowledge base, person and setting lines from the brief or
// from a real frame, custom lines from the operator. Every direction restates
// it; pinned lines also survive a full pivot.
export type ContractKind = "product" | "person" | "setting" | "custom";
export type ContractSource = "knowledge" | "brief" | "frame" | "operator";
export type ContractLine = { id: string; kind: ContractKind; text: string; pinned: boolean; source: ContractSource };
export type SceneContract = { lines: ContractLine[] };
export type ContractDraft = { person: string[]; setting: string[] };

export const MAX_CONTRACT_LINES = 12;
export const MAX_LINE_CHARS = 200;
// Keeps the restated clause well inside the live prompt budget.
export const MAX_CLAUSE_CHARS = 600;

const KINDS: ContractKind[] = ["product", "person", "setting", "custom"];
const SOURCES: ContractSource[] = ["knowledge", "brief", "frame", "operator"];

let counter = 0;
export function lineId(kind: ContractKind): string {
  counter += 1;
  return `${kind}-${Date.now().toString(36)}-${counter}`;
}

function clean(text: string): string {
  return text.trim().replace(/\s+/g, " ").replace(/[.!]+$/, "");
}

// What the product must look like, from the knowledge base. Pinned: the ad is the point.
export function productLines(knowledge: CampaignKnowledge, keepProduct = true): ContractLine[] {
  if (!keepProduct) return [];
  const name = knowledge.product.name;
  const lines = [
    knowledge.product.appearance
      ? `One ${name} stays in the scene: ${clean(knowledge.product.appearance)}`
      : `One ${name} stays in the scene`,
    ...knowledge.protectedChanges,
  ];
  return lines.map((text) => ({ id: lineId("product"), kind: "product", text: clean(text), pinned: true, source: "knowledge" }));
}

// One line the operator or a model wrote, checked like any other input.
export function validateLine(knowledge: CampaignKnowledge, text: string): string | null {
  const cleaned = clean(text);
  if (!cleaned) return "empty line";
  if (cleaned.length > MAX_LINE_CHARS) return `line longer than ${MAX_LINE_CHARS} characters`;
  const guard = guardInput(knowledge, cleaned);
  if (!guard.ok) return guard.reason;
  const forbidden = knowledge.forbiddenClaims.find((claim) => containsPhrase(cleaned, claim));
  if (forbidden) return `forbidden claim: "${forbidden}"`;
  return null;
}

// Validates a client-provided contract. Throws with the offending line.
export function parseContract(raw: unknown, knowledge: CampaignKnowledge): SceneContract {
  const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  if (!Array.isArray(body.lines)) throw new Error("contract.lines must be a list");
  if (body.lines.length > MAX_CONTRACT_LINES) throw new Error(`contract has more than ${MAX_CONTRACT_LINES} lines`);
  const lines = body.lines.map((item, index): ContractLine => {
    const line = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const kind = KINDS.includes(line.kind as ContractKind) ? (line.kind as ContractKind) : null;
    const source = SOURCES.includes(line.source as ContractSource) ? (line.source as ContractSource) : "operator";
    if (!kind) throw new Error(`contract line ${index + 1} has an unknown kind`);
    if (typeof line.text !== "string") throw new Error(`contract line ${index + 1} has no text`);
    const problem = validateLine(knowledge, line.text);
    if (problem) throw new Error(`contract line ${index + 1}: ${problem}`);
    return {
      id: typeof line.id === "string" && line.id ? line.id.slice(0, 64) : lineId(kind),
      kind,
      text: clean(line.text),
      pinned: line.pinned === true,
      source,
    };
  });
  return { lines };
}

// The sentence every direction carries. Truncated by whole lines.
export function contractClause(contract: SceneContract | null | undefined): string {
  if (!contract?.lines.length) return "";
  const parts: string[] = [];
  let length = "Keep true: ".length;
  for (const line of contract.lines) {
    if (length + line.text.length + 2 > MAX_CLAUSE_CHARS) break;
    parts.push(line.text);
    length += line.text.length + 2;
  }
  return parts.length ? `Keep true: ${parts.join("; ")}.` : "";
}

// What survives a direction. A full pivot replaces the setting, so unpinned
// setting lines go; dropping the brand removes every product line.
export function afterPivot(contract: SceneContract, { mode, keepProduct }: { mode: "pivot" | "refine"; keepProduct: boolean }): SceneContract {
  return {
    lines: contract.lines.filter((line) => {
      if (line.kind === "product") return keepProduct;
      if (mode === "pivot" && line.kind === "setting") return line.pinned;
      return true;
    }),
  };
}

// Replaces unpinned person and setting lines with a fresh draft; keeps the rest.
export function mergeDraft(contract: SceneContract, draft: ContractDraft, source: ContractSource, knowledge: CampaignKnowledge): SceneContract {
  const kept = contract.lines.filter((line) => line.pinned || (line.kind !== "person" && line.kind !== "setting"));
  const drafted = [
    ...draft.person.map((text): ContractLine => ({ id: lineId("person"), kind: "person", text: clean(text), pinned: false, source })),
    ...draft.setting.map((text): ContractLine => ({ id: lineId("setting"), kind: "setting", text: clean(text), pinned: false, source })),
  ].filter((line) => validateLine(knowledge, line.text) === null);
  return { lines: [...kept, ...drafted].slice(0, MAX_CONTRACT_LINES) };
}

export function sanitizeDraft(knowledge: CampaignKnowledge, raw: unknown): ContractDraft {
  const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const list = (value: unknown) =>
    (Array.isArray(value) ? value : [])
      .filter((item): item is string => typeof item === "string")
      .map(clean)
      .filter((text) => text && wordCount(text) <= 20 && validateLine(knowledge, text) === null)
      .slice(0, 3);
  return { person: list(body.person), setting: list(body.setting) };
}

// No model: the brief's first sentence is the setting; nobody is assumed.
export function draftFromBrief(brief: string): ContractDraft {
  const first = clean(brief.split(/(?<=[.!?])\s+/)[0] ?? "");
  return { person: [], setting: first ? [first.slice(0, MAX_LINE_CHARS)] : [] };
}

const DRAFT_INSTRUCTION = `You write a scene contract for a live video model: the things that must stay
the same for the whole take. From the brief, and from the frame when one is
attached, list:
- person: who is present and what must not change about them (count, build,
  hair, clothing, what they hold and in which hand). Write these only when a
  person is described or visible; otherwise return an empty list.
- setting: the place, time of day, weather and light that must persist.
Each line is one positive statement under 15 words, present tense, specific.
Describe what is there; never invent a person or a place. Never mention the
product's qualities, taste, price or other brands; the product's own line is
written elsewhere. Avoid "no", "not", "without". Return JSON only.`;

export async function draftContractWithGemini(
  knowledge: CampaignKnowledge,
  brief: string,
  image?: { bytes: Buffer; mimeType: string },
): Promise<ContractDraft> {
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await client.models.generateContent({
    model: ENGINEER_MODEL,
    contents: [
      { text: [`Product: ${knowledge.product.name}`, `Brief: ${brief}`, image ? "A frame from the take is attached; prefer what is visible in it." : ""].filter(Boolean).join("\n") },
      ...(image ? [{ inlineData: { mimeType: image.mimeType, data: image.bytes.toString("base64") } }] : []),
    ],
    config: {
      systemInstruction: DRAFT_INSTRUCTION,
      temperature: 0.2,
      maxOutputTokens: 300,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: { person: { type: "array", items: { type: "string" } }, setting: { type: "array", items: { type: "string" } } },
        required: ["person", "setting"],
      },
    },
  });
  return sanitizeDraft(knowledge, JSON.parse(response.text ?? "{}"));
}
