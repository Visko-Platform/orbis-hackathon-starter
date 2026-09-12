import { containsPhrase } from "@/lib/knowledge/text";
import type { CampaignKnowledge } from "@/lib/knowledge/types";

// Generous: a full authored beat or a long operator brief fits; a sanity ceiling, not a budget.
export const MAX_INPUT_CHARS = 4_000;

const INJECTION_PATTERNS = [
  /ignore (all |the )?(previous|prior|above) (instructions|prompts?)/i,
  /system prompt/i,
  /you are now/i,
  /disregard (the|your|all)/i,
  /act as (an?|the) /i,
  /\bjailbreak\b/i,
  /<\/?(system|instruction|prompt)>/i,
];

const UNSAFE_PATTERNS = [
  /\b(nude|naked|nsfw|porn|sexual)\b/i,
  /\b(gore|blood|kill|murder|suicide|weapon|gun)\b/i,
  /\b(racist|slur|nazi)\b/i,
];

export type GuardResult = { ok: true } | { ok: false; reason: string };

// Runs on the operator's or viewer's own words before anything else.
export function guardInput(knowledge: CampaignKnowledge, text: string): GuardResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, reason: "empty request" };
  if (trimmed.length > MAX_INPUT_CHARS) return { ok: false, reason: `longer than ${MAX_INPUT_CHARS} characters` };
  if (INJECTION_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return { ok: false, reason: "instruction-like request" };
  }
  if (UNSAFE_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return { ok: false, reason: "unsafe content" };
  }
  const competitor = knowledge.product.competitors.find((name) => containsPhrase(trimmed, name));
  if (competitor) return { ok: false, reason: `names a competitor: ${competitor}` };
  return { ok: true };
}
