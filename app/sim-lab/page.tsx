import type { Metadata } from "next";

import { enumerateReachableStates } from "@/lib/sim/engine";
import { loadScenario } from "@/lib/sim/scenarios";

import { SimLab, type ScenarioResponse } from "./sim-lab";

export const metadata: Metadata = {
  title: "MDP simulation lab",
  description: "Developer tools for YAML-authored deterministic simulations.",
};

export default function SimLabPage() {
  const scenario = loadScenario("tiny-life");
  const graph = enumerateReachableStates(scenario);
  const initialScenarioData: ScenarioResponse = {
    scenario,
    graph: {
      ...graph,
      states: graph.states.map(({ id, state }) => ({ id, state })),
    },
  };

  return <SimLab initialScenarioData={initialScenarioData} />;
}
