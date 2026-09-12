const test = require("node:test");
const assert = require("node:assert/strict");
const baseUrl = process.env.ORBIS_TEST_BASE_URL || "http://localhost:3000";
const selection = { profileId: "urban-explorer", titleId: "sintel-mountain", campaignId: "pepsi-thirsty-for-more", selectionMode: "manual", sceneBrief: "A sunlit cafe", assetId: "pepsi-can" };
const pivot = { campaignId: selection.campaignId, currentPrompt: "OLD_SCENE", direction: "Fly through a snowy mountain pass", preserveBrand: true, mode: "pivot" };
async function post(path, data) {
  return fetch(baseUrl + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), signal: AbortSignal.timeout(15_000) });
}

test("prepare returns a no-store, asset-aware run", async () => {
  const response = await post("/api/continuations/prepare", selection);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const result = await response.json();
  assert.ok(result.runId);
  assert.match(result.prompt, /Pepsi original can/);
  assert.match(result.prompt, /Product reference: A blue Pepsi can/);
  assert.equal(result.engineered.source, selection.sceneBrief);
  assert.ok(result.prompt.includes(result.engineered.text));
});

test("manual selection can choose Nike while auto mode enforces matching", async () => {
  const request = { ...selection, campaignId: "nike-move-through-it", assetId: "nike-logo" };
  assert.equal((await post("/api/continuations/prepare", request)).status, 200);
  assert.equal((await post("/api/continuations/prepare", { ...request, selectionMode: "auto" })).status, 409);
});

test("a pivot returns an action beat ahead of the settled prompt; a refinement has none", async () => {
  const response = await post("/api/continuations/pivot", pivot);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.ok(result.actionPrompt.includes("Right now"));
  assert.ok(result.prompt.includes("New creative direction"));
  const refine = await (await post("/api/continuations/pivot", { ...pivot, mode: "refine" })).json();
  assert.equal(refine.actionPrompt, null);
});

test("a back-of-watch pivot carries the case-back appearance of the running Rolex", async () => {
  const response = await post("/api/continuations/pivot", { ...pivot, campaignId: "rolex-perpetual-moment", assetId: "rolex-submariner", direction: "Turn the watch over and show me the back" });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.match(result.prompt, /Submariner Date, case back/);
  assert.match(result.actionPrompt, /no engraving/);
  assert.equal((await post("/api/continuations/pivot", { ...pivot, assetId: 42 })).status, 400);
});

test("prepare accepts the Rolex campaign with a wrist-worn product", async () => {
  const response = await post("/api/continuations/prepare", { ...selection, campaignId: "rolex-perpetual-moment", assetId: "rolex-submariner" });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.match(result.prompt, /wrist/);
  assert.equal(result.assetId, "rolex-submariner");
});


test("the Rolex demo path resolves bubbles and free text into fixed beats", async () => {
  const base = { campaignId: "rolex-perpetual-moment", currentPrompt: "OLD_SCENE" };
  const byId = await post("/api/continuations/demo", { ...base, stepId: "inspect" });
  assert.equal(byId.status, 200);
  const result = await byId.json();
  assert.equal(result.step.id, "inspect");
  assert.match(result.prompt, /case back/);
  assert.match(result.actionPrompt, /Right now/);
  assert.ok(result.productNotes.some((note) => /no engraving/.test(note)));
  assert.deepEqual(result.nextChips.map((chip) => chip.id), ["wear", "exit", "boutique"]);
  assert.ok(result.promptVersionId);
  const byText = await (await post("/api/continuations/demo", { ...base, direction: "can you show the back" })).json();
  assert.equal(byText.step.id, "inspect");
  assert.equal(byText.engineered.source, "can you show the back");
  assert.equal((await post("/api/continuations/demo", { ...base, direction: "make it rain" })).status, 422);
  assert.equal((await post("/api/continuations/demo", { campaignId: "pepsi-thirsty-for-more", currentPrompt: "", stepId: "inspect" })).status, 404);
  assert.equal((await post("/api/continuations/demo", { ...base, stepId: 7 })).status, 400);
});
for (const [name, fields] of [
  ["invalid profile", { profileId: "unknown" }],
  ["cross-campaign asset", { assetId: "nike-logo" }],
  ["invalid asset type", { assetId: {} }],
  ["empty scene brief", { sceneBrief: " " }],
  ["oversized scene brief", { sceneBrief: "x".repeat(1201) }],
  ["invalid selection mode", { selectionMode: "other" }],
]) {
  test(`prepare rejects ${name}`, async () => assert.equal((await post("/api/continuations/prepare", { ...selection, ...fields })).status, 400));
}

