const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./load.cjs");

const { demoFlows, demoFlowFor, resolveDemoStep, demoChips, stepIndex, stepAssetIds, demoContinuity, ledgerLine } = load("lib/demo/flows.ts");
const { demoContract } = load("lib/demo/contract.ts");
const { parseContract, contractClause } = load("lib/knowledge/contract.ts");
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
      for (const id of stepAssetIds(step)) assert.ok(campaign.assets.some((asset) => asset.id === id), `${step.id} state ${id}`);
      assert.ok(step.watches.onWrist || step.watches.inHands, `${step.id} says where the watch is`);
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
  const inspect = rolex.steps[3];
  assert.ok(inspect.brief.includes("mirror-polished stainless steel screw-down case back") && inspect.brief.includes("no window, engraving or text"));
  assert.ok(inspect.action && inspect.action.includes("single rigid piece"));
  assert.ok(rolex.steps.filter((step) => step.action).map((step) => step.id).join(",") === "swap,inspect,wear");
});

test("one cast member and a watch ledger carry through every beat", () => {
  const campaign = campaigns.find((item) => item.id === "rolex-perpetual-moment");
  assert.ok(rolex.cast.startsWith("a Chinese man"));
  assert.ok(rolex.steps[0].brief.startsWith("A Chinese man"));
  assert.ok(rolex.steps.slice(1).every((step) => step.brief.includes("The same man")));
  assert.deepEqual(rolex.steps.map((step) => step.watches.onWrist ?? step.watches.inHands), ["rolex-submariner", "rolex-submariner", "rolex-datejust", "rolex-datejust-back", "rolex-datejust", "rolex-datejust"]);
  assert.deepEqual(rolex.steps.map((step) => step.watches.onTray ?? null), [null, null, "rolex-submariner", "rolex-submariner", "rolex-submariner", null]);
  const continuity = demoContinuity(rolex, rolex.steps[3], campaign);
  assert.ok(continuity.includes("The same person throughout: a Chinese man"));
  assert.ok(continuity.includes("In his hands: the Datejust 41, case back"));
  assert.ok(continuity.includes("On the green leather tray, lying still and unchanged: the Submariner Date."));
  assert.ok(continuity.includes("never animated, morphed, multiplied"));
  assert.deepEqual(stepAssetIds(rolex.steps[3]), ["rolex-datejust-back", "rolex-submariner", "rolex-datejust-open"]);
});

test("every beat leaves the take under a contract that carries the cast, the ledger and the marks", () => {
  const campaign = campaigns.find((item) => item.id === "rolex-perpetual-moment");
  const knowledge = seedKnowledge("rolex-perpetual-moment");
  const operator = { id: "op", kind: "custom", text: "Rain on the boutique window", pinned: true, source: "operator" };
  for (const step of rolex.steps) {
    const contract = demoContract(rolex, step, campaign, knowledge, { lines: [operator] });
    assert.doesNotThrow(() => parseContract(JSON.parse(JSON.stringify(contract)), knowledge), step.id);
    const person = contract.lines.find((line) => line.kind === "person");
    assert.ok(person.pinned && person.text.includes("a Chinese man"), `${step.id} cast`);
    assert.ok(contract.lines.some((line) => line.kind === "custom" && line.text === ledgerLine(step, campaign)), `${step.id} ledger`);
    assert.ok(contract.lines.some((line) => line.kind === "custom" && line.text === rolex.marks), `${step.id} marks`);
    assert.ok(contract.lines.some((line) => line.id === "op"), `${step.id} keeps the operator's line`);
    assert.ok(contract.lines[0].kind === "product" && contract.lines[0].text.includes("One Rolex stays in the scene"));
    const clause = contractClause(contract);
    assert.ok(clause.includes("a Chinese man") && clause.includes("Rain on the boutique window"));
  }
  assert.equal(ledgerLine(rolex.steps[3], campaign), "In his hands: the Datejust 41, case back, the watch he was wearing; On the green leather tray, unchanged: the Submariner Date");
  assert.ok(ledgerLine(rolex.steps[0], campaign).startsWith("On his left wrist: the Submariner Date"));
});

test("the Rolex knowledge describes the steel case back and forbids see-through backs", () => {
  const knowledge = seedKnowledge("rolex-perpetual-moment");
  assert.ok(knowledge.product.appearance.includes("mirror-polished stainless steel screw-down case back"));
  assert.ok(knowledge.protectedChanges.some((line) => line.includes("solid stainless steel object")));
  assert.ok(knowledge.protectedChanges.some((line) => line.includes("never animate, morph or multiply")));
  assert.ok(knowledge.product.appearance.includes("never changes within a scene"));
  assert.equal(validateEngineered(knowledge, "a sapphire case back shows the movement").ok, false);
  assert.equal(validateEngineered(knowledge, "the flat polished steel case back").ok, true);
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
  const notes = productNotesFor(campaign, stepAssetIds(rolex.steps[3]));
  assert.equal(notes.length, 3);
  assert.ok(notes[0].startsWith("Datejust 41, case back:"), "the held watch comes first");
  assert.ok(notes[1].startsWith("Submariner Date:"), "the watch left on the tray is described too");
  assert.ok(notes[2].startsWith("Datejust 41, Oysterclasp open:"), "extra views follow the ledger");
  assert.deepEqual(productNotesFor(campaign, ["missing"]), []);
});
