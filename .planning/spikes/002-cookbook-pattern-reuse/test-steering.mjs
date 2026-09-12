import { composePrompt, nextBeat } from "./steering.ts";

const baseScene =
  "A narrow barrio alley in Cavite City, 1953: bamboo and sawali walls, a sari-sari store counter, a woman tindera at the counter, a red Coca-Cola sign on the facade";

const beats = [
  "the tindera hands a bottle of Coca-Cola across the counter",
  "a barefoot man pedals a pedicab past the alley in the background",
  "laundry strung between the houses stirs gently in the breeze",
  "an afternoon rain begins, and neighbors pull tarps over the sari-sari store's shelves",
];

console.log("--- Test 1: basic composition ---");
const p0 = composePrompt({ baseScene, directional: beats[0] });
console.log(p0);
console.log("length:", p0.length);

console.log("\n--- Test 2: advancing through all beats ---");
let state = { index: 0 };
let idx = 0;
for (let i = 0; i < beats.length; i++) {
  const { prompt, nextIndex } = nextBeat({ baseScene, directional: beats[idx] }, beats, idx);
  console.log(`beat[${idx}] -> nextIndex=${nextIndex}:`, prompt);
  idx = nextIndex;
}

console.log("\n--- Test 3: nextBeat clamps past the end of the script ---");
const past = nextBeat({ baseScene, directional: beats[beats.length - 1] }, beats, beats.length + 5);
console.log("nextIndex when starting past end:", past.nextIndex, "(expect", beats.length - 1, ")");

console.log("\n--- Test 4: overlong directional clause gets truncated, baseScene preserved ---");
const longDirectional =
  "x".repeat(600) + " this should be cut off long before it ever reaches the model";
const truncated = composePrompt({ baseScene, directional: longDirectional });
console.log("length:", truncated.length, "(expect <= 480)");
console.log("starts with baseScene intact:", truncated.startsWith(baseScene));
console.log(truncated.slice(0, 120) + "...");

console.log("\n--- Test 5: pathological case — baseScene alone already exceeds budget ---");
const hugeBase = "y".repeat(500);
const hugeResult = composePrompt({ baseScene: hugeBase, directional: "anything" });
console.log("length:", hugeResult.length, "(expect 480, hard-truncated baseScene)");
