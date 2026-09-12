import { mkdirSync } from "node:fs";
mkdirSync("test-results", { recursive: true });
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
const root = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const require = createRequire(root + "/package.json");
const ts = require("typescript");
const slots = [];
let cursor = 0;
const timers = new Map();
let timerId = 0;
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
      (x) => (slots[i] = typeof x === "function" ? x(slots[i]) : x),
    ];
  },
  useCallback: (fn) => fn,
  useEffect() {},
};
const instances = [];
let rejectOldReference,
  firstReferenceSeen = false;
const firstReference = new Promise(
  (_, reject) => (rejectOldReference = reject),
);
class FakeReactor {
  constructor() {
    this.handlers = new Map();
    this.disconnected = false;
    instances.push(this);
  }
  on(name, fn) {
    this.handlers.set(name, fn);
  }
  emit(type, data = {}) {
    this.handlers.get("message")?.({ type, data });
  }
  getStatus() {
    return this.disconnected ? "disconnected" : "ready";
  }
  getLastError() {}
  async connect() {}
  async disconnect() {
    this.disconnected = true;
  }
  async uploadFile() {
    return { uploadId: "synthetic" };
  }
  async sendCommand(name) {
    if (name === "set_image") return { type: "image_accepted", data: {} };
    if (name === "set_prompt") {
      this.emit("conditions_ready");
      return { type: "prompt_accepted", data: {} };
    }
    if (name === "start") {
      this.emit("generation_started", { image_conditioned: true });
      return undefined;
    }
    return { type: "generation_reset", data: {} };
  }
}
class FakeStream {
  constructor() {
    this.tracks = [];
  }
  getTracks() {
    return this.tracks;
  }
  addTrack(t) {
    this.tracks.push(t);
  }
  removeTrack(t) {
    this.tracks = this.tracks.filter((x) => x !== t);
  }
}
const source = fs.readFileSync(
  root + "/components/cutline/use-live-video.ts",
  "utf8",
);
const code = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
  },
}).outputText;
const mod = { exports: {} };
const imports = {
  react: hooks,
  "@reactor-team/js-sdk": { Reactor: FakeReactor },
  "@/lib/cutline/orbis/starter": {
    unwrapOrbisMessage: (r) =>
      r?.data ? { ...r.data, type: r.type } : r || {},
  },
  "@/lib/cutline/references": {
    referenceFile: async () => {
      if (!firstReferenceSeen) {
        firstReferenceSeen = true;
        return firstReference;
      }
      return new File(["synthetic"], "ref.png");
    },
  },
};
new Function(
  "require",
  "exports",
  "module",
  "fetch",
  "MediaStream",
  "setTimeout",
  "clearTimeout",
  code,
)(
  (id) => imports[id] || require(id),
  mod.exports,
  mod,
  async () => ({
    ok: true,
    json: async () => ({ jwt: "synthetic-token", model: "synthetic-model" }),
  }),
  FakeStream,
  (fn, ms) => {
    timers.set(++timerId, { fn, ms });
    return timerId;
  },
  (id) => timers.delete(id),
);
const keys = { reactor: "", nebius: "", accessCode: "" };
const render = () => {
  cursor = 0;
  return mod.exports.useLiveVideo(keys);
};
let hook = render();
const old = hook.connect({ id: "OLD" }, "Old take", "/old.png").catch((e) => e);
for (let i = 0; i < 12 && !firstReferenceSeen; i++) await Promise.resolve();
assert.ok(firstReferenceSeen);
await hook.disconnect();
hook = render();
await hook.connect({ id: "NEW" }, "New take", "/new.png");
assert.equal(instances.length, 2);
assert.equal(instances[1].disconnected, false);
rejectOldReference(new Error("Old reference image failed"));
await old;
const staleFailureKilledNewSession = instances[1].disconnected;
console.log(JSON.stringify({ staleFailureKilledNewSession, providerCalls: 0 }));
fs.writeFileSync(
  "test-results/live-lifecycle.json",
  JSON.stringify({ staleFailureKilledNewSession, providerCalls: 0 }, null, 2),
);

await hook.disconnect();
hook = render();
await hook.connect({ id: "FRAME" }, "Frame trace take", "/frame.png");
hook = render();
await hook.sendPrompt("Mara opens a door.", "Test cue");
instances.at(-1).emit("chunk_complete", { frames_emitted: 0, delivered: null });
hook = render();
const zeroFrameMarkedObserved = hook.trace?.status === "next-chunk";
console.log(
  JSON.stringify({
    zeroFrameMarkedObserved,
    trace: hook.trace?.status,
    providerCalls: 0,
  }),
);
fs.writeFileSync(
  "test-results/live-lifecycle.json",
  JSON.stringify(
    { staleFailureKilledNewSession, zeroFrameMarkedObserved, providerCalls: 0 },
    null,
    2,
  ),
);
await hook.disconnect();
assert.equal(
  staleFailureKilledNewSession,
  false,
  "A cancelled old connect failure must not disconnect a newer session",
);
assert.equal(
  zeroFrameMarkedObserved,
  false,
  "Zero-frame chunks must not be described as visible progress",
);
