await mkdir("test-results", { recursive: true });
import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
import { activePath } from "../lib/cutline/story.ts";

const base = process.env.CUTLINE_TEST_BASE || "http://localhost:3000";
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname))
  throw new Error("Run test fixture mutations only against a local server.");
const results = [];
const cleanup = [];
let assertionCount = 0;
function ok(condition, message) {
  assertionCount++;
  assert.ok(condition, message);
}
function equal(actual, expected, message) {
  assertionCount++;
  assert.deepEqual(actual, expected, message);
}
async function check(name, run) {
  const started = Date.now();
  try {
    await run();
    results.push({ name, pass: true, ms: Date.now() - started });
    console.log("PASS", name);
  } catch (error) {
    results.push({
      name,
      pass: false,
      error: error.message,
      ms: Date.now() - started,
    });
    console.log("FAIL", name, error.message);
  }
}
async function client() {
  const r = await fetch(base + "/api/bootstrap");
  equal(r.status, 200, "bootstrap succeeds");
  const config = await r.json();
  const cookie = r.headers.get("set-cookie")?.split(";")[0];
  ok(cookie?.startsWith("cutline_session="), "bootstrap creates a cookie");
  return { cookie, config };
}
async function request(
  client,
  path,
  { method = "GET", body, raw, headers = {} } = {},
) {
  if (body?.planning === "nebius")
    throw new Error("Provider requests are forbidden in this suite.");
  if (body && ["direct", "poll.apply"].includes(body.type))
    body = { ...body, planning: "rehearsal" };
  const h = { ...(client ? { Cookie: client.cookie } : {}), ...headers };
  if (body !== undefined || raw !== undefined)
    h["Content-Type"] = "application/json";
  const r = await fetch(base + path, {
    method,
    headers: h,
    body:
      raw !== undefined
        ? raw
        : body !== undefined
          ? JSON.stringify(body)
          : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const text = await r.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: r.status, headers: r.headers, data };
}
async function expect(client, path, status, opts) {
  const r = await request(client, path, opts);
  equal(
    r.status,
    status,
    `${opts?.method || "GET"} ${path}: ${JSON.stringify(r.data).slice(0, 160)}`,
  );
  return r;
}
const owner = await client();
const viewer = await client();
const viewer2 = await client();

const root = "/api/stories";
let story;
const state = async () =>
  (await expect(owner, root + "/" + story.id, 200)).data.story;
const action = async (body, status = 200) =>
  expect(owner, root + "/" + story.id + "/action", status, {
    method: "POST",
    body,
  });
const vote = async (who, pollId, choiceId, status = 200) =>
  expect(who, root + "/" + story.id + "/vote", status, {
    method: "POST",
    body: { pollId, choiceId },
  });
const make = async (who, templateId, title) => {
  const r = await expect(who, root, 201, {
    method: "POST",
    body: { templateId, title },
  });
  cleanup.push({ who, id: r.data.story.id });
  return r.data.story;
};

await check("create/list isolation and owner/audience snapshots", async () => {
  equal(
    (await expect(owner, root, 200)).data.stories,
    [],
    "fresh owner list empty",
  );
  story = await make(owner, "last-train", "Integration test — delete me");
  const other = await make(viewer, "custom", "Audience-owned test — delete me");
  const ownList = (await expect(owner, root, 200)).data.stories;
  const audienceList = (await expect(viewer, root, 200)).data.stories;
  equal(
    ownList.map((x) => x.id),
    [story.id],
  );
  equal(
    audienceList.map((x) => x.id),
    [other.id],
  );
  const mine = (await expect(owner, root + "/" + story.id, 200)).data;
  const theirs = (await expect(viewer, root + "/" + story.id, 200)).data;
  equal(mine.isOwner, true);
  equal(theirs.isOwner, false);
  ok(!Object.hasOwn(mine.story, "owner"), "owner hash is not leaked");
  equal(mine.story.version, 1);
});
if (!story) throw new Error("Cannot continue without test story");

await check(
  "audience cannot direct, mint tokens, export, or delete; anonymous denied",
  async () => {
    await expect(viewer, root + "/" + story.id + "/action", 403, {
      method: "POST",
      body: { type: "direct", prompt: "The train door opens." },
    });
    await expect(viewer, root + "/" + story.id + "/token", 403, {
      method: "POST",
    });
    await expect(viewer, root + "/" + story.id + "/export", 403);
    await expect(viewer, root + "/" + story.id, 403, { method: "DELETE" });
    await expect(null, root + "/" + story.id, 401);
    await expect(null, root, 401);
    await expect(
      owner,
      root + "/" + story.id + "/token",
      owner.config.reactorConfigured ? 403 : 422,
      { method: "POST" },
    );
    equal((await state()).version, 1, "denied actions do not mutate story");
  },
);

await check(
  "invalid input, cross-origin protection, stale versions",
  async () => {
    await expect(owner, root, 400, {
      method: "POST",
      body: { templateId: "missing" },
    });
    await expect(owner, root + "/" + story.id + "/action", 400, {
      method: "POST",
      raw: "{bad json",
    });
    await action({ type: "direct", prompt: "x" }, 400);
    await action({ type: "cosmic", chapter: 9, running: true }, 400);
    await action({ type: "branch", sceneId: "not-a-uuid" }, 400);
    await action({ type: "branch", sceneId: crypto.randomUUID() }, 404);
    await action({ type: "cue", cueId: "unknown" }, 400);
    await action(
      { type: "memory", memory: "Valid memory but stale version", version: 0 },
      409,
    );
    await expect(owner, root + "/" + story.id + "/action", 403, {
      method: "POST",
      body: { type: "poll.open" },
      headers: { Origin: "https://untrusted.example" },
    });
    await expect(owner, root + "/" + story.id + "/action", 403, {
      method: "POST",
      body: { type: "poll.open" },
      headers: { "Sec-Fetch-Site": "cross-site" },
    });
    await expect(owner, root + "/" + story.id + "/action", 413, {
      method: "POST",
      raw: " ".repeat(24001),
    });
    await expect(owner, root + "/invalid", 404);
  },
);

// Run the 25-second stream concurrently with ordinary mutations, then reconnect.
const sseTask = (async () => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35000);
  const started = Date.now();
  const snapshots = [];
  let raw = "";
  try {
    const response = await fetch(base + root + "/" + story.id + "/events", {
      headers: { Cookie: viewer.cookie },
      signal: controller.signal,
    });
    equal(response.status, 200);
    ok(response.headers.get("content-type")?.includes("text/event-stream"));
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = "";
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      const chunk = decoder.decode(part.value, { stream: true });
      raw += chunk;
      pending += chunk;
      let i;
      while ((i = pending.indexOf("\n\n")) >= 0) {
        const block = pending.slice(0, i);
        pending = pending.slice(i + 2);
        const line = block.split("\n").find((x) => x.startsWith("data: "));
        if (line && !block.includes("event: unavailable"))
          snapshots.push(JSON.parse(line.slice(6)));
      }
    }
    const elapsed = Date.now() - started;
    ok(
      elapsed >= 25000 && elapsed < 35000,
      "stream ends at its deliberate 25-second lifetime",
    );
    ok(raw.includes("retry: 500"), "stream configures reconnect delay");
    ok(raw.includes(": heartbeat"), "unchanged state produces heartbeat");
    ok(
      !raw.includes("event: unavailable"),
      "stream remains available beyond 25 seconds",
    );
    ok(snapshots.length >= 2, "stream observes state mutations");
    ok(
      snapshots.every((s) => s.story.id === story.id && s.isOwner === false),
      "stream preserves audience role",
    );
    ok(
      snapshots.some((s) => s.viewers >= 1),
      "viewer heartbeat counted",
    );
    const reconnect = await fetch(base + root + "/" + story.id + "/events", {
      headers: { Cookie: viewer.cookie },
      signal: AbortSignal.timeout(5000),
    });
    equal(reconnect.status, 200);
    const r = reconnect.body.getReader();
    let p = "";
    let fresh;
    while (!fresh) {
      const x = await r.read();
      if (x.done) break;
      p += decoder.decode(x.value);
      const match = p.match(/data: ([^\n]+)\n/);
      if (match) fresh = JSON.parse(match[1]);
    }
    await r.cancel();
    ok(fresh, "reconnect produces snapshot");
    equal(fresh.story.id, story.id);
    equal(
      fresh.story.version,
      (await state()).version,
      "reconnect catches up to latest state",
    );
    await writeFile(
      "test-results/sse-summary.json",
      JSON.stringify(
        {
          elapsedMs: elapsed,
          snapshots: snapshots.length,
          initialVersion: snapshots[0].story.version,
          finalVersion: fresh.story.version,
          unavailable: false,
        },
        null,
        2,
      ),
    );
  } finally {
    clearTimeout(timeout);
  }
})();

