export const ORBIS_MODEL_NAME = "reactor/visko-orbis-stable";

export const ORBIS_TRACKS = [
  { name: "main_video", kind: "video", direction: "recvonly" },
  { name: "main_audio", kind: "audio", direction: "recvonly" },
] as const;

export const DOCUMENTED_RESOLUTIONS = ["1080p", "2k", "4k"];

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

export async function requestReactorJwt() {
  let response: Response;
  try {
    response = await fetch("/api/token", { method: "POST", cache: "no-store", signal: AbortSignal.timeout(25_000) });
  } catch {
    throw new Error("Could not reach the live session service. Check your connection and try again.");
  }
  const payload = await response.json().catch(() => null) as unknown;
  const result = payload && typeof payload === "object" ? payload as { jwt?: string; error?: string } : {};
  if (!response.ok || typeof result.jwt !== "string" || !result.jwt) {
    throw new Error(typeof result.error === "string" ? result.error : "Could not create a live session. Please try again.");
  }
  return result.jwt;
}
