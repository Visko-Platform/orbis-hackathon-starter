// "Storybooks" grammar: maps whatever a kid says onto a curated, accumulating
// world description. Each utterance is an "and then" — it adds to the world
// rather than replacing it. Keyword matches update structured world state;
// the raw phrase (lightly filtered) is kept as the latest story beat so
// anything a kid says still lands.

export type World = {
  setting: string | null;
  time: string | null;
  weather: string | null;
  creatures: string[];
  mods: string[];
  beats: string[]; // the "and then..." list, most recent last
};

export const EMPTY_WORLD: World = {
  setting: null,
  time: null,
  weather: null,
  creatures: [],
  mods: [],
  beats: [],
};

const SETTINGS: Record<string, string> = {
  underwater: "deep under the ocean",
  ocean: "deep under the ocean",
  sea: "deep under the ocean",
  space: "floating in outer space among planets and stars",
  moon: "on the surface of the moon",
  jungle: "in a lush jungle",
  forest: "in a magical forest",
  castle: "at a giant fairytale castle",
  city: "in a glowing future city",
  desert: "in a golden desert",
  mountain: "high in snowy mountains",
  volcano: "next to a friendly rumbling volcano",
  candy: "in a land made entirely of candy",
  cloud: "on top of fluffy clouds in the sky",
  beach: "on a sunny beach",
  farm: "on a cheerful farm",
  school: "at a colorful playground",
  playground: "at a colorful playground",
  racetrack: "on a huge racetrack",
  race: "on a huge racetrack",
  bedroom: "inside a cozy giant bedroom",
  cave: "inside a glowing crystal cave",
  dinosaur: "in a land of dinosaurs",
};

const TIMES: Record<string, string> = {
  night: "at night under a sky full of stars",
  dark: "at night under a sky full of stars",
  sunset: "at golden sunset",
  morning: "in bright morning light",
  sunrise: "at sunrise",
};

const WEATHER: Record<string, string> = {
  snow: "with snow gently falling everywhere",
  snowing: "with snow gently falling everywhere",
  snowy: "with snow gently falling everywhere",
  rain: "in warm rain",
  raining: "in warm rain",
  storm: "during a dramatic but friendly thunderstorm",
  thunder: "during a dramatic but friendly thunderstorm",
  rainbow: "with a huge rainbow across the sky",
  fog: "in soft mysterious fog",
  foggy: "in soft mysterious fog",
  wind: "with a strong playful wind blowing",
  windy: "with a strong playful wind blowing",
  bubbles: "with bubbles floating everywhere",
  confetti: "with confetti raining down",
};

const CREATURES: Record<string, string> = {
  dragon: "a friendly dragon",
  dragons: "friendly dragons",
  dinosaur: "a big dinosaur",
  dinosaurs: "lots of dinosaurs",
  "t-rex": "a T-rex",
  trex: "a T-rex",
  robot: "a shiny robot",
  robots: "lots of shiny robots",
  unicorn: "a sparkly unicorn",
  unicorns: "sparkly unicorns",
  whale: "a giant whale",
  octopus: "a big friendly octopus",
  shark: "a smiling shark",
  fish: "colorful fish",
  dolphin: "playful dolphins",
  cat: "a fluffy cat",
  cats: "lots of fluffy cats",
  kitten: "a tiny kitten",
  dog: "a happy dog",
  dogs: "lots of happy dogs",
  puppy: "a tiny puppy",
  bird: "colorful birds",
  birds: "colorful birds",
  butterfly: "giant butterflies",
  butterflies: "giant butterflies",
  bear: "a big fuzzy bear",
  lion: "a friendly lion",
  elephant: "a huge elephant",
  monkey: "silly monkeys",
  monkeys: "silly monkeys",
  penguin: "waddling penguins",
  penguins: "waddling penguins",
  alien: "cute aliens",
  aliens: "cute aliens",
  monster: "a silly friendly monster",
  monsters: "silly friendly monsters",
  pirate: "a pirate",
  pirates: "pirates",
  princess: "a princess",
  knight: "a knight in shining armor",
  wizard: "a wizard casting sparkles",
  superhero: "a superhero flying by",
  car: "a super fast race car",
  cars: "lots of race cars",
  truck: "a giant monster truck",
  train: "a colorful train",
  rocket: "a rocket ship",
  spaceship: "a spaceship",
  airplane: "an airplane",
  plane: "an airplane",
  helicopter: "a helicopter",
  boat: "a pirate ship",
  ship: "a pirate ship",
  submarine: "a yellow submarine",
  balloon: "hot air balloons",
  balloons: "hot air balloons",
};

