import type {
  ActionDefinition,
  BellmanSolution,
  RenderIntent,
  ScenarioDefinition,
  SimState,
  TransitionResult,
} from "./types";

export function allowedActions(scenario: ScenarioDefinition, state: SimState) {
  return scenario.actions.filter((action) =>
    Object.entries(action.available_when ?? {}).every(([field, expected]) => state[field] === expected)
      && Object.entries(action.requires ?? {}).every(([field, condition]) => {
        const value = state[field];
        return typeof value === "number"
          && (condition.gte === undefined || value >= condition.gte)
          && (condition.lte === undefined || value <= condition.lte);
      }),
  );
}

export function applyAction(
  scenario: ScenarioDefinition,
  state: SimState,
  actionId: string,
  stepIndex = 0,
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
  const episode = evaluateEpisode(scenario, next, action.reward ?? 0, stepIndex);
  return {
    stateBefore: { ...state },
    stateAfter: next,
    action,
    renderIntent: buildRenderIntent(action, next),
    ...episode,
  };
}

export function evaluateEpisode(scenario: ScenarioDefinition, state: SimState, actionReward = 0, stepIndex = 0) {
  const definition = scenario.episode;
  if (!definition) return { reward: actionReward, done: false as const };
  const success = stateMatches(state, definition.success_when);
  const failure = !success && (stateMatches(state, definition.failure_when) || stepIndex >= definition.max_steps);
  return {
    reward: actionReward + definition.step_reward + (success ? definition.success_reward : failure ? definition.failure_reward : 0),
    done: success || failure,
    outcome: success ? "success" as const : failure ? "failure" as const : undefined,
  };
}

const INITIAL_VISUAL_VARIANTS = [
  "a sunlit Mission studio with warm wood, trailing plants, and a lived-in desk by the window",
  "a fog-softened Inner Sunset apartment with cool daylight, bookshelves, and a neatly packed suitcase",
  "a compact Richmond room with overcast window light, a bicycle helmet, and a hand-drawn neighborhood map",
  "a bright South Beach apartment with clean lines, pale concrete, and a small view toward the Bay",
  "a colorful shared apartment near Dolores Park with posters, thrifted furniture, and morning light",
  "a quiet Noe Valley room with soft cream walls, houseplants, and a work bag ready by the door",
  "a modest Tenderloin studio with practical furnishings, a transit card, and dramatic city light through blinds",
  "a calm Outer Richmond apartment with coastal light, a rain jacket, and a simple breakfast setup",
] as const;

export function buildInitialRenderIntent(scenario: ScenarioDefinition, state: SimState, seed = 0): RenderIntent {
  const location = String(state.location ?? "the current location");
  const time = String(state.time ?? "daytime");
  const visualVariant = INITIAL_VISUAL_VARIANTS[Math.abs(seed) % INITIAL_VISUAL_VARIANTS.length];
  return {
    scene: `${location} during ${time}`,
    event: "The protagonist begins a quiet moment in this state.",
    visualFacts: [location, time, "one person", visualVariant],
    camera: "stable medium-wide shot",
    prompt: `A grounded, cinematic life-simulation scene. Show ${location} during ${time}: ${visualVariant}. A single consistent protagonist is present. Keep the setting, character identity, lighting, and camera stable.`,
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

/** Solves an episodic, deterministic scenario exactly with Bellman optimality. */
export function solveBellman(scenario: ScenarioDefinition, limit = 5_000): BellmanSolution {
  if (!scenario.episode) throw new Error("Bellman solving requires an episodic scenario with terminal rules.");
  const states = new Map<string, SimState>();
  const transitions = new Map<string, Array<{ actionId: string; nextId: string; reward: number; done: boolean }>>();
  const queue = [scenario.initial_state];
  states.set(stateKey(scenario.initial_state), scenario.initial_state);

  while (queue.length) {
    const state = queue.shift()!;
    const id = stateKey(state);
    const edges = allowedActions(scenario, state).map((action) => {
      const result = applyAction(scenario, state, action.id);
      const nextId = stateKey(result.stateAfter);
      if (!states.has(nextId)) {
        if (states.size >= limit) throw new Error(`Bellman state limit (${limit}) reached.`);
        states.set(nextId, result.stateAfter);
        queue.push(result.stateAfter);
      }
      return { actionId: action.id, nextId, reward: result.reward, done: result.done };
    });
    transitions.set(id, edges);
  }

  const values = new Map<string, BellmanSolution["states"][string]>();
  const visiting = new Set<string>();
  const solveState = (id: string): BellmanSolution["states"][string] => {
    const cached = values.get(id);
    if (cached) return cached;
    if (visiting.has(id)) throw new Error("Bellman solver found a cycle; add an episode clock to the scenario state.");
    visiting.add(id);
    const edges = transitions.get(id) ?? [];
    if (!edges.length) {
      const terminal = { value: 0, actionValues: {}, terminal: true };
      values.set(id, terminal);
      visiting.delete(id);
      return terminal;
    }
    const actionValues = Object.fromEntries(edges.map((edge) => [edge.actionId, edge.reward + (edge.done ? 0 : solveState(edge.nextId).value)]));
    const [optimalActionId, value] = Object.entries(actionValues).reduce((best, current) => current[1] > best[1] ? current : best);
    const solved = { value, optimalActionId, actionValues, terminal: false };
    values.set(id, solved);
    visiting.delete(id);
    return solved;
  };

  const startStateId = stateKey(scenario.initial_state);
  const start = solveState(startStateId);
  return {
    stateCount: states.size,
    startStateId,
    startValue: start.value,
    startActionId: start.optimalActionId,
    states: Object.fromEntries(values),
  };
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

function stateMatches(state: SimState, expected: Partial<SimState>) {
  return Object.entries(expected).every(([field, value]) => state[field] === value);
}
