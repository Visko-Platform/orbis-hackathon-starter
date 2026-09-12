import type {
  ActionDefinition,
  RenderIntent,
  ScenarioDefinition,
  SimState,
  TransitionResult,
} from "./types";

export function allowedActions(scenario: ScenarioDefinition, state: SimState) {
  return scenario.actions.filter((action) =>
    Object.entries(action.available_when ?? {}).every(([field, expected]) => state[field] === expected),
  );
}

export function applyAction(
  scenario: ScenarioDefinition,
  state: SimState,
  actionId: string,
): TransitionResult {
  const action = allowedActions(scenario, state).find((candidate) => candidate.id === actionId);
  if (!action) throw new Error(`Action ${actionId} is not allowed in the current state.`);

  const next: SimState = { ...state };
  for (const [field, value] of Object.entries(action.transition.set ?? {})) {
    if (value !== undefined) next[field] = value;
  }
  for (const [field, delta] of Object.entries(action.transition.add ?? {})) {
    const current = next[field];
    if (typeof current !== "number") throw new Error(`Cannot add to non-numeric field ${field}.`);
    next[field] = current + delta;
  }
  validateState(scenario, next);
  return { stateBefore: { ...state }, stateAfter: next, action, renderIntent: buildRenderIntent(action, next) };
}

export function buildInitialRenderIntent(scenario: ScenarioDefinition, state: SimState): RenderIntent {
  const location = String(state.location ?? "the current location");
  const time = String(state.time ?? "daytime");
  return {
    scene: `${location} during ${time}`,
    event: "The protagonist begins a quiet moment in this state.",
    visualFacts: [location, time, "one person"],
    camera: "stable medium-wide shot",
    prompt: `A grounded, cinematic life-simulation scene. Show ${location} during ${time}. A single consistent protagonist is present. Keep the setting, character identity, lighting, and camera stable.`,
  };
}

export function enumerateReachableStates(scenario: ScenarioDefinition, limit = 80) {
  const initialKey = stateKey(scenario.initial_state);
  const states = new Map([[initialKey, scenario.initial_state]]);
  const edges: Array<{ from: string; to: string; actionId: string }> = [];
  const queue = [scenario.initial_state];
  while (queue.length && states.size < limit) {
    const current = queue.shift()!;
    const from = stateKey(current);
    for (const action of allowedActions(scenario, current)) {
      const next = applyAction(scenario, current, action.id).stateAfter;
      const to = stateKey(next);
      edges.push({ from, to, actionId: action.id });
      if (!states.has(to) && states.size < limit) {
        states.set(to, next);
        queue.push(next);
      }
    }
  }
  return { states: [...states.entries()].map(([id, state]) => ({ id, state })), edges, truncated: queue.length > 0 };
}

function buildRenderIntent(action: ActionDefinition, state: SimState): RenderIntent {
  const visualFacts = action.render.visual_facts ?? [];
  const prompt = [
    "Continue the exact same grounded life-simulation world.",
    `Current declared state: ${Object.entries(state).map(([key, value]) => `${key}=${value}`).join(", ")}.`,
    `Scene: ${action.render.scene}.`,
    `Event: ${action.render.event}`,
    `Required visible facts: ${visualFacts.join(", ") || "none"}.`,
    `Camera: ${action.render.camera ?? "stable medium-wide shot"}.`,
    "Preserve the protagonist's identity and make only the declared transition.",
  ].join(" ");
  return { scene: action.render.scene, event: action.render.event, visualFacts, camera: action.render.camera ?? "stable medium-wide shot", prompt };
}

function validateState(scenario: ScenarioDefinition, state: SimState) {
  for (const [field, definition] of Object.entries(scenario.state)) {
    const value = state[field];
    if (definition.type === "enum" && !definition.values.includes(value)) {
      throw new Error(`Transition produced invalid ${field}: ${String(value)}.`);
    }
    if (definition.type === "integer" && (typeof value !== "number" || value < definition.min || value > definition.max)) {
      throw new Error(`Transition produced out-of-range ${field}: ${String(value)}.`);
    }
  }
}

export function stateKey(state: SimState) {
  return JSON.stringify(Object.keys(state).sort().map((key) => [key, state[key]]));
}
