import type { Campaign } from "@/lib/studio-data";

// Fixed demo paths: an ordered set of beats a presenter walks through with
// preset bubbles. Free text is matched to a beat by its cues, so "show the
// back" jumps to that beat instead of becoming an open-ended direction.
export type Place = "street" | "boutique";
/** Where the story is and which watch (by product id) is where after the beat; every prompt restates the watches so nothing swaps on its own. */
export type BeatState = { place: Place; onWrist?: string; inHands?: string; onTray?: string };

export type DemoStep = {
  id: string;
  /** Bubble label. */
  chip: string;
  /** Longer label for receipts and activity. */
  title: string;
  /** The scene this beat transitions into (sent as a pivot direction, or as the opening brief for the first beat). */
  brief: string;
  /** The product view this beat shows (a face or state of a watch in the ledger); composited into the opening frame for the first beat. */
  assetId: string;
  /** Extra reference views whose appearance notes ride along in the prompt. */
  stateAssetIds: string[];
  state: BeatState;
  /** What must already be true for this beat to follow; bubbles and the route only allow beats that fit. */
  requires: Partial<BeatState>;
  /** For beats that handle the product: the physical motion for the action beat. */
  action?: string;
  /** Lower-case phrases in free text that resolve to this beat; the longest match wins. */
  cues: string[];
  mode: "pivot" | "refine";
  /** Offered again as a bubble after the path has passed it. */
  replayable: boolean;
};

export type DemoFlow = {
  campaignId: string;
  name: string;
  /** The one person in the story, restated in every beat so the model keeps the same face and clothes. */
  cast: string;
  /** How brand marks behave: fixed printed graphics, never animated. */
  marks: string;
  steps: DemoStep[];
};

export const CHIP_COUNT = 3;

const ROLEX_CAST =
  "a Chinese man in his early thirties, short black hair, clean-shaven, medium build, in a tailored charcoal overcoat over a white shirt, dark trousers and black leather shoes, with no other jewellery";

