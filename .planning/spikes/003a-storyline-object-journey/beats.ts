// Storyline A: "Object Journey" — the camera/attention moves from one
// material-culture object to the next across the frame, in the order a
// close reading of the photo would naturally travel. Draws on 4 of the
// photo's 6 sanitized hotspots (coca-cola-sign, sari-sari-store,
// cement-step, galvanized-iron-panels). Deliberately excludes the
// "four children / orphan father" hotspot (personal family narrative,
// out of scope) and downplays cavite-city-1953/barrio-density (saved for
// storylines B and C so the three arcs don't just repeat each other).
//
// Shape matches spike 002's steering.ts: baseScene is set once at
// session start (image seed anchor); each beat's `prompt` becomes the
// `directional` clause passed to composePrompt().

export const baseScene =
  "A barrio street in Cavite City, Philippines, 1953: a sari-sari store with a woven sawali wall, an open front lined with pinned sachets and wooden shelves of canned goods, a red enameled Coca-Cola sign mounted above the counter, a red Coca-Cola ice cooler beside it, a concrete step in the foreground, tightly packed plank-and-yero-roofed houses along a narrow alley";

export const BEATS: { prompt: string; narration: string }[] = [
  {
    prompt:
      "the camera holds on the red enameled Coca-Cola sign above the store, sunlight glinting faintly off its metal surface",
    narration:
      "That red sign is a Coca-Cola 'button' sign — free store signage the company pushed into barrios across the Philippines after World War Two, tying this tiny shop into a global brand system that arrived with American troops.",
  },
  {
    prompt:
      "attention shifts down to the sari-sari store counter, where pinned sachets sway slightly and the tindera arranges bottles on the shelf",
    narration:
      "This is a sari-sari store — Tagalog for 'variety.' Almost everything here was sold in tingi, fractional quantities: a twist of sugar, a single cigarette, priced for a day's wage rather than a household budget.",
  },
  {
    prompt:
      "the view settles on the concrete step in the foreground, its surface worn smooth, morning light pooling across the cement",
    narration:
      "That concrete step was a small luxury in 1953. Cement was still expensive enough that a household's first pour was usually just a step or a counter base — the house above it often stayed built from bamboo and sawali for another decade.",
  },
  {
    prompt:
      "the camera tilts up past the sawali wall to the corrugated yero roofing above, its ridges catching the sun",
    narration:
      "That corrugated metal roofing is called yero. It flooded into barrios like this one from WWII military surplus, slowly replacing nipa thatch, roof by roof, through the whole postwar decade.",
  },
  {
    prompt:
      "a wide view returns, taking in the whole barrio storefront as a neighbor crosses the alley behind it",
    narration:
      "Put together, these details are a household's balance sheet in physical form — what's still traditional, what's been upgraded, and exactly how far the postwar economy had reached by 1953.",
  },
];
