// Adapted from reactor-team/reactor-cookbook's examples/fast-h3-streaming-app
// (components/h3-studio.tsx: propDirection() + fitPrompt()), retargeted to
// Orbis-Stable's single-call setPrompt steering model.
//
// Reused (the underlying idea, not the code — H3's version is queue-aware
// and doesn't compile as-is against a different model's SDK):
//   - Compose a persistent "base scene" instruction with a swappable
//     "directional" instruction into ONE string, rather than replacing the
//     whole prompt from scratch on every steer. This keeps subject/setting
//     continuity (the barrio, the sari-sari store, the era) stable while
//     only the "what's happening right now" clause changes.
//   - Cap the composed string to a safe character budget and truncate the
//     directional clause (not the base scene) if it overflows, so
//     continuity never gets silently dropped to make room for a new beat.
//
// Does NOT transfer from H3Studio, and why:
//   - H3's clip_id / continue_from_clip_id queue (FastH3ClipInfo,
//     ensureQueue()) has no Orbis-Stable equivalent. Orbis-Stable has no
//     discrete "clips" to queue — it's one continuous chunked stream, and
//     setPrompt() re-steers the *same* running session at the next ~1.4s
//     chunk boundary (per ARCHITECTURE.md). Do not build a queue for this.
//   - H3's queuedProps/textCues drag-and-drop state (multiple simultaneous
//     persistent props layered in) doesn't map cleanly onto Orbis-Stable's
//     single setPrompt string — this project only needs ONE base scene at
//     a time (the seed photo's scene), so that machinery is unnecessary
//     complexity here.
//   - H3's storyHistoryRef + OpenAI story-planning integration is out of
//     scope entirely — this project's narration is presenter-authored
//     (lib/beats.ts / narration script), not model-generated.
//
// Open gap (flag for Phase 1 build): FastH3's 800-char prompt cap is
// confirmed from h3-contract.ts; Orbis-Stable's own max prompt length is
// NOT confirmed anywhere in this project's research. MAX_PROMPT_LENGTH
// below is a conservative placeholder — verify against the actual
// @reactor-models/visko-orbis-stable TypeScript types once installed.

const MAX_PROMPT_LENGTH = 480; // placeholder — re-verify at build time

export interface SteeringState {
  /** The stable scene description anchored to the seed photo. Set once. */
  baseScene: string;
  /** The current "what's happening" beat. Changes on every steer. */
  directional: string;
}

/**
 * Compose the base scene + current directional beat into one prompt string
 * for setPrompt({ prompt }). Mirrors H3Studio's propDirection() intent:
 * persistent context first, then what's new, fitted to a length budget.
 */
export function composePrompt(state: SteeringState): string {
  const composed = `${state.baseScene}. ${state.directional}`.trim();
  return fitPrompt(composed, state.baseScene);
}

/**
 * Truncate to MAX_PROMPT_LENGTH, preserving baseScene in full and cutting
 * from the tail of the directional clause — mirrors H3Studio's fitPrompt(),
 * which never sacrifices continuity to make room for new direction.
 */
function fitPrompt(composed: string, baseScene: string): string {
  if (composed.length <= MAX_PROMPT_LENGTH) return composed;
  const budget = MAX_PROMPT_LENGTH - baseScene.length - 2; // ". " separator
  if (budget <= 0) return baseScene.slice(0, MAX_PROMPT_LENGTH);
  const truncatedDirectional = composed
    .slice(baseScene.length + 2)
    .slice(0, budget);
  return `${baseScene}. ${truncatedDirectional}`.trim();
}

/**
 * Advance to the next beat in an ordered script (lib/beats.ts) and return
 * the composed prompt ready for session.setPrompt({ prompt }).
 * The caller owns calling session.setPrompt — this module only composes.
 */
export function nextBeat(
  state: SteeringState,
  beats: string[],
  currentIndex: number
): { prompt: string; nextIndex: number } {
  const nextIndex = Math.min(currentIndex + 1, beats.length - 1);
  const prompt = composePrompt({ ...state, directional: beats[nextIndex] });
  return { prompt, nextIndex };
}
