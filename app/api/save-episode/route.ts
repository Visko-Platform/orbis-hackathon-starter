import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Writes a finished episode to a local dataset directory.
 *
 * Browser downloads are a poor fit for batch generation: Chrome throttles or
 * blocks repeated saves, and the files land in Downloads rather than next to
 * whatever consumes them. This writes straight into `EPISODE_DIR` instead.
 *
 * Development only, and confined to that directory — it exists to collect
 * generated data on the machine running the lab, not to accept uploads.
 */
const EPISODE_DIR = process.env.EPISODE_DIR || "episodes";
const MAX_BYTES = 256 * 1024 * 1024;

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const name = formData.get("name");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is too large" }, { status: 413 });
  }
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "A filename is required" }, { status: 400 });
  }

  // Basename only: never let a submitted name escape the episode directory.
  const safeName = path.basename(name.trim()).replace(/[^A-Za-z0-9._-]/g, "_");
  if (!safeName || safeName.startsWith(".")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const root = path.resolve(process.cwd(), EPISODE_DIR);
  const target = path.join(root, safeName);
  if (path.dirname(target) !== root) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  try {
    await mkdir(root, { recursive: true });
    await writeFile(target, Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ path: target, bytes: file.size });
  } catch (caught) {
    console.error("Saving the episode failed", caught);
    return NextResponse.json(
      {
        error: `Could not write ${safeName}: ${
          caught instanceof Error ? caught.message : String(caught)
        }`,
      },
      { status: 500 },
    );
  }
}
