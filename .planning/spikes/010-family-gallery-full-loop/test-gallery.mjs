// Full-loop integration test for spike 010. Exercises gallery.js's pure
// merge logic AND the real memory.js + worldProvider.js modules together —
// this is the test that actually proves 008+009+010 integrate, not just
// that each spike works alone. Run: node test-gallery.mjs
//
// Uses a minimal in-memory localStorage stub since Node has no DOM/storage
// by default — memory.js/gallery.js only ever call getItem/setItem, so a
// plain object-backed stub is sufficient (no jsdom dependency needed).
import assert from "node:assert/strict";

globalThis.localStorage = (() => {
  let store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
  };
})();

const { buildMemory, loadFamily } = await import("../008-creation-screen-memory-contract/memory.js");
const { createMockWorldProvider } = await import("../009-mock-world-provider/worldProvider.js");
const { SEED_FAMILY, missingSeeds, ensureSeedsInStorage } = await import("./gallery.js");

// --- missingSeeds is pure and correct ---
assert.equal(missingSeeds([]).length, 3);
assert.equal(missingSeeds([{ id: "seed-lola" }]).length, 2);
assert.equal(missingSeeds(SEED_FAMILY).length, 0);

// --- ensureSeedsInStorage: idempotent, additive, doesn't clobber user data ---
localStorage.clear();
const userMemory = buildMemory({
  relationship: "My tita",
  place: "Manila, Philippines",
  year: "1978",
  memory: "She taught piano on weekends.",
  photo: "data:image/png;base64,AAAA",
});
localStorage.setItem("familyWorldMemories", JSON.stringify([userMemory]));

let all = ensureSeedsInStorage();
assert.equal(all.length, 4); // 1 pre-existing user memory + 3 seeds
assert.ok(all.some((m) => m.id === userMemory.id), "user memory survives seeding");
assert.ok(SEED_FAMILY.every((s) => all.some((m) => m.id === s.id)), "all 3 seeds present");

const before = JSON.stringify(loadFamily());
ensureSeedsInStorage(); // calling again must not duplicate
assert.equal(JSON.stringify(loadFamily()), before, "ensureSeedsInStorage is idempotent");
assert.equal(loadFamily().length, 4);

// --- THE required demo loop, across real modules: ---
// Lola -> Enter Her World -> Market -> Home -> Exit -> another relative (Yay)
const lola = loadFamily().find((m) => m.id === "seed-lola");
const yay = loadFamily().find((m) => m.id === "seed-yay");
const provider = createMockWorldProvider();

const lolaSession = provider.enter(lola);
assert.equal(lolaSession.current().key, "home");
lolaSession.goTo("market");
assert.match(lolaSession.current().narration, /Lola/);
lolaSession.goTo("home");
lolaSession.exit();
assert.equal(lolaSession.current().key, "home", "exiting Lola's world resets cleanly");

const yaySession = provider.enter(yay); // "another relative"
assert.equal(yaySession.current().key, "home");
assert.match(yaySession.current().narration, /Yay/);
assert.notEqual(yaySession, lolaSession, "each relative gets an independent session");

console.log("✓ all spike-010 full-loop integration tests passed");