await check(
  "poll open, vote replace/idempotence, tie ordering, close gate, and apply once",
  async () => {
    await action({ type: "poll.open" });
    await action({ type: "poll.open" }, 409);
    const opened = await state();
    const poll = opened.state.poll;
    const choices = opened.state.scenes[0].choices;
    await vote(viewer, poll.id, "invalid", 409);
    await vote(viewer, crypto.randomUUID(), choices[0].id, 409);
    let v = await vote(viewer, poll.id, choices[0].id);
    equal(v.data.myVote, choices[0].id);
    v = await vote(viewer, poll.id, choices[0].id);
    equal(v.data.votes, { [choices[0].id]: 1 }, "same vote is idempotent");
    v = await vote(viewer, poll.id, choices[1].id);
    equal(
      v.data.votes,
      { [choices[1].id]: 1 },
      "changing vote replaces previous choice",
    );
    await vote(viewer2, poll.id, choices[0].id);
    const closed = await action({ type: "poll.close" });
    equal(
      closed.data.winner,
      choices[0].id,
      "tie follows displayed choice order",
    );
    equal(closed.data.story.state.poll.results, {
      [choices[0].id]: 1,
      [choices[1].id]: 1,
    });
    equal(closed.data.story.state.poll.open, false);
    await vote(viewer, poll.id, choices[2].id, 409);
    await action({ type: "poll.close" }, 409);
    const applied = await action({ type: "poll.apply" });
    const selected = applied.data.story.state.scenes.at(-1);
    equal(selected.action, choices[0].action);
    equal(selected.source, "rehearsal");
    equal(applied.data.story.state.poll.applied, true);
    await action({ type: "poll.apply" }, 409);
  },
);

