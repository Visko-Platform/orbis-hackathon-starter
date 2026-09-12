// Storyline C: "Neighborhood in Motion" — foregrounds the barrio's social
// density and daily commerce rhythm rather than individual objects or
// pure atmosphere. Draws on sari-sari-store and barrio-density hotspots
// most heavily. Uses only GENERIC "children's laughter drifts from a side
// alley" (ambient, no individuals identified) — explicitly NOT the specific
// "four children / orphan father" hotspot narrative, which stays excluded.
//
// Shape matches spike 002's steering.ts: baseScene is set once at
// session start (image seed anchor); each beat's `prompt` becomes the
// `directional` clause passed to composePrompt().

export const baseScene =
  "A barrio street in Cavite City, Philippines, 1953: a sari-sari store with a woven sawali wall, an open front lined with pinned sachets and wooden shelves of canned goods, a red enameled Coca-Cola sign mounted above the counter, a red Coca-Cola ice cooler beside it, a concrete step in the foreground, tightly packed plank-and-yero-roofed houses along a narrow eskinita alley";

export const BEATS: { prompt: string; narration: string }[] = [
  {
    prompt:
      "neighbors pass along the narrow alley behind the store, moving between the tightly packed houses",
    narration:
      "Barrios like this one grew dense fast after the war — Cavite's buildable land was a thin peninsula, so lots got subdivided again and again, and houses ended up wall-to-wall along footpath-width alleys called eskinita.",
  },
  {
    prompt:
      "the tindera serves a line of customers at the counter, exchanging small coins for goods wrapped in newspaper",
    narration:
      "Most transactions here were tingi — fractional. A laborer with a few centavos could buy a single cigarette or a twist of sugar in newspaper, not a whole pack or a kilo.",
  },
  {
    prompt: "children's laughter drifts faintly from a side alley, just out of frame",
    narration:
      "This density had a real cost — almost no privacy — but it also built a support network: a child could be watched from half a dozen kitchens at once, and no one needed a form for that.",
  },
  {
    prompt: "laundry sways overhead between two facades as a woman gathers it in",
    narration:
      "Housing upgraded unevenly here — a family might pour a concrete step or add a corrugated-metal roof panel long before the rest of the house changed at all.",
  },
  {
    prompt: "a pedicab driver calls out for a fare passing at the alley's far end",
    narration:
      "Pedicabs were the barrio's taxi and delivery service — human-powered, low-cost, everywhere in postwar Filipino towns before jeepneys took over the longer routes.",
  },
  {
    prompt:
      "the street settles into its evening rhythm, a lantern beginning to glow in one window",
    narration:
      "None of this is about who specifically lived here — it's what an ordinary postwar Filipino barrio looked and felt like, alive again for a moment.",
  },
];
