import { cookieToken, newToken, json, setting } from "@/lib/cutline/server";
export async function GET(request: Request) {
  const existing = cookieToken(request);
  const token = existing || newToken();
  return json(
    {
      reactorConfigured: !!setting("REACTOR_API_KEY"),
      nebiusConfigured: !!setting("NEBIUS_API_KEY"),
      accessCodeRequired: !!setting("LIVE_ACCESS_CODE"),
      reactorModel: setting("REACTOR_MODEL") || "reactor/visko-orbis-dynamic",
      nebiusModel: setting("NEBIUS_MODEL") || "openai/gpt-oss-120b",
    },
    200,
    existing
      ? {}
      : {
          "Set-Cookie": `cutline_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
        },
  );
}
