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

  try {
  const response = await fetch(`${REACTOR_API_URL}/tokens`, {
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

  const text = await response.text();
  if (!response.ok) {
    return NextResponse.json(
      { error: response.status === 429 ? "Reactor is busy. Try connecting again shortly." : `Reactor token request failed (HTTP ${response.status}).` },
      { status: response.status },
    );
  }

  let result: { jwt?: string };
  try {
    result = JSON.parse(text) as { jwt?: string };
  } catch {
    return NextResponse.json({ error: "Reactor returned an empty or invalid token response. Try again." }, { status: 502 });
  }
  if (!result.jwt) {
    return NextResponse.json({ error: "Reactor returned no JWT" }, { status: 502 });
  }

  return NextResponse.json(
    { jwt: result.jwt },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
  } catch {
    return NextResponse.json({ error: "Could not reach Reactor's token service. Try again shortly." }, { status: 502 });
  }
}
