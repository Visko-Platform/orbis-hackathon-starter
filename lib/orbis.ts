export const ORBIS_MODEL_NAME = "reactor/visko-orbis-stable";

export const ORBIS_TRACKS = [
  { name: "main_video", kind: "video", direction: "recvonly" },
  { name: "main_audio", kind: "audio", direction: "recvonly" },
] as const;

export type OrbisMessage = {
  type?: string;
  command?: string;
  reason?: string;
  available_resolutions?: string[];
  width?: number;
  height?: number;
  has_image?: boolean;
  image_conditioned?: boolean;
  started?: boolean;
  paused?: boolean;
  session_chunk?: number;
  current_chunk?: number;
  resolution?: string;
  active_prompt?: string;
};

export function unwrapOrbisMessage(raw: unknown): OrbisMessage {
  if (!raw || typeof raw !== "object") return {};
  const envelope = raw as OrbisMessage & { data?: Record<string, unknown> };
  if (envelope.data && typeof envelope.data === "object" && !Array.isArray(envelope.data)) {
    return {
      ...envelope,
      ...envelope.data,
      type: typeof envelope.data.type === "string" ? envelope.data.type : envelope.type,
    } as OrbisMessage;
  }
  return raw as OrbisMessage;
}

const PASSWORD_KEY = "orbis-studio-password";

function storedPassword(): string {
  try { return sessionStorage.getItem(PASSWORD_KEY) ?? ""; } catch { return ""; }
}

function rememberPassword(value: string) {
  try { sessionStorage.setItem(PASSWORD_KEY, value); } catch { /* session storage is optional */ }
}

async function fetchToken(password: string) {
  const headers: Record<string, string> = password ? { "x-studio-password": password } : {};
  const response = await fetch("/api/token", { method: "POST", cache: "no-store", headers, signal: AbortSignal.timeout(25_000) });
  const payload = await response.json().catch(() => null) as unknown;
  const result = payload && typeof payload === "object" ? payload as { jwt?: string; error?: string; passwordRequired?: boolean } : {};
  return { response, result };
}

// When the server has a studio password, ask for it once per browser session and retry.
export async function requestReactorJwt() {
  let attempt: Awaited<ReturnType<typeof fetchToken>>;
  try {
    attempt = await fetchToken(storedPassword());
    if (attempt.response.status === 401 && attempt.result.passwordRequired) {
      const entered = window.prompt("This studio needs a password to start a live session.")?.trim() ?? "";
      if (!entered) throw new Error("A studio password is needed to start a live session.");
      attempt = await fetchToken(entered);
      if (attempt.response.ok) rememberPassword(entered);
    }
  } catch (caught) {
    if (caught instanceof Error && caught.message.includes("studio password")) throw caught;
    throw new Error("Could not reach the live session service. Check your connection and try again.");
  }
  const { response, result } = attempt;
  if (!response.ok || typeof result.jwt !== "string" || !result.jwt) {
    throw new Error(typeof result.error === "string" ? result.error : "Could not create a live session. Please try again.");
  }
  return result.jwt;
}
