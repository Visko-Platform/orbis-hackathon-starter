import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_VIDEO_BYTES = 80 * 1024 * 1024;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!/^[0-9a-f-]+$/i.test(id)) return NextResponse.json({ error: "Invalid run id." }, { status: 400 });
    const form = await request.formData();
    const recording = form.get("video");
    if (!(recording instanceof File) || !recording.type.startsWith("video/webm")) {
      return NextResponse.json({ error: "A WebM recording is required." }, { status: 400 });
    }
    const video = Buffer.from(await recording.arrayBuffer());
    if (video.byteLength > MAX_VIDEO_BYTES) return NextResponse.json({ error: "Recording exceeds the 80 MB local limit." }, { status: 413 });

    const assetsDirectory = path.join(process.cwd(), "data", "simulation-assets", id);
    mkdirSync(assetsDirectory, { recursive: true });
    const safeLabel = (String(form.get("label") ?? "trajectory")).replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "trajectory";
    const stem = `${safeLabel}-${Date.now()}`;
    const webmPath = path.join(assetsDirectory, `${stem}.webm`);
    const mp4Filename = `${stem}.mp4`;
    const mp4Path = path.join(assetsDirectory, mp4Filename);
    writeFileSync(webmPath, video);
    const conversion = spawnSync("ffmpeg", ["-y", "-i", webmPath, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4Path], { encoding: "utf8" });
    if (conversion.status !== 0) {
      return NextResponse.json({ error: `MP4 conversion failed: ${conversion.stderr.slice(-500)}` }, { status: 500 });
    }
    return NextResponse.json({ videoPath: `/api/sim/assets/${id}/${mp4Filename}` });
  } catch (caught) {
    return NextResponse.json({ error: caught instanceof Error ? caught.message : "Could not save recording." }, { status: 500 });
  }
}
