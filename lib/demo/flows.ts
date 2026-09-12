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
  /** The director's brief for this beat, rendered from `scene` in a fixed order; sent as the direction (or the opening brief for the first beat). */
  brief: string;
  scene: BeatScene;
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

/**
 * A beat's scene as a director would brief a crew. It is rendered into the
 * prompt in a fixed order (scene, camera, what happens step by step, light,
 * product, brand marks, never) so the bubble's short label injects a complete,
 * unambiguous description behind it.
 */
export type BeatScene = {
  /** Where we are and what it looks like: architecture, materials, colours. */
  setting: string;
  /** Framing and movement of the one continuous take. */
  camera: string;
  /** What happens, in order. */
  sequence: string[];
  /** Light and atmosphere. */
  light: string;
  /** The watch or watches: which, where, what catches the light. */
  product: string;
  /** Where the crown and the word ROLEX appear, exactly. */
  marks: string;
  /** What must not happen. */
  never: string[];
};

export function renderBrief(scene: BeatScene): string {
  return [
    `Scene: ${scene.setting}`,
    `Camera: ${scene.camera}`,
    `What happens, in order: ${scene.sequence.map((line, index) => `(${index + 1}) ${line}`).join(" ")}`,
    `Light: ${scene.light}`,
    `Product: ${scene.product}`,
    `Brand marks: ${scene.marks}`,
    `Never: ${scene.never.join("; ")}.`,
  ].join(" ");
}

function beat(step: Omit<DemoStep, "brief">): DemoStep {
  return { ...step, brief: renderBrief(step.scene) };
}

