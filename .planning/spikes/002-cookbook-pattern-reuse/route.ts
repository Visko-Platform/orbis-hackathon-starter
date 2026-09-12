// Adapted from reactor-team/reactor-cookbook's examples/fast-h3-streaming-app
// (app/api/reactor/token/route.ts), retargeted to this project's confirmed
// visko-orbis-stable model slug and scoping shape (see STACK.md).
//
// Reused verbatim from the cookbook pattern:
//   - Server-only route, never touches the client with the raw API key
//   - authorization_details scoping to a single model + a session-count cap
//   - Cache-Control: no-store on the response so the JWT is never cached
//   - Returning ONLY { jwt, expiresAt } to the client, nothing else
//
// Adapted for this project (NOT copied verbatim):
//   - models.match is "reactor/visko-orbis-stable", not "FAST_H3_MODEL"
//   - max_sessions: 1, not 3 — this is a single-presenter, single-session
//     demo (cookbook's H3 example anticipates multiple concurrent testers)
//   - expires_after left at 3600s (1h), matching both the cookbook's choice
//     and STACK.md's confirmed server cap behavior (up to 6h max)

import { NextResponse } from "next/server";

const MODEL_NAME = "reactor/visko-orbis-stable";

export async function GET() {
  const res = await fetch("https://api.reactor.inc/tokens", {
    method: "POST",
    headers: {
      "Reactor-API-Key": process.env.REACTOR_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      expires_after: 60 * 60, // 1 hour
      authorization_details: [
        {
          type: "session",
          resources: { models: { match: [MODEL_NAME] } },
          constraints: { max_sessions: 1, max_duration_seconds: 60 * 60 },
        },
      ],
    }),
  });

  if (!res.ok) {
    // Cookbook pattern: surface the upstream error message rather than a
    // generic 500, but never leak the raw API key or full request body.
    const body = await res.json().catch(() => null);
    const message = body?.error?.message ?? "Failed to mint Reactor token";
    return NextResponse.json({ error: message }, { status: res.status || 502 });
  }

  const { jwt, expires_at } = await res.json();
  return NextResponse.json(
    { jwt, expiresAt: expires_at },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
