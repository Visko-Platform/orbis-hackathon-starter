const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./load.cjs");

const { demoFlows, demoFlowFor, resolveDemoStep, demoChips, stepIndex } = load("lib/demo/flows.ts");
const { productNotesFor } = load("lib/product-cues.ts");
const { campaigns } = load("lib/studio-data.ts");
const { seedKnowledge } = load("lib/knowledge/seeds.ts");
const { validateEngineered } = load("lib/knowledge/validate.ts");

const rolex = demoFlowFor("rolex-perpetual-moment");

test("every demo step points at real campaign assets and passes the product knowledge", () => {
  for (const flow of demoFlows) {
    const campaign = campaigns.find((item) => item.id === flow.campaignId);
    const knowledge = seedKnowledge(flow.campaignId);
    assert.ok(campaign && knowledge, flow.campaignId);
    for (const step of flow.steps) {
      assert.ok(campaign.assets.some((asset) => asset.id === step.assetId), `${step.id} asset`);
      for (const id of step.stateAssetIds) assert.ok(campaign.assets.some((asset) => asset.id === id), `${step.id} state ${id}`);
      assert.deepEqual(validateEngineered(knowledge, step.brief), { ok: true }, step.id);
      assert.ok(step.cues.every((cue) => cue === cue.toLowerCase()), `${step.id} cues are lower-case`);
    }
  }
  assert.equal(demoFlowFor("pepsi-thirsty-for-more"), null);
});

test("the Rolex walk follows street → boutique → swap → inspect → wear → exit", () => {
  assert.deepEqual(rolex.steps.map((step) => step.id), ["street", "boutique", "swap", "inspect", "wear", "exit"]);
  assert.equal(rolex.steps[0].assetId, "rolex-submariner");
  assert.equal(rolex.steps[2].assetId, "rolex-datejust");
  assert.equal(rolex.steps[3].assetId, "rolex-datejust-back");
  assert.ok(rolex.steps[1].brief.includes("ROLEX") && rolex.steps[1].brief.includes("crown"));
});

test("free text resolves to a beat by its longest cue; open directions resolve to nothing", () => {
  assert.equal(resolveDemoStep(rolex, "Show the back").id, "inspect");
  assert.equal(resolveDemoStep(rolex, "can you show me the back?").id, "inspect");
  assert.equal(resolveDemoStep(rolex, "put it back on please").id, "wear");
  assert.equal(resolveDemoStep(rolex, "Let's walk into the store").id, "boutique");
  assert.equal(resolveDemoStep(rolex, "swap it for a different watch").id, "swap");
  assert.equal(resolveDemoStep(rolex, "walk out").id, "exit");
  assert.equal(resolveDemoStep(rolex, "Make it rain and slow the camera"), null);
  assert.equal(resolveDemoStep(rolex, "backdrop of mountains"), null);
});

test("bubbles offer the next beats, then replayable ones, three at a time", () => {
  assert.deepEqual(demoChips(rolex, null).map((step) => step.id), ["street"]);
  assert.deepEqual(demoChips(rolex, "street").map((step) => step.id), ["boutique", "swap", "inspect"]);
  assert.deepEqual(demoChips(rolex, "inspect").map((step) => step.id), ["wear", "exit", "boutique"]);
  assert.deepEqual(demoChips(rolex, "exit").map((step) => step.id), ["boutique", "swap", "inspect"]);
  assert.equal(stepIndex(rolex, "wear"), 4);
});

test("a beat's state views become product notes in order", () => {
  const campaign = campaigns.find((item) => item.id === "rolex-perpetual-moment");
  const notes = productNotesFor(campaign, rolex.steps[3].stateAssetIds);
  assert.equal(notes.length, 2);
  assert.ok(notes[0].startsWith("Datejust 41, case back:") && notes[1].startsWith("Datejust 41, Oysterclasp open:"));
  assert.deepEqual(productNotesFor(campaign, ["missing"]), []);
});
