import { NextResponse } from "next/server";

import { getRun, listSteps } from "@/lib/sim/db";
import { allowedActions } from "@/lib/sim/engine";
import { loadScenario } from "@/lib/sim/scenarios";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const run = await getRun(id);
    if (!run) return NextResponse.json({ error: "Run not found." }, { status: 404 });
    const scenario = loadScenario(run.scenarioId);
    return NextResponse.json({ run, scenario, allowedActions: allowedActions(scenario, run.state), steps: await listSteps(id) });
  } catch (caught) {
    return NextResponse.json({ error: caught instanceof Error ? caught.message : "Could not load run." }, { status: 500 });
  }
}