const rolexWalk: DemoFlow = {
  campaignId: "rolex-perpetual-moment",
  name: "Rolex walk",
  cast: ROLEX_CAST,
  marks:
    "The gold five-point crown and the word ROLEX are fixed printed graphics: exact shape, spelling and position, always sharp, never animated, morphed, multiplied or recoloured",
  steps: [
    {
      id: "street",
      chip: "Walk the street",
      title: "A walk through the city",
      brief:
        `${ROLEX_CAST.charAt(0).toUpperCase()}${ROLEX_CAST.slice(1)}, walks along a sunlit city street at golden hour, the camera tracking beside him at chest height. As his arm swings, his cuff rides up and the Rolex Submariner Date on his left wrist catches the light: black dial, black rotating bezel, steel Oyster bracelet. He is the only character the camera follows and stays the same person throughout.`,
      assetId: "rolex-submariner",
      stateAssetIds: [],
      state: { place: "street", onWrist: "rolex-submariner" },
      requires: {},
      cues: ["walk the street", "walking", "city street", "the street", "start walking"],
      mode: "pivot",
      replayable: false,
    },
    {
      id: "boutique",
      chip: "Enter the boutique",
      title: "Into the Rolex boutique",
      brief:
        "The same man turns toward a Rolex boutique with a dark green facade and the word ROLEX in gold capitals above the door, pushes the glass door open and steps inside: cream walls with dark green accents, illuminated glass display cases holding only Rolex watches, and on the back wall a single gold five-point crown above the word ROLEX in green serif capitals. His Submariner Date stays on his wrist, unchanged.",
      assetId: "rolex-submariner",
      stateAssetIds: [],
      state: { place: "boutique", onWrist: "rolex-submariner" },
      requires: { place: "street", onWrist: "rolex-submariner" },
      action: "he turns from the pavement toward the boutique, pushes its glass door open and steps inside, the camera following him through the doorway into the cream-and-green interior",
      cues: ["enter the boutique", "boutique", "go inside", "walk in", "walk into", "into the store", "the store", "the shop", "go in"],
      mode: "pivot",
      replayable: true,
    },
    {
      id: "swap",
      chip: "Try the Datejust",
      title: "Switch to the Datejust 41",
      brief:
        "At the counter, under the crown and the word ROLEX on the wall, a sales associate in a dark suit presents one Rolex Datejust 41 on a green leather tray: slate dial, fluted white-gold bezel, Cyclops date window, five-link Jubilee bracelet. The same man opens the clasp of his Submariner Date (black dial, black bezel, Oyster bracelet), sets it on the tray where it stays, and the associate fastens the Datejust 41 onto his left wrist. Two distinct watches, each keeping its own model the whole time; nothing else on the tray.",
      assetId: "rolex-datejust",
      stateAssetIds: [],
      state: { place: "boutique", onWrist: "rolex-datejust", onTray: "rolex-submariner" },
      requires: { place: "boutique", onWrist: "rolex-submariner" },
      action: "he opens the clasp of his Submariner Date and lays it on the green leather tray, his left wrist bare for a moment; then the associate lifts the Datejust 41 from the tray and fastens it around that same wrist, each watch staying one solid piece and keeping its own dial and bracelet",
      cues: ["try the datejust", "datejust", "switch", "swap", "another watch", "different watch", "change the watch", "new watch", "try on", "try another"],
      mode: "pivot",
      replayable: true,
    },
    {
      id: "inspect",
      chip: "Show the back",
      title: "Inspect the case back",
      brief:
        "The same man unfastens the Datejust 41 he is wearing, holds it by its Jubilee bracelet and turns the case over in one smooth rotation, then lifts it toward the camera as it pushes in. As it turns, the slate dial with its fluted white-gold bezel and Cyclops date window rotates away from the camera and the back comes round to face it: a flat, mirror-polished stainless steel screw-down case back with a finely fluted edge and no window, engraving or text; brushed steel lugs; the five-link Jubilee bracelet hanging open from the lugs; the folding clasp with its small raised Rolex crown. The watch has its dial on one face and this plain steel back on the other; only the back faces the camera now, and the dial face is never plain steel. It is the same Datejust 41, not a different watch. His hands stay steady, the watch keeps its exact shape and proportions, the Submariner Date lies untouched on the tray, and the boutique's cream walls and green accents stay soft behind him.",
      assetId: "rolex-datejust-back",
      stateAssetIds: [],
      state: { place: "boutique", inHands: "rolex-datejust", onTray: "rolex-submariner" },
      requires: { place: "boutique", onWrist: "rolex-datejust" },
      action: "his hands unfasten the Datejust 41 and turn it over in one smooth rotation, the slate dial rotating away from the camera as the flat mirror-polished steel back comes round to face it, the case flipping as a single rigid piece while the camera pushes in close",
      cues: ["show the back", "the back", "turn it over", "flip it", "case back", "caseback", "inspect", "look at it closely", "underside", "open the clasp", "open the strap"],
      mode: "pivot",
      replayable: true,
    },
    {
      id: "wear",
      chip: "Put it back on",
      title: "Back on the wrist",
      brief:
        "The same man turns the Datejust 41 dial-up again, slides its Jubilee bracelet over his left wrist and closes the clasp; the Datejust 41 sits flat with the slate dial and fluted bezel facing up, his cuff settles over it, and he nods to the associate beneath the crown and the word ROLEX on the wall. It is the same Datejust 41 he just inspected; the Submariner Date still lies on the tray.",
      assetId: "rolex-datejust",
      stateAssetIds: [],
      state: { place: "boutique", onWrist: "rolex-datejust", onTray: "rolex-submariner" },
      requires: { place: "boutique", inHands: "rolex-datejust" },
      action: "he turns the Datejust 41 over so its slate dial faces up again, slides the Jubilee bracelet over his left wrist and closes the folding clasp with a click, the watch settling flat as one solid piece",
      cues: ["put it back on", "put it on", "back on", "wear it", "fasten", "close the clasp", "on the wrist", "on his wrist"],
      mode: "pivot",
      replayable: true,
    },
    {
      id: "exit",
      chip: "Walk out",
      title: "Back to the street",
      brief:
        "The same man walks back through the glass door onto the street as evening falls, the camera following him past the dark green storefront with the word ROLEX in gold above the door; the Datejust 41 on his left wrist, the same watch he put on inside, catches the last of the light.",
      assetId: "rolex-datejust",
      stateAssetIds: [],
      state: { place: "street", onWrist: "rolex-datejust" },
      requires: { place: "boutique", onWrist: "rolex-datejust" },
      action: "he turns from the counter, walks back through the glass door onto the evening street, and the camera follows him out past the dark green storefront",
      cues: ["walk out", "leave", "exit", "back to the street", "outside", "head out"],
      mode: "pivot",
      replayable: false,
    },
  ],
};

