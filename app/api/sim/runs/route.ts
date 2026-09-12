import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { createRun } from "@/lib/sim/db";
import { buildInitialRenderIntent } from "@/lib/sim/engine";
import { loadScenario } from "@/lib/sim/scenarios";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { scenarioId?: string; seed?: number };
    const scenario = loadScenario(body.scenarioId || "tiny-life");
    const now = new Date().toISOString();
    const run = await createRun({
      id: randomUUID(),
      scenarioId: scenario.id,
      scenarioVersion: scenario.version,
      status: "active",
      seed: Number.isInteger(body.seed) ? body.seed! : Math.floor(Math.random() * 2 ** 31),
      state: scenario.initial_state,
      stepIndex: 0,
      totalReward: 0,
      createdAt: now,
      updatedAt: now,
    });
    return NextResponse.json({ run, initialRenderIntent: buildInitialRenderIntent(scenario, run.state, run.seed), scenario });
  } catch (caught) {
    return NextResponse.json({ error: caught instanceof Error ? caught.message : "Could not create run." }, { status: 400 });
  }
}
