import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { storeCollectedEpisodes } from "../lib/sim/db";
import { allowedActions, applyAction } from "../lib/sim/engine";
import { loadScenario } from "../lib/sim/scenarios";
import type { ActionDefinition, RunRecord, ScenarioDefinition, SimState, StepRecord } from "../lib/sim/types";

type PolicyName = "random" | "balanced";
type CollectedEpisode = { run: RunRecord; steps: StepRecord[]; policy: PolicyName };

function parseCount() {
  const value = Number(process.argv[2] ?? 200);
  if (!Number.isInteger(value) || value < 1 || value > 10_000) throw new Error("Pass an episode count between 1 and 10,000.");
  return value;
}

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 2 ** 32;
  };
}

function chooseAction(scenario: ScenarioDefinition, state: SimState, legal: ActionDefinition[], policy: PolicyName, random: () => number) {
  if (policy === "balanced") {
    const desired = state.location === "room" && state.time === "day"
      ? (Number(state.connections) < 2 && Number(state.money) >= 2 ? "take_waymo_to_park" : "go_to_office")
      : state.location === "office" && state.time === "day"
        ? "work_at_office"
        : state.location === "park" && state.time === "day"
          ? "meet_people_at_park"
          : state.location === "office"
              ? "go_home_from_office"
              : state.location === "park"
                ? "go_home_from_park"
                : "rest_at_room";
    const selected = legal.find((action) => action.id === desired);
    if (selected) return selected;
  }
  return legal[Math.floor(random() * legal.length)];
}

async function collectEpisode(scenario: ScenarioDefinition, seed: number, policy: PolicyName): Promise<CollectedEpisode> {
  const now = new Date().toISOString();
  let run: RunRecord = {
    id: randomUUID(),
    scenarioId: scenario.id,
    scenarioVersion: scenario.version,
    status: "active",
    seed,
    state: scenario.initial_state,
    stepIndex: 0,
    totalReward: 0,
    createdAt: now,
    updatedAt: now,
  };
  const random = seededRandom(seed);
  const steps: StepRecord[] = [];

  while (run.status === "active") {
    const legal = allowedActions(scenario, run.state);
    if (!legal.length) throw new Error(`No legal actions for active run ${run.id}.`);
    const action = chooseAction(scenario, run.state, legal, policy, random);
    const result = applyAction(scenario, run.state, action.id, run.stepIndex + 1);
    const createdAt = new Date().toISOString();
    run = {
      ...run,
      state: result.stateAfter,
      stepIndex: run.stepIndex + 1,
      totalReward: run.totalReward + result.reward,
      status: result.done ? "completed" : "active",
      outcome: result.outcome,
      updatedAt: createdAt,
    };
    const step: StepRecord = {
      id: randomUUID(),
      runId: run.id,
      stepIndex: run.stepIndex,
      actionId: action.id,
      stateBefore: result.stateBefore,
      stateAfter: result.stateAfter,
      renderIntent: result.renderIntent,
      judgment: { status: "skipped", summary: "Symbolic collection run; no renderer frame requested." },
      reward: result.reward,
      done: result.done,
      outcome: result.outcome,
      createdAt,
    };
    steps.push(step);
  }
  return { run, steps, policy };
}

async function main() {
  const count = parseCount();
  const scenario = loadScenario("new-in-sf-v2");
  const episodes: CollectedEpisode[] = [];
  for (let index = 0; index < count; index += 1) {
    episodes.push(await collectEpisode(scenario, 10_000 + index, index % 2 === 0 ? "balanced" : "random"));
  }
  await storeCollectedEpisodes(episodes);
  const successes = episodes.filter((episode) => episode.run.outcome === "success").length;
  const exportDirectory = path.join(process.cwd(), "data", "episode-exports");
  mkdirSync(exportDirectory, { recursive: true });
  const exportPath = path.join(exportDirectory, `${scenario.id}-${Date.now()}.jsonl`);
  writeFileSync(exportPath, episodes.map((episode) => JSON.stringify(episode)).join("\n") + "\n");
  console.log(JSON.stringify({
    scenario: scenario.id,
    episodes: count,
    policies: { balanced: Math.ceil(count / 2), random: Math.floor(count / 2) },
    successes,
    successRate: Number((successes / count).toFixed(3)),
    exportPath,
  }, null, 2));
}

void main();
