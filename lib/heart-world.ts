// Heart rate -> world. The BPM number is the only input; every source
// (BLE watch, Garmin replay, manual slider) funnels into this mapping.

export type HeartZone = {
  id: string;
  label: string;
  minBpm: number;
  color: string;
  prompt: string;
};

// Calibrate these to the athlete's real zones (Garmin: get_activity_hr_zones).
// Every zone repeats the same subject and camera so Orbis morphs the action
// instead of cutting to a new scene.
const SUBJECT = `A man in his thirties in a grey t-shirt and black shorts in
the same small living room, same couch, same TV glowing behind him, filmed
from the same fixed camera angle.`;

const STYLE = `Cinematic, photorealistic, continuous shot, no cuts.`;

export const HEART_ZONES: HeartZone[] = [
  {
    id: "z1",
    label: "Calma",
    minBpm: 0,
    color: "#6ee7b7",
    prompt: `${SUBJECT} He sits back on the couch watching TV, completely
relaxed, breathing slowly, barely moving. Calm warm lamp light. ${STYLE}`,
  },
  {
    id: "z2",
    label: "Activo",
    minBpm: 95,
    color: "#fcd34d",
    prompt: `${SUBJECT} He is up off the couch now, walking briskly in place in
front of the TV, arms swinging, light effort, breathing a little faster.
${STYLE}`,
  },
  {
    id: "z3",
    label: "Esfuerzo",
    minBpm: 125,
    color: "#fb923c",
    prompt: `${SUBJECT} He is jogging hard in place, knees rising, shirt
starting to soak with sweat, breathing heavily, hair damp. ${STYLE}`,
  },
  {
    id: "z4",
    label: "Umbral",
    minBpm: 150,
    color: "#f87171",
    prompt: `${SUBJECT} He is doing explosive burpees and jumping squats,
drenched in sweat, chest heaving, face straining with effort, sweat flying.
${STYLE}`,
  },
  {
    id: "z5",
    label: "Máximo",
    minBpm: 170,
    color: "#ef4444",
    prompt: `${SUBJECT} He is at absolute maximum effort, sprinting in place,
completely drenched, gasping for air, face red and contorted, sweat pouring
off him, on the edge of collapse. ${STYLE}`,
  },
];

// --- Continuous prompt construction -------------------------------------
// The zones above drive the UI. The prompt itself is rebuilt from the exact
// BPM plus its direction, so the world keeps evolving inside a zone instead
// of only at the five crossings.

const EFFORT_LADDER: { min: number; action: string }[] = [
  { min: 0, action: "sinks deep into the couch watching TV, totally still" },
  { min: 80, action: "sits up on the edge of the couch, restless, foot tapping" },
  { min: 95, action: "is on his feet, walking slowly in place in front of the TV" },
  { min: 110, action: "marches briskly in place, arms swinging" },
  { min: 125, action: "jogs in place at a steady rhythm" },
  { min: 140, action: "runs hard in place, knees driving high" },
  { min: 155, action: "sprints in place, arms pumping furiously" },
  { min: 170, action: "hammers out explosive burpees and jump squats" },
  { min: 182, action: "goes all out, sprinting flat out on the edge of collapse" },
];

export type Trend = "up" | "down" | "flat";

export function buildWorldPrompt(bpm: number, trend: Trend) {
  let step = EFFORT_LADDER[0];
  for (const entry of EFFORT_LADDER) if (bpm >= entry.min) step = entry;

  const sweat =
    bpm < 95
      ? "His shirt is dry"
      : bpm < 125
        ? "A light sheen of sweat shows on his forehead"
        : bpm < 150
          ? "Sweat is soaking through his shirt"
          : bpm < 170
            ? "He is drenched, hair matted, sweat running down his face"
            : "He is completely soaked, sweat flying off him with every movement";

  const breath =
    bpm < 95
      ? "breathing slowly and evenly"
      : bpm < 130
        ? "breathing faster now"
        : bpm < 160
          ? "breathing hard, chest rising and falling"
          : "gasping for air, mouth wide open";

  const trendClause =
    trend === "up"
      ? "He is visibly accelerating, pushing harder every second."
      : trend === "down"
        ? "He is easing off, slowing down, starting to recover."
        : "He holds this exact effort, steady.";

  return `${SUBJECT} He ${step.action}, ${breath}. ${sweat}. ${trendClause} ${STYLE}`;
}

export function zoneForBpm(bpm: number, zones: HeartZone[] = HEART_ZONES) {
  let match = zones[0];
  for (const zone of zones) if (bpm >= zone.minBpm) match = zone;
  return match;
}

export const MAX_SCALE_BPM = 190;

export type HeartSample = { t: number; bpm: number };
