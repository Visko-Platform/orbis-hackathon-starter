// Plain data module (no "use client") so app/live-world/page.tsx (a Server
// Component) can call isSeedMemoryId() directly. It used to live inside
// LiveWorld.tsx, but that file is "use client" — every export of a client
// module becomes an opaque client reference, so a Server Component can only
// render its default export as a Component, not call a plain function from
// it (production 500: "Attempted to call isSeedMemoryId() from the server
// but isSeedMemoryId is on the client").
export type Beat = {
  id: string;
  title: string;
  hint?: string;
  narration: string;
};

export type Scene = {
  kicker: string;
  title: string;
  image: string;
  initial: Beat;
  evolutions: Beat[];
};

// One seed scene per grandmother example on the front page (FamilyGallery's
// SEEDS) and AddFamily's design import — keyed by the same seed ids so
// "Enter their world" can deep-link straight to the matching panorama.
// panorama_philippines.jpeg is a wider companion shot of the "Lola" entry
// on /explore-grandmas-world; panorama_phnom-penh.jpeg and
// panorama_leningrad.jpeg are the "Yay" and "Babushka" counterparts.
export const SCENES: Record<string, Scene> = {
  "seed-lola": {
    kicker: "Lola · My grandmother · Cavite City, Philippines · 1953",
    title: "Barrio street, fiesta day",
    image: "/images/panorama_philippines.jpeg",
    initial: {
      id: "initial",
      title: "Barrio street, fiesta day",
      narration:
        "A festive barrio street in Cavite City, Philippines: fruit stalls set along a bamboo fence, strings of fiesta buntings overhead, a jeepney idling past a San Miguel Beer signboard, and a cargo ship waiting at the harbor beyond the rooftops.",
    },
    evolutions: [
      {
        id: "buntings",
        title: "Fiesta buntings",
        hint: "Look up at the string of flags overhead.",
        narration:
          "Buntings like these crossed barrio streets for town fiestas — Cavite City's biggest is the Feast of the Immaculate Conception, when whole streets are strung with paper and cloth flags.",
      },
      {
        id: "stalls",
        title: "Market stalls",
        hint: "Settle on the fruit stalls along the road.",
        narration:
          "Roadside stalls like these sold whatever was in season, set out directly on the packed-earth street for anyone walking by.",
      },
      {
        id: "jeepney",
        title: "The jeepney",
        hint: "Follow the jeepney idling down the street.",
        narration:
          "Jeepneys were repurposed U.S. military jeeps left behind after World War Two, stretched and decorated into the Philippines' iconic shared taxi.",
      },
      {
        id: "harbor",
        title: "The harbor beyond",
        hint: "Look past the rooftops to the ship at anchor.",
        narration:
          "Cavite City sits on a peninsula built around a naval anchorage — a cargo ship waiting offshore was an everyday backdrop, not a special occasion.",
      },
      {
        id: "wide",
        title: "Wide barrio shot",
        hint: "Pull back to see the whole street.",
        narration:
          "Put together, this one photograph holds a household's entire world — market, transit, festival, and harbor within a single unhurried view.",
      },
    ],
  },
  "seed-yay": {
    kicker: "Yay · My great-grandmother · Phnom Penh, Cambodia · 1964",
    title: "Wide boulevard, morning walk to school",
    image: "/images/panorama_phnom-penh.jpeg",
    initial: {
      id: "initial",
      title: "Wide boulevard, morning walk to school",
      narration:
        "A wide, tree-lined boulevard in Phnom Penh: colonial-era shopfronts under a row of rain trees, a cyclo driver waiting at the curb, and a group of schoolchildren crossing barefoot in the early light.",
    },
    evolutions: [
      {
        id: "cyclo",
        title: "The cyclo driver",
        hint: "Follow the cyclo waiting at the curb.",
        narration:
          "Cyclos — pedal-powered rickshaws — were the everyday taxi of 1960s Phnom Penh, weaving between cars along the city's broad French-planned boulevards.",
      },
      {
        id: "rain-trees",
        title: "Rain trees overhead",
        hint: "Look up at the canopy along the boulevard.",
        narration:
          "Rows of rain trees, planted along Phnom Penh's boulevards under French administration, shaded generations of morning walks to school.",
      },
      {
        id: "shopfronts",
        title: "Shophouse row",
        hint: "Settle on the shopfronts across the street.",
        narration:
          "These shophouses mixed home and business under one roof — a family often lived above the very stall it kept open to the street.",
      },
      {
        id: "schoolyard",
        title: "The schoolyard gate",
        hint: "Follow the children ahead to the gate.",
        narration:
          "Barefoot was simply how the walk was done — shoes were saved for later, and the packed-earth path to school was cool underfoot before the day's heat set in.",
      },
      {
        id: "wide",
        title: "Wide boulevard shot",
        hint: "Pull back to see the whole crossing.",
        narration:
          "One photograph, one ordinary morning — a boulevard, a ride for hire, and a crossing made on foot thousands of times before anyone thought to remember it.",
      },
    ],
  },
  "seed-babushka": {
    kicker: "Babushka · Leningrad, USSR · 1980s",
    title: "Tram stop, past the bell tower",
    image: "/images/panorama_leningrad.jpeg",
    initial: {
      id: "initial",
      title: "Tram stop, past the bell tower",
      narration:
        "A tram stop on a wide Leningrad avenue: an old bell tower rising behind snow-dusted rooftops, a red-and-cream tram easing to a halt, and commuters bundled in winter coats waiting along the platform.",
    },
    evolutions: [
      {
        id: "tram",
        title: "The tram arrives",
        hint: "Watch the tram ease to a stop.",
        narration:
          "Leningrad's tram network was one of the largest in the world — a single ride could cross the whole city for a few kopecks.",
      },
      {
        id: "bell-tower",
        title: "The bell tower",
        hint: "Look past the rooftops to the tower.",
        narration:
          "Bell towers like this one survived the war years as fixed points on a skyline that had otherwise changed block by block.",
      },
      {
        id: "commuters",
        title: "Waiting at the platform",
        hint: "Settle on the commuters bundled against the cold.",
        narration:
          "Winter coats, fur hats, and a shared silence at the platform — the tram stop was where a school morning actually began.",
      },
      {
        id: "snow",
        title: "Snow on the rooftops",
        hint: "Follow the snowline along the roofs.",
        narration:
          "Leningrad winters could hold snow on the rooftops from October to April — the city learned to keep moving through it.",
      },
      {
        id: "wide",
        title: "Wide avenue shot",
        hint: "Pull back to see the whole avenue.",
        narration:
          "Put together, this one photograph holds a whole commute — tower, tram, and the cold walk in between.",
      },
    ],
  },
};

export const DEFAULT_SCENE_ID = "seed-lola";

/** True for the 3 curated seed ids this component simulates locally. Used by
 * app/live-world/page.tsx to route anything else (an AddFamily-created
 * memory, or an unknown id) to <LiveWorldSession> — real Visko Orbis Stable
 * generation — instead of falling through to the Lola default here. */
export function isSeedMemoryId(id: string | undefined): boolean {
  return !!id && id in SCENES;
}
