import { NextResponse } from "next/server";

import { enumerateReachableStates, solveBellman } from "@/lib/sim/engine";
import { loadScenario } from "@/lib/sim/scenarios";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const scenario = loadScenario(id);
    return NextResponse.json({ scenario, graph: enumerateReachableStates(scenario), solution: scenario.episode ? solveBellman(scenario) : undefined });
  } catch (caught) {
    return NextResponse.json({ error: caught instanceof Error ? caught.message : "Scenario not found." }, { status: 404 });
  }
}
