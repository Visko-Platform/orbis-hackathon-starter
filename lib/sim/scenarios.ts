import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { parse } from "yaml";

import type { ScenarioDefinition } from "./types";

const SCENARIO_DIRECTORY = path.join(process.cwd(), "scenarios");

function assertScenario(value: unknown): asserts value is ScenarioDefinition {
  if (!value || typeof value !== "object") throw new Error("Scenario YAML must be an object.");
  const scenario = value as Partial<ScenarioDefinition>;
  if (!scenario.id || !scenario.title || !scenario.version || !scenario.state || !scenario.initial_state || !scenario.actions) {
    throw new Error("Scenario YAML is missing a required top-level field.");
  }
  if (!scenario.runtime?.chunks_per_action || !Array.isArray(scenario.actions)) {
    throw new Error("Scenario runtime or actions are invalid.");
  }
}

export function listScenarios() {
  return readdirSync(SCENARIO_DIRECTORY)
    .filter((name) => name.endsWith(".yaml"))
    .map((name) => loadScenario(name.replace(/\.yaml$/, "")));
}

export function loadScenario(id: string): ScenarioDefinition {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error("Invalid scenario id.");
  const document = parse(readFileSync(path.join(SCENARIO_DIRECTORY, `${id}.yaml`), "utf8"));
  assertScenario(document);
  validateScenario(document);
  return document;
}

function validateScenario(scenario: ScenarioDefinition) {
  for (const [field, definition] of Object.entries(scenario.state)) {
    const value = scenario.initial_state[field];
    if (value === undefined) throw new Error(`Initial state is missing ${field}.`);
    if (definition.type === "enum" && !definition.values.includes(value)) {
      throw new Error(`Initial value for ${field} is not in its enum.`);
    }
    if (definition.type === "integer" && (typeof value !== "number" || value < definition.min || value > definition.max)) {
      throw new Error(`Initial value for ${field} is outside its integer range.`);
    }
  }
  const ids = new Set<string>();
  for (const action of scenario.actions) {
    if (ids.has(action.id)) throw new Error(`Duplicate action id: ${action.id}.`);
    ids.add(action.id);
    for (const field of Object.keys(action.available_when ?? {})) {
      if (!scenario.state[field]) throw new Error(`Action ${action.id} checks unknown field ${field}.`);
    }
    for (const field of Object.keys(action.transition.set ?? {})) {
      if (!scenario.state[field]) throw new Error(`Action ${action.id} sets unknown field ${field}.`);
    }
    for (const field of Object.keys(action.transition.add ?? {})) {
      if (!scenario.state[field]) throw new Error(`Action ${action.id} adds unknown field ${field}.`);
    }
  }
}
