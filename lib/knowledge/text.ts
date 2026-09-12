const STOPWORDS = new Set([
  "a", "an", "the", "it", "its", "in", "on", "to", "of", "and", "or", "me",
  "show", "make", "please", "can", "you", "i", "want", "see", "let", "with",
  "is", "be", "this", "that", "now", "one", "then", "how", "much", "many",
  "does", "do", "did", "what", "which", "where", "when", "why", "are", "was",
  "there", "here", "get", "have", "has", "into", "onto", "as", "at", "by",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((token) => token && !STOPWORDS.has(token))
    .map(stem);
}

// Crude suffix stripping so "pours" matches "pour" and "chilled" matches "chill".
export function stem(token: string): string {
  if (token.length <= 3) return token;
  return token
    .replace(/ies$/, "y")
    .replace(/(sses|ches|shes|xes)$/, (m) => m.slice(0, -2))
    .replace(/ing$/, "")
    .replace(/ed$/, "")
    .replace(/s$/, "");
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Fraction of the request's tokens that appear in the text.
export function coverage(requestTokens: string[], text: string): number {
  if (!requestTokens.length) return 0;
  const set = new Set(tokenize(text));
  const hits = requestTokens.filter((token) => set.has(token)).length;
  return hits / requestTokens.length;
}

export function containsPhrase(text: string, phrase: string): boolean {
  const pattern = phrase
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${pattern}([^\\p{L}\\p{N}]|$)`, "iu").test(text);
}
