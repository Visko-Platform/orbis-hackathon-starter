import { readFileSync } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ runId: string; file: string }> }) {
  const { runId, file } = await context.params;
  if (!/^[0-9a-f-]+$/i.test(runId) || !/^[0-9a-f-]+\.(png|jpg)$/i.test(file)) return new Response("Not found", { status: 404 });
  try {
    const content = readFileSync(path.join(process.cwd(), "data", "simulation-assets", runId, file));
    return new Response(content, { headers: { "Content-Type": file.endsWith(".png") ? "image/png" : "image/jpeg", "Cache-Control": "no-store" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
