import type { TerrainSummary } from "@/lib/terrain";

async function callDirector(payload: unknown): Promise<string> {
  const res = await fetch("/api/director", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { prompt?: string; error?: string };
  if (!res.ok || !data.prompt) {
    throw new Error(data.error || "The AI director did not return a prompt.");
  }
  return data.prompt;
}

/** Ask the LLM to write an Orbis start prompt from the terrain summary. */
export function directorStart(summary: TerrainSummary): Promise<string> {
  return callDirector({ mode: "start", summary });
}

/** Ask the LLM to turn a free-text instruction into an Orbis steering prompt. */
export function directorEdit(
  instruction: string,
  currentPrompt: string,
): Promise<string> {
  return callDirector({ mode: "edit", instruction, currentPrompt });
}
