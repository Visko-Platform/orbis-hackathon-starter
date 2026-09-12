import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
await mkdir("test-results", { recursive: true });

// Standalone HTTP regression: uses fresh browser ownership; never calls sponsors.
const base = (process.env.CUTLINE_TEST_BASE || "http://localhost:3000").replace(
  /\/$/,
  "",
);
const parsedBase = new URL(base);
if (!["localhost", "127.0.0.1", "[::1]"].includes(parsedBase.hostname))
  throw new Error(
    "Run these fixture mutations only against a local Cutline server.",
  );
const results = [],
  fixtures = [];
let assertions = 0,
  providerCalls = 0,
  removed = 0,
  cookie = "";
const equal = (actual, expected, label) => {
  assertions++;
  assert.deepEqual(actual, expected, label);
};
const ok = (value, label) => {
  assertions++;
  assert.ok(value, label);
};
async function test(name, run) {
  const start = Date.now();
  try {
    await run();
    results.push({ name, pass: true, ms: Date.now() - start });
    console.log("PASS", name);
  } catch (error) {
    results.push({
      name,
      pass: false,
      error: error.message,
      ms: Date.now() - start,
    });
    console.log("FAIL", name, error.message);
  }
}
async function call(path, { method = "GET", body } = {}) {
  if (path.includes("/token") || body?.planning === "nebius")
    throw new Error("Provider calls are forbidden in this harness.");
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  return { status: response.status, data, headers: response.headers };
}
async function create(templateId, extra = {}) {
  const result = await call("/api/stories", {
    method: "POST",
    body: {
      templateId,
      title: "Temporary cosmic preservation regression",
      ...extra,
    },
  });
  equal(result.status, 201, "fixture creation: " + JSON.stringify(result.data));
  fixtures.push(result.data.story.id);
  return result.data.story;
}
async function act(story, action) {
  const result = await call("/api/stories/" + story.id + "/action", {
    method: "POST",
    body: { ...action, planning: "rehearsal", version: story.version },
  });
  equal(
    result.status,
    200,
    "action " + action.type + ": " + JSON.stringify(result.data),
  );
  equal(
    result.data.story.version,
    story.version + 1,
    "action advances version once",
  );
  return result.data.story;
}
const current = (story) =>
  story.state.scenes.find((scene) => scene.id === story.state.currentSceneId);
async function replay(story, expectedScenes, expectedMemory) {
  const id = story.state.currentSceneId;
  for (const chapter of [0, 5, 7, 8]) {
    story = await act(story, { type: "cosmic", chapter, running: false });
    equal(
      story.state.phase,
      chapter === 8 ? "story" : "opening",
      "phase matches chapter",
    );
    equal(
      story.state.currentSceneId,
      id,
      "presentation does not change current scene",
    );
    equal(
      story.state.scenes,
      expectedScenes,
      "presentation preserves all beat fields",
    );
    equal(
      story.state.memory,
      expectedMemory,
      "presentation preserves edited continuity memory",
    );
  }
  const fresh = await call("/api/stories/" + story.id);
  equal(fresh.status, 200, "fixture reads back");
  equal(
    fresh.data.story.state.scenes,
    expectedScenes,
    "preserved scenes persisted",
  );
  equal(
    fresh.data.story.state.memory,
    expectedMemory,
    "preserved memory persisted",
  );
  return fresh.data.story;
}

