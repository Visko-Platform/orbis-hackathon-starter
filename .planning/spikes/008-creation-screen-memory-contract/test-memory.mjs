// Contract test for memory.js. Run: node test-memory.mjs
import assert from "node:assert/strict";
import { buildMemory, derivePersonLabel } from "./memory.js";

// derivePersonLabel: the "My X" heuristic
assert.equal(derivePersonLabel("My grandmother"), "Grandmother");
assert.equal(derivePersonLabel("my tita Baby"), "Tita Baby");
assert.equal(derivePersonLabel("Lola"), "Lola"); // no "My " prefix — passes through
assert.equal(derivePersonLabel("She's my grandma"), "She's my grandma"); // known limitation: "my" mid-sentence isn't stripped
assert.equal(derivePersonLabel(""), "");

// buildMemory: happy path
const mem = buildMemory({
  relationship: "My grandmother",
  place: "Cavite City, Philippines",
  year: "1956",
  memory: "She went to the market with her mother.",
  photo: "data:image/png;base64,AAAA",
});
assert.equal(mem.person, "Grandmother");
assert.equal(mem.relationship, "My grandmother");
assert.equal(mem.place, "Cavite City, Philippines");
assert.equal(mem.year, "1956");
assert.equal(mem.memory, "She went to the market with her mother.");
assert.equal(mem.photo, "data:image/png;base64,AAAA");
assert.ok(mem.id.startsWith("mem-"));
assert.ok(mem.createdAt);

// buildMemory: missing-field validation
assert.throws(
  () => buildMemory({ relationship: "", place: "X", year: "1956", memory: "Y", photo: "z" }),
  /relationship/
);
assert.throws(
  () => buildMemory({ relationship: "My aunt", place: "X", year: "1956", memory: "Y", photo: "" }),
  /photo/
);
assert.throws(
  () => buildMemory({ relationship: "", place: "", year: "", memory: "", photo: "" }),
  /relationship, place, year, memory, photo/
);

console.log("✓ all memory.js contract tests passed");
