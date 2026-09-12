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
  assert.ok(Array.isArray(result.contract.lines) && result.contract.lines.length >= 1);
  assert.equal(result.contract.lines[0].kind, "product");
  assert.ok(result.contract.lines[0].pinned);
});

const contract = { lines: [
  { id: "prod", kind: "product", text: "One Pepsi stays in the scene: a blue can with the globe", pinned: true, source: "knowledge" },
  { id: "who", kind: "person", text: "One man in a grey hoodie holds the can in his right hand", pinned: false, source: "frame" },
  { id: "where", kind: "setting", text: "A rainy street at night", pinned: false, source: "brief" },
] };

test("a direction restates the scene contract and the pivot advances it", async () => {
  const response = await post("/api/continuations/pivot", { ...pivot, contract });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.ok(result.prompt.includes("Keep true: One Pepsi stays in the scene"));
  assert.ok(result.prompt.includes("grey hoodie"));
  // The old unpinned setting is dropped; product and person lines survive; the
  // new setting is re-read from the direction so refinements can hold onto it.
  const ids = result.contract.lines.map((line) => line.id);
  assert.deepEqual(ids.slice(0, 2), ["prod", "who"]);
  assert.ok(!ids.includes("where"));
  const settings = result.contract.lines.filter((line) => line.kind === "setting");
  assert.ok(settings.length >= 1 && settings.every((line) => line.source === "brief" && !line.pinned));
});

test("a refinement keeps every contract line", async () => {
  const result = await (await post("/api/continuations/pivot", { ...pivot, mode: "refine", contract })).json();
  assert.deepEqual(result.contract.lines.map((line) => line.id), ["prod", "who", "where"]);
});

test("a contract line naming a competitor is refused", async () => {
  const bad = { lines: [{ kind: "custom", text: "A Coca-Cola on the table" }] };
  assert.equal((await post("/api/continuations/pivot", { ...pivot, contract: bad })).status, 400);
});

test("the contract endpoint drafts person and setting lines from a brief and keeps pinned lines", async () => {
  const form = new FormData();
  form.set("campaignId", "pepsi-thirsty-for-more");
  form.set("brief", "A woman in a yellow raincoat waits at a bus stop at dusk, holding the can.");
  form.set("contract", JSON.stringify({ lines: [{ id: "keep", kind: "setting", text: "Neon signs reflect on wet pavement", pinned: true, source: "operator" }] }));
  const response = await fetch(baseUrl + "/api/continuations/contract", { method: "POST", body: form, signal: AbortSignal.timeout(20_000) });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.source, "brief");
  const texts = result.contract.lines.map((line) => line.text);
  assert.ok(texts[0].startsWith("One Pepsi stays in the scene"));
  assert.ok(texts.includes("Neon signs reflect on wet pavement"));
  assert.ok(result.contract.lines.some((line) => line.kind === "setting" && line.source === "brief"));
  assert.equal((await fetch(baseUrl + "/api/continuations/contract", { method: "POST", body: new FormData() })).status, 400);
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
  const verbatim = await (await post("/api/continuations/prepare", { ...selection, campaignId: "rolex-perpetual-moment", assetId: "rolex-submariner", sceneBrief: "A Chinese man walks down the street", engineer: false })).json();
  assert.equal(verbatim.engineered.model, "passthrough");
  assert.ok(verbatim.prompt.includes("A Chinese man walks down the street"));
  // The prepared contract round-trips into a pivot even with Rolex's long product lines.
  const carried = await post("/api/continuations/pivot", { direction: "Move to a rooftop at dusk", mode: "pivot", preserveBrand: true, campaignId: "rolex-perpetual-moment", assetId: "rolex-submariner", currentPrompt: verbatim.prompt, contract: verbatim.contract });
  assert.equal(carried.status, 200);
  assert.match((await carried.json()).prompt, /Keep true: One Rolex stays in the scene/);
  assert.equal((await post("/api/continuations/prepare", { ...selection, engineer: "no" })).status, 400);
});


