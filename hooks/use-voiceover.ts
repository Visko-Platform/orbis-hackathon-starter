"use client";

import { useCallback, useEffect, useRef } from "react";

export type VoiceoverRole = "opening" | "pivot" | "refine";

type SpeakInput = {
  campaignId: string;
  /** What is on screen now, in words: an authored beat brief, or the viewer's own direction. */
  scene: string;
  role: VoiceoverRole;
  /** The viewer's or operator's exact words, when they differ from the scene. */
  direction?: string;
  contractLines?: string[];
  /** Called as soon as the lines are written, before the speech has been synthesized. */
  onLines?: (lines: string[]) => void;
};

// Writing the lines is a text call; speaking them is slower and gets its own limit.
const WRITE_MS = 45_000;
const SPEAK_MS = 60_000;

/**
 * Narrator lines for the scene on screen: written from the campaign's approved
 * knowledge, then spoken by Gemini TTS and played over the take. Two phases, so
 * the caption appears while the speech is still being synthesized.
 *
 * Shared by the studio and the viewer's ad break. Never throws into the caller
 * and never blocks a take — a scene must not fail because its narration did.
 */
export function useVoiceover(enabled: boolean) {
  const narrator = useRef<HTMLAudioElement | null>(null);
  const take = useRef(0);

  /** Silences the narrator and makes any request still in flight stale. */
  const stop = useCallback(() => {
    narrator.current?.pause();
    narrator.current = null;
    take.current += 1;
  }, []);

  // Leaving the page, or switching the narration off, stops it mid-line.
  useEffect(() => stop, [stop]);
  useEffect(() => { if (!enabled) stop(); }, [enabled, stop]);

  const speak = useCallback(async ({ campaignId, scene, role, direction, contractLines = [], onLines }: SpeakInput) => {
    if (!enabled) return;
    const ticket = ++take.current;
    const post = (payload: Record<string, unknown>, timeoutMs: number) =>
      fetch("/api/continuations/voiceover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, ...payload }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    try {
      // Phase one: the lines, so they can be shown right away.
      const written = await post({ scene, role, direction, contractLines }, WRITE_MS);
      const result = await written.json();
      if (!written.ok || ticket !== take.current) return;
      const lines: string[] = Array.isArray(result.lines) ? result.lines : [];
      if (!lines.length) return;
      onLines?.(lines);
      // Phase two: the speech for exactly those lines.
      const spoken = await post({ lines, scene, role }, SPEAK_MS);
      const speech = await spoken.json();
      if (!spoken.ok || ticket !== take.current || !speech.audio) return;
      narrator.current?.pause();
      const audio = new Audio(`data:${speech.mimeType || "audio/wav"};base64,${speech.audio}`);
      narrator.current = audio;
      audio.play().catch((caught) => console.warn("voiceover playback blocked", caught));
    } catch (caught) {
      console.warn("voiceover unavailable", caught);
    }
  }, [enabled]);

  return { speak, stop };
}