await check("no-vote closure has no winner and cannot apply", async () => {
  await action({ type: "poll.open" });
  const r = await action({ type: "poll.close" });
  equal(r.data.winner, null);
  equal(r.data.story.state.poll.results, {});
  equal(r.data.story.state.poll.open, false);
  await action({ type: "poll.apply" }, 409);
});

await check(
  "vote/close and close/visual races preserve atomic frozen results",
  async () => {
    for (let iteration = 0; iteration < 6; iteration++) {
      await action({ type: "poll.open" });
      const s = await state();
      const poll = s.state.poll;
      const current = s.state.scenes.find(
        (x) => x.id === s.state.currentSceneId,
      );
      await vote(viewer, poll.id, current.choices[0].id);
      const requests = await Promise.all([
        request(owner, root + "/" + story.id + "/action", {
          method: "POST",
          body: { type: "poll.close" },
        }),
        request(owner, root + "/" + story.id + "/action", {
          method: "POST",
          body: { type: "visual", sceneId: current.id, status: "acknowledged" },
        }),
        request(viewer2, root + "/" + story.id + "/vote", {
          method: "POST",
          body: { pollId: poll.id, choiceId: current.choices[1].id },
        }),
      ]);
      for (const r of requests)
        ok([200, 409].includes(r.status), "race only succeeds or conflicts");
      let after = (await expect(owner, root + "/" + story.id, 200)).data;
      if (after.story.state.poll.open) {
        await action({ type: "poll.close" });
        after = (await expect(owner, root + "/" + story.id, 200)).data;
      }
      equal(after.story.state.poll.open, false);
      equal(
        after.story.state.poll.results,
        after.votes,
        "frozen results match all admitted votes",
      );
      equal(
        after.story.state.poll.winnerId,
        current.choices[0].id,
        "first choice wins single vote or tie",
      );
      ok(after.story.state.poll.closedAt > 0);
    }
  },
);

