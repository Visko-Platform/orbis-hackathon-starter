// Spike 004 — composite "Family World" content for Phnom Penh, November 1964.
//
// Matches the `Scene` shape from my-orbis-app/app/lib/prompts.ts (spike 003a's
// proven "object journey" arc), so this plugs into SCENES directly on build day
// with no reshaping. Image anchor: ../004-seed-photo-candidate.jpg (see README
// for sourcing/license — CC BY-SA 4.0, Don Christie, Wikimedia Commons).
//
// COMPOSITE / FICTIONAL — not a real family. "Yay" (Khmer: grandmother) is an
// invented composite figure, age ~10, placed in a real, well-documented setting
// (Phnom Penh's Sangkum-era "golden age," years before the Khmer Rouge took
// power in 1975). The real photo's real pictured child is NOT claimed to be
// "Yay" — narration stays on the street's general setting and verifiable
// period facts, never asserts identity onto a real bystander in someone else's
// 60-year-old photograph. The UI must label this world as composite; see
// README's Requirements/legitimacy trail.
//
// Deliberately excludes any gesture toward the 1975-79 Khmer Rouge period —
// that association is exactly what this world is designed to avoid per the
// user's explicit direction ("an ordinary childhood rather than making
// Cambodian history synonymous with genocide").

export interface Prompt {
  title: string;
  text: string;
  narration?: string;
}

export const worldMeta = {
  id: "phnom-penh-1964",
  grandmotherLabel: "Yay",
  age: 10,
  place: "Phnom Penh, Cambodia",
  year: 1964,
  composite: true,
  compositeDisclosure:
    "A composite portrait — not a real family history. The photograph is a real, dated (Nov. 1964) Phnom Penh street scene from a public archive; 'Yay' is an invented grandmother placed in this real, ordinary Sangkum-era setting, not a claim about anyone actually pictured.",
  threeQuestions: {
    whereDidSheLive:
      "A tree-lined boulevard in Phnom Penh, in the years Cambodians now remember as the Sangkum — the 'golden age' of Sihanouk-era Cambodia, the 'Pearl of Asia.'",
    whatWasEverydayLifeLike:
      "Whitewashed tree trunks along the curb, cyclos threading past monks on their morning almsround, the occasional imported sedan parked at the curb.",
    whatDidSheExperience:
      "A ten-year-old's ordinary morning — crossing a wide boulevard barefoot, cyclos and bicycles for traffic, a city that felt calm and unhurried.",
  },
};

export const baseScene: string =
  "A tree-lined boulevard in Phnom Penh, Cambodia, November 1964: whitewashed tree trunks along both curbs, a Buddhist monk in saffron robes walking on his morning almsround, a cyclo (bicycle rickshaw) waiting at the curb, a vintage sedan parked beside a colonial-era building, warm late-morning light, a calm unhurried Sangkum-era street.";

export const BEATS: ReadonlyArray<Prompt> = [
  {
    title: "The Boulevard's White Trunks",
    text: "The same tree-lined Phnom Penh boulevard, November 1964. The camera holds on the whitewashed tree trunks lining the curb, dappled shade falling across the pavement between them. Still, calm, a single unbroken take.",
    narration:
      "Whitewashing tree trunks was standard practice on Phnom Penh's French-planned boulevards — it made the curb visible at night and was thought to deter insects. By 1964 it had simply become how a proper street looked.",
  },
  {
    title: "The Monk's Almsround",
    text: "The same boulevard, the same whitewashed trunks. Attention shifts to a Buddhist monk in saffron robes walking slowly along the sidewalk on his morning almsround. Quiet, unhurried, a single unbroken take.",
    narration:
      "A monk's almsround happened on this street every single morning, rain or shine, for centuries before this photo and decades after it — one of the few things about this scene that hasn't changed.",
  },
  {
    title: "The Cyclo at the Curb",
    text: "The same street, the same monk passing in the distance. The view settles on a cyclo waiting at the curb, its driver resting between fares. Still, patient, a single unbroken take.",
    narration:
      "The cyclo — a pedaled bicycle-rickshaw — was the era's taxi, cheap enough for a daily errand and slow enough that its driver usually knew every family on the block.",
  },
  {
    title: "A Vintage Sedan at the Curb",
    text: "The same boulevard, the same cyclo nearby. The camera moves to a large imported sedan parked at the curb outside a colonial-era building, its chrome catching the light. Bright, still, a single unbroken take.",
    narration:
      "A private car like this one was a genuine luxury in 1964 Phnom Penh — most of the street ran on foot, bicycle, or cyclo, which is exactly why a parked sedan stood out enough to remember.",
  },
  {
    title: "Crossing the Boulevard",
    text: "The same street, the same sedan behind. A child crosses the wide boulevard barefoot, unhurried, between the cyclo and the passing bicycles. Calm, everyday, a single unbroken take.",
    narration:
      "Children crossed streets like this one on their own, barefoot, every day — this was an ordinary Tuesday in what Cambodians would later call the golden age, a decade before anyone here could have imagined what came next.",
  },
  {
    title: "Wide Boulevard Shot",
    text: "The same boulevard, the same monk, cyclo, sedan, and crossing child now framed together in one wide view, the colonial-era building's facade visible at the edge of the frame. Calm, expansive, a single unbroken take.",
    narration:
      "This is the world Yay grew up in — not a recreation, but the real texture of an ordinary Phnom Penh morning, the year she turned ten.",
  },
];
