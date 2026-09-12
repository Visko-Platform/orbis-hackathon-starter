import { guardInput } from "@/lib/knowledge/guard";
import { retrieveNotes } from "@/lib/knowledge/retrieve";
import type { CampaignKnowledge } from "@/lib/knowledge/types";
import { validateEngineered } from "@/lib/knowledge/validate";

export type EngineerRole = "opening" | "pivot" | "refine";

export type EngineerContext = {
  knowledge: CampaignKnowledge;
  text: string;
  role: EngineerRole;
  notes: string[];
  keepProduct: boolean;
};

export interface Engine {
  rewrite(ctx: EngineerContext): Promise<string>;
}

export type Engineered = {
  // What the operator or director typed.
  source: string;
  // What is used in the prompt.
  text: string;
  model: "gemini" | "passthrough";
  notes: string[];
  // Why a model rewrite was set aside, when it was.
  rejected: string[];
};

// Thrown when the input itself is not allowed; the caller answers with a 4xx.
export class RefusedError extends Error {}

// Prompt engineering for one piece of user text: guard it, retrieve the
// product notes it touches, have the engine rewrite it with the approved
// appearance, validate the result, and fall back to the user's own words.
export async function engineerPrompt(
  knowledge: CampaignKnowledge,
  text: string,
  role: EngineerRole,
  { engine, keepProduct = true }: { engine?: Engine; keepProduct?: boolean } = {},
): Promise<Engineered> {
  const source = text.trim().replace(/\s+/g, " ");
  const guard = guardInput(knowledge, source);
  if (!guard.ok) throw new RefusedError(`Request refused: ${guard.reason}.`);

  const notes = retrieveNotes(knowledge, source);
  const rejected: string[] = [];
  const ctx: EngineerContext = { knowledge, text: source, role, notes, keepProduct };

  if (engine) {
    let rewritten = "";
    try {
      rewritten = (await engine.rewrite(ctx)).trim().replace(/\s+/g, " ");
    } catch (caught: unknown) {
      const message = caught instanceof Error ? caught.message : String(caught);
      rejected.push(`engine failed: ${message.slice(0, 120)}`);
    }
    if (rewritten) {
      const validation = validateEngineered(knowledge, rewritten, { keepProduct });
      if (validation.ok) return { source, text: rewritten, model: "gemini", notes, rejected };
      rejected.push(...validation.reasons.map((reason) => `rewrite rejected: ${reason}`));
    }
  }

  const validation = validateEngineered(knowledge, source, { keepProduct });
  if (!validation.ok) throw new RefusedError(`Request refused: ${validation.reasons.join(", ")}.`);
  return { source, text: source, model: "passthrough", notes, rejected };
}
