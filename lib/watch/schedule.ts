// When the ad break happens relative to playback, as pure functions so the
// player and its tests agree.

/** Seconds into the video at which the ad takes over by default. */
export const DEFAULT_AD_AT_S = 8;
/** How long before the break the live session starts warming up, so the ad pops instantly. */
export const PREWARM_S = 6;
/** How long the viewer watches the ad before "Skip ad" is offered. */
export const SKIP_AFTER_S = 5;

export type AdPhase = "idle" | "prewarm" | "show" | "done";

/** The ad's phase for a playback position; once done it stays done. */
export function adPhaseAt(currentTime: number, adAt: number, previous: AdPhase): AdPhase {
  if (previous === "done" || previous === "show") return previous;
  if (currentTime >= adAt) return "show";
  if (currentTime >= adAt - PREWARM_S) return "prewarm";
  return "idle";
}

/** Reads `?adAt=` and `?live=` from a query string; bad values fall back. */
export function readWatchOptions(search: string): { adAt: number; live: boolean } {
  const params = new URLSearchParams(search);
  const adAt = Number(params.get("adAt"));
  return {
    adAt: Number.isFinite(adAt) && adAt >= 0 && params.get("adAt") !== null ? adAt : DEFAULT_AD_AT_S,
    live: params.get("live") !== "0",
  };
}

/** m:ss or h:mm:ss, the way a video player shows time. */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  const mmss = `${hours ? String(minutes).padStart(2, "0") : minutes}:${String(rest).padStart(2, "0")}`;
  return hours ? `${hours}:${mmss}` : mmss;
}
