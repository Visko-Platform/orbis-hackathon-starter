// Spike 012 — converts spike 005's Leningrad world from a labeled
// composite/fictional portrait into a real family storyline, per the
// user's explicit decision on 2026-09-11 to lift the "composite only"
// requirement for this world (see MANIFEST.md Requirements for the
// recorded reversal and rationale).
//
// Matches the `Scene` shape from my-orbis-app/app/lib/prompts.ts (same
// object-journey arc spike 003a validated). Not wired into the running
// app yet — standalone content spike, same convention as 004/005.
//
// REAL FAMILY, NOT COMPOSITE. "Babushka" (age 9, Leningrad, 1984) is a
// real relative of the person telling this story. The street scene image
// (../005-composite-world-russia/../005-seed-photo-candidate.jpg, CC BY 2.0,
// Vladimir Fedotov via Flickr/Wikimedia Commons, captioned "1980s") remains
// an ILLUSTRATIVE period setting, not a claim that this exact street or the
// pedestrians pictured in it are this family's actual address or actual
// relatives — that distinction still matters even once the *person* being
// portrayed (Babushka) is real: the photo grounds the environment, not the
// identity claim.
//
// NEW IN THIS SPIKE: a great-grandmother ("Prababushka") who died of
// starvation during the Siege of Leningrad (1941-1944), decades before
// Babushka was born — a relative the storyteller has never met and never
// could. No photograph of her survives. Beat 7 below is the first spike
// content to use the `imagined` disclosure field proposed in this spike's
// README and added to CONVENTIONS.md: rather than fabricate an imagined
// human portrait for a beat with no photographic reference, this beat
// anchors on a surviving *object type* (a wartime bread-ration card) —
// staying inside the object-journey convention and avoiding an invented
// likeness for a real, specific, deceased person.

export interface Prompt {
  title: string;
  text: string;
  narration?: string;
  /** True when this beat's visual has no real historical photograph to
   * ground it — the subject or object is reconstructed/imagined rather
   * than documented. UI copy and narration must disclose this. */
  imagined?: boolean;
  imaginedDisclosure?: string;
}

export const worldMeta = {
  id: "leningrad-1984",
  grandmotherLabel: "Babushka",
  age: 9,
  place: "Leningrad, USSR",
  year: 1984,
  composite: false,
  realFamilyNote:
    "A real family memory, not a composite. Babushka and Prababushka are real relatives of the person who submitted this memory. The 1980s street photograph is used as an illustrative, correctly-dated period setting — it is not claimed to depict this family's exact address, home, or the specific people in it.",
  greatGrandmother: {
    label: "Prababushka",
    relationship: "great-grandmother",
    fate: "died of starvation during the Siege of Leningrad, 1941–1944",
    everMet: false,
    note:
      "She died roughly four decades before Babushka's own 1984 childhood pictured in this world, and long before the storyteller was born — known only through what the family has passed down, never met firsthand.",
  },
  threeQuestions: {
    whereDidSheLive:
      "A residential street in Leningrad, tram tracks running past rows of pre-revolutionary apartment buildings repurposed for Soviet life.",
    whatWasEverydayLifeLike:
      "A tram rattling past every few minutes, an old church bell tower still standing on the skyline, a street loudspeaker carrying the morning broadcast over the courtyards.",
    whatDidSheExperience:
      "An ordinary, peaceful walk to school past the tram stop — a childhood the family's earlier generation, forty years before, was never allowed to have; the famine that took Prababushka is the quiet backdrop this ordinariness is measured against.",
  },
};

export const baseScene: string =
  "A residential street in Leningrad, USSR, in the 1980s: a tram running on tracks down the center of the street, rows of multi-story pre-revolutionary apartment buildings lining both sides, an old church bell tower rising in the middle distance, overhead tram wires crossing above the street, pedestrians in coats walking along the sidewalk, overcast late-morning light.";

export const BEATS: ReadonlyArray<Prompt> = [
  {
    title: "The Tram on Its Tracks",
    text: "The same Leningrad street, the same apartment buildings lining it. The camera holds on the tram running along its tracks down the center of the road, its overhead pole sparking faintly against the wire. Still, unhurried, a single unbroken take.",
    narration:
      "By the late 1980s Leningrad had the largest tram network in the world — for most families here, the tram wasn't a novelty, it was simply how you got anywhere.",
  },
  {
    title: "Overhead Wires",
    text: "The same street, the same tram passing below. The view tilts up to the tangle of overhead tram wires crossing above the road, strung between poles and the buildings themselves. Textural, quiet, a single unbroken take.",
    narration:
      "Those wires ran straight into the buildings' own facades — the whole street's electrical infrastructure was as visible as the architecture, layered on top of it rather than hidden.",
  },
  {
    title: "The Bell Tower",
    text: "The same street, the same wires overhead. The camera settles on an old church bell tower rising above the rooftops in the middle distance. Still, muted, a single unbroken take.",
    narration:
      "Many of Leningrad's pre-revolutionary church buildings survived the Soviet period standing, even as they were repurposed as warehouses, pools, or museums — a skyline that quietly outlasted the ideology built around it.",
  },
  {
    title: "Coats on the Sidewalk",
    text: "The same street, the same bell tower behind. Pedestrians in heavy coats walk along the sidewalk past the tram tracks, unhurried, heads down against the cold. Calm, everyday, a single unbroken take.",
    narration:
      "A coat like this one was worn for most of the year here — Leningrad's climate shaped the wardrobe as much as any factory did.",
  },
  {
    title: "The Street Loudspeaker",
    text: "The same sidewalk, the same coated pedestrians nearby. The camera finds a loudspeaker mounted on a building's corner, wired into the street below. Still, distinctive, a single unbroken take.",
    narration:
      "Streets and courtyards across the Soviet Union were wired with public loudspeakers like this one, carrying the morning broadcast — news, the anthem, sometimes gymnastics instructions — whether anyone below was listening or not.",
  },
  {
    title: "Wide Street Shot",
    text: "The same street, the same tram, bell tower, and loudspeaker now framed together in one wide view, the row of apartment buildings receding into the distance. Calm, expansive, a single unbroken take.",
    narration:
      "This is the world Babushka grew up in — an ordinary Leningrad morning, forty years after the siege that nearly emptied this city.",
  },
  {
    title: "A Ration Card, Kept",
    text: "A close, still frame on a small, worn paper ration card resting on a windowsill in soft indoor light — faded Cyrillic printing, a hand-torn perforated edge, the card slightly yellowed with age. Quiet, intimate, a single unbroken take.",
    narration:
      "This card belonged to Babushka's own grandmother — Prababushka, the great-grandmother of this family — who died of starvation during the Siege of Leningrad, between 1941 and 1944. No photograph of her survives. This is the one object the family still has of her.",
    imagined: true,
    imaginedDisclosure:
      "No photograph of Prababushka survives. This beat depicts a physically plausible object of her era (a Leningrad bread-ration card) rather than an invented likeness of a specific, real, deceased person — the object is a reconstruction, not a document.",
  },
];
