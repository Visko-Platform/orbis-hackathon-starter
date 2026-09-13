import { NextResponse } from "next/server";

// Best-effort: terminate a Reactor session by id so a reload/close never
// leaves a zombie holding the account's single concurrent slot.
export async function POST(request: Request) {
  const apiKey = process.env.REACTOR_API_KEY;
  if (!apiKey) return NextResponse.json({ ok: false, error: "no key" }, { status: 500 });
  let id = "";
  try {
    const body = await request.json();
    id = String(body?.id || "");
  } catch {
    /* sendBeacon may send text */
  }
  if (!id) {
    try {
      id = String((await request.text()) || "").trim();
    } catch {}
  }
  if (!/^[0-9a-f-]{20,}$/i.test(id)) return NextResponse.json({ ok: false, error: "bad id" }, { status: 400 });

  const attempts: Record<string, number> = {};
  for (const [label, init] of [
    ["delete-key", { method: "DELETE", headers: { "Reactor-API-Key": apiKey } }],
    ["post-terminate-key", { method: "POST", headers: { "Reactor-API-Key": apiKey } }],
  ] as const) {
    try {
      const url =
        label === "post-terminate-key"
          ? `https://api.reactor.inc/sessions/${id}/terminate`
          : `https://api.reactor.inc/sessions/${id}`;
      const r = await fetch(url, { ...init, cache: "no-store" });
      attempts[label] = r.status;
      if (r.ok) break;
    } catch {
      attempts[label] = 0;
    }
  }
  console.log("[session-kill]", id, attempts);
  return NextResponse.json({ ok: Object.values(attempts).some((s) => s >= 200 && s < 300), attempts });
}
