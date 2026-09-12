"use client";

import {
  ViskoOrbisStableProvider,
  useViskoOrbisStable,
  useViskoOrbisStableState,
  useViskoOrbisStableMessage,
  useViskoOrbisStableCommandError,
  useViskoOrbisStableGenerationStarted,
  useViskoOrbisStableGenerationComplete,
  useViskoOrbisStableChunkComplete,
  useViskoOrbisStableTrack,
  ViskoOrbisStableMainVideoView,
  FileRef,
  MODEL_NAME,
  type ViskoOrbisStableStateMessage,
  type ViskoOrbisStableMessage,
  type ViskoOrbisStableCommandErrorMessage,
  type ViskoOrbisStableChunkCompleteMessage,
} from "@reactor-models/visko-orbis-stable";

// The model this example drives on PROD — the launch target.
export { MODEL_NAME };
export { ViskoOrbisStableProvider };

// Per-type hooks the downstream components bind to (terse local aliases over
// the typed SDK ones). Subscribing to each message type once here means
// components get a stable import surface and this file stays the one place
// that knows the long typed names.
export const useViskoState = useViskoOrbisStableState;
export const useCommandError = useViskoOrbisStableCommandError;
export const useGenerationStarted = useViskoOrbisStableGenerationStarted;
export const useGenerationComplete = useViskoOrbisStableGenerationComplete;
export const useChunkComplete = useViskoOrbisStableChunkComplete;
export const useVideoTrack = () => useViskoOrbisStableTrack("main_video");
export const MainVideoView = ViskoOrbisStableMainVideoView;
// The per-component typed store access — returns the whole typed Model store.
// Aliased here so components import from one place.
export { useViskoOrbisStable };

// ─────────────────────────────────────────────────────────────────────────────
// Typed SDK, resolved from the published npm package `@reactor-models/visko-orbis-stable`.
//
// The typed client supplies the Provider and all the hooks this file re-wraps
// once so the app's components stay terse. There is no generic
// "message-of-type" helper in the package — per-type consumers use the
// typed per-type hooks directly; the one catch-all still used here is
// `useViskoOrbisStableMessage` (StatusBadge's `command_error` filter).
// ─────────────────────────────────────────────────────────────────────────────

export type StateMessage = ViskoOrbisStableStateMessage;
export type CommandErrorMessage = ViskoOrbisStableCommandErrorMessage;
export type ChunkCompleteMessage = ViskoOrbisStableChunkCompleteMessage;
export type AnyMsg = ViskoOrbisStableMessage;
export type { FileRef };

// Widened view of the typed store used by components. Fields match
// useViskoOrbisStable()'s output exactly; declared as an indexable type so
// existing `(st) => st` whole-object reads keep working.
export type S = Record<string, unknown> &
  ReturnType<typeof useViskoOrbisStable>;

// Model-side store type used by the send* helpers — the underlying object with
// the typed command methods on it (that same useViskoOrbisStable() shape).
export type ReactorStore = S;

// ── Token resolver — shared by every ViskoOrbisStableProvider in this app ──
// Hand this to the Provider's `jwtToken` prop. The SDK re-invokes it on every
// Reactor API hop (uploads, clip manifests, ICE refresh, SDP renegotiation);
// with a static string those hops 401 the moment the token ages out.
//
// Memoized in MODULE scope (not per-component-instance) until shortly before
// it expires, with the mint itself `no-store`. Reuse is REQUIRED: a
// session-scoped token only acts on sessions it created, so every hop of one
// session must present the SAME JWT. Two separate pages that each mount their
// own Provider (e.g. `/session` and `/internal/upload-test`) still share this
// one cache — each still opens its own distinct Reactor session, but no page
// forces an avoidable re-mint just because it's a different route.
const TOKEN_REFRESH_SKEW_MS = 60_000;
let cachedToken: { jwt: string; expiresAtMs: number } | null = null;
let inflightToken: Promise<string> | null = null;

export async function fetchReactorToken(): Promise<string> {
  if (
    cachedToken &&
    Date.now() < cachedToken.expiresAtMs - TOKEN_REFRESH_SKEW_MS
  ) {
    return cachedToken.jwt;
  }
  // Coalesce the parallel hops the SDK fires at connect time into one mint.
  if (inflightToken) return inflightToken;
  inflightToken = (async () => {
    try {
      const r = await fetch("/api/reactor/token", { cache: "no-store" });
      // `/live-world` is public but `/api/reactor/token` is gated by
      // proxy.ts, so a signed-out visitor's fetch follows the middleware's
      // redirect to the NextAuth sign-in HTML page: `r.ok` is true (the HTML
      // page loads fine), and `r.json()` would throw a raw
      // "SyntaxError: Unexpected token '<'". Detect that case up front and
      // fail with a message the UI already knows how to show instead.
      const contentType = r.headers.get("content-type") ?? "";
      if (r.redirected || !contentType.includes("application/json")) {
        throw new Error("Sign in to run a live world");
      }
      if (!r.ok) {
        const body = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Token fetch failed: ${r.status}`);
      }
      const { jwt, expires_at } = (await r.json()) as {
        jwt: string;
        expires_at: number;
      };
      cachedToken = { jwt, expiresAtMs: expires_at * 1000 };
      return jwt;
    } finally {
      inflightToken = null;
    }
  })();
  return inflightToken;
}

// ── Prompt display helpers ──────────────────────────────────────────────────
// The model may rewrite incoming prompts before generation, so the UI pins
// the user's own words at send-time (below) rather than echoing back
// whatever the snapshot reports.
let lastAcceptedPrompt: string | null = null;

/** True when a string carries the model's structured markup tags. */
export function isEnhancedPrompt(text: string): boolean {
  return /<(?:header|event)\b/i.test(text);
}

/** What to show/match on instead of raw `state.current_prompt`. See above. */
export function preferredPrompt(currentPrompt: string | null): string {
  return typeof currentPrompt === "string"
    ? (lastAcceptedPrompt ?? currentPrompt)
    : (lastAcceptedPrompt ?? "");
}

export function getLastAcceptedPrompt(): string | null {
  return lastAcceptedPrompt;
}

// ── Command senders — thin wrappers over the typed Model's own methods ─────
// The awaited call IS the ack on js-sdk 3.0.0 (correlated reply). Reply types
// come from the schema (e.g. setImage → ImageAccepted, setPrompt → PromptAccepted);
// start/pause/resume/reset resolve undefined because the schema declares no payload.
export const sendSetPrompt = async (s: ReactorStore, prompt: string) => {
  const reply = await s.setPrompt({ prompt });
  // A resolved await means the model took the prompt (3.0 correlated ack), so
  // this is the earliest point the text is known-good to pin for display.
  lastAcceptedPrompt = prompt;
  return reply;
};
export const sendSetImage = (s: ReactorStore, image: FileRef) =>
  s.setImage({ image });
export const sendSetSeed = (s: ReactorStore, seed: number) =>
  s.setSeed({ seed });
export const sendSetResolution = (s: ReactorStore, resolution: string) =>
  s.setResolution({ resolution });
export const sendSetAudioPrompt = (s: ReactorStore, prompt: string) =>
  s.setAudioPrompt({ prompt });
export const sendSetAudioEnabled = (s: ReactorStore, audio_enabled: boolean) =>
  s.setAudioEnabled({ audio_enabled });
export const sendStart = (s: ReactorStore) => s.start();
export const sendPause = (s: ReactorStore) => s.pause();
export const sendResume = (s: ReactorStore) => s.resume();
export const sendReset = (s: ReactorStore) => s.reset();
