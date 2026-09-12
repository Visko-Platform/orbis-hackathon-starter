// Spike 005 — composite "Family World" content for Leningrad, USSR, 1980s.
//
// Matches the `Scene` shape from my-orbis-app/app/lib/prompts.ts (spike 003a's
// proven "object journey" arc), so this plugs into SCENES directly on build day
// with no reshaping. Image anchor: ../005-seed-photo-candidate.jpg (see README
// for sourcing/license — CC BY 2.0, Vladimir Fedotov via Flickr, Wikimedia
// Commons; captioned only "1980s," not an exact year — see Investigation
// Trail).
//
// COMPOSITE / FICTIONAL — not a real family. "Babushka" is an invented
// composite figure, age ~9, placed in a real, dated street photograph. The
// pedestrians actually visible in the photo are NOT claimed to be her or her
// family — narration stays on the street's general setting and verifiable
// period facts about Leningrad, never asserts identity onto real bystanders in
// someone else's archival photograph. The UI must label this world as
// composite; see README's Requirements/legitimacy trail.

export interface Prompt {
  title: string;
  text: string;
  narration?: string;
}

export const worldMeta = {
  id: "leningrad-1984",
  grandmotherLabel: "Babushka",
  age: 9,
  place: "Leningrad, USSR",
  year: 1984,
  composite: true,
  compositeDisclosure:
    "A composite portrait — not a real family history. The photograph is a real, dated-1980s Leningrad street scene from a public archive; 'Babushka' is an invented grandmother placed in this real, ordinary setting, not a claim about anyone actually pictured.",
  threeQuestions: {
    whereDidSheLive:
      "A residential street in Leningrad, tram tracks running past rows of pre-revolutionary apartment buildings repurposed for Soviet life.",
    whatWasEverydayLifeLike:
      "A tram rattling past every few minutes, an old church bell tower still standing on the skyline, a street loudspeaker carrying the morning broadcast over the courtyards.",
    whatDidSheExperience:
      "A child's ordinary walk to school past the tram stop, bundled in a coat, the overhead wires humming above the street.",
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
      "This is the world Babushka grew up in — not a recreation, but the real texture of an ordinary Leningrad morning, the decade before it became a different city with a different name.",
  },
];
