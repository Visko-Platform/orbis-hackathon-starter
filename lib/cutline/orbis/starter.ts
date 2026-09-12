/**
 * Adapted from Visko-Platform/orbis-hackathon-starter, lib/orbis.ts
 * commit 6de7ad733e90967f25979afcfca55b73a71f064a.
 * Original project has no declared license. See docs/STARTER.md.
 */
export type OrbisMessage = {
  type?: string;
  command?: string;
  reason?: string;
  available_resolutions?: string[];
  resolution?: string;
  live_resolution_switching?: boolean;
  width?: number;
  height?: number;
  has_image?: boolean;
  image_conditioned?: boolean;
  started?: boolean;
  paused?: boolean;
  frames?: number;
  frames_emitted?: number;
  delivered?: string;
};

export function unwrapOrbisMessage(raw: unknown): OrbisMessage {
  const envelope = raw as { type?: string; data?: Record<string, unknown> };
  if (envelope?.data && typeof envelope.data === "object") {
    return { ...envelope.data, type: envelope.type } as OrbisMessage;
  }
  return (raw ?? {}) as OrbisMessage;
}
