const test = require("node:test");
const assert = require("node:assert/strict");
const { existsSync } = require("node:fs");
const { resolve } = require("node:path");
const { load } = require("./load.cjs");

const { campaigns, audienceProfiles, filmTitles, selectEligibleCampaign } = load("lib/studio-data.ts");
const { buildLiveDirection, buildLiveDirectionBeats } = load("lib/live-direction.ts");
const { matchProductNotes } = load("lib/product-cues.ts");
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

test("collectors are matched to Rolex on every title", () => {
  for (const title of filmTitles) {
    assert.equal(selectEligibleCampaign("collector", title.id)?.brand, "Rolex");
  }
});

test("every sourced campaign asset exists locally", () => {
  assert.equal(campaigns.flatMap((campaign) => campaign.assets).length, 14);
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

test("a pivot gets an action beat with no continuity language; a refinement does not", () => {
  const beats = buildLiveDirectionBeats(base);
  assert.ok(beats.action.includes(base.direction));
  assert.ok(beats.action.includes("Right now"));
  assert.ok(!beats.action.includes("Maintain continuity"));
  assert.ok(beats.action.includes("Keep Pepsi"));
  assert.equal(beats.settled, buildLiveDirection(base));
  assert.equal(buildLiveDirectionBeats({ ...base, mode: "refine" }).action, null);
});

test("a back-of-watch direction pulls the case-back view of the running product only", () => {
  const rolex = campaigns.find((campaign) => campaign.brand === "Rolex");
  const notes = matchProductNotes(rolex, "Turn the watch over and show me the back", "rolex-submariner");
  assert.equal(notes.length, 1);
  assert.ok(notes[0].startsWith("Submariner Date, case back:"));
  assert.ok(notes[0].includes("no engraving"));
  const open = matchProductNotes(rolex, "Move to a rooftop at dusk", "rolex-submariner");
  assert.equal(open.length, 1);
  assert.ok(open[0].startsWith("Submariner Date:"), "an open direction keeps the running watch");
  assert.equal(matchProductNotes(rolex, "Move to a rooftop at dusk").length, 0);
  assert.equal(matchProductNotes(rolex, "show the caseback", "upload").length, 2);
  const opened = matchProductNotes(rolex, "Open the strap and show me the back", "rolex-datejust");
  assert.equal(opened.map((note) => note.split(":")[0]).join(" | "), "Datejust 41, case back | Datejust 41, Oysterclasp open");
  assert.ok(opened[1].includes("never two-tone"));
});

test("product notes ride along in both pivot beats and in a refinement", () => {
  const withNotes = { ...base, productNotes: ["Submariner Date, case back: plain steel case back"] };
  const beats = buildLiveDirectionBeats(withNotes);
  assert.ok(beats.action.includes("plain steel case back"));
  assert.ok(beats.settled.includes("plain steel case back"));
  assert.ok(buildLiveDirection({ ...withNotes, mode: "refine" }).includes("plain steel case back"));
  assert.ok(!buildLiveDirection(base).includes("Product fidelity"));
});

test("an authored action beat describes physical motion instead of a scene transform, with the rigid-body rule", () => {
  const notes = ["Datejust 41, case back: flat mirror-polished stainless steel back"];
  const beats = buildLiveDirectionBeats({ ...base, productNotes: notes, actionDirection: "His hands turn the watch over in one smooth rotation" });
  assert.ok(beats.action.startsWith("Right now, in one continuous take, his hands turn the watch over in one smooth rotation."));
  assert.ok(!beats.action.includes("the scene transforms into"));
  assert.ok(beats.action.includes("Rigid-body rule") && beats.settled.includes("Rigid-body rule"));
  assert.ok(beats.settled.includes("this view takes precedence over the general product description"));
  assert.ok(buildLiveDirectionBeats(base).action.includes("the scene transforms into"));
  assert.ok(!buildLiveDirection(base).includes("Rigid-body rule"));
  const carried = buildLiveDirectionBeats({ ...base, continuity: "the same man; the Datejust 41 stays on his wrist" });
  assert.ok(carried.action.includes("Continuity: the same man") && carried.settled.includes("Continuity: the same man"));
  assert.ok(carried.settled.includes("the continuity below carries over unchanged") && !carried.settled.includes("narrative"));
  assert.ok(!buildLiveDirection(base).includes("Continuity:"));
});

test("Rolex products carry their wrist integration and appearance into the opening prompt", () => {
  const rolex = campaigns.find((campaign) => campaign.brand === "Rolex");
  const prompt = buildContinuationPrompt({ title: filmTitles[2], campaign: rolex, profile: audienceProfiles[3], assetId: "rolex-submariner", sceneBrief: "A rain-slick metro exit at night" });
  assert.ok(prompt.includes("worn on the protagonist's wrist"));
  assert.ok(prompt.includes("Cerachrom bezel"));
  assert.ok(!prompt.includes("boutique window"));
  const logoPrompt = buildContinuationPrompt({ title: filmTitles[2], campaign: rolex, profile: audienceProfiles[3], assetId: "rolex-crown" });
  assert.ok(logoPrompt.includes("crown emblem"));
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

const { isCapacityError, friendlyStartError, CAPACITY_RETRY_LIMIT } = load("hooks/use-live-continuation.ts");

test("capacity refusals from Reactor are recognised and reworded", () => {
  const quota = new Error('unexpected HTTP status 429 from create session: {"error":"quota_exceeded","limit":1}');
  const capacity = new Error('unexpected HTTP status 429 from create session: {"error":"no available capacity: no available server"}');
  assert.equal(isCapacityError(quota), true);
  assert.equal(isCapacityError(capacity), true);
  assert.equal(isCapacityError(new Error("The Reactor credential was not accepted.")), false);
  assert.match(friendlyStartError(capacity).message, /at capacity/);
  assert.equal(friendlyStartError(new Error("other")).message, "other");
  assert.ok(CAPACITY_RETRY_LIMIT >= 3);
});

const { DEFAULT_CAMPAIGN_ID } = load("lib/studio-data.ts");
test("the studio opens on the Rolex campaign", () => {
  assert.equal(DEFAULT_CAMPAIGN_ID, "rolex-perpetual-moment");
  assert.ok(campaigns.some((campaign) => campaign.id === DEFAULT_CAMPAIGN_ID));
});
