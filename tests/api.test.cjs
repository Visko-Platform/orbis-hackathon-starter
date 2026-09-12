const test = require("node:test");
const assert = require("node:assert/strict");
const baseUrl = process.env.ORBIS_TEST_BASE_URL || "http://localhost:3000";
const selection = { profileId: "urban-explorer", titleId: "spider-midtown", campaignId: "pepsi-thirsty-for-more", selectionMode: "manual", sceneBrief: "A sunlit cafe", assetId: "pepsi-can" };
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
});

test("manual selection can choose Nike while auto mode enforces matching", async () => {
  const request = { ...selection, campaignId: "nike-move-through-it", assetId: "nike-logo" };
  assert.equal((await post("/api/continuations/prepare", request)).status, 200);
  assert.equal((await post("/api/continuations/prepare", { ...request, selectionMode: "auto" })).status, 409);
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
  assert.ok(result.prompt.includes(pivot.direction));
  assert.ok(!result.prompt.includes("OLD_SCENE"));
  assert.ok(!result.prompt.includes("Pepsi"));
});

test("refine preserves current scene context", async () => {
  const response = await post("/api/continuations/pivot", { ...pivot, mode: "refine" });
  assert.equal(response.status, 200);
  assert.ok((await response.json()).prompt.includes("OLD_SCENE"));
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
  const response = await fetch(baseUrl + "/api/continuations/eligible?profileId=culture-runner&titleId=spider-midtown");
  assert.equal(response.status, 200);
  assert.equal((await response.json()).campaign.brand, "Nike");
});