test("the Rolex demo path resolves bubbles and free text into fixed beats", async () => {
  const base = { campaignId: "rolex-perpetual-moment", currentPrompt: "OLD_SCENE" };
  const byId = await post("/api/continuations/demo", { ...base, stepId: "inspect" });
  assert.equal(byId.status, 200);
  const result = await byId.json();
  assert.equal(result.step.id, "inspect");
  assert.match(result.prompt, /case back/);
  assert.match(result.actionPrompt, /Right now, in one continuous take, his hands unfasten the Datejust 41/);
  assert.match(result.actionPrompt, /Rigid-body rule/);
  assert.ok(!result.actionPrompt.includes("the scene transforms into"));
  assert.ok(result.productNotes.some((note) => /no engraving/.test(note)));
  assert.ok(result.productNotes.some((note) => note.startsWith("Datejust 41: Oystersteel")), "the dial side is described alongside the back");
  assert.match(result.prompt, /the slate dial is still on the other side, hidden/);
  assert.ok(!result.prompt.includes(".."), "no doubled periods");
  // Coming from the boutique, the swap tells the wrist as a change, not as the same watch.
  const swap = await (await post("/api/continuations/demo", { campaignId: "rolex-perpetual-moment", stepId: "swap", fromStepId: "boutique", currentPrompt: "x" })).json();
  assert.match(swap.actionPrompt, /the Submariner Date he wore until now comes off first/);
  assert.ok(!swap.prompt.includes("the same physical watch as in the previous shot"));
  assert.equal((await post("/api/continuations/demo", { campaignId: "rolex-perpetual-moment", stepId: "swap", fromStepId: 7, currentPrompt: "x" })).status, 400);
  // Showing the back of the Datejust while he still wears the Submariner cannot follow.
  const refused = await post("/api/continuations/demo", { campaignId: "rolex-perpetual-moment", stepId: "inspect", fromStepId: "boutique", currentPrompt: "x" });
  assert.equal(refused.status, 409);
  assert.match((await refused.json()).error, /needs the Datejust 41 on his wrist, inside the boutique/);
  assert.equal((await post("/api/continuations/demo", { campaignId: "rolex-perpetual-moment", stepId: "street", fromStepId: "exit", currentPrompt: "x" })).status, 409, "the opening never follows a running take");
  assert.match(result.prompt, /Continuity: The same person throughout: a Chinese man/);
  assert.match(result.prompt, /On the green leather tray, lying still and unchanged: the Submariner Date/);
  assert.ok(!result.prompt.includes("The product looks like this:"), "demo beats leave out the general appearance");
  assert.ok(!result.prompt.includes("Keep true:"), "the beat's continuity line stands in for the clause");
  assert.ok(result.contract.lines.some((line) => line.kind === "person" && line.text.includes("a Chinese man")));
  // A free direction typed after the beat carries the beat's contract.
  const free = await (await post("/api/continuations/pivot", { direction: "He steps out into heavy rain", mode: "pivot", preserveBrand: true, campaignId: "rolex-perpetual-moment", assetId: "rolex-datejust", currentPrompt: result.prompt, contract: result.contract })).json();
  assert.equal(free.outcome, "steer");
  assert.match(free.prompt, /Keep true: One Rolex stays in the scene: A Rolex Oyster Perpetual/);
  assert.match(free.prompt, /The same man throughout: a Chinese man/);
  assert.match(free.prompt, /On the green leather tray, unchanged: the Submariner Date/);
  assert.ok(!free.prompt.includes("The product looks like this:"), "the clause carries the appearance once");
  assert.deepEqual(result.nextChips.map((chip) => chip.id), ["wear", "dial", "turn"], "with the watch in his hands: put it on, or a moment with it");
  // A moment runs from the beat the take is on and leaves it there, with the next three bubbles.
  const dial = await post("/api/continuations/demo", { ...base, stepId: "dial", fromStepId: "inspect", assetId: "rolex-datejust-back" });
  assert.equal(dial.status, 200);
  const shown = await dial.json();
  assert.deepEqual([shown.step.kind, shown.step.beatId, shown.step.assetId, shown.actionPrompt], ["moment", "inspect", "rolex-datejust", null]);
  assert.match(shown.prompt, /Director's latest adjustment.*Camera: Close on his hands/);
  assert.match(shown.prompt, /Still in his hands: the Datejust 41, held as in the previous shot;/);
  assert.ok(!shown.prompt.includes("case back faces the camera"), "the dial is up now");
  assert.deepEqual(shown.nextChips.map((chip) => chip.id), ["wear", "turn", "wall"]);
  const turned = await (await post("/api/continuations/demo", { ...base, stepId: "turn", fromStepId: "inspect", assetId: "rolex-datejust" })).json();
  assert.ok(!turned.prompt.includes("case back faces the camera"), "turning keeps the face the viewer chose");
  assert.equal(turned.step.assetId, "rolex-datejust");
  assert.equal((await post("/api/continuations/demo", { ...base, stepId: "closer", fromStepId: "inspect" })).status, 409, "no wrist close-up while the watch is in his hands");
  assert.equal((await post("/api/continuations/demo", { ...base, stepId: "glow" })).status, 400, "a moment needs the beat the take is on");
  assert.equal((await post("/api/continuations/demo", { ...base, stepId: "glow", fromStepId: "exit", assetId: "nope" })).status, 400);
  const late = await (await post("/api/continuations/demo", { ...base, stepId: "glow", fromStepId: "exit" })).json();
  assert.deepEqual([late.step.beatId, late.nextChips.length], ["exit", 3], "after the walk there are still three");
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
  ["oversized scene brief", { sceneBrief: "x".repeat(4001) }],
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
  ["oversized direction", { direction: "x".repeat(4001) }],
  ["invalid direction type", { direction: [] }],
  ["invalid mode", { mode: "other" }],
  ["invalid boolean", { preserveBrand: "false" }],
  ["unknown campaign", { campaignId: "unknown" }],
  ["oversized context", { currentPrompt: "x".repeat(16001) }],
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

test("a page can release its live session by id; bad ids are refused, unknown ones are already gone", async () => {
  assert.equal((await post("/api/sessions/release", { sessionId: "not a session id!" })).status, 400);
  assert.equal((await post("/api/sessions/release", {})).status, 400);
  const unknown = await post("/api/sessions/release", { sessionId: "00000000-0000-4000-8000-000000000000" });
  assert.equal(unknown.status, 200);
  assert.deepEqual(await unknown.json(), { released: false, alreadyGone: true });
});

test("the voiceover route writes grounded narrator lines for a scene", async () => {
  // Writing the lines and synthesizing speech takes longer than the shared 15 s helper allows.
  const response = await fetch(baseUrl + "/api/continuations/voiceover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId: "rolex-perpetual-moment", scene: "A man in a grey coat crosses a rainy street at night, the Rolex on his wrist catching the light.", role: "pivot" }), signal: AbortSignal.timeout(45_000) });
  assert.ok([200, 503].includes(response.status), `status ${response.status}`);
  if (response.status === 200) {
    const result = await response.json();
    assert.ok(Array.isArray(result.lines) && result.lines.length >= 1 && result.lines.length <= 2);
    assert.ok(result.lines.every((line) => line.split(/\s+/).length <= 24));
    assert.equal(result.audio, null, "phase one returns lines only");
    const spoken = await fetch(baseUrl + "/api/continuations/voiceover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId: "rolex-perpetual-moment", scene: "x", role: "pivot", lines: result.lines }), signal: AbortSignal.timeout(60_000) });
    assert.equal(spoken.status, 200);
    const speech = await spoken.json();
    assert.ok(typeof speech.audio === "string" && speech.audio.length > 1000, "phase two returns audio");
  }
  // Phase two without a scene or role is what the studio sends; it must still be accepted.
  const bare = await fetch(baseUrl + "/api/continuations/voiceover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId: "rolex-perpetual-moment", lines: ["He checks the time."] }), signal: AbortSignal.timeout(60_000) });
  assert.ok([200, 502, 503].includes(bare.status), `bare speech call status ${bare.status}`);
  assert.equal((await post("/api/continuations/voiceover", { campaignId: "nope", scene: "x", role: "pivot" })).status, 400);
});
