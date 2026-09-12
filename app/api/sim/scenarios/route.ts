import { NextResponse } from "next/server";

import { listScenarios } from "@/lib/sim/scenarios";

export const runtime = "nodejs";

export async function GET() {
  try {
    const scenarios = listScenarios().map(({ actions, initial_state, state, ...scenario }) => ({
      ...scenario,
      actionCount: actions.length,
      initialState: initial_state,
      stateSchema: state,
    }));
    return NextResponse.json({ scenarios });
  } catch (caught) {
    return NextResponse.json({ error: caught instanceof Error ? caught.message : "Could not load scenarios." }, { status: 500 });
  }
}
