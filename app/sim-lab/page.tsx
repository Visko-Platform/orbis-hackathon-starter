import type { Metadata } from "next";

import { enumerateReachableStates, solveBellman } from "@/lib/sim/engine";
import { loadScenario } from "@/lib/sim/scenarios";

import { SimLab, type ScenarioResponse } from "./sim-lab";

export const metadata: Metadata = {
  title: "MDP simulation lab",
  description: "Developer tools for YAML-authored deterministic simulations.",
};

export default function SimLabPage() {
  const scenario = loadScenario("new-in-sf-v2");
  const graph = enumerateReachableStates(scenario);
  const initialScenarioData: ScenarioResponse = {
    scenario,
    graph: {
      ...graph,
      states: graph.states.map(({ id, state }) => ({ id, state })),
    },
    solution: solveBellman(scenario),
  };

  return <SimLab initialScenarioData={initialScenarioData} />;
}
