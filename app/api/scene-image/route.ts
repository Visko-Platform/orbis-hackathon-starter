import { NextResponse } from "next/server";

import {
  NO_PROVIDER_ERROR,
  fileToImageInput,
  validateImage,
  visionProvider,
} from "@/lib/vision-provider";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Produces the episode's start frame.
 *
 * With no source image this is text-to-image from the composed scene prompt.
 * With one it is an edit, which covers both "drop my robot into this photo of
 * my real bench" and "re-roll this frame with a small change".
 */
export async function POST(request: Request) {
  const provider = visionProvider();
  if (!provider) {
    return NextResponse.json({ error: NO_PROVIDER_ERROR }, { status: 500 });
  }

  const formData = await request.formData();
  const prompt = formData.get("prompt");
  if (typeof prompt !== "string" || !prompt.trim()) {
    return NextResponse.json(
      { error: "A scene prompt is required" },
      { status: 400 },
    );
  }

  const source = formData.get("image");
  let sourceImage;
  if (source instanceof File && source.size > 0) {
    const checked = validateImage(source);
    if ("error" in checked) {
      return NextResponse.json({ error: checked.error }, { status: checked.status });
    }
    sourceImage = await fileToImageInput(checked.image);
  }

  try {
    const result = await provider.generateImage(prompt.trim(), sourceImage);
    return new Response(new Uint8Array(result.bytes), {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Content-Type": result.mimeType,
        "X-Lab-Model": `${provider.name}/${result.model}`,
      },
    });
  } catch (caught) {
    console.error("Start frame generation failed", caught);
    return NextResponse.json(
      {
        error: `Start frame generation failed (${provider.name}): ${
          caught instanceof Error ? caught.message : String(caught)
        }`,
      },
      { status: 502 },
    );
  }
}
