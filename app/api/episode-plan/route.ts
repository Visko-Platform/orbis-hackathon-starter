import { NextResponse } from "next/server";

import {
  NO_PROVIDER_ERROR,
  fileToImageInput,
  validateImage,
  visionProvider,
} from "@/lib/vision-provider";
import {
  EPISODE_PLAN_INSTRUCTION,
  EPISODE_PLAN_SCHEMA,
} from "@/lib/lab-prompts";
import type { PhaseSeed } from "@/lib/episode";

export const runtime = "nodejs";
export const maxDuration = 120;

type PlanResponse = {
  anchor: string;
  instruction: string;
  phases: PhaseSeed[];
};

/**
 * Grounds the catalog phase skeleton in the actual start frame.
 *
 * The client already has a working template plan by the time it calls this, so
 * a failure here is not fatal — it keeps the template and says so.
 */
export async function POST(request: Request) {
  const provider = visionProvider();
  if (!provider) {
    return NextResponse.json({ error: NO_PROVIDER_ERROR }, { status: 500 });
  }

  const formData = await request.formData();
  const checked = validateImage(formData.get("image"));
  if ("error" in checked) {
    return NextResponse.json({ error: checked.error }, { status: checked.status });
  }

  const context = formData.get("context");
  const skeleton = formData.get("skeleton");
  if (typeof context !== "string" || typeof skeleton !== "string") {
    return NextResponse.json(
      { error: "Episode context and phase skeleton are required" },
      { status: 400 },
    );
  }

  try {
    const plan = await provider.completeJson<PlanResponse>({
      system: EPISODE_PLAN_INSTRUCTION,
      text: `Episode context:\n${context}\n\nDraft phase skeleton (JSON):\n${skeleton}`,
      image: await fileToImageInput(checked.image),
      schema: EPISODE_PLAN_SCHEMA as unknown as Record<string, unknown>,
      schemaName: "episode_plan",
      temperature: 0.35,
      maxTokens: 6_000,
    });

    const phases = (plan.phases ?? [])
      .filter((phase) => phase?.action?.trim() && phase?.cue?.trim())
      .slice(0, 12)
      .map((phase, index) => ({
        id: phase.id?.trim() || `phase_${index + 1}`,
        label: phase.label?.trim() || `Phase ${index + 1}`,
        weight: Number.isFinite(phase.weight) && phase.weight > 0 ? phase.weight : 1,
        action: phase.action.trim(),
        cue: phase.cue.trim(),
        recovery:
          phase.recovery?.trim() ||
          "the robot continues the same motion until the step lands",
      }));

    if (!phases.length || !plan.anchor?.trim()) {
      return NextResponse.json(
        { error: "The planner returned no usable phases" },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        anchor: plan.anchor.trim(),
        instruction: plan.instruction?.trim() || "",
        phases,
        provider: provider.name,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (caught) {
    console.error("Episode planning failed", caught);
    return NextResponse.json(
      {
        error: `Episode planning failed (${provider.name}): ${
          caught instanceof Error ? caught.message : String(caught)
        }`,
      },
      { status: 502 },
    );
  }
}
