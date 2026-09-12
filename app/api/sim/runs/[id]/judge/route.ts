import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { NextResponse } from "next/server";

import { getStep, updateJudgment } from "@/lib/sim/db";
import { judgeRenderedStep } from "@/lib/sim/judge";

export const runtime = "nodejs";

const MAX_FRAME_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json() as { stepId?: string; frameDataUrl?: string };
    if (!body.stepId || !body.frameDataUrl) return NextResponse.json({ error: "stepId and frameDataUrl are required." }, { status: 400 });
    const step = await getStep(body.stepId);
    if (!step || step.runId !== id) return NextResponse.json({ error: "Step not found." }, { status: 404 });
    const match = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec(body.frameDataUrl);
    if (!match) return NextResponse.json({ error: "A PNG or JPEG frame data URL is required." }, { status: 400 });
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.byteLength > MAX_FRAME_BYTES) return NextResponse.json({ error: "Frame is too large." }, { status: 413 });
    const assetsDirectory = path.join(process.cwd(), "data", "simulation-assets", id);
    mkdirSync(assetsDirectory, { recursive: true });
    const extension = match[1] === "image/png" ? "png" : "jpg";
    const filename = `${step.stepIndex}-${step.id}.${extension}`;
    writeFileSync(path.join(assetsDirectory, filename), buffer);
    const framePath = `/api/sim/assets/${id}/${filename}`;
    const judgment = await judgeRenderedStep(step, { mimeType: match[1], data: match[2] });
    await updateJudgment(step.id, judgment, framePath);
    return NextResponse.json({ judgment, framePath });
  } catch (caught) {
    return NextResponse.json({ error: caught instanceof Error ? caught.message : "Could not judge frame." }, { status: 500 });
  }
}
