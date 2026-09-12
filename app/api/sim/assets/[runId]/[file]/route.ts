import { readFileSync } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ runId: string; file: string }> }) {
  const { runId, file } = await context.params;
  if (!/^[0-9a-f-]+$/i.test(runId) || !/^[a-z0-9-]+\.(png|jpg|mp4)$/i.test(file)) return new Response("Not found", { status: 404 });
  try {
    const content = readFileSync(path.join(process.cwd(), "data", "simulation-assets", runId, file));
    const contentType = file.endsWith(".png") ? "image/png" : file.endsWith(".mp4") ? "video/mp4" : "image/jpeg";
    return new Response(content, { headers: { "Content-Type": contentType, "Cache-Control": "no-store" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
