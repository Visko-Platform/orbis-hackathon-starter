import test from "node:test";
import assert from "node:assert/strict";
import { activePath, pollWinner } from "../lib/cutline/story.ts";
import type { Beat } from "../lib/cutline/types.ts";
const beat = (id: string, parentId: string | null): Beat => ({
  id,
  parentId,
  title: id,
  narration: id,
  prompt: id,
  action: id,
  choices: [],
  source: "rehearsal",
  createdAt: 0,
});
test("branching excludes the abandoned future from director context", () => {
  const scenes = [
    beat("a", null),
    beat("b", "a"),
    beat("c", "b"),
    beat("d", "a"),
  ];
  assert.deepEqual(
    activePath(scenes, "d").map((x) => x.id),
    ["a", "d"],
  );
  assert.deepEqual(
    activePath(scenes, "c").map((x) => x.id),
    ["a", "b", "c"],
  );
});
test("an absent parent never loops or includes unrelated scenes", () => {
  assert.deepEqual(
    activePath([beat("b", "missing"), beat("z", null)], "b").map((x) => x.id),
    ["b"],
  );
});
test("a corrupt parent cycle is bounded", () => {
  assert.equal(activePath([beat("a", "b"), beat("b", "a")], "a").length, 2);
});
test("empty ballots do not invent a winner", () =>
  assert.equal(pollWinner([{ id: "a" }, { id: "b" }], {}), null));
test("ties use the visible choice order", () =>
  assert.equal(pollWinner([{ id: "b" }, { id: "a" }], { a: 2, b: 2 }), "b"));
test("unknown choices cannot win", () =>
  assert.equal(pollWinner([{ id: "a" }], { a: 1, malicious: 100 }), "a"));
