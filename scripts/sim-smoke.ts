import { randomUUID } from "node:crypto";

import { appendStep, createRun, getRun, listSteps } from "../lib/sim/db";
import { allowedActions, applyAction, enumerateReachableStates, solveBellman } from "../lib/sim/engine";
import { loadScenario } from "../lib/sim/scenarios";

async function main() {
const scenario = loadScenario("tiny-life");
const stateBefore = scenario.initial_state;
const action = allowedActions(scenario, stateBefore).find((candidate) => candidate.id === "go_to_park");
if (!action) throw new Error("Tiny Life should allow go_to_park initially.");

const transition = applyAction(scenario, stateBefore, action.id);
const graph = enumerateReachableStates(scenario);
const maxAvailableActions = Math.max(...graph.states.map(({ state }) => allowedActions(scenario, state).length));
if (maxAvailableActions > 3) throw new Error(`Expected no more than 3 actions per state, received ${maxAvailableActions}.`);
const sfScenario = loadScenario("new-in-sf-v2");
const sfGraph = enumerateReachableStates(sfScenario, 200);
const sfMaxAvailableActions = Math.max(...sfGraph.states.map(({ state }) => allowedActions(sfScenario, state).length));
if (sfMaxAvailableActions > 3) throw new Error(`New in SF should have at most 3 actions per state, received ${sfMaxAvailableActions}.`);
const sfSolution = solveBellman(sfScenario);
if (sfSolution.startActionId !== "go_to_office") throw new Error(`Expected Bellman solver to start at office, received ${sfSolution.startActionId}.`);
const now = new Date().toISOString();
const runId = randomUUID();
const initialRun = {
  id: runId,
  scenarioId: scenario.id,
  scenarioVersion: scenario.version,
  status: "active" as const,
  seed: 42,
  state: stateBefore,
  stepIndex: 0,
  totalReward: 0,
  createdAt: now,
  updatedAt: now,
};
await createRun(initialRun);
await appendStep(
  { ...initialRun, state: transition.stateAfter, stepIndex: 1, totalReward: transition.reward },
  {
    id: randomUUID(),
    runId,
    stepIndex: 1,
    actionId: action.id,
    stateBefore,
    stateAfter: transition.stateAfter,
    renderIntent: transition.renderIntent,
    judgment: { status: "pending" },
    reward: transition.reward,
    done: transition.done,
    outcome: transition.outcome,
    createdAt: now,
  },
);

console.log(JSON.stringify({
  scenario: scenario.id,
  initialActions: allowedActions(scenario, stateBefore).map((candidate) => candidate.id),
  transition: { action: action.id, stateAfter: transition.stateAfter },
  reachableStates: graph.states.length,
  maxAvailableActions,
  storedState: (await getRun(runId))?.state,
  storedSteps: (await listSteps(runId)).length,
  newInSfV2: {
    reachableStates: sfGraph.states.length,
    maxAvailableActions: sfMaxAvailableActions,
    bellman: { stateCount: sfSolution.stateCount, startValue: sfSolution.startValue, startAction: sfSolution.startActionId },
    initialActions: allowedActions(sfScenario, sfScenario.initial_state).map((candidate) => candidate.id),
  },
}, null, 2));
}

void main();