export const demoFlows: DemoFlow[] = [rolexWalk];

/** Every asset a beat's prompt must describe: the view it shows, the watches in the ledger (so a hidden face is still described), then extra views. */
export function stepAssetIds(step: DemoStep): string[] {
  const ledger = [step.state.onWrist, step.state.inHands, step.state.onTray].filter((id): id is string => Boolean(id));
  return [...new Set([step.assetId, ...ledger, ...step.stateAssetIds])];
}

/** Whether a beat can follow the state the take is in; the opening beat never follows a running take. */
export function canFollow(from: DemoStep | null, step: DemoStep): boolean {
  if (!from) return true;
  if (stepIndex(demoFlows.find((flow) => flow.steps.includes(step)) ?? demoFlows[0], step.id) === 0) return false;
  return (Object.keys(step.requires) as (keyof BeatState)[]).every((key) => step.requires[key] === from.state[key]);
}

/** Why a beat cannot run now, in the presenter's terms: "needs the Datejust 41 on his wrist, inside the boutique". */
export function followReason(step: DemoStep, campaign: Campaign): string {
  const label = (id: string) => watchIdentity(campaign, id);
  const parts = [
    step.requires.onWrist ? `the ${label(step.requires.onWrist)} on his wrist` : null,
    step.requires.inHands ? `the ${label(step.requires.inHands)} in his hands` : null,
    step.requires.place ? (step.requires.place === "boutique" ? "inside the boutique" : "out on the street") : null,
  ].filter(Boolean);
  return parts.length ? `“${step.chip}” needs ${parts.join(", ")}.` : `“${step.chip}” only starts the walk.`;
}

function assetOf(campaign: Campaign, id: string) {
  return campaign.assets.find((asset) => asset.id === id);
}

/** The watch a ledger entry names, by its product's label even when the entry is a view of it ("Datejust 41", not "Datejust 41, case back"). */
export function watchIdentity(campaign: Campaign, id: string): string {
  const asset = assetOf(campaign, id);
  const parent = asset?.variantOf ? assetOf(campaign, asset.variantOf) : undefined;
  return parent?.label ?? asset?.label ?? id;
}

/** The beat the take was on before this one: the one the client names, else the previous beat in order. */
export function previousStep(flow: DemoFlow, step: DemoStep, fromStepId?: string | null): DemoStep | null {
  const named = fromStepId ? flow.steps.find((item) => item.id === fromStepId) : undefined;
  if (named) return named;
  const index = stepIndex(flow, step.id);
  return index > 0 ? flow.steps[index - 1] : null;
}

/**
 * What carries into this beat: the one cast member, which watch is on the
 * wrist, in his hands, or on the tray, and that brand marks are static. The
 * ledger is told as a change from the previous beat, so a watch that has just
 * been swapped is never called "the same watch as before".
 */
