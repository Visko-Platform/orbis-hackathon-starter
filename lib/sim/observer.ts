import { GoogleGenAI } from "@google/genai";

import { solveBellman, stateKey } from "./engine";
import type { ActionDefinition, ScenarioDefinition, SimState } from "./types";

const OBSERVER_MODEL = "gemini-3.5-flash";

export type ObservationDecision = {
  thought: string;
  inferredState: Partial<SimState>;
  actionId: string;
  source: "gemini" | "bellman-fallback";
  observerError?: string;
};

export async function observeAndDecide(input: {
  scenario: ScenarioDefinition;
  trueState: SimState;
  actions: ActionDefinition[];
  image: { mimeType: string; data: string };
}): Promise<ObservationDecision> {
  const fallback = bellmanAction(input.scenario, input.trueState, input.actions);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      thought: "No visual observer key is configured, so the safety policy is choosing the best known legal move.",
      inferredState: {},
      actionId: fallback,
      source: "bellman-fallback",
    };
  }

  try {
    const response = await new GoogleGenAI({ apiKey }).models.generateContent({
      model: OBSERVER_MODEL,
      contents: [
        {
          text: `You are the live observer and decision-maker for a tiny, game-like life simulation. Inspect only this video frame. Infer what you can see, then choose exactly one action from the supplied legal choices. Do not claim access to hidden state or invent a new action. The episode goal is to build a sustainable SF foothold: earn coins through office work, build friends in the park, and return home to recover energy. Return JSON only with thought (one concise first-person sentence), inferred_state (an object containing only any of day, time, location, energy, money, connections that are visually plausible), and action_id.\n\nLegal choices:\n${input.actions.map((action) => `- ${action.id}: ${action.label}`).join("\n")}`,
        },
        { inlineData: input.image },
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.35,
        maxOutputTokens: 260,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    const value = JSON.parse(response.text?.trim() || "{}") as Record<string, unknown>;
    const actionId = typeof value.action_id === "string" && input.actions.some((action) => action.id === value.action_id)
      ? value.action_id
      : fallback;
    const inferred = value.inferred_state && typeof value.inferred_state === "object" && !Array.isArray(value.inferred_state)
      ? Object.fromEntries(Object.entries(value.inferred_state as Record<string, unknown>).filter(([key, stateValue]) =>
        ["day", "time", "location", "energy", "money", "connections"].includes(key)
          && ["string", "number", "boolean"].includes(typeof stateValue),
      )) as Partial<SimState>
      : {};
    return {
      thought: typeof value.thought === "string" && value.thought.trim()
        ? value.thought.trim()
        : "I’m reading the scene and selecting the clearest legal next move.",
      inferredState: inferred,
      actionId,
      source: "gemini",
    };
  } catch (caught) {
    const observerError = caught instanceof Error ? caught.message : "Gemini observer failed.";
    const quotaExhausted = /quota exceeded|resource_exhausted|rate.limit/i.test(observerError);
    return {
      thought: quotaExhausted
        ? "My visual-thinking quota is exhausted, so the safety policy is continuing this episode."
        : "The visual observer was unavailable for this turn, so the safety policy is continuing the episode.",
      inferredState: {},
      actionId: fallback,
      source: "bellman-fallback",
      observerError,
    };
  }
}

function bellmanAction(scenario: ScenarioDefinition, state: SimState, actions: ActionDefinition[]) {
  const solved = scenario.episode ? solveBellman(scenario) : undefined;
  const actionId = solved?.states[stateKey(state)]?.optimalActionId;
  return actions.some((action) => action.id === actionId) ? actionId! : actions[0].id;
}
