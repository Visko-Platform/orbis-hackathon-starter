// Contract test for worldProvider.js. Run: node test-worldProvider.mjs
import assert from "node:assert/strict";
import { createMockWorldProvider, createOrbisWorldProvider } from "./worldProvider.js";

const memory = {
  id: "mem-test",
  person: "Grandmother",
  relationship: "My grandmother",
  place: "Cavite City, Philippines",
  year: "1956",
  memory: "She went to the market with her mother.",
  photo: "data:image/png;base64,AAAA",
};

// --- MockWorldProvider: full interaction loop ---
const mock = createMockWorldProvider();
const session = mock.enter(memory);

assert.equal(session.locations.length, 3);
assert.deepEqual(
  session.locations.map((l) => l.key),
  ["home", "market", "neighborhood"]
);
assert.equal(session.current().key, "home");

// Lola -> Market -> Home -> Exit -> another relative, per the required demo loop
session.goTo("market");
assert.equal(session.current().key, "market");
session.goTo("home");
assert.equal(session.current().key, "home");
session.exit();
assert.equal(session.current().key, "home"); // exit resets to first location, ready for "another relative"

// Free-text steering round-trips the typed text into the narration
const steered = session.steer("a rainy afternoon");
assert.match(steered.narration, /rainy afternoon/);

// Unknown location throws instead of silently no-op-ing
assert.throws(() => session.goTo("not-a-real-place"), /Unknown location/);

// --- Contract parity: OrbisWorldProvider exposes the same call site ---
const orbis = createOrbisWorldProvider();
assert.equal(typeof orbis.enter, "function"); // same shape as mock.enter
assert.throws(() => orbis.enter(memory), /not implemented/);

console.log("✓ all worldProvider.js contract tests passed");
