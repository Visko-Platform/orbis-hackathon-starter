import { NextResponse } from "next/server";

import {
  NO_PROVIDER_ERROR,
  fileToImageInput,
  validateImage,
  visionProvider,
} from "@/lib/vision-provider";
import {
  FRAME_VERIFY_INSTRUCTION,
  FRAME_VERIFY_SCHEMA,
} from "@/lib/lab-prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

export type FrameVerdict = {
  achieved: boolean;
  observed: string;
  correction: string;
  severity: "ok" | "drift" | "broken";
};

/**
 * Closed-loop check. The director grabs a frame near the end of each phase and
 * asks whether the phase's success cue is actually visible; a negative verdict
 * turns into a corrective steering prompt on the next chunk boundary.
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

  const cue = formData.get("cue");
  const context = formData.get("context");
  if (typeof cue !== "string" || !cue.trim()) {
    return NextResponse.json({ error: "A success cue is required" }, { status: 400 });
  }

  try {
    const verdict = await provider.completeJson<FrameVerdict>({
      system: FRAME_VERIFY_INSTRUCTION,
      text: `Episode context:\n${typeof context === "string" ? context : ""}\n\nSuccess cue for the phase that is ending:\n${cue.trim()}`,
      image: await fileToImageInput(checked.image),
      schema: FRAME_VERIFY_SCHEMA as unknown as Record<string, unknown>,
      schemaName: "frame_verdict",
      temperature: 0,
      // Headroom for a reasoning model; "low" keeps the thinking budget at zero.
      maxTokens: 2_500,
      reasoningEffort: "low",
    });

    if (typeof verdict?.achieved !== "boolean") {
      return NextResponse.json(
        { error: "The verifier returned no verdict" },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        achieved: verdict.achieved,
        observed: verdict.observed?.trim() || "",
        correction: verdict.achieved ? "" : verdict.correction?.trim() || "",
        severity: verdict.severity || (verdict.achieved ? "ok" : "drift"),
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (caught) {
    console.error("Frame verification failed", caught);
    return NextResponse.json(
      {
        error: `Frame verification failed (${provider.name}): ${
          caught instanceof Error ? caught.message : String(caught)
        }`,
      },
      { status: 502 },
    );
  }
}
