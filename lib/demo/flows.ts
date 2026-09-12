// Fixed demo paths: an ordered set of beats a presenter walks through with
// preset bubbles. Free text is matched to a beat by its cues, so "show the
// back" jumps to that beat instead of becoming an open-ended direction.
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
  /** Reference views whose appearance notes ride along in the prompt. */
  stateAssetIds: string[];
  /** Lower-case phrases in free text that resolve to this beat; the longest match wins. */
  cues: string[];
  mode: "pivot" | "refine";
  /** Offered again as a bubble after the path has passed it. */
  replayable: boolean;
};

export type DemoFlow = { campaignId: string; name: string; steps: DemoStep[] };

export const CHIP_COUNT = 3;

const rolexWalk: DemoFlow = {
  campaignId: "rolex-perpetual-moment",
  name: "Rolex walk",
  steps: [
    {
      id: "street",
      chip: "Walk the street",
      title: "A walk through the city",
      brief:
        "A man in a tailored charcoal overcoat walks along a sunlit city street at golden hour, the camera tracking beside him at chest height. As his arm swings, his cuff rides up and the Rolex Submariner Date on his left wrist catches the light: black dial, black rotating bezel, steel Oyster bracelet.",
      assetId: "rolex-submariner",
      stateAssetIds: ["rolex-submariner"],
      cues: ["walk the street", "walking", "city street", "the street", "start walking"],
      mode: "pivot",
      replayable: false,
    },
    {
      id: "boutique",
      chip: "Enter the boutique",
      title: "Into the Rolex boutique",
      brief:
        "He turns toward a Rolex boutique with a dark green facade, a gold five-point crown emblem and the word ROLEX in gold capitals above the window, pushes the glass door open and steps inside: cream walls with dark green accents, illuminated glass display cases holding only Rolex watches, and the word ROLEX in green serif capitals under a gold crown on the back wall.",
      assetId: "rolex-submariner",
      stateAssetIds: ["rolex-submariner", "rolex-crown"],
      cues: ["enter the boutique", "boutique", "go inside", "walk in", "walk into", "into the store", "the store", "the shop", "go in"],
      mode: "pivot",
      replayable: true,
    },
    {
      id: "swap",
      chip: "Try the Datejust",
      title: "Switch to the Datejust 41",
      brief:
        "At the counter, under the word ROLEX and the gold crown on the wall, a sales associate in a dark suit presents a Rolex Datejust 41 on a green leather tray. He opens the clasp of his Submariner and sets it on the tray, and the associate fastens the Datejust 41 onto his wrist: slate dial, fluted white-gold bezel, Cyclops date window, five-link Jubilee bracelet.",
      assetId: "rolex-datejust",
      stateAssetIds: ["rolex-datejust"],
      cues: ["try the datejust", "datejust", "switch", "swap", "another watch", "different watch", "change the watch", "new watch", "try on", "try another"],
      mode: "pivot",
      replayable: true,
    },
    {
      id: "inspect",
      chip: "Show the back",
      title: "Inspect the case back",
      brief:
        "He slips the Datejust 41 off, turns it over in his hands and lifts it toward the camera, which moves in close: the plain polished steel case back with no engraving, the Jubilee bracelet unfolded flat around it, and the folding clasp with its small raised Rolex crown. The boutique's cream walls and green accents stay soft behind him.",
      assetId: "rolex-datejust-back",
      stateAssetIds: ["rolex-datejust-back", "rolex-datejust-open"],
      cues: ["show the back", "the back", "turn it over", "flip it", "case back", "caseback", "inspect", "look at it closely", "underside", "open the clasp", "open the strap"],
      mode: "pivot",
      replayable: true,
    },
    {
      id: "wear",
      chip: "Put it back on",
      title: "Back on the wrist",
      brief:
        "He closes the clasp around his left wrist; the Datejust 41 sits flat with the slate dial and fluted bezel facing up, his cuff settles over it, and he nods to the associate beneath the word ROLEX and the gold crown on the wall.",
      assetId: "rolex-datejust",
      stateAssetIds: ["rolex-datejust"],
      cues: ["put it back on", "put it on", "back on", "wear it", "fasten", "close the clasp", "on the wrist", "on his wrist"],
      mode: "pivot",
      replayable: true,
    },
    {
      id: "exit",
      chip: "Walk out",
      title: "Back to the street",
      brief:
        "He walks back through the glass door onto the street as evening falls, the camera following him past the dark green ROLEX storefront with its gold crown; the Datejust 41 on his wrist catches the last of the light.",
      assetId: "rolex-datejust",
      stateAssetIds: ["rolex-datejust"],
      cues: ["walk out", "leave", "exit", "back to the street", "outside", "head out"],
      mode: "pivot",
      replayable: false,
    },
  ],
};

export const demoFlows: DemoFlow[] = [rolexWalk];

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