const rolexWalk: DemoFlow = {
  campaignId: "rolex-perpetual-moment",
  name: "Rolex walk",
  cast: ROLEX_CAST,
  marks:
    "The gold five-point crown and the word ROLEX are fixed printed graphics: exact shape, spelling and position, always sharp, never animated, morphed, multiplied or recoloured",
  steps: [
    beat({
      id: "street",
      chip: "Walk the street",
      title: "A walk through the city",
      scene: {
        setting: "A sunlit European city street at golden hour: pale limestone facades with tall windows and wrought-iron balconies, a cafe awning, a row of parked bicycles, a few passers-by softly out of focus far behind him.",
        camera: "One continuous steadicam take tracking beside him at chest height, slightly ahead of his stride so his left arm and wrist stay in frame, with a gentle push-in toward the wrist as it swings forward.",
        sequence: [
          `A Chinese man in his early thirties, ${ROLEX_CAST.replace(/^a Chinese man in his early thirties, /, "")}, walks along the pavement at an easy, confident pace; he is the only person the camera follows and stays the same person throughout.`,
          "As his left arm swings forward, the cuff of his overcoat rides up and the Rolex Submariner Date on his left wrist catches the low sun: black dial with luminous markers, black rotating bezel, steel Oyster bracelet.",
          "He keeps walking and the camera stays with him; nothing else on the street draws focus.",
        ],
        light: "Low, warm golden-hour sun from behind the camera's left shoulder, long soft shadows on the pavement, warm rim light on his hair and coat, a bright glint travelling across the watch's polished bezel and case.",
        product: "Exactly one watch: the Submariner Date on his left wrist, dial facing up, crown side outward, worn under the cuff so it shows only as the arm swings.",
        marks: "The only Rolex mark in the scene is on the watch itself: the word ROLEX in small printed capitals beneath the gold crown at twelve on the dial.",
        never: ["a second watch or any other jewellery", "other brands, shop signs or readable text", "cuts, title cards or an ad-break look", "the watch changing model, colour or size"],
      },
      assetId: "rolex-submariner",
      stateAssetIds: [],
      state: { place: "street", onWrist: "rolex-submariner" },
      requires: {},
      cues: ["walk the street", "walking", "city street", "the street", "start walking"],
      mode: "pivot",
      replayable: false,
    }),
    beat({
      id: "boutique",
      chip: "Enter the boutique",
      title: "Into the Rolex boutique",
      scene: {
        setting: "A Rolex boutique on the same street: a facade of dark Rolex-green panels with a tall glass double door framed in brushed brass, one window display on a cream backdrop with a single watch on a green stand, and above the door a gold five-point crown centred over the word ROLEX in gold serif capitals. Inside: cream walls with dark green accents, warm wood floors, low glass display cabinets with brass trim holding only Rolex watches on cream cushions, a long counter of dark green lacquer, and on the back wall a single gold five-point crown above the word ROLEX in green serif capitals.",
        camera: "One continuous take, no cut: the camera follows him from the pavement through the doorway into the interior, tracking behind and slightly to his left so the facade and then the back wall are seen over his shoulder.",
        sequence: [
          "The same man slows, turns to his right toward the boutique and approaches the glass door.",
          "He pushes the door open with his right hand and steps inside; the camera follows him through the doorway as the street light gives way to the interior.",
          "He walks toward the counter, where a sales associate in a dark suit stands beneath the crown and the word ROLEX on the back wall.",
          "His Submariner Date stays on his left wrist, unchanged, glinting under the cabinet lights.",
        ],
        light: "From warm exterior sunlight to a soft, even interior: warm downlights over the cabinets, cream walls glowing gently, soft reflections in the glass, no harsh shadows.",
        product: "Still exactly one watch on him: the Submariner Date on his left wrist, dial up. The watches inside the cabinets are Rolex, small in frame and never in focus.",
        marks: "The crown and the word ROLEX appear exactly twice: in gold above the door outside, and as one gold crown above ROLEX in green serif capitals on the back wall inside; both are flat, printed, correctly spelled and never move.",
        never: ["any other brand name or logo", "a second crown or a second ROLEX on the same wall", "the man's face, coat or watch changing", "a cut or fade between the street and the interior"],
      },
      assetId: "rolex-submariner",
      stateAssetIds: [],
      state: { place: "boutique", onWrist: "rolex-submariner" },
      requires: { place: "street", onWrist: "rolex-submariner" },
      action: "he slows, turns to his right toward the dark green boutique facade and pushes its glass door open, the camera following him through the doorway from the sunlit street into the cream-and-green interior",
      cues: ["enter the boutique", "boutique", "go inside", "walk in", "walk into", "into the store", "the store", "the shop", "go in"],
      mode: "pivot",
      replayable: true,
    }),
    beat({
      id: "swap",
      chip: "Try the Datejust",
      title: "Switch to the Datejust 41",
      scene: {
        setting: "The counter inside the boutique: a dark green lacquer top, the associate in a dark suit opposite him, a green leather presentation tray on the counter between them, the single gold crown above the word ROLEX on the wall behind the associate.",
        camera: "Medium close-up over the counter from his side, both wrists and the tray in frame; a slow push-in on the tray and his left wrist; one continuous take.",
        sequence: [
          "The associate sets the green leather tray on the counter with exactly one watch on it, a Rolex Datejust 41: slate grey dial with baton markers, fluted white-gold bezel, Cyclops date window at three o'clock, five-link Jubilee bracelet, dial facing up.",
          "The same man raises his left wrist, opens the Oysterlock clasp of his Submariner Date with his right hand and slides the Submariner off.",
          "He lays the Submariner dial-up on the tray beside the Datejust; for a moment his left wrist is bare.",
          "The associate lifts the Datejust 41 from the tray, opens its Oysterclasp, slips the Jubilee bracelet over his left wrist and closes the clasp; the Datejust sits dial-up on his wrist.",
          "The Submariner Date stays on the tray where he laid it; the Datejust 41 is now the only watch on him.",
        ],
        light: "Soft warm downlights over the counter; the slate dial reads matte grey with fine highlights along the fluted bezel; the black Submariner dial stays black on the tray.",
        product: "Two distinct watches throughout: the Submariner Date (black dial, black bezel, three-link Oyster bracelet) that comes off, and the Datejust 41 (slate dial, fluted bezel, five-link Jubilee bracelet) that goes on. Each keeps its own dial, bezel and bracelet; neither turns into the other.",
        marks: "Each dial shows the word ROLEX beneath the gold crown at twelve; the wall behind the associate shows the single gold crown above ROLEX.",
        never: ["two watches on one wrist", "a watch merging with a hand or the tray", "the Datejust with a black dial or the Submariner with a slate dial", "extra watches appearing on the tray"],
      },
      assetId: "rolex-datejust",
      stateAssetIds: [],
      state: { place: "boutique", onWrist: "rolex-datejust", onTray: "rolex-submariner" },
      requires: { place: "boutique", onWrist: "rolex-submariner" },
      action: "he opens the clasp of his Submariner Date and lays it on the green leather tray, his left wrist bare for a moment; then the associate lifts the Datejust 41 from the tray and fastens it around that same wrist, each watch staying one solid piece and keeping its own dial and bracelet",
      cues: ["try the datejust", "datejust", "switch", "swap", "another watch", "different watch", "change the watch", "new watch", "try on", "try another"],
      mode: "pivot",
      replayable: true,
    }),
    beat({
      id: "inspect",
      chip: "Show the back",
      title: "Inspect the case back",
      scene: {
        setting: "The same counter in the boutique; the green leather tray with the Submariner Date lies at the edge of frame; the cream walls and green accents stay soft behind him.",
        camera: "Close-up on his hands at chest height with the watch filling a third of the frame; the camera pushes in to a tight close-up of the case back as it turns to face the lens; one continuous take.",
        sequence: [
          "The same man opens the Oysterclasp of the Datejust 41 he is wearing and slides it off his left wrist.",
          "He holds it by the Jubilee bracelet in both hands, dial toward the camera for a moment: slate dial, fluted white-gold bezel, Cyclops date window.",
          "He turns the watch over in one smooth half-turn about its vertical axis: the slate dial rotates away from the camera and the back comes round to face it.",
          "Facing the camera now is the flat, mirror-polished stainless steel screw-down case back with a finely fluted edge and no window, engraving or text, reflecting the ceiling lights; the fluted bezel edge is just visible around it; the Jubilee bracelet hangs open from the lugs; the folding clasp shows its small raised crown.",
          "He holds it steady for the camera. The watch has its dial on one face and this plain steel back on the other; only the back faces the camera now, and the dial face is never plain steel. It is the same Datejust 41, not a different watch.",
        ],
        light: "Warm downlights reflect as soft highlights across the polished steel back and glint on the fluted edge; his hands and cuff stay sharp and steady.",
        product: "The Datejust 41 in his hands, seen from behind; the Submariner Date lies untouched dial-up on the tray, its black dial unchanged.",
        marks: "On the case back there is no mark at all; the only crown in close-up is the small raised crown on the clasp; the wall mark stays soft in the background.",
        never: ["text, a window, engraving or a logo on the case back", "both faces of the watch plain steel", "the dial turning grey or blank when it comes back", "the watch bending, doubling or merging with his fingers"],
      },
      assetId: "rolex-datejust-back",
      stateAssetIds: [],
      state: { place: "boutique", inHands: "rolex-datejust", onTray: "rolex-submariner" },
      requires: { place: "boutique", onWrist: "rolex-datejust" },
      action: "his hands unfasten the Datejust 41 and turn it over in one smooth half-turn, the slate dial rotating away from the camera as the flat mirror-polished steel back comes round to face it, the case flipping as a single rigid piece while the camera pushes in close",
      cues: ["show the back", "the back", "turn it over", "flip it", "case back", "caseback", "inspect", "look at it closely", "underside", "open the clasp", "open the strap"],
      mode: "pivot",
      replayable: true,
    }),
    beat({
      id: "wear",
      chip: "Put it back on",
      title: "Back on the wrist",
      scene: {
        setting: "The same counter in the boutique, the associate opposite, the tray with the Submariner Date beside him, the crown above ROLEX on the wall behind.",
        camera: "Close-up on his hands and left wrist, pulling back to a medium shot as the clasp closes and he looks up at the associate; one continuous take.",
        sequence: [
          "The same man turns the Datejust 41 back over so its slate dial faces up again.",
          "He slides the open Jubilee bracelet over his left wrist and closes the Oysterclasp with a click.",
          "The Datejust 41 sits flat on his wrist, slate dial and fluted bezel facing up, Cyclops date window at three o'clock; his cuff settles over it.",
          "He nods to the associate beneath the crown and the word ROLEX on the wall. The Submariner Date still lies on the tray.",
        ],
        light: "Soft warm downlights; a crisp highlight travels along the fluted bezel as the wrist turns.",
        product: "The Datejust 41 back on his left wrist, dial up, the same watch he just inspected; the Submariner Date on the tray, unchanged.",
        marks: "The dial shows ROLEX beneath the gold crown at twelve; the wall shows the single gold crown above ROLEX.",
        never: ["the watch going on upside down or on the right wrist", "two watches on his wrist", "the dial blank or plain steel"],
      },
      assetId: "rolex-datejust",
      stateAssetIds: [],
      state: { place: "boutique", onWrist: "rolex-datejust", onTray: "rolex-submariner" },
      requires: { place: "boutique", inHands: "rolex-datejust" },
      action: "he turns the Datejust 41 over so its slate dial faces up again, slides the Jubilee bracelet over his left wrist and closes the folding clasp with a click, the camera pulling back as the watch settles flat as one solid piece",
      cues: ["put it back on", "put it on", "back on", "wear it", "fasten", "close the clasp", "on the wrist", "on his wrist"],
      mode: "pivot",
      replayable: true,
    }),
    beat({
      id: "exit",
      chip: "Walk out",
      title: "Back to the street",
      scene: {
        setting: "From the counter back out through the glass door to the street, now at dusk: a deep blue sky, the boutique's window and fascia lit warm, the gold crown and the word ROLEX above the door glowing against the dark green facade, streetlamps just coming on.",
        camera: "One continuous take following him from behind and to his left, through the doorway and along the pavement past the lit storefront, then drifting ahead to his left wrist.",
        sequence: [
          "The same man turns from the counter, nods once more to the associate and walks to the glass door.",
          "He pushes the door open and steps out onto the pavement as evening falls; the camera follows him out.",
          "He walks past the storefront; the crown and the word ROLEX in gold pass above him on the fascia.",
          "The Datejust 41 on his left wrist, the same watch he put on inside, catches the last of the light and the warm glow of the shop window.",
        ],
        light: "Blue-hour dusk outside, warm light spilling from the boutique window and fascia, cool shadows on the pavement, a warm glint on the fluted bezel.",
        product: "Exactly one watch: the Datejust 41 on his left wrist, dial up. The Submariner Date stayed behind on the tray in the boutique.",
        marks: "The gold crown above the word ROLEX on the fascia, flat and correctly spelled; the dial's ROLEX beneath the crown at twelve.",
        never: ["the Submariner reappearing", "a second crown or misspelled lettering on the fascia", "a cut or fade from the interior to the street"],
      },
      assetId: "rolex-datejust",
      stateAssetIds: [],
      state: { place: "street", onWrist: "rolex-datejust" },
      requires: { place: "boutique", onWrist: "rolex-datejust" },
      action: "he turns from the counter, walks to the glass door and pushes it open onto the dusk-lit street, the camera following him out past the dark green storefront with its gold crown and ROLEX above the door",
      cues: ["walk out", "leave", "exit", "back to the street", "outside", "head out"],
      mode: "pivot",
      replayable: false,
    }),
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
