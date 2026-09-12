const test = require("node:test");
const assert = require("node:assert/strict");
const { existsSync } = require("node:fs");
const { resolve } = require("node:path");
const { load } = require("./load.cjs");

const { campaigns, audienceProfiles, filmTitles, selectEligibleCampaign } = load("lib/studio-data.ts");
const { buildLiveDirection } = load("lib/live-direction.ts");
const { buildContinuationPrompt } = load("lib/continuation-prompt.ts");
const { unwrapOrbisMessage } = load("lib/orbis.ts");

for (const title of filmTitles) {
  for (const [profileIndex, brand] of ["Pepsi", "McDonald's", "Nike"].entries()) {
    test(`${title.title}: ${audienceProfiles[profileIndex].name} selects ${brand}`, () => {
      assert.equal(selectEligibleCampaign(audienceProfiles[profileIndex].id, title.id)?.brand, brand);
    });
  }
}

test("unknown profiles and titles have no eligible campaign", () => {
  assert.equal(selectEligibleCampaign("unknown", filmTitles[0].id), null);
  assert.equal(selectEligibleCampaign(audienceProfiles[0].id, "unknown"), null);
});

test("all six sourced campaign assets exist locally", () => {
  assert.equal(campaigns.flatMap((campaign) => campaign.assets).length, 6);
  for (const campaign of campaigns) {
    assert.ok(existsSync(resolve(__dirname, "../public" + campaign.logo)));
    for (const asset of campaign.assets) {
      assert.ok(existsSync(resolve(__dirname, "../public" + asset.src)), asset.src);
      assert.ok(asset.sourceUrl.startsWith("https://"));
    }
  }
});

const base = { direction: "A bright snowy mountain pass", mode: "pivot", currentPrompt: "OLD_HARBOR_CONTEXT", brand: "Pepsi", preserveBrand: true };
test("a full pivot drops previous scene instructions and can retain the sponsor", () => {
  const prompt = buildLiveDirection(base);
  assert.ok(prompt.includes(base.direction));
  assert.ok(!prompt.includes(base.currentPrompt));
  assert.ok(prompt.includes("Keep Pepsi"));
});

test("unchecking brand preservation removes the automatic sponsor requirement", () => {
  const prompt = buildLiveDirection({ ...base, preserveBrand: false });
  assert.ok(!prompt.includes("Pepsi"));
  assert.ok(prompt.includes("new direction is authoritative"));
});

test("refinement retains the most recent context and latest adjustment", () => {
  const prompt = buildLiveDirection({ ...base, mode: "refine", currentPrompt: "x".repeat(3000) + "RECENT_DIRECTION" });
  assert.ok(prompt.includes("RECENT_DIRECTION"));
  assert.ok(prompt.includes(base.direction));
});

test("maximum-length refinement stays within the live engine limit", () => {
  const prompt = buildLiveDirection({ ...base, mode: "refine", currentPrompt: "x".repeat(4000), direction: "y".repeat(1200), brand: "McDonald's" });
  assert.ok(prompt.length <= 4000, `Prompt length ${prompt.length}`);
});

test("starting prompt follows the selected physical product", () => {
  const prompt = buildContinuationPrompt({ title: filmTitles[0], campaign: campaigns[0], profile: audienceProfiles[0], assetId: "pepsi-can", sceneBrief: "A cafe table at dawn" });
  assert.ok(prompt.includes("Pepsi original can"));
  assert.ok(prompt.includes("physical product"));
  assert.ok(prompt.includes("A cafe table at dawn"));
  assert.ok(!prompt.includes("refreshment kiosk"));
});

test("starting prompt supports custom artwork and photo campaigns", () => {
  const common = { title: filmTitles[0], campaign: campaigns[2], profile: audienceProfiles[2] };
  assert.ok(buildContinuationPrompt({ ...common, assetId: "upload" }).includes("supplied Nike artwork"));
  assert.ok(buildContinuationPrompt({ ...common, assetId: "nike-air-max-campaign" }).includes("background poster"));
});

test("messages support both flat and SDK data envelopes", () => {
  assert.equal(unwrapOrbisMessage({ type: "state", data: { active_prompt: "scene" } }).active_prompt, "scene");
  assert.equal(unwrapOrbisMessage({ type: "event", data: { type: "generation_started" } }).type, "generation_started");
  assert.equal(unwrapOrbisMessage({ type: "prompt_accepted" }).type, "prompt_accepted");
  assert.equal(Object.keys(unwrapOrbisMessage(null)).length, 0);
});
