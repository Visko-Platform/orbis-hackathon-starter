// Storyline B: "This Photo, Alive" — atmosphere- and motion-first rather
// than object-labeling. Leans into the Core Value statement directly
// ("photo -> living, steerable memory") by making the FIRST beat pure
// motion with almost no narration, then layering historical context in
// as the scene keeps breathing. Draws lightly on cavite-city-1953 and
// sari-sari-store hotspots; excludes the "four children" hotspot.
//
// Shape matches spike 002's steering.ts: baseScene is set once at
// session start (image seed anchor); each beat's `prompt` becomes the
// `directional` clause passed to composePrompt().

export const baseScene =
  "A barrio street in Cavite City, Philippines, 1953: a sari-sari store with a woven sawali wall, an open front lined with pinned sachets and wooden shelves of canned goods, a red enameled Coca-Cola sign mounted above the counter, a red Coca-Cola ice cooler beside it, a concrete step in the foreground, tightly packed plank-and-yero-roofed houses with laundry strung between them along a narrow alley";

export const INTRO_NARRATION =
  "This is a real photograph — a barrio street in Cavite City, Philippines, 1953. Watch it come alive.";

export const BEATS: { prompt: string; narration: string }[] = [
  {
    prompt:
      "a light breeze moves through the alley, gently stirring the laundry strung between the houses",
    narration: "", // deliberately silent — let the first motion land before any narration
  },
  {
    prompt: "faint smoke drifts from a cooking fire somewhere just out of frame",
    narration:
      "Cavite City sat at the tip of a peninsula opposite Manila — a Spanish-era port that had spent the previous decade rebuilding after WWII bombing runs on the nearby Cavite Navy Yard.",
  },
  {
    prompt:
      "the tindera leans across the counter to hand a bottle from the cooler to a customer stepping into frame",
    narration:
      "The sari-sari store was the barrio's town square before there was a town square — credit, gossip, and a cold Coke all passed across that one counter.",
  },
  {
    prompt: "a barefoot man pedals a pedicab slowly past the far end of the alley",
    narration:
      "Postwar Cavite lived a double life: half battered Spanish port, half civilian fringe of the US Naval Station at Sangley Point just up the road. You can see that layered history in every frame of daily commerce here.",
  },
  {
    prompt:
      "afternoon light shifts and lengthens the shadows across the concrete step and storefront",
    narration:
      "By 1953 the barrio was rebuilding itself house by house, upgrade by upgrade — cement here, corrugated roofing there — never all at once.",
  },
  {
    prompt:
      "the scene settles into quiet stillness, the sari-sari store humming with the last of the day's activity",
    narration: "The same photo you saw a minute ago — now it's a memory, moving.",
  },
];