try {
  const boot = await call("/api/bootstrap");
  equal(boot.status, 200, "bootstrap succeeds");
  cookie = boot.headers.get("set-cookie")?.split(";")[0] || "";
  ok(
    cookie.startsWith("cutline_session="),
    "isolated ownership cookie established",
  );
  // Deliberately ignore provider configuration: every action is explicit rehearsal.
  let canonicalTrain;
  await test("last-train edited prompt and memory survive cosmic replay", async () => {
    canonicalTrain = await create("last-train");
    const editedPrompt =
      "Mara in a burnt-orange coat studies a folded map beside a violet train window. Keep the amber door distant.";
    let story = await create("last-train", { opening: editedPrompt });
    const memory =
      "Mara keeps a folded paper map in her left hand. Preserve violet windows, her orange coat, and the amber door.";
    story = await act(story, { type: "memory", memory });
    equal(
      current(story).prompt,
      editedPrompt,
      "fixture actually has edited opening prompt",
    );
    equal(
      current(story).source,
      "opening",
      "regression exercises opening-source conversion hazard",
    );
    const scenes = structuredClone(story.state.scenes);
    story = await replay(story, scenes, memory);
    await replay(story, scenes, memory);
  });
  await test("custom opening prompt, memory, and choices survive cosmic replay", async () => {
    const prompt =
      "A botanist in a green raincoat studies a bioluminescent fern inside a glass greenhouse at midnight.";
    const memory =
      "Nila is the only botanist. Her green raincoat and the midnight glass greenhouse stay consistent. No trains.";
    let story = await create("custom", { opening: prompt, memory });
    equal(current(story).prompt, prompt, "custom prompt accepted");
    equal(story.state.memory, memory, "custom memory accepted");
    ok(current(story).choices.length === 3, "custom choices exist");
    const scenes = structuredClone(story.state.scenes);
    story = await replay(story, scenes, memory);
    equal(
      current(story).choices,
      scenes[0].choices,
      "custom choices were not replaced by train choices",
    );
    await replay(story, scenes, memory);
  });
  await test("default custom cavern remains intact after entering film", async () => {
    const story = await create("custom"),
      scenes = structuredClone(story.state.scenes),
      memory = story.state.memory;
    ok(
      current(story).prompt.includes("cavern"),
      "default custom fixture is the cavern",
    );
    await replay(story, scenes, memory);
  });
  await test("initial cosmic opening converts to train while preserving edited memory", async () => {
    if (!canonicalTrain) canonicalTrain = await create("last-train");
    let story = await create("cosmic-premiere");
    equal(story.state.phase, "opening", "cosmic template begins in opening");
    const openingId = story.state.currentSceneId;
    const memory =
      "Mara wears her burnt-orange coat and carries a blue notebook. Preserve the notebook when entering the train film.";
    story = await act(story, { type: "memory", memory });
    story = await act(story, { type: "cosmic", chapter: 8, running: false });
    equal(story.state.phase, "story", "initial cosmic conversion enters story");
    equal(
      story.state.currentSceneId,
      openingId,
      "conversion retains opening identity",
    );
    equal(
      story.state.scenes.length,
      1,
      "conversion does not duplicate a scene",
    );
    equal(
      current(story).prompt,
      current(canonicalTrain).prompt,
      "converted prompt is canonical train opening",
    );
    equal(
      current(story).choices,
      current(canonicalTrain).choices,
      "converted choices are canonical train choices",
    );
    equal(
      story.state.memory,
      memory,
      "edited continuity survives first conversion",
    );
    const scenes = structuredClone(story.state.scenes);
    story = await replay(story, scenes, memory);
    await replay(story, scenes, memory);
  });
  await test("default cosmic memory survives initial train conversion", async () => {
    if (!canonicalTrain) canonicalTrain = await create("last-train");
    let story = await create("cosmic-premiere");
    const memory = story.state.memory;
    story = await act(story, { type: "cosmic", chapter: 8, running: false });
    equal(
      current(story).prompt,
      current(canonicalTrain).prompt,
      "default cosmic converts to train",
    );
    equal(story.state.memory, memory, "default cosmic continuity is preserved");
  });
} catch (error) {
  results.push({ name: "setup", pass: false, error: error.message });
  console.log("FAIL setup", error.message);
} finally {
  for (const id of fixtures) {
    try {
      const result = await call("/api/stories/" + id, { method: "DELETE" });
      equal(result.status, 200, "remove own fixture " + id);
      removed++;
      const gone = await call("/api/stories/" + id);
      equal(gone.status, 404, "removed fixture is absent");
    } catch (error) {
      results.push({
        name: "cleanup " + id,
        pass: false,
        error: error.message,
      });
    }
  }
}
const report = {
  base,
  completedAt: new Date().toISOString(),
  assertions,
  passed: results.filter((x) => x.pass).length,
  failed: results.filter((x) => !x.pass).length,
  providerCalls,
  fixturesCreated: fixtures.length,
  fixturesRemoved: removed,
  results,
};
await writeFile(
  "test-results/cosmic-preservation.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.failed ? 1 : 0;
