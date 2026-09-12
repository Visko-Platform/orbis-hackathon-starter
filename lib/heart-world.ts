// Heart rate -> world. The BPM number is the only input; every source
// (BLE watch, Garmin replay, manual slider) funnels into this mapping.

export type HeartZone = {
  id: string;
  label: string;
  minBpm: number;
  color: string;
  prompt: string;
};

export type Trend = "up" | "down" | "flat";
export type HeartSample = { t: number; bpm: number };

export const MAX_SCALE_BPM = 220;

// The protagonist is the thread across every world. The place changes with
// effort, he does not, so the jump reads as the same story escalating.
// The body is the progress bar: same face, same clothes, and a physique that
// transforms from heavy to bodybuilder as the effort climbs.
function hero(build: string) {
  return `The same man in his thirties, same face, dark hair, grey t-shirt,
black shorts. ${build}.`;
}

const STYLE = `Cinematic, photorealistic, continuous shot, no cuts.`;

type World = {
  id: string;
  label: string;
  minBpm: number;
  color: string;
  build: string;
  scene: string;
  rising: string;
  falling: string;
};

const WORLDS: World[] = [
  {
    id: "z1",
    label: "Living room",
    minBpm: 0,
    color: "#6ee7b7",
    build: `He is heavy and out of shape, a soft belly straining his t-shirt, round face, slouched posture`,
    scene: `He is sunk deep into a couch in a dim living room, a TV glowing
blue on his face, a warm lamp in the corner, totally still`,
    rising: "He shifts forward, restless, about to get up.",
    falling: "He sinks further into the cushions, completely at rest.",
  },
  {
    id: "z2",
    label: "Street",
    minBpm: 95,
    color: "#fcd34d",
    build: `He is still thick and heavy set, but standing taller, the shirt looser on him`,
    scene: `He is walking fast down a crowded city sidewalk at golden hour,
weaving between people, shop windows and traffic sliding past`,
    rising: "His pace quickens, he starts pushing through the crowd.",
    falling: "He slows to an easy walk, letting the crowd close around him.",
  },
  {
    id: "z3",
    label: "Court",
    minBpm: 125,
    color: "#fb923c",
    build: `He has an average build now, the belly gone, shoulders starting to fill out`,
    scene: `He is in a fast outdoor pickup basketball game, driving hard to the
hoop, defenders closing, the ball slapping the asphalt`,
    rising: "He accelerates past his defender, the game speeding up.",
    falling: "He pulls up, hands on his shorts, the play breaking down.",
  },
  {
    id: "z4",
    label: "Chase",
    minBpm: 150,
    color: "#f87171",
    build: `He is lean and athletic, clearly defined arms and a flat stomach`,
    scene: `He is sprinting down a narrow alley at night, wet asphalt throwing
back neon, fences and fire escapes flying past, something behind him`,
    rising: "He is gaining speed, running for his life.",
    falling: "He staggers, losing speed, the alley swallowing him.",
  },
  {
    id: "z5",
    label: "Volcano",
    minBpm: 170,
    color: "#ef4444",
    build: `He is heavily muscled and ripped, abs carved, veins standing out on his arms`,
    scene: `He is running across black volcanic rock, rivers of lava on both
sides, embers storming through a blood-red sky, heat warping the air`,
    rising: "He drives forward into the fire, past his limit.",
    falling: "He falters, collapsing to his knees in the ash.",
  },
  // Beyond here no human heart goes. Reachable only by dragging the slider,
  // which is the point: the manual override is where the demo gets strange.
  {
    id: "z6",
    label: "Orbit",
    minBpm: 190,
    color: "#a78bfa",
    build: `He has a full bodybuilder physique, enormous shoulders and chest, shredded`,
    scene: `He is sprinting across the hull of a space station, Earth turning
enormous and blue below him, stars streaking past, no air, no sound`,
    rising: "He pushes off the hull and launches into open space.",
    falling: "He slows, drifting, tethered to nothing.",
  },
  {
    id: "z7",
    label: "Supernova",
    minBpm: 205,
    color: "#f0abfc",
    build: `He is a colossal bodybuilder at peak condition, every muscle enormous and impossibly defined`,
    scene: `He is running through a collapsing star, his body breaking apart
into light and particles, space folding around him, reality tearing`,
    rising: "He dissolves completely into the blast.",
    falling: "The light drains away, leaving only his silhouette.",
  },
];

// Real training zones span 60-190 BPM. Nobody reaches 190 in front of a
// jury, so demo mode compresses the same five worlds into the band a person
// actually crosses doing jumping jacks for thirty seconds.
export const DEMO_THRESHOLDS = [0, 78, 90, 102, 114, 126, 138];

function thresholds(demo: boolean) {
  return demo ? DEMO_THRESHOLDS : WORLDS.map((world) => world.minBpm);
}

export function zonesFor(demo: boolean): HeartZone[] {
  const cuts = thresholds(demo);
  return WORLDS.map((world, index) => ({
    id: world.id,
    label: world.label,
    minBpm: cuts[index],
    color: world.color,
    prompt: `${hero(world.build)} ${world.scene}. ${STYLE}`,
  }));
}

export const HEART_ZONES = zonesFor(false);

export function zoneForBpm(bpm: number, demo = false) {
  const zones = zonesFor(demo);
  let match = zones[0];
  for (const zone of zones) if (bpm >= zone.minBpm) match = zone;
  return match;
}

function worldForBpm(bpm: number, demo: boolean) {
  const cuts = thresholds(demo);
  let match = WORLDS[0];
  WORLDS.forEach((world, index) => {
    if (bpm >= cuts[index]) match = world;
  });
  return match;
}

// The prompt is rebuilt from the exact BPM and its direction, so the world
// keeps evolving inside a range instead of only at the five crossings.
export function buildWorldPrompt(bpm: number, trend: Trend, demo = false) {
  const world = worldForBpm(bpm, demo);
  // Describe the body by which world we are in, not by raw BPM, so the two
  // threshold scales stay consistent.
  const level = WORLDS.indexOf(world);

  const body = [
    "breathing slowly and evenly, shirt dry",
    "breathing faster, a light sheen of sweat on his forehead",
    "breathing hard, sweat soaking through his shirt",
    "gasping, drenched, hair matted to his forehead",
    "lungs burning, completely soaked, sweat flying off him",
    "no breath at all, weightless, eyes wide",
    "beyond a body now, coming apart into light",
  ][level];

  const trendClause =
    trend === "up" ? world.rising : trend === "down" ? world.falling : "";

  return `${hero(world.build)} ${world.scene}, ${body}. ${trendClause} ${STYLE}`;
}
