import { MAX_INPUT_CHARS } from "@/lib/knowledge/guard";
import { containsPhrase } from "@/lib/knowledge/text";
import type { CampaignKnowledge } from "@/lib/knowledge/types";

export type Validation = { ok: true } | { ok: false; reasons: string[] };

// Applies to any engineered text before it is wrapped into a prompt.
export function validateEngineered(
  knowledge: CampaignKnowledge,
  text: string,
  { keepProduct = true }: { keepProduct?: boolean } = {},
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
  return reasons.length ? { ok: false, reasons } : { ok: true };
}
