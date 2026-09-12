import { coverage, tokenize } from "@/lib/knowledge/text";
import type { CampaignKnowledge } from "@/lib/knowledge/types";

const MAX_ENTRIES = 3;
const MIN_SCORE = 0.34;

// Lexical retrieval: entries whose words cover the request. The seam for
// embeddings later; the contract (campaign-scoped, ranked, capped) stays.
export function retrieveEntries(entries: string[], text: string, { max = MAX_ENTRIES, minScore = MIN_SCORE } = {}): string[] {
  const tokens = tokenize(text);
  return entries
    .map((entry) => ({ entry, score: coverage(tokens, entry) }))
    .filter(({ score }) => score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map(({ entry }) => entry);
}

export function retrieveNotes(knowledge: CampaignKnowledge, text: string): string[] {
  return retrieveEntries(knowledge.visualNotes, text);
}

export function retrieveFacts(knowledge: CampaignKnowledge, text: string): string[] {
  return retrieveEntries(knowledge.facts, text);
}

const FACT_PATTERNS = [
  /\b(how (much|many|long|old|big|heavy)|price|cost|what('s| is| are)?|whats|when (was|did|is)|where (is|was|does)|who|why|spec|specs|weight|size|calorie|calories|sugar|ingredient|does it|is it|tell me about)\b/i,
];

// A question about the product is answered on screen, never sent as a prompt.
export function isFactQuestion(text: string): boolean {
  return /\?\s*$/.test(text.trim()) || FACT_PATTERNS.some((pattern) => pattern.test(text));
}
