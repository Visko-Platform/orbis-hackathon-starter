import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { appendStep, getRun } from "@/lib/sim/db";
import { applyAction, allowedActions } from "@/lib/sim/engine";
import { loadScenario } from "@/lib/sim/scenarios";
import type { StepRecord } from "@/lib/sim/types";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json() as { actionId?: string };
    if (!body.actionId) return NextResponse.json({ error: "actionId is required." }, { status: 400 });
    const run = await getRun(id);
    if (!run) return NextResponse.json({ error: "Run not found." }, { status: 404 });
    const scenario = loadScenario(run.scenarioId);
    const result = applyAction(scenario, run.state, body.actionId);
    const now = new Date().toISOString();
    const nextRun = { ...run, state: result.stateAfter, stepIndex: run.stepIndex + 1, updatedAt: now };
    const step: StepRecord = {
      id: randomUUID(),
      runId: run.id,
      stepIndex: nextRun.stepIndex,
      actionId: result.action.id,
      stateBefore: result.stateBefore,
      stateAfter: result.stateAfter,
      renderIntent: result.renderIntent,
      judgment: { status: "pending" },
      createdAt: now,
    };
    await appendStep(nextRun, step);
    return NextResponse.json({ run: nextRun, step, allowedActions: allowedActions(scenario, nextRun.state), cadence: scenario.runtime.chunks_per_action });
  } catch (caught) {
    return NextResponse.json({ error: caught instanceof Error ? caught.message : "Could not apply action." }, { status: 400 });
  }
}
