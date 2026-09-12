import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

const START_SYSTEM = `You are an ultra-precise GIS & spatial prompt engineer for Visko Orbis, a real-time 3D world model.
Your objective is to translate structured coordinate data and elevation values into a strict topographic prompt that describes a single sculpted MASS of uniform, neutral material. You do NOT deal with object or surface types of any kind.

STRICT RULES:
1. UNIFORM NEUTRAL MASS (NO MATERIAL TYPES):
   - Model the entire terrain as one continuous, solid mass of a single uniform, neutral matte material (an evenly coloured clay-grey / concrete-grey surface).
   - DO NOT assign or mention grass, trees, forest, water, rivers, lakes, soil, mud, sand, snow, rock type, vegetation, biomes, seasons, weather, or any object/material identity. Describe ONLY the sculpted form.

2. EXPLICIT COORDINATE & ELEVATION ANCHORING:
   - Reference explicit coordinate tags and height ratings (0-9) inside the description (e.g. "at peak coordinate [7,8] the mass rises to its maximum height 9/9", "the surface sinks toward 1/9 around sector [0..3, 0..3]").
   - Explicitly define the bounding box of the surveyed zone (e.g. "within the survey grid zone [X: 0..N, Y: 0..M]...").

3. STRICT FLAT SURROUNDINGS (ISOLATED MESH):
   - Every area outside the exact surveyed coordinates is completely flat, featureless horizontal ground of the SAME neutral material, with 0 elevation change.
   - The active coordinate zone flattens out immediately onto this level horizontal base.

4. CAMERA & DIRECTIONAL LIGHTING:
   - Position a steady oblique aerial camera at a fixed altitude and angle pointing toward the center of the coordinate grid.
   - Specify strong low-angle sunlight casting sharp directional shadows that trace the contour lines and exaggerate the exact height contrast between the 0 and 9 elevation values.

5. OUTPUT RULES:
   - Make the prompt long, technical, and hyper-detailed about the FORM only: ridges, slopes, hollows, gradients, curvature, and how the mass rises and falls across the grid.
   - DO NOT use markdown code blocks, quotes, or conversational preamble.
   - MUST end strictly with: photorealistic, cinematic, 16:9.`;

const EDIT_SYSTEM = `You steer a running Visko Orbis video world in real time.
The user gives an instruction to change the current scene. Rewrite it into an ultra-specific steering prompt.

Rules:
- STRICTLY PRESERVE all coordinate boundary rules, height levels (0-9), the surrounding flat plain, and the uniform neutral material of the mass, unless explicitly asked to modify the terrain form.
- Do NOT introduce grass, water, vegetation, or any material/object type.
- Translate user instructions into clear spatial modifications.
- Output ONLY the raw steering prompt text without markdown, quotes, or preamble.`;

function clean(text: string): string {
  return text
    .trim()
    .replace(/^```[a-z]*\n?/i, "")
    .replace(/```$/i, "")
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .trim();
}

// If the model was cut off at the token cap, keep up to the last full sentence.
function trimToLastSentence(text: string): string {
  const m = text.match(/^[\s\S]*[.!?]/);
  return (m ? m[0] : text).trim();
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 500 },
    );
  }

  let body: {
    mode?: "start" | "edit";
    summary?: unknown;
    instruction?: string;
    currentPrompt?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const mode = body.mode === "edit" ? "edit" : "start";

  let userContent: string;
  if (mode === "start") {
    if (!body.summary) {
      return NextResponse.json({ error: "Missing terrain summary" }, { status: 400 });
    }
    userContent =
      `Surveyed Terrain Grid & Coordinate Data (JSON):\n${JSON.stringify(body.summary, null, 2)}\n\n` +
      `Generate an ultra-detailed, coordinate-anchored Orbis prompt describing a single uniform neutral mass. ` +
      `Explicitly reference grid points, coordinates, and exact relative elevations (0-9). ` +
      `Enforce absolute flatness for all areas outside the surveyed coordinate boundary. ` +
      `Do not mention grass, water, vegetation, or any material type.`;
  } else {
    const instruction = (body.instruction || "").trim();
    if (!instruction) {
      return NextResponse.json({ error: "Missing instruction" }, { status: 400 });
    }
    userContent =
      (body.currentPrompt
        ? `Current coordinate scene prompt:\n${body.currentPrompt}\n\n`
        : "") + `User instruction: ${instruction}\n\nWrite the coordinate-aware steering prompt.`;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ text: userContent }],
      config: {
        systemInstruction: mode === "start" ? START_SYSTEM : EDIT_SYSTEM,
        // Low temperature keeps the model faithful to the input data.
        temperature: mode === "start" ? 0.1 : 0.2,
        maxOutputTokens: mode === "start" ? 4096 : 400,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const finishReason = response.candidates?.[0]?.finishReason;

    let raw = "";
    try {
      raw = response.text?.trim() || "";
    } catch {
      // Gemini can reject text access when it returns no usable candidate.
    }

    // If it hit the token cap but we still got usable text, salvage it.
    if (finishReason === "MAX_TOKENS") {
      if (raw) {
        return NextResponse.json(
          { prompt: trimToLastSentence(clean(raw)) },
          { headers: { "Cache-Control": "no-store, max-age=0" } },
        );
      }
      return NextResponse.json(
        { error: "Gemini reached its output limit before finishing" },
        { status: 502 },
      );
    }

    if (!raw) {
      return NextResponse.json(
        { error: "Gemini returned no completion" },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { prompt: clean(raw) },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}