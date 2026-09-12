export type Team = "crimson" | "azure";
export type HitPoints = Record<Team, number>;
export type Moves = Record<Team, string>;
export type Action = "attack" | "guard" | "hold";

export const STARTING_HP = 100;

export function classifyAction(move: string): Action {
  if (!move.trim() || /^(hold position|no move)$/i.test(move.trim())) return "hold";
  return /\b(guard(?:s|ing)?|defend(?:s|ing)?|defense|shield(?:s|ing)?|block(?:s|ing)?|barrier|protect(?:s|ing)?|dodge(?:s|ing)?)\b/i.test(move)
    ? "guard"
    : "attack";
}

export function resolveHitPoints(current: HitPoints, moves: Moves) {
  const actions = {
    crimson: classifyAction(moves.crimson),
    azure: classifyAction(moves.azure),
  };
  const power = (action: Action) => action === "attack" ? 18 : action === "guard" ? 12 : 0;
  const reduction = (action: Action) => action === "guard" ? 7 : 0;
  const damageToCrimson = Math.max(0, power(actions.azure) - reduction(actions.crimson));
  const damageToAzure = Math.max(0, power(actions.crimson) - reduction(actions.azure));
  const hp = {
    crimson: Math.max(0, current.crimson - damageToCrimson),
    azure: Math.max(0, current.azure - damageToAzure),
  };
  return { actions, hp, damage: { crimson: damageToCrimson, azure: damageToAzure } };
}

export function defeatPrompt(hp: HitPoints) {
  if (hp.crimson > 0 && hp.azure > 0) return "Both sides remain in the battle.";
  if (hp.crimson === 0 && hp.azure === 0) {
    return "This is a double knockout. The last standing fighters on BOTH sides collapse and remain down. The battle is over; no one attacks again.";
  }
  const loser = hp.crimson === 0 ? "left-side Crimson fighter" : "right-side Azure fighter";
  const winner = hp.crimson === 0 ? "right-side Azure fighter" : "left-side Crimson fighter";
  return `The ${loser} has been defeated and falls to the ground, visibly unable to continue. The ${winner} remains standing victorious. The defeated fighter does not rise or attack again. The battle is over.`;
}
