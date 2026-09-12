import { NextResponse } from "next/server";

const REACTOR_API_URL = "https://api.reactor.inc";
const MODEL_NAME = "reactor/visko-orbis-stable";

export async function POST() {
  const apiKey = process.env.REACTOR_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "REACTOR_API_KEY is not configured" },
      { status: 500 },
    );
  }

  let response: Response;
  try {
    response = await fetch(`${REACTOR_API_URL}/tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Reactor-API-Key": apiKey,
      },
      body: JSON.stringify({
        expires_after: 3600,
        authorization_details: [
          {
            type: "session",
            resources: { models: { match: [MODEL_NAME] } },
            constraints: { max_sessions: 1 },
          },
        ],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return NextResponse.json(
      { error: "Reactor is taking too long to respond or is unreachable. Please retry shortly." },
      { status: 503 },
    );
  }

  if (!response.ok) {
    const message = response.status === 401 || response.status === 403
      ? "The Reactor credential was not accepted. Check the server API key."
      : response.status === 429
        ? "Reactor is at its request limit. Wait a moment and retry."
        : "Reactor could not create a live session. Please retry shortly.";
    return NextResponse.json(
      { error: message },
      { status: response.status === 429 ? 429 : 502 },
    );
  }

  const payload = await response.json().catch(() => null) as unknown;
  const result = payload && typeof payload === "object" ? payload as { jwt?: string } : {};
  if (typeof result.jwt !== "string" || !result.jwt) {
    return NextResponse.json({ error: "Reactor returned no JWT" }, { status: 502 });
  }

  return NextResponse.json(
    { jwt: result.jwt },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
