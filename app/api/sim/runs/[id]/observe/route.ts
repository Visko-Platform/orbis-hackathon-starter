import { NextResponse } from "next/server";

import { getRun } from "@/lib/sim/db";
import { allowedActions } from "@/lib/sim/engine";
import { observeAndDecide } from "@/lib/sim/observer";
import { loadScenario } from "@/lib/sim/scenarios";

export const runtime = "nodejs";

const MAX_FRAME_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json() as { frameDataUrl?: string };
    const match = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec(body.frameDataUrl ?? "");
    if (!match) return NextResponse.json({ error: "A PNG or JPEG frame data URL is required." }, { status: 400 });
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.byteLength > MAX_FRAME_BYTES) return NextResponse.json({ error: "Frame is too large." }, { status: 413 });
    const run = await getRun(id);
    if (!run) return NextResponse.json({ error: "Run not found." }, { status: 404 });
    const scenario = loadScenario(run.scenarioId);
    const actions = allowedActions(scenario, run.state);
    if (!actions.length) return NextResponse.json({ error: "No legal actions are available." }, { status: 409 });
    const decision = await observeAndDecide({
      scenario,
      trueState: run.state,
      actions,
      image: { mimeType: match[1], data: match[2] },
    });
    return NextResponse.json({ decision, allowedActions: actions });
  } catch (caught) {
    return NextResponse.json({ error: caught instanceof Error ? caught.message : "Could not observe the live frame." }, { status: 500 });
  }
}
