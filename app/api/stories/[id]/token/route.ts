import {
  assertOrigin,
  failure,
  HttpError,
  json,
  owned,
  providerKey,
  rateLimit,
  setting,
  sharedBudget,
} from "@/lib/cutline/server";
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    assertOrigin(request);
    const { owner } = await owned(request, (await ctx.params).id);
    const key = providerKey(request, "reactor");
    if (!key)
      throw new HttpError(
        422,
        "Add a Reactor API key in Connections to start live Orbis video.",
      );
    await rateLimit(owner, "reactor", 12);
    await sharedBudget(request, "reactor");
    const model =
      new URL(request.url).searchParams.get("model") ||
      setting("REACTOR_MODEL") ||
      "reactor/visko-orbis-dynamic";
    if (
      !["reactor/visko-orbis-dynamic", "reactor/visko-orbis-stable"].includes(
        model,
      )
    )
      throw new HttpError(
        503,
        "Use a documented Orbis Dynamic or Stable model identifier.",
      );
    const response = await fetch("https://api.reactor.inc/tokens", {
      method: "POST",
      headers: { "Reactor-API-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        expires_after: 1800,
        authorization_details: [
          {
            type: "session",
            resources: { models: { match: [model] } },
            constraints: { max_sessions: 1, max_session_duration_seconds: 900 },
          },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    }).catch(() => {
      throw new HttpError(
        502,
        "Reactor did not respond. Please try connecting again.",
      );
    });
    if (!response.ok)
      throw new HttpError(
        response.status === 401 || response.status === 403 ? 422 : 502,
        response.status === 401 || response.status === 403
          ? "Reactor rejected the API key or Orbis access. Check your hackathon credentials."
          : "Reactor could not start a session. Please check your credits and try again.",
      );
    const result = (await response.json()) as {
      jwt?: string;
      expires_at?: number;
    };
    if (!result.jwt)
      throw new HttpError(
        502,
        "Reactor returned an invalid session credential.",
      );
    return json({ jwt: result.jwt, expiresAt: result.expires_at, model });
  } catch (e) {
    return failure(e);
  }
}
