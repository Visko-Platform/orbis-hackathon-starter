const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./load.cjs");

const { demoFlows, demoFlowFor, resolveDemoStep, demoChips, stepIndex, stepAssetIds, demoContinuity, ledgerLine, previousStep, watchIdentity, canFollow, followReason } = load("lib/demo/flows.ts");
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
      assert.ok(step.state.onWrist || step.state.inHands, `${step.id} says where the watch is`);
      assert.ok(step.state.place === "street" || step.state.place === "boutique", `${step.id} says where he is`);
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
  assert.ok(rolex.steps.slice(1).every((step) => step.action), "every beat after the first has an authored action");
  assert.ok(inspect.brief.includes("the dial face is never plain steel") && inspect.action.includes("slate dial rotating away"));
  assert.ok(rolex.steps[2].action.includes("his left wrist bare for a moment"), "the swap takes one watch off before the other goes on");
});

test("one cast member and a watch ledger carry through every beat", () => {
  const campaign = campaigns.find((item) => item.id === "rolex-perpetual-moment");
  assert.ok(rolex.cast.startsWith("a Chinese man"));
  assert.ok(rolex.steps[0].brief.startsWith("A Chinese man"));
  assert.ok(rolex.steps.slice(1).every((step) => step.brief.includes("The same man")));
  assert.deepEqual(rolex.steps.map((step) => step.state.onWrist ?? step.state.inHands), ["rolex-submariner", "rolex-submariner", "rolex-datejust", "rolex-datejust", "rolex-datejust", "rolex-datejust"]);
  assert.deepEqual(rolex.steps.map((step) => step.state.onTray ?? null), [null, null, "rolex-submariner", "rolex-submariner", "rolex-submariner", null]);
  assert.deepEqual(rolex.steps.map((step) => step.state.place), ["street", "boutique", "boutique", "boutique", "boutique", "street"]);
  const continuity = demoContinuity(rolex, rolex.steps[3], campaign, rolex.steps[2]);
  assert.ok(continuity.includes("The same person throughout: a Chinese man"));
  assert.ok(continuity.includes("In his hands: the Datejust 41 he was just wearing, taken off and held, turned over so its flat steel case back faces the camera and its slate dial faces away"));
  assert.ok(!continuity.includes("Datejust 41, case back"), "the held watch is named as a watch, not as a case back");
  assert.ok(continuity.includes("On the green leather tray, lying still and unchanged: the Submariner Date."));
  assert.ok(continuity.includes("never animated, morphed, multiplied"));
  assert.deepEqual(stepAssetIds(rolex.steps[3]), ["rolex-datejust-back", "rolex-datejust", "rolex-submariner"], "the back view, then the watch itself so its dial side is described, then the tray watch");
  assert.equal(watchIdentity(campaign, "rolex-datejust-back"), "Datejust 41");
});

test("the ledger is told as a change from the previous beat, never as 'the same watch' after a swap", () => {
  const campaign = campaigns.find((item) => item.id === "rolex-perpetual-moment");
  const [street, boutique, swap, inspect, wear, exit] = rolex.steps;
  assert.equal(previousStep(rolex, swap).id, "boutique");
  assert.equal(previousStep(rolex, inspect, "exit").id, "exit", "a replayed beat comes from wherever the take is");
  assert.equal(previousStep(rolex, street), null);
  const swapped = demoContinuity(rolex, swap, campaign, boutique);
  assert.ok(swapped.includes("the Datejust 41, the watch just fastened on; the Submariner Date he wore until now comes off first, so his wrist never carries two watches"));
  assert.ok(swapped.includes("Now lying on the green leather tray: the Submariner Date, just set down there."));
  assert.ok(!swapped.includes("the same physical watch as in the previous shot"));
  const worn = demoContinuity(rolex, wear, campaign, inspect);
  assert.ok(worn.includes("the Datejust 41 he was holding, now fastened on again"));
  assert.ok(worn.includes("lying still and unchanged: the Submariner Date"));
  const left = demoContinuity(rolex, exit, campaign, wear);
  assert.ok(left.includes("On his left wrist: the Datejust 41, the same physical watch as in the previous shot"));
  assert.ok(left.includes("The Submariner Date stays behind on the tray in the boutique."));
  const opening = demoContinuity(rolex, street, campaign, null);
  assert.ok(opening.includes("On his left wrist: the Submariner Date; its model") && !opening.includes("previous shot"));
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
  assert.equal(ledgerLine(rolex.steps[3], campaign), "In his hands: the Datejust 41 he was wearing, turned over so its flat steel case back faces the camera and its slate dial faces away; On the green leather tray, unchanged: the Submariner Date");
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

test("bubbles offer only beats the story can show from where it is", () => {
  const ids = (current) => demoChips(rolex, current).map((step) => step.id);
  assert.deepEqual(ids(null), ["street"]);
  assert.deepEqual(ids("street"), ["boutique"], "no trying on or inspecting out on the street");
  assert.deepEqual(ids("boutique"), ["swap"], "he still wears the Submariner, so no showing the Datejust's back yet");
  assert.deepEqual(ids("swap"), ["inspect", "exit"]);
  assert.deepEqual(ids("inspect"), ["wear"], "the watch is in his hands, so only putting it on follows");
  assert.deepEqual(ids("wear"), ["exit", "inspect"], "he can look at the back again before leaving");
  assert.deepEqual(ids("exit"), [], "the walk is over; nothing puts him back at a tray he left");
  assert.equal(stepIndex(rolex, "wear"), 4);
});

test("a beat can only follow a state it fits, and the refusal says what it needs", () => {
  const campaign = campaigns.find((item) => item.id === "rolex-perpetual-moment");
  const [street, boutique, swap, inspect, wear, exit] = rolex.steps;
  assert.equal(canFollow(null, street), true);
  assert.equal(canFollow(exit, street), false, "the opening never follows a running take");
  assert.equal(canFollow(boutique, inspect), false);
  assert.equal(canFollow(swap, inspect), true);
  assert.equal(canFollow(wear, inspect), true);
  assert.equal(canFollow(exit, inspect), false);
  assert.equal(canFollow(inspect, exit), false, "he cannot leave with the watch in his hands");
  assert.equal(canFollow(wear, swap), false, "no swapping to the Datejust he already wears");
  assert.equal(followReason(inspect, campaign), "“Show the back” needs the Datejust 41 on his wrist, inside the boutique.");
  assert.equal(followReason(wear, campaign), "“Put it back on” needs the Datejust 41 in his hands, inside the boutique.");
});

test("a beat's state views become product notes in order", () => {
  const campaign = campaigns.find((item) => item.id === "rolex-perpetual-moment");
  const notes = productNotesFor(campaign, stepAssetIds(rolex.steps[3]));
  assert.equal(notes.length, 3);
  assert.ok(notes[0].startsWith("Datejust 41, case back:"), "the view shown comes first");
  assert.ok(notes[1].startsWith("Datejust 41: Oystersteel"), "then the watch itself, so its hidden dial is described");
  assert.ok(notes[2].startsWith("Submariner Date:"), "then the watch left on the tray");
  assert.ok(notes[0].includes("the slate dial is still on the other side, hidden"), "the back view names the hidden dial");
  assert.deepEqual(productNotesFor(campaign, ["missing"]), []);
});