export function demoContinuity(flow: DemoFlow, step: DemoStep, campaign: Campaign, previous: DemoStep | null = null): string {
  const identity = (id: string) => watchIdentity(campaign, id);
  const shown = assetOf(campaign, step.assetId);
  const view = (id: string) => (shown?.variantOf === id ? shown.view : undefined);
  const same = (a?: string, b?: string) => Boolean(a && b && identity(a) === identity(b));
  const { onWrist, inHands, onTray } = step.state;
  const before: Partial<BeatState> = previous?.state ?? {};
  const rule = "its model, dial, bezel and bracelet never change unless he visibly takes it off and picks up another";
  const wrist = !onWrist ? null
    : same(before.onWrist, onWrist) ? `On his left wrist: the ${identity(onWrist)}, the same physical watch as in the previous shot; ${rule}.`
    : same(before.inHands, onWrist) ? `On his left wrist by the end of this shot: the ${identity(onWrist)} he was holding, now fastened on again; it is the same watch, and ${rule}.`
    : before.onWrist ? `On his left wrist by the end of this shot: the ${identity(onWrist)}, the watch just fastened on; the ${identity(before.onWrist)} he wore until now comes off first, so his wrist never carries two watches.`
    : `On his left wrist: the ${identity(onWrist)}; ${rule}.`;
  const hands = inHands ? `In his hands: the ${identity(inHands)} he was just wearing, taken off and held${view(inHands) ? `, ${view(inHands)}` : ""}; it stays the same watch and the same model.` : null;
  const tray = onTray
    ? same(before.onTray, onTray) ? `On the green leather tray, lying still and unchanged: the ${identity(onTray)}.` : `Now lying on the green leather tray: the ${identity(onTray)}, just set down there.`
    : before.onTray ? `The ${identity(before.onTray)} stays behind on the tray in the boutique.` : null;
  return [
    `The same person throughout: ${flow.cast}. His face, build, hair and clothes never change, and he is the only person who wears or handles the watches.`,
    wrist, hands, tray,
    `${flow.marks}.`,
  ].filter(Boolean).join(" ");
}

/** The ledger as one scene-contract line, carried by free directions after the beat. */
export function ledgerLine(step: DemoStep, campaign: Campaign): string {
  const identity = (id: string) => watchIdentity(campaign, id);
  const shown = assetOf(campaign, step.assetId);
  const view = (id: string) => (shown?.variantOf === id ? shown.view : undefined);
  const { onWrist, inHands, onTray } = step.state;
  return [
    onWrist ? `On his left wrist: the ${identity(onWrist)}, the same watch until he visibly takes it off for another` : null,
    inHands ? `In his hands: the ${identity(inHands)} he was wearing${view(inHands) ? `, ${view(inHands)}` : ""}` : null,
    onTray ? `On the green leather tray, unchanged: the ${identity(onTray)}` : null,
  ].filter(Boolean).join("; ");
}

export function demoFlowFor(campaignId: string): DemoFlow | null {
  return demoFlows.find((flow) => flow.campaignId === campaignId) ?? null;
}

export function stepIndex(flow: DemoFlow, stepId: string): number {
  return flow.steps.findIndex((step) => step.id === stepId);
}

/** The beat a free-text direction asks for, or null when it is an open direction. */
export function resolveDemoStep(flow: DemoFlow, text: string): DemoStep | null {
  const haystack = ` ${text.toLowerCase().replace(/[^\p{L}\p{N}\s']/gu, " ").replace(/\s+/g, " ").trim()} `;
  let best: { step: DemoStep; length: number } | null = null;
  for (const step of flow.steps) {
    for (const cue of step.cues) {
      if (haystack.includes(` ${cue} `) && (!best || cue.length > best.length)) best = { step, length: cue.length };
    }
  }
  return best?.step ?? null;
}

/**
 * The bubbles to offer next: the beats after the current one, then replayable
 * earlier ones, keeping only those the current state allows, so nothing is
 * offered that the story cannot show (no "show the back" of a watch he is not
 * wearing). Before the path starts, only the first beat is offered.
 */
export function demoChips(flow: DemoFlow, currentStepId: string | null, count = CHIP_COUNT): DemoStep[] {
  if (!currentStepId) return flow.steps.slice(0, 1);
  const index = stepIndex(flow, currentStepId);
  const current = flow.steps[index] ?? null;
  const upcoming = flow.steps.slice(index + 1).filter((step) => canFollow(current, step));
  const replays = flow.steps.filter((step) => step.replayable && step.id !== currentStepId && !upcoming.includes(step) && canFollow(current, step));
  return [...upcoming, ...replays].slice(0, count);
}
