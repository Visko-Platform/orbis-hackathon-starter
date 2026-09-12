import type { Beat } from "./types";
export function activePath(scenes: Beat[], id: string): Beat[] {
  const map = new Map(scenes.map((x) => [x.id, x]));
  const path: Beat[] = [];
  const seen = new Set<string>();
  let cursor: string | null = id;
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    const node = map.get(cursor);
    if (!node) break;
    path.unshift(node);
    cursor = node.parentId;
  }
  return path;
}
export function pollWinner(
  choices: { id: string }[],
  votes: Record<string, number>,
): string | null {
  let winner: string | null = null;
  let max = 0;
  for (const choice of choices) {
    const count = votes[choice.id] || 0;
    if (count > max) {
      max = count;
      winner = choice.id;
    }
  }
  return winner;
}
