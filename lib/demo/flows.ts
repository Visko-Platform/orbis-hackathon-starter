import type { Campaign } from "@/lib/studio-data";

// Fixed demo paths: an ordered set of beats a presenter walks through with
// preset bubbles. Free text is matched to a beat by its cues, so "show the
// back" jumps to that beat instead of becoming an open-ended direction.
/** Which watch is where after the beat; every prompt restates this so nothing swaps on its own. */
export type WatchLedger = { onWrist?: string; inHands?: string; onTray?: string };

export type DemoStep = {
  id: string;
  /** Bubble label. */
  chip: string;
  /** Longer label for receipts and activity. */
  title: string;
  /** The scene this beat transitions into (sent as a pivot direction, or as the opening brief for the first beat). */
  brief: string;
  /** Product state after this beat; the asset composited into the opening frame for the first beat. */
  assetId: string;
  /** Extra reference views (beyond the ledger's watches) whose appearance notes ride along in the prompt. */
  stateAssetIds: string[];
  watches: WatchLedger;
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
      watches: { onWrist: "rolex-submariner" },
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
      watches: { onWrist: "rolex-submariner" },
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
      watches: { onWrist: "rolex-datejust", onTray: "rolex-submariner" },
      action: "he opens the clasp of his Submariner and sets it on the green tray while the associate lifts the Datejust 41 and fastens it around his wrist, both watches staying solid steel objects the whole time",
      cues: ["try the datejust", "datejust", "switch", "swap", "another watch", "different watch", "change the watch", "new watch", "try on", "try another"],
      mode: "pivot",
      replayable: true,
    },
    {
      id: "inspect",
      chip: "Show the back",
      title: "Inspect the case back",
      brief:
        "The same man unfastens the Datejust 41 he is wearing, holds it by its Jubilee bracelet and turns the case over in one smooth rotation, then lifts it toward the camera as it pushes in. Seen from behind the watch is one solid stainless steel object: a flat, mirror-polished stainless steel screw-down case back with a finely fluted edge and no window, engraving or text; brushed steel lugs; the five-link Jubilee bracelet hanging open from the lugs; the folding clasp with its small raised Rolex crown. It is the same Datejust 41, not a different watch. His hands stay steady, the watch keeps its exact shape and proportions, the Submariner Date lies untouched on the tray, and the boutique's cream walls and green accents stay soft behind him.",
      assetId: "rolex-datejust-back",
      stateAssetIds: ["rolex-datejust-open"],
      watches: { inHands: "rolex-datejust-back", onTray: "rolex-submariner" },
      action: "his hands unfasten the Datejust 41 and turn it over in one smooth rotation, the solid stainless steel case flipping as a single rigid piece to show its flat mirror-polished back while the camera pushes in close",
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
      watches: { onWrist: "rolex-datejust", onTray: "rolex-submariner" },
      action: "he turns the Datejust 41 dial-up again, slides the Jubilee bracelet over his left wrist and closes the folding clasp with a click, the watch settling flat as one solid piece",
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
      watches: { onWrist: "rolex-datejust" },
      cues: ["walk out", "leave", "exit", "back to the street", "outside", "head out"],
      mode: "pivot",
      replayable: false,
    },
  ],
};

export const demoFlows: DemoFlow[] = [rolexWalk];

/** Every asset a beat's prompt must describe: the watches in the ledger, then extra views. */
export function stepAssetIds(step: DemoStep): string[] {
  const ledger = [step.watches.onWrist, step.watches.inHands, step.watches.onTray].filter((id): id is string => Boolean(id));
  return [...new Set([...ledger, ...step.stateAssetIds])];
}

/**
 * What carries over unchanged into this beat: the one cast member, which
 * watch is on the wrist, in his hands, or on the tray, and that brand marks
 * are static. Restated in both beats so nothing swaps or morphs on its own.
 */
export function demoContinuity(flow: DemoFlow, step: DemoStep, campaign: Campaign): string {
  const label = (id: string) => campaign.assets.find((asset) => asset.id === id)?.label ?? id;
  const { onWrist, inHands, onTray } = step.watches;
  return [
    `The same person throughout: ${flow.cast}. His face, build, hair and clothes never change, and he is the only person who wears or handles the watches.`,
    onWrist ? `On his left wrist: the ${label(onWrist)}, the same physical watch as in the previous shot; its model, dial, bezel and bracelet never change unless he visibly takes it off and picks up another.` : null,
    inHands ? `In his hands: the ${label(inHands)}, the watch he was just wearing, now held; it stays the same model.` : null,
    onTray ? `On the green leather tray, lying still and unchanged: the ${label(onTray)}.` : null,
    `${flow.marks}.`,
  ].filter(Boolean).join(" ");
}

/** The ledger as one scene-contract line, carried by free directions after the beat. */
export function ledgerLine(step: DemoStep, campaign: Campaign): string {
  const label = (id: string) => campaign.assets.find((asset) => asset.id === id)?.label ?? id;
  const { onWrist, inHands, onTray } = step.watches;
  return [
    onWrist ? `On his left wrist: the ${label(onWrist)}, the same watch until he visibly takes it off for another` : null,
    inHands ? `In his hands: the ${label(inHands)}, the watch he was wearing` : null,
    onTray ? `On the green leather tray, unchanged: the ${label(onTray)}` : null,
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
 * The bubbles to offer next: the beats that follow the current one, then
 * replayable earlier beats to keep three on screen. Before the path starts,
 * only the first beat is offered.
 */
export function demoChips(flow: DemoFlow, currentStepId: string | null, count = CHIP_COUNT): DemoStep[] {
  if (!currentStepId) return flow.steps.slice(0, 1);
  const index = stepIndex(flow, currentStepId);
  const upcoming = flow.steps.slice(index + 1, index + 1 + count);
  const replays = flow.steps.filter((step) => step.replayable && step.id !== currentStepId && !upcoming.includes(step));
  return [...upcoming, ...replays].slice(0, count);
}
