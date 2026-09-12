import { NextResponse } from "next/server";

const REACTOR_API_URL = "https://api.reactor.inc";
const SESSION_ID = /^[A-Za-z0-9._:-]{8,128}$/;
const NO_STORE = { "Cache-Control": "no-store" };

// Closes a live session server-side. The browser sends this as a beacon when
// its page is closed, refreshed, or left: the SDK's own disconnect is
// asynchronous and cannot finish during unload, and one key gets one session,
// so without this the next take waits about a minute for the old one to die.
// Beacons cannot carry headers, so the studio password is not checked here;
// deleting needs the session's own random id, which only its page knows.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { sessionId?: unknown } | null;
  const sessionId = body?.sessionId;
  if (typeof sessionId !== "string" || !SESSION_ID.test(sessionId)) {
    return NextResponse.json({ error: "A session id is required." }, { status: 400, headers: NO_STORE });
  }
  const apiKey = process.env.REACTOR_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "REACTOR_API_KEY is not configured" }, { status: 500, headers: NO_STORE });

  let response: Response;
  try {
    response = await fetch(`${REACTOR_API_URL}/sessions/${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
      headers: { "Reactor-API-Key": apiKey },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (caught: unknown) {
    console.error("session release: Reactor unreachable", { sessionId, caught });
    return NextResponse.json({ error: "Reactor is unreachable; the session will time out on its own." }, { status: 503, headers: NO_STORE });
  }
  // 404 means the session already ended, which is the outcome wanted.
  const alreadyGone = response.status === 404;
  if (!response.ok && !alreadyGone) {
    console.error("session release refused", { sessionId, status: response.status, body: (await response.text().catch(() => "")).slice(0, 200) });
    return NextResponse.json({ error: "Reactor did not close the session." , status: response.status }, { status: 502, headers: NO_STORE });
  }
  console.info(JSON.stringify({ event: "session_released", sessionId, alreadyGone }));
  return NextResponse.json({ released: response.ok, alreadyGone }, { headers: NO_STORE });
}