const MODS: Record<string, string> = {
  giant: "everything is enormous",
  huge: "everything is enormous",
  big: "everything is enormous",
  tiny: "everything is tiny and miniature",
  small: "everything is tiny and miniature",
  flying: "everything is flying through the air",
  fly: "everything is flying through the air",
  glowing: "everything glows with neon light",
  glow: "everything glows with neon light",
  sparkly: "everything is sparkly",
  sparkles: "everything is sparkly",
  party: "it's a big birthday party with balloons and cake",
  birthday: "it's a big birthday party with balloons and cake",
  dancing: "everyone is dancing",
  dance: "everyone is dancing",
  racing: "everyone is racing super fast",
  fast: "everything moves super fast",
  slow: "everything moves in slow motion",
  "upside down": "the whole world is upside down",
  rainbow: "everything is rainbow colored",
  lava: "rivers of glowing lava flow by",
  ice: "everything is made of ice",
  frozen: "everything is frozen in ice",
  gold: "everything is made of gold",
  candy: "everything is made of candy",
  lego: "everything is built from toy bricks",
  cartoon: "it looks like a cartoon",
  spooky: "it's a little bit spooky but fun",
  magic: "magic sparkles fill the air",
  fire: "friendly fireworks burst in the sky",
  fireworks: "friendly fireworks burst in the sky",
  music: "musical notes float through the air",
};

// Kept deliberately small: these just get dropped, and the kid is nudged.
const BLOCKED = [
  "kill", "dead", "die", "blood", "gun", "shoot", "knife", "murder", "naked",
  "sex", "drug", "hell", "damn", "stupid", "hate",
];

export function isBlocked(text: string) {
  const t = text.toLowerCase();
  return BLOCKED.some((w) => new RegExp(`\\b${w}\\w*`).test(t));
}

function findAll(text: string, table: Record<string, string>) {
  const found: string[] = [];
  // Longer keys first so "upside down" beats "down".
  const keys = Object.keys(table).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (new RegExp(`\\b${key}\\b`, "i").test(text)) {
      const v = table[key];
      if (!found.includes(v)) found.push(v);
    }
  }
  return found;
}

export function applyUtterance(world: World, raw: string): World {
  const text = raw.trim().toLowerCase();
  if (!text) return world;

  const setting = findAll(text, SETTINGS)[0] ?? null;
  const time = findAll(text, TIMES)[0] ?? null;
  const weather = findAll(text, WEATHER)[0] ?? null;
  const creatures = findAll(text, CREATURES);
  const mods = findAll(text, MODS);

  const uniq = (xs: string[]) => Array.from(new Set(xs));

  return {
    setting: setting ?? world.setting,
    time: time ?? world.time,
    weather: weather ?? world.weather,
    creatures: uniq([...world.creatures, ...creatures]).slice(-6),
    mods: uniq([...world.mods, ...mods]).slice(-4),
    beats: [...world.beats, raw.trim()].slice(-5),
  };
}

const STYLE = "A warm, magical scene for children; nothing scary.";

export function composePrompt(world: World): string {
  const parts: string[] = [STYLE];
  const place = [world.setting, world.time, world.weather]
    .filter(Boolean)
    .join(", ");
  if (place) parts.push(`The scene is ${place}.`);
  if (world.creatures.length)
    parts.push(`There are ${world.creatures.join(", ")}.`);
  if (world.mods.length) parts.push(`${world.mods.join(", and ")}.`);
  const latest = world.beats[world.beats.length - 1];
  if (latest) parts.push(`And then: ${latest}.`);
  return parts.join(" ");
}

// Big-button shortcuts for shy kids (and as a demo safety net).
export const QUICK_BEATS: { emoji: string; label: string; say: string }[] = [
  { emoji: "❄️", label: "snow", say: "make it snow" },
  { emoji: "🐉", label: "dragon", say: "add a friendly dragon" },
  { emoji: "🌊", label: "under sea", say: "go underwater" },
  { emoji: "🎈", label: "party", say: "it's a birthday party" },
];
