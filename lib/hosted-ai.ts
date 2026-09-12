// People running the studio on their own machine rarely have a Gemini key, and
// a key copied from .env.example is a placeholder. Without a working key, every
// Gemini-backed route forwards its request to the hosted site, which holds the
// key on Vercel. Those hosted routes are already public, so this exposes
// nothing new and the key never leaves the server.
//
// ADTRACTIVE_HOSTED_AI:
//   unset   forward only when there is no real GEMINI_API_KEY (default)
//   off     never forward; Gemini features degrade locally as before
//   always  forward even with a key (for keys that fail, e.g. unsupported regions)
//   <url>   forward to another deployment instead of the default
export const DEFAULT_HOSTED_AI_URL = "https://orbis-ad.vercel.app";
export const FORWARDED_HEADER = "x-adtractive-forwarded";
const FORWARD_TIMEOUT_MS = 90_000;

type Env = Record<string, string | undefined>;

export function isRealKey(value: string | undefined): boolean {
  const key = value?.trim() ?? "";
  return key.length > 0 && !/^replace_with|^your_|^<|changeme/i.test(key);
}

// The deployment to forward to, or null to handle the request locally.
export function hostedAiBase(env: Env = process.env): string | null {
  if (env.VERCEL) return null;
  const setting = (env.ADTRACTIVE_HOSTED_AI ?? "").trim();
  const mode = setting.toLowerCase();
  if (mode === "off") return null;
  if (mode !== "always" && isRealKey(env.GEMINI_API_KEY)) return null;
  const base = mode === "always" || !setting ? DEFAULT_HOSTED_AI_URL : setting;
  return /^https?:\/\/[^\s]+$/.test(base) ? base.replace(/\/+$/, "") : null;
}

// Forwards the request when hostedAiBase says so. Returns null to let the route
// run locally: forwarding is off, the request was already forwarded, or the
// hosted site is unreachable (the local fallbacks then apply).
export async function forwardToHostedAi(request: Request): Promise<Response | null> {
  const base = hostedAiBase();
  if (!base || request.headers.get(FORWARDED_HEADER)) return null;
  const url = new URL(request.url);
  const headers = new Headers({ [FORWARDED_HEADER]: "1" });
  const type = request.headers.get("content-type");
  if (type) headers.set("content-type", type);
  try {
    const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.clone().arrayBuffer();
    const response = await fetch(`${base}${url.pathname}${url.search}`, {
      method: request.method, headers, body, cache: "no-store", signal: AbortSignal.timeout(FORWARD_TIMEOUT_MS),
    });
    return new Response(await response.arrayBuffer(), {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json", "cache-control": "no-store", [FORWARDED_HEADER]: base },
    });
  } catch (caught: unknown) {
    console.warn(`hosted AI unreachable at ${base}; using the local fallback`, caught);
    return null;
  }
}