await check(
  "branch ancestry excludes abandoned future and preserves descendants",
  async () => {
    const initial = (await state()).state.scenes[0].id;
    const before = await state();
    await action({ type: "direct", prompt: "Mara touches the cold window." });
    const b = (await state()).state.currentSceneId;
    await action({
      type: "direct",
      prompt: "Mara slowly raises her hand toward the light.",
    });
    const c = (await state()).state.currentSceneId;
    await action({ type: "branch", sceneId: initial });
    let s = await state();
    equal(s.state.currentSceneId, initial);
    equal(s.state.poll, null);
    await action({
      type: "direct",
      prompt: "Mara turns toward a quiet sound behind her.",
    });
    s = await state();
    const d = s.state.scenes.find((x) => x.id === s.state.currentSceneId);
    equal(d.parentId, initial);
    equal(d.source, "rehearsal");
    equal(
      activePath(s.state.scenes, d.id).map((x) => x.id),
      [initial, d.id],
      "director ancestry excludes old branch",
    );
    ok(
      s.state.scenes.some((x) => x.id === b) &&
        s.state.scenes.some((x) => x.id === c),
      "other branch remains saved",
    );
    equal(s.state.scenes.length, before.state.scenes.length + 3);
  },
);

await check("memory, camera, session, and visual actions persist", async () => {
  await action({
    type: "memory",
    memory: "Mara remains in the orange coat inside the midnight train.",
  });
  await action({
    type: "cue",
    cueId: "camera",
    prompt: "Static wide shot",
    latency: 42,
  });
  await action({ type: "session", live: true, paused: true });
  let s = await state();
  equal(s.state.camera, "Static wide shot");
  equal(s.state.lastCueLatency, 42);
  equal(s.state.sessionLive, true);
  equal(s.state.sessionPaused, true);
  await action({ type: "session", live: false });
  s = await state();
  equal(s.state.sessionLive, false);
  equal(s.state.sessionPaused, false);
});

await check(
  "JSON and Markdown story exports contain full branch data",
  async () => {
    const r = await expect(owner, root + "/" + story.id + "/export", 200);
    equal(r.data.product, "Cutline");
    equal(r.data.schemaVersion, 1);
    equal(r.data.story.id, story.id);
    equal(
      r.data.story.state.scenes.length,
      (await state()).state.scenes.length,
    );
    ok(r.headers.get("content-disposition")?.includes(".json"));
    const m = await expect(
      owner,
      root + "/" + story.id + "/export?format=md",
      200,
    );
    ok(m.headers.get("content-type")?.includes("text/markdown"));
    ok(m.headers.get("content-disposition")?.includes(".md"));
    ok(m.data.includes("## Story memory"));
    ok(m.data.includes("Parent scene:"));
    ok(m.data.includes("**Source:** rehearsal"));
    ok(
      !JSON.stringify(r.data).includes("cutline_session"),
      "export contains no owner credential",
    );
  },
);

await check(
  "cosmic opening gates voting then transitions into story",
  async () => {
    const cosmic = await make(
      owner,
      "cosmic-premiere",
      "Cosmic integration test — delete me",
    );
    const path = root + "/" + cosmic.id + "/action";
    await expect(owner, path, 409, {
      method: "POST",
      body: { type: "poll.open" },
    });
    await expect(owner, path, 200, {
      method: "POST",
      body: { type: "cosmic", chapter: 8, running: false },
    });
    const s = (await expect(owner, root + "/" + cosmic.id, 200)).data.story;
    equal(s.state.phase, "story");
    equal(s.state.cosmicChapter, 8);
    await expect(owner, path, 200, {
      method: "POST",
      body: { type: "poll.open" },
    });
  },
);

await check(
  "SSE runs beyond 25 seconds, receives mutations, and reconnects",
  () => sseTask,
);

await check("delete test stories and confirm list isolation/404", async () => {
  for (const item of cleanup) {
    await expect(item.who, root + "/" + item.id, 200, { method: "DELETE" });
    await expect(item.who, root + "/" + item.id, 404);
  }
  equal((await expect(owner, root, 200)).data.stories, []);
  equal((await expect(viewer, root, 200)).data.stories, []);
});

const report = {
  base,
  completedAt: new Date().toISOString(),
  assertions: assertionCount,
  passed: results.filter((x) => x.pass).length,
  failed: results.filter((x) => !x.pass).length,
  results,
};
await writeFile("test-results/results.json", JSON.stringify(report, null, 2));
console.log(
  JSON.stringify({
    assertions: report.assertions,
    passed: report.passed,
    failed: report.failed,
  }),
);
process.exitCode = report.failed ? 1 : 0;
