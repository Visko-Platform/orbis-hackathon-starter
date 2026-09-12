import { MAX_INPUT_CHARS } from "@/lib/knowledge/guard";
import { containsPhrase } from "@/lib/knowledge/text";
import type { CampaignKnowledge } from "@/lib/knowledge/types";

export type Validation = { ok: true } | { ok: false; reasons: string[] };

// Framing a rewrite may not introduce on its own: the live model takes these
// literally and the product ends up filling the picture.
export const FRAMING_PHRASES = [
  "in the foreground", "foreground", "close-up", "close up", "closeup", "fills the frame",
  "filling the frame", "fill the frame", "dominates the frame", "towering", "giant", "oversized", "larger than life",
];

export function introducedFraming(source: string, rewrite: string): string | null {
  return FRAMING_PHRASES.find((phrase) => containsPhrase(rewrite, phrase) && !containsPhrase(source, phrase)) ?? null;
}

// Applies to any engineered text before it is wrapped into a prompt.
export function validateEngineered(
  knowledge: CampaignKnowledge,
  text: string,
  { keepProduct = true, source }: { keepProduct?: boolean; source?: string } = {},
): Validation {
  const reasons: string[] = [];
  const trimmed = text.trim();
  if (!trimmed) reasons.push("empty");
  if (trimmed.length > MAX_INPUT_CHARS) reasons.push(`longer than ${MAX_INPUT_CHARS} characters`);

  const competitor = knowledge.product.competitors.find((name) => containsPhrase(trimmed, name));
  if (competitor) reasons.push(`competitor: "${competitor}"`);

  const forbidden = knowledge.forbiddenClaims.find((claim) => containsPhrase(trimmed, claim));
  if (forbidden) reasons.push(`forbidden claim: "${forbidden}"`);

  // A direction that drops the sponsor must not have the sponsor written back in.
  if (!keepProduct && containsPhrase(trimmed, knowledge.product.name)) {
    reasons.push(`mentions ${knowledge.product.name} although the direction drops the brand`);
  }
  // A rewrite (source given) must not add framing the director never asked for.
  const framing = source !== undefined ? introducedFraming(source, trimmed) : null;
  if (framing) reasons.push(`adds framing the direction did not ask for: "${framing}"`);
  return reasons.length ? { ok: false, reasons } : { ok: true };
}
