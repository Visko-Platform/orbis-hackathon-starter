import { mkdirSync } from "node:fs";
mkdirSync("test-results", { recursive: true });
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
const root = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const require = createRequire(root + "/package.json");
const ts = require("typescript");
const results = [];
let assertions = 0;
const equal = (a, b, m) => {
  assertions++;
  assert.deepEqual(a, b, m);
};
const ok = (a, m) => {
  assertions++;
  assert.ok(a, m);
};
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, pass: true });
    console.log("PASS", name);
  } catch (e) {
    results.push({ name, pass: false, error: e.message });
    console.log("FAIL", name, e.message);
  }
}
function moduleAt(path, deps = {}, extra = {}) {
  const text = fs.readFileSync(root + "/" + path, "utf8");
  const js = ts.transpileModule(text, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const mod = { exports: {} };
  const names = Object.keys(extra),
    values = Object.values(extra);
  new Function("require", "module", "exports", "process", ...names, js)(
    (id) => (id in deps ? deps[id] : require(id)),
    mod,
    mod.exports,
    { env: {} },
    ...values,
  );
  return mod.exports;
}
class AuditError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const scene = {
  id: crypto.randomUUID(),
  parentId: null,
  title: "Start",
  prompt: "Mara is inside the train.",
  action: "Opening",
  choices: [
    {
      id: "a",
      label: "Open door",
      detail: "Light enters",
      action: "Mara opens the door.",
    },
  ],
  source: "opening",
  createdAt: 1,
};
const story = {
  id: "AUDIT001",
  version: 1,
  title: "Audit",
  templateId: "last-train",
  state: {
    scenes: [scene],
    currentSceneId: scene.id,
    memory: "Mara wears an orange coat.",
  },
};
await test("default and explicit rehearsal never resolve keys or call a provider", async () => {
  let keys = 0,
    budgets = 0,
    calls = 0;
  const server = {
    HttpError: AuditError,
    providerKey() {
      keys++;
      throw new Error("Rehearsal must not resolve a provider key");
    },
    setting() {
      throw new Error("Rehearsal must not read model configuration");
    },
    async sharedBudget() {
      budgets++;
    },
  };
  const director = moduleAt(
    "lib/cutline/director.ts",
    {
      "./server": server,
      "./content": {
        TEMPLATES: [{ id: "last-train", choices: scene.choices }],
      },
      "./story": { activePath: () => [scene] },
    },
    {
      fetch: async () => {
        calls++;
        throw new Error("Provider fetch forbidden");
      },
    },
  );
  const request = new Request("http://audit.invalid");
  for (const planning of [undefined, "rehearsal"]) {
    const beat = await director.direct(
      request,
      story,
      "Mara slowly opens the train door.",
      planning,
    );
    equal(beat.source, "rehearsal");
    equal(beat.parentId, scene.id);
  }
  equal({ keys, budgets, calls }, { keys: 0, budgets: 0, calls: 0 });
});
await test("Nebius requires credentials and reserves global budget before fetch", async () => {
  let calls = 0,
    budgets = 0,
    haveKey = false;
  const server = {
    HttpError: AuditError,
    providerKey: () => (haveKey ? "synthetic-fixture" : ""),
    setting: () => "",
    async sharedBudget() {
      budgets++;
      throw new AuditError(429, "Fixture global cap");
    },
  };
  const director = moduleAt(
    "lib/cutline/director.ts",
    {
      "./server": server,
      "./content": { TEMPLATES: [] },
      "./story": { activePath: () => [scene] },
    },
    {
      fetch: async () => {
        calls++;
        throw new Error("Provider fetch forbidden");
      },
    },
  );
  await assert.rejects(
    () =>
      director.direct(
        new Request("http://audit.invalid"),
        story,
        "Open door",
        "nebius",
      ),
    (e) => e.status === 422,
  );
  assertions++;
  haveKey = true;
  await assert.rejects(
    () =>
      director.direct(
        new Request("http://audit.invalid"),
        story,
        "Open door",
        "nebius",
      ),
    (e) => e.status === 429,
  );
  assertions++;
  equal({ calls, budgets }, { calls: 0, budgets: 1 });
});
await test("shared budget is global across cookies, per-provider, and skips personal keys", async () => {
  const counts = new Map();
  const env = {
    SHARED_REACTOR_HOURLY_LIMIT: "2",
    SHARED_NEBIUS_HOURLY_LIMIT: "3",
    DB: {
      prepare(sql) {
        ok(
          sql.includes("WHERE count < ?"),
          "limiter uses bounded atomic update",
        );
        let values;
        return {
          bind(...args) {
            values = args;
            return this;
          },
          async first() {
            const [owner, bucket, limit] = values;
            const key = owner + "|" + bucket;
            const previous = counts.get(key) || 0;
            if (previous >= limit) return null;
            counts.set(key, previous + 1);
            return { count: previous + 1 };
          },
        };
      },
    },
  };
  const server = moduleAt("lib/cutline/server.ts", {
    "cloudflare:workers": { env },
  });
  const req = (cookie, personal) =>
    new Request("http://audit.invalid", {
      headers: {
        Cookie: "cutline_session=" + cookie,
        ...(personal ? { "x-reactor-key": "synthetic-personal" } : {}),
      },
    });
  await server.sharedBudget(req("a".repeat(64)), "reactor");
  await server.sharedBudget(req("b".repeat(64)), "reactor");
  await assert.rejects(
    () => server.sharedBudget(req("c".repeat(64)), "reactor"),
    (e) => e.status === 429,
  );
  assertions++;
  await server.sharedBudget(req("d".repeat(64), true), "reactor");
  await server.sharedBudget(req("d".repeat(64)), "nebius");
  equal(counts.size, 2);
  ok([...counts.keys()].every((k) => k.startsWith("shared-provider|")));
});
await test("late story action retains selected room and sends expected version", async () => {
  const slots = [];
  let cursor = 0,
    resolveRequest,
    requestBody;
  const hooks = {
    useRef(init) {
      const i = cursor++;
      return (slots[i] ??= { current: init });
    },
    useState(init) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = init;
      return [
        slots[i],
        (value) => {
          slots[i] = typeof value === "function" ? value(slots[i]) : value;
        },
      ];
    },
    useCallback: (fn) => fn,
    useEffect() {},
  };
  const api = moduleAt(
    "components/cutline/use-story.ts",
    {
      react: hooks,
      "./use-live-video": {
        keyHeaders: () => ({ "Content-Type": "application/json" }),
      },
    },
    {
      fetch: (_url, opts) => {
        requestBody = JSON.parse(opts.body);
        return new Promise((resolve) => (resolveRequest = resolve));
      },
      window: {
        history: { replaceState() {} },
        location: { href: "http://audit.invalid/" },
      },
    },
  );
  const keys = { reactor: "", nebius: "", accessCode: "" };
  const render = () => {
    cursor = 0;
    return api.useStory(keys);
  };
  let hook = render();
  hook.select(story);
  hook = render();
  const pending = hook.act({
    type: "memory",
    memory: "Mara remains on the train.",
  });
  equal(requestBody.version, 1);
  equal(requestBody.planning, "rehearsal");
  const second = { ...story, id: "AUDIT002", title: "Second room" };
  hook.select(second);
  hook = render();
  resolveRequest({
    ok: true,
    json: async () => ({ story: { ...story, version: 2 } }),
  });
  await pending;
  hook = render();
  equal(hook.story.id, "AUDIT002");
  equal(hook.stories.find((x) => x.id === "AUDIT001").version, 2);
});
const base = process.env.CUTLINE_TEST_BASE || "http://localhost:3000";
const fixtures = [];
let owner, viewer;
async function client() {
  const response = await fetch(base + "/api/bootstrap", {
    signal: AbortSignal.timeout(5000),
  });
  equal(response.status, 200);
  const config = await response.json();
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  ok(cookie);
  return { cookie, config };
}
async function call(who, path, body, method = "POST") {
  // This harness never sends provider keys, presenter codes or token requests.
  if (path.endsWith("/token"))
    throw new Error("Provider-token requests prohibited");
  if (body?.planning === "nebius")
    throw new Error("Real Nebius planning prohibited");
  const response = await fetch(base + path, {
    method,
    headers: { Cookie: who.cookie, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(6000),
  });
  return { status: response.status, data: await response.json() };
}
async function create(template = "last-train") {
  const response = await call(owner, "/api/stories", {
    templateId: template,
    title: "Temporary regression fixture",
  });
  equal(response.status, 201);
  fixtures.push(response.data.story.id);
  return response.data.story;
}
async function act(story, action, expected = 200) {
  const result = await call(owner, "/api/stories/" + story.id + "/action", {
    ...action,
    version: story.version,
  });
  equal(result.status, expected, JSON.stringify(result.data));
  return result.data.story;
}
try {
  owner = await client();
  viewer = await client();
  await test("HTTP direct defaults to rehearsal and persists explicit rehearsal", async () => {
    let s = await create();
    s = await act(s, {
      type: "direct",
      prompt: "Mara slowly opens the train door.",
    });
    equal(s.state.scenes.at(-1).source, "rehearsal");
    s = await act(s, {
      type: "direct",
      prompt: "Mara steps into the warm light.",
      planning: "rehearsal",
    });
    equal(s.state.scenes.at(-1).source, "rehearsal");
    equal(s.state.scenes.length, 3);
  });
  await test("HTTP cosmic transition clears active poll and rejects stale votes", async () => {
    let s = await create();
    s = await act(s, { type: "poll.open" });
    const poll = s.state.poll,
      choice = s.state.scenes[0].choices[0].id;
    s = await act(s, { type: "cosmic", chapter: 0, running: false });
    equal(s.state.phase, "opening");
    equal(s.state.poll, null);
    const vote = await call(viewer, "/api/stories/" + s.id + "/vote", {
      pollId: poll.id,
      choiceId: choice,
    });
    equal(vote.status, 409);
    await act(s, { type: "poll.open" }, 409);
    s = await act(s, { type: "cosmic", chapter: 8, running: false });
    s = await act(s, { type: "poll.open" });
    ok(s.state.poll.open);
  });
  await test("HTTP stale close cannot close a replacement poll", async () => {
    let s = await create();
    s = await act(s, { type: "poll.open" });
    const stale = s;
    s = await act(s, { type: "poll.close" });
    s = await act(s, { type: "poll.open" });
    await act(stale, { type: "poll.close" }, 409);
    const read = await call(owner, "/api/stories/" + s.id, undefined, "GET");
    equal(read.data.story.state.poll.open, true);
    equal(read.data.story.state.poll.id, s.state.poll.id);
  });
  await test("HTTP poll winner applies once in rehearsal and rejects post-close votes", async () => {
    let s = await create();
    s = await act(s, { type: "poll.open" });
    const poll = s.state.poll,
      choice = s.state.scenes[0].choices[1];
    const vote = await call(viewer, "/api/stories/" + s.id + "/vote", {
      pollId: poll.id,
      choiceId: choice.id,
    });
    equal(vote.status, 200);
    s = await act(s, { type: "poll.close" });
    equal(s.state.poll.winnerId, choice.id);
    equal(s.state.poll.results, { [choice.id]: 1 });
    equal(
      (
        await call(viewer, "/api/stories/" + s.id + "/vote", {
          pollId: poll.id,
          choiceId: choice.id,
        })
      ).status,
      409,
    );
    s = await act(s, { type: "poll.apply" });
    equal(s.state.poll.applied, true);
    equal(s.state.scenes.at(-1).source, "rehearsal");
    equal(s.state.scenes.at(-1).action, choice.action);
    await act(s, { type: "poll.apply" }, 409);
  });
} catch (e) {
  results.push({ name: "HTTP setup", pass: false, error: e.message });
  console.log("FAIL HTTP setup", e.message);
} finally {
  for (const id of fixtures) {
    try {
      equal(
        (await call(owner, "/api/stories/" + id, undefined, "DELETE")).status,
        200,
      );
    } catch (e) {
      results.push({
        name: "fixture cleanup " + id,
        pass: false,
        error: e.message,
      });
    }
  }
}
const report = {
  completedAt: new Date().toISOString(),
  assertions,
  passed: results.filter((x) => x.pass).length,
  failed: results.filter((x) => !x.pass).length,
  providerCalls: 0,
  fixturesRemoved: fixtures.length,
  results,
};
fs.writeFileSync(
  "test-results/regressions.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.failed ? 1 : 0;
