import { GoogleGenAI } from "@google/genai";

import type { Judgment, StepRecord } from "./types";

const JUDGE_MODEL = "gemini-3.5-flash";

export async function judgeRenderedStep(step: StepRecord, image: { mimeType: string; data: string }): Promise<Judgment> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { status: "skipped", summary: "GEMINI_API_KEY is not configured." };

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: JUDGE_MODEL,
      contents: [
        {
          text: `You are a strict renderer-alignment judge for a deterministic simulation. The symbolic transition is already true; do not invent or modify state. Inspect the rendered image and score only whether it visibly supports the declared transition. Return JSON only.\n\nState before: ${JSON.stringify(step.stateBefore)}\nAction: ${step.actionId}\nState after: ${JSON.stringify(step.stateAfter)}\nDeclared scene: ${step.renderIntent.scene}\nDeclared event: ${step.renderIntent.event}\nRequired visible facts: ${step.renderIntent.visualFacts.join(", ")}`,
        },
        { inlineData: image },
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0,
        maxOutputTokens: 500,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    const raw = response.text?.trim();
    if (!raw) return { status: "error", error: "Gemini returned no judgment." };
    const value = JSON.parse(raw) as Record<string, unknown>;
    const score = (name: string) => {
      const candidate = Number(value[name]);
      return Number.isFinite(candidate) ? Math.max(0, Math.min(10, candidate)) : 0;
    };
    return {
      status: "judged",
      stateAlignment: score("state_alignment"),
      actionAlignment: score("action_alignment"),
      continuity: score("continuity"),
      enjoyment: score("enjoyment"),
      observedFacts: Array.isArray(value.observed_facts) ? value.observed_facts.map(String) : [],
      contradictions: Array.isArray(value.contradictions) ? value.contradictions.map(String) : [],
      summary: typeof value.summary === "string" ? value.summary : "No summary returned.",
    };
  } catch (caught) {
    return { status: "error", error: caught instanceof Error ? caught.message : "Gemini judge failed." };
  }
}
