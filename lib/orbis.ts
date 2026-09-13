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
};

export function unwrapOrbisMessage(raw: unknown): OrbisMessage {
  const envelope = raw as { type?: string; data?: Record<string, unknown> };
  if (envelope?.data && typeof envelope.data === "object") {
    return { ...envelope.data, type: envelope.type } as OrbisMessage;
  }
  return raw as OrbisMessage;
}

/**
 * Cached so the provider and the clip downloader use the same token: the clip
 * manifest GET is authorized with `Authorization: Bearer <jwt>`, and the chunks
 * it points at are presigned S3 URLs fetched unauthenticated.
 */
let cachedJwt: string | null = null;

export function currentReactorJwt() {
  return cachedJwt;
}

export function clearReactorJwt() {
  cachedJwt = null;
}

export async function requestReactorJwt() {
  const response = await fetch("/api/token", { method: "POST" });
  const result = (await response.json()) as { jwt?: string; error?: string };
  if (!response.ok || !result.jwt) {
    throw new Error(result.error || "Could not create a Reactor token");
  }
  cachedJwt = result.jwt;
  return result.jwt;
}
