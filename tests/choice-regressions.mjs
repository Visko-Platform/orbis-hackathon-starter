import fs from "node:fs";
import assert from "node:assert/strict";
const base = "http://localhost:3000";
const report = {
  checkedAt: new Date().toISOString(),
  providerCalls: 0,
  passed: 0,
  failed: 0,
  results: [],
  fixturesRemoved: 0,
};
let owner, viewer;
const fixtures = [];
async function client() {
  const r = await fetch(base + "/api/bootstrap", {
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(r.status, 200);
  return r.headers.get("set-cookie").split(";")[0];
}
async function call(cookie, path, data, method = "POST") {
  assert.notEqual(data?.planning, "nebius", "No provider calls allowed");
  const r = await fetch(base + path, {
    method,
    headers: { cookie, "content-type": "application/json" },
    body: data ? JSON.stringify(data) : undefined,
    signal: AbortSignal.timeout(5000),
  });
  return { status: r.status, data: await r.json() };
}
async function create() {
  const r = await call(owner, "/api/stories", {
    templateId: "last-train",
    title: "Temporary choice guard regression",
  });
  assert.equal(r.status, 201);
  fixtures.push(r.data.story.id);
  return r.data.story;
}
async function act(story, data, status = 200) {
  const r = await call(owner, "/api/stories/" + story.id + "/action", {
    planning: "rehearsal",
    version: story.version,
    ...data,
  });
  assert.equal(r.status, status, JSON.stringify(r.data));
  return r.data.story;
}
async function read(story) {
  const r = await call(owner, "/api/stories/" + story.id, undefined, "GET");
  assert.equal(r.status, 200);
  return r.data;
}
async function vote(story, choiceId) {
  const r = await call(viewer, "/api/stories/" + story.id + "/vote", {
    pollId: story.state.poll.id,
    choiceId,
  });
  assert.equal(r.status, 200);
}
async function test(name, fn) {
  try {
    await fn();
    report.passed++;
    report.results.push({ name, passed: true });
    console.log("PASS", name);
  } catch (error) {
    report.failed++;
    report.results.push({ name, passed: false, error: error.message });
    console.log("FAIL", name, error.message);
  }
}
try {
  owner = await client();
  viewer = await client();
  await test("Direct during voting returns409 and preserves open poll and ballots", async () => {
    let s = await create();
    s = await act(s, { type: "poll.open" });
    const pollId = s.state.poll.id,
      choice = s.state.scenes[0].choices[0].id;
    await vote(s, choice);
    const before = structuredClone(s);
    await act(
      s,
      { type: "direct", prompt: "Mara turns toward the window." },
      409,
    );
    const snapshot = await read(s);
    assert.equal(snapshot.story.version, before.version);
    assert.equal(
      snapshot.story.state.currentSceneId,
      before.state.currentSceneId,
    );
    assert.equal(
      snapshot.story.state.scenes.length,
      before.state.scenes.length,
    );
    assert.equal(snapshot.story.state.poll.id, pollId);
    assert.equal(snapshot.story.state.poll.open, true);
    assert.equal(snapshot.votes[choice], 1);
    s = await act(snapshot.story, { type: "poll.close" });
    assert.equal(s.state.poll.winnerId, choice);
    assert.equal(s.state.poll.results[choice], 1);
  });
  await test("Paused live winner cannot apply; resume applies exactly once in rehearsal", async () => {
    let s = await create();
    s = await act(s, { type: "poll.open" });
    const choice = s.state.scenes[0].choices[1];
    await vote(s, choice.id);
    s = await act(s, { type: "session", live: true, paused: true });
    s = await act(s, { type: "poll.close" });
    assert.equal(s.state.poll.winnerId, choice.id);
    assert.equal(s.state.poll.open, false);
    assert.ok(!s.state.poll.applied);
    const before = structuredClone(s);
    await act(s, { type: "poll.apply" }, 409);
    s = (await read(s)).story;
    assert.equal(s.version, before.version);
    assert.equal(s.state.scenes.length, before.state.scenes.length);
    assert.ok(!s.state.poll.applied);
    assert.equal(s.state.poll.winnerId, choice.id);
    s = await act(s, { type: "session", live: true, paused: false });
    s = await act(s, { type: "poll.apply" });
    assert.equal(s.state.poll.applied, true);
    assert.equal(s.state.scenes.at(-1).source, "rehearsal");
    assert.equal(s.state.scenes.at(-1).action, choice.action);
    assert.equal(s.state.scenes.at(-1).parentId, before.state.currentSceneId);
    await act(s, { type: "poll.apply" }, 409);
  });
  await test("An old closed poll cannot apply after an unrelated new scene", async () => {
    let s = await create();
    s = await act(s, { type: "poll.open" });
    const choice = s.state.scenes[0].choices[2];
    await vote(s, choice.id);
    s = await act(s, { type: "poll.close" });
    s = await act(s, {
      type: "direct",
      prompt: "Mara sits on the empty train bench.",
    });
    const before = structuredClone(s);
    await act(s, { type: "poll.apply" }, 409);
    s = (await read(s)).story;
    assert.equal(s.version, before.version);
    assert.equal(s.state.currentSceneId, before.state.currentSceneId);
    assert.equal(s.state.scenes.length, before.state.scenes.length);
  });
} catch (error) {
  report.failed++;
  report.results.push({ name: "Setup", passed: false, error: error.message });
} finally {
  for (const id of fixtures) {
    try {
      const r = await call(owner, "/api/stories/" + id, undefined, "DELETE");
      if (r.status === 200) report.fixturesRemoved++;
      else report.failed++;
    } catch {
      report.failed++;
    }
  }
  fs.writeFileSync(
    "test-results/choice-regressions.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
}
process.exitCode = report.failed ? 1 : 0;