test("pivot drops old scene context and supports removing the brand", async () => {
  const response = await post("/api/continuations/pivot", { ...pivot, preserveBrand: false });
  assert.equal(response.status, 200);
  const result = await response.json();
  // The direction is engineered before it is wrapped; the receipt keeps the original.
  assert.equal(result.outcome, "steer");
  assert.equal(result.engineered.source, pivot.direction);
  assert.ok(result.prompt.includes(result.engineered.text));
  assert.ok(!result.prompt.includes("OLD_SCENE"));
  assert.ok(!result.prompt.includes("Pepsi"));
  assert.ok(result.promptVersionId);
});

test("refine preserves current scene context and restates the product", async () => {
  const response = await post("/api/continuations/pivot", { ...pivot, mode: "refine" });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.ok(result.prompt.includes("OLD_SCENE"));
  assert.ok(result.prompt.includes("The product looks like this:"));
});

test("a product question is answered from approved facts, not sent as a prompt", async () => {
  const response = await post("/api/continuations/pivot", { ...pivot, direction: "how many calories in a can?" });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.outcome, "overlay");
  assert.match(result.answer, /150 calories/);
  assert.equal(result.prompt, undefined);
});

test("a question with no approved answer is refused", async () => {
  assert.equal((await post("/api/continuations/pivot", { ...pivot, direction: "who is the CEO?" })).status, 422);
});

test("a direction naming a competitor is refused", async () => {
  assert.equal((await post("/api/continuations/pivot", { ...pivot, direction: "swap the can for a Coca-Cola" })).status, 400);
});

test("knowledge is readable, writable, and validated", async () => {
  const url = baseUrl + "/api/campaigns/pepsi-thirsty-for-more/knowledge";
  const current = await (await fetch(url)).json();
  assert.equal(current.product.name, "Pepsi");
  const put = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(current) });
  assert.equal(put.status, 200);
  assert.ok((await put.json()).updatedAt);
  const bad = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product: { name: "" } }) });
  assert.equal(bad.status, 400);
  assert.match((await bad.json()).error, /product\.name/);
  assert.equal((await fetch(baseUrl + "/api/campaigns/unknown/knowledge")).status, 404);
});

test("suggestions come from the knowledge", async () => {
  const response = await fetch(baseUrl + "/api/campaigns/nike-move-through-it/suggestions");
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.ok(Array.isArray(result.suggestions) && result.suggestions.length >= 3);
  assert.ok(["gemini", "default"].includes(result.source));
});

for (const [name, fields] of [
  ["empty direction", { direction: " " }],
  ["oversized direction", { direction: "x".repeat(1201) }],
  ["invalid direction type", { direction: [] }],
  ["invalid mode", { mode: "other" }],
  ["invalid boolean", { preserveBrand: "false" }],
  ["unknown campaign", { campaignId: "unknown" }],
  ["oversized context", { currentPrompt: "x".repeat(4001) }],
]) {
  test(`pivot rejects ${name}`, async () => assert.equal((await post("/api/continuations/pivot", { ...pivot, ...fields })).status, 400));
}

test("malformed JSON fails cleanly", async () => {
  const response = await fetch(baseUrl + "/api/continuations/pivot", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  assert.equal(response.status, 400);
});

test("audience endpoint recommends Nike to culture runners", async () => {
  const response = await fetch(baseUrl + "/api/continuations/eligible?profileId=culture-runner&titleId=sintel-mountain");
  assert.equal(response.status, 200);
  assert.equal((await response.json()).campaign.brand, "Nike");
});

test("a product image can be described into draft product info", async () => {
  const image = await fetch(baseUrl + "/brands/pepsi/pepsi-can.jpg").then((r) => r.blob());
  const data = new FormData();
  data.set("image", new File([image], "pepsi-can.jpg", { type: "image/jpeg" }));
  const response = await fetch(baseUrl + "/api/campaigns/pepsi-thirsty-for-more/knowledge/describe", { method: "POST", body: data, signal: AbortSignal.timeout(40_000) });
  // 503 when the server has no Gemini key; otherwise a draft with an appearance and notes.
  assert.ok([200, 503].includes(response.status), `status ${response.status}`);
  if (response.status === 200) {
    const draft = await response.json();
    assert.match(draft.appearance, /Pepsi/);
    assert.ok(Array.isArray(draft.visualNotes) && draft.visualNotes.length >= 2);
  }
  const bad = await fetch(baseUrl + "/api/campaigns/pepsi-thirsty-for-more/knowledge/describe", { method: "POST", body: new FormData() });
  assert.ok([400, 503].includes(bad.status));
});
