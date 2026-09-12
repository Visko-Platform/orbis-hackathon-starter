---
phase: quick-260912-mjl
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/260912-mjl-verify-add-family-can-still-save-run-whe/260912-mjl-VERIFICATION.md
autonomous: false
requirements: [VERIFY-ADDFAMILY-BLANK-01]

must_haves:
  truths:
    - "With who filled in and place/year/scene/context all blank, the Add Family save button enables and 'Reconstruct their world' completes without an error banner"
    - "/api/orbis-prompt does not return its 400 required-field error for a blank-optional-fields save, because memory-pipeline.ts substitutes non-empty fallbacks for place, year, and memory before the POST"
    - "The grounded prompt renders under 'Their world' on /add-family after a blank-fields save"
    - "The 'Ready to enter' card for a blank-fields memory renders readable fallback copy ('Place and time to be reconstructed') instead of an empty or broken line"
    - "'Enter their world' on a blank-fields memory reaches /live-world?memoryId=<id>, renders LiveWorldSession, and after Connect the stream starts (no 'memory isn't ready in this browser tab' message)"
    - "A written verification record exists stating the answer with file+line evidence and reproducible manual steps"
  artifacts:
    - path: ".planning/quick/260912-mjl-verify-add-family-can-still-save-run-whe/260912-mjl-VERIFICATION.md"
      provides: "Code-path trace, verdict, manual test steps, and observed live result for the blank-optional-fields Add Family flow"
      contains: "Verdict"
      min_lines: 40
  key_links:
    - from: "app/components/AddFamily.tsx"
      to: "app/lib/memory-pipeline.ts"
      via: "onSave calls groundFamilyMemory with relationship defaulted to 'a family member' and place/year/memory possibly undefined/empty"
      pattern: "groundFamilyMemory\\("
    - from: "app/lib/memory-pipeline.ts"
      to: "app/api/orbis-prompt/route.ts"
      via: "FormData whose place/year/memory fields are fallback-filled so the route's required-field guard passes"
      pattern: "a place remembered by the family"
    - from: "app/components/MemoryAutostart.tsx"
      to: "app/lib/family-memory-store.ts"
      via: "loadFamilyMemory(memoryId) reading only anchorImage + groundedPrompt (never place/year/scene/context)"
      pattern: "anchorImage && found\\?\\.groundedPrompt"
---

<objective>
Answer the user's question about https://family-world-flax.vercel.app/add-family — "even if the 'Tell us what you know' fields are not filled in, can it still run?" — with real evidence rather than a guess, and fix anything that genuinely breaks.

Purpose: The Save button's gate is only `!!a.who.trim()` (AddFamily.tsx:180), so the UI *claims* place/year/scene/context are optional. `/api/orbis-prompt` (route.ts:52) nevertheless hard-rejects a request missing relationship, year, memory, or place with a 400. Whether the flow survives blank optionals depends entirely on the fallback substitution in `memory-pipeline.ts` sitting between them. That needs to be confirmed end-to-end — through Nano Banana restore, Gemini grounding, sessionStorage handoff, and the `/live-world` autostart — not asserted from the button state.

Output: A verification record at `260912-mjl-VERIFICATION.md` with the verdict, the traced code path with file:line evidence, reproducible manual steps, and the observed live result. Production code changes ONLY if the live run actually fails (Task 3, conditional).

Pre-read finding (the executor should confirm, not assume): the fallbacks appear to already exist and cover every required field — `relationship` defaults to `"a family member"` (AddFamily.tsx:151), `place` to `"a place remembered by the family"`, `year` to `"an earlier era"`, `memory` to `"A quiet family moment, remembered fondly."` (memory-pipeline.ts:60-68). `MemoryAutostart` reads only `anchorImage` + `groundedPrompt` (MemoryAutostart.tsx:62-66), so the optional fields never reach the live session at all. The expected verdict is therefore "yes, it runs" — but Task 2 exists to prove it at runtime, and Task 3 exists in case it doesn't.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@AGENTS.md

@app/components/AddFamily.tsx
@app/lib/memory-pipeline.ts
@app/lib/family-memory-store.ts
@app/api/orbis-prompt/route.ts
@app/lib/memory-prompt.ts
@app/components/MemoryAutostart.tsx
@app/components/LiveWorldSession.tsx
@app/live-world/page.tsx
@app/lib/live-world-scenes.ts
@proxy.ts
</context>

<interfaces>
The contract that decides the answer, for reference while writing Task 1's trace:

- `AddFamily.toInput(photo)` (AddFamily.tsx:56-67) maps blank inputs to `undefined`:
  `place: a.place.trim() || undefined`, `time: parseTime(a.year)` (returns `undefined` for
  empty input, AddFamily.tsx:41-42), `sceneDescription`/`familyContext` likewise.
- `AddFamily.onSave` (AddFamily.tsx:148-157) then calls
  `groundFamilyMemory({ id, photoDataUrl, relationship: input.person?.nameOrRelationship || "a family member", place, year: input.time?.userText, memory: [sceneDescription, familyContext].filter(Boolean).join(" ") })`
  — with everything blank, `memory` is the empty string `""`.
- `groundFamilyMemory` (memory-pipeline.ts:57-68) appends to FormData with `?.trim() || <fallback>`
  for `place`, `year`, and `memory`.
- `POST /api/orbis-prompt` (route.ts:14-17, 44-60): `requireField` returns `null` for any
  missing/whitespace string; the guard
  `if (!relationship || !year || !memory || !(place || (city && country)))` → 400.
- `buildMemoryContext` (memory-prompt.ts:59-72) flattens the four fields into the
  `Person/Place/Year/Remembered detail` block Gemini sees alongside the photo.
- `saveFamilyMemory` / `loadFamilyMemory` (family-memory-store.ts:37-59) persist the whole
  `FamilyPhotoInput` under `family-world:memory:<id>` in sessionStorage.
- `LiveWorldPage` (live-world/page.tsx:45) routes `!isSeedMemoryId(memoryId)` → `<LiveWorldSession>`;
  an AddFamily photo id (`p<timestamp><rand>`) is never a seed id.
- `MemoryAutostart` (MemoryAutostart.tsx:60-66, 72-91) treats the memory as usable iff
  `anchorImage && groundedPrompt` are both present, then uploads + setImage + setPrompt + start.

Do NOT touch the seed-vs-real branching in `live-world/page.tsx` or `live-world-scenes.ts` —
that is another session's in-flight work and is not implicated here.
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Trace the blank-fields path in the current tree and write the verification record</name>
  <files>.planning/quick/260912-mjl-verify-add-family-can-still-save-run-whe/260912-mjl-VERIFICATION.md</files>
  <action>
Re-read the files in `<context>` as they exist right now (another session is actively editing
`/live-world`, `LiveWorldSession`, and the grounding pipeline — the current file contents are the
source of truth, not this plan's quoted line numbers, and not any earlier SUMMARY). Confirm or
correct every line reference before citing it.

Then write `260912-mjl-VERIFICATION.md` with these sections:

1. `## Question` — restate it in one sentence: does Add Family save and enter the world when
   place/year/scene/context are blank and only "who" is filled in?
2. `## Verdict` — one of `YES — runs end to end`, `NO — fails at <step>`, or
   `PARTIAL — <what degrades>`. State it in the first line of the section, plainly, no hedging.
3. `## Traced path` — a numbered walkthrough from the Save click to the first video frame, each
   step citing `file.ts:line`, and each step saying explicitly what the blank field becomes at
   that step. Cover, in order: the `complete` gate; `toInput`'s `|| undefined` mapping and
   `parseTime("") === undefined`; `onSave`'s `relationship` default and empty-string `memory`;
   `groundFamilyMemory`'s three fallback substitutions; `/api/orbis-prompt`'s `requireField` +
   required-field guard and whether the fallback values satisfy it; `buildMemoryContext`'s
   rendered block; `saveFamilyMemory` into sessionStorage; the `?memoryId=` link;
   `isSeedMemoryId` routing to `LiveWorldSession`; `MemoryAutostart`'s
   `anchorImage && groundedPrompt` check and the upload/setImage/setPrompt/start sequence.
4. `## UI fallback copy with everything blank` — what the presenter actually sees: the
   `gateNote` strings (AddFamily.tsx:188-196), the saved-card `meta` fallback
   `"Place and time to be reconstructed"` and `summary` fallback chain (AddFamily.tsx:657-664).
   Note that the card heading is `p.a.who`, which is guaranteed non-empty by the save gate.
5. `## Manual test steps` — the exact steps Task 2 will follow (copy them from Task 2's
   `<how-to-verify>` so the record stands alone).
6. `## Observed live result` — leave a `_Pending Task 2._` placeholder; Task 2 fills it in.
7. `## Risks / notes` — at minimum: (a) the fallback strings are injected into Gemini's context as
   if factual (`Place: a place remembered by the family`, `Year: an earlier era`), which biases the
   prompt toward a generic, low-motion scene even though the photo stays authoritative per
   `MEMORY_PROMPT_SYSTEM_INSTRUCTION` — a quality observation, not a failure; (b) there is no
   regression test, so deleting any one `|| "<fallback>"` in `memory-pipeline.ts` would silently
   reintroduce a 400 for blank-field saves — the grep guard in this task's `<verify>` is the only
   thing standing in for one; (c) sessionStorage locality means the `?memoryId=` link only works in
   the same browser tab, independent of which fields were filled.

Report findings in the file — do not modify any file under `app/` in this task, even if the trace
suggests an improvement. If the trace uncovers an actual break (a required field that reaches the
route empty, a crash, or an empty prompt with no fallback), say so in `## Verdict` and stop; Task 3
handles the fix.
  </action>
  <verify>
    <automated>npm run typecheck && test "$(grep -v '^[[:space:]]*//' app/lib/memory-pipeline.ts | grep -Ec 'a place remembered by the family|an earlier era|A quiet family moment, remembered fondly')" = 3 && test "$(grep -v '^[[:space:]]*//' app/components/AddFamily.tsx | grep -Fc '|| "a family member"')" = 1 && test "$(grep -v '^[[:space:]]*//' app/api/orbis-prompt/route.ts | grep -Fc '!relationship || !year || !memory')" = 1 && grep -q '^## Verdict' .planning/quick/260912-mjl-verify-add-family-can-still-save-run-whe/260912-mjl-VERIFICATION.md && grep -q '^## Traced path' .planning/quick/260912-mjl-verify-add-family-can-still-save-run-whe/260912-mjl-VERIFICATION.md</automated>
  </verify>
  <done>
`npm run typecheck` passes clean; all three fallback substitutions plus the relationship default
plus the route's required-field guard are confirmed present in non-comment code (counts 3 / 1 / 1);
`260912-mjl-VERIFICATION.md` exists with all seven sections, a stated verdict, and file:line
citations that match the current tree.

Note: if any of the three grep counts comes back different, the pipeline has been edited by the
concurrent session — re-derive the trace from the new code and update both the record and the
counts asserted here rather than forcing the old numbers.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
Task 1 traced the code and predicts the blank-optional-fields save works end to end. Nothing in
`app/` was changed. This checkpoint is the runtime proof — the part that reading code cannot give,
since it covers the two live Gemini calls and the Orbis session start.
  </what-built>
  <how-to-verify>
Use the deployed site the question was asked about (one save burns one Nano Banana + one Gemini
call — that is the intended cost). Local alternative: `npm run dev`, then
`http://localhost:3000/add-family`.

1. Open https://family-world-flax.vercel.app/add-family and sign in with Google
   (the route is gated in `proxy.ts`).
2. Drop in any family photograph.
3. In "2 · Tell us what you know", fill in ONLY "Who is this?" — e.g. `My grandmother`.
   Leave "Where are they?", "Around when?", "What's happening here?", and "What else do you know
   about this time?" completely blank.
4. Confirm the "Reconstruct their world" button is ENABLED and the note beside it reads
   "Everything else is optional."
5. Click "Reconstruct their world". Expect the button to read "Reconstructing their world…" and
   the note to read "Restoring the photo and grounding their world in it…".
   - PASS: it finishes, the note becomes "Their world is ready.", and a "Their world" paragraph
     with a real multi-sentence grounded prompt appears below the form.
   - FAIL: a red-ish error line appears under the button. Copy its EXACT text — especially if it is
     "relationship, year, memory, and either place or city+country are all required" (that is the
     400 this whole task is about) or "Gemini returned no grounded prompt".
6. Scroll to "Ready to enter". Confirm the new card shows: the who text as its heading, the line
   "Place and time to be reconstructed" where place · year would be, and the grounded prompt as
   its summary. No blank lines, no "undefined", no empty card.
7. Click "Enter their world →". Confirm the URL is `/live-world?memoryId=p...` and the page shows
   the live session panel (video area + status badge), NOT the curated Lola/Yay/Babushka panorama
   narration.
8. Confirm the "Family memory" panel says "<who>'s world is ready. Click Connect above to bring it
   to life." — NOT "This memory isn't ready in this browser tab".
9. Click Connect. Wait through "Placing session…" (a cold pod can take minutes).
   - PASS: status reaches Connected, the panel shows "Starting <who>'s world…", and video frames
     appear.
   - FAIL: copy the exact error text from the status badge or the Family memory panel.
10. Open the browser devtools Network tab and confirm the `orbis-prompt` request returned 200 (not
    400). Note the status either way.

Report back: the step number of any failure plus the exact error text, or "all steps passed".
  </how-to-verify>
  <resume-signal>Type "approved" (all steps passed) or paste the failing step number + exact error text</resume-signal>
</task>

<task type="auto">
  <name>Task 3: Record the live result, and apply a minimal fix only if Task 2 failed</name>
  <files>.planning/quick/260912-mjl-verify-add-family-can-still-save-run-whe/260912-mjl-VERIFICATION.md</files>
  <action>
Always: replace the `_Pending Task 2._` placeholder in `## Observed live result` with what the user
reported — which steps passed, the `orbis-prompt` HTTP status observed at step 10, and any exact
error text. Update `## Verdict` if the live run contradicts the traced prediction.

Only if Task 2 reported a FAILURE, additionally apply the smallest fix that addresses the observed
error, then re-run the checkpoint's failing step:

- 400 "relationship, year, memory, and either place or city+country are all required" → a fallback
  in `memory-pipeline.ts` is missing or no longer covers that field. Restore/add the single
  `?.trim() || "<fallback>"` substitution for exactly the field named in the error. Do not relax the
  guard in `app/api/orbis-prompt/route.ts` — `/internal/upload-test` posts to the same route with
  its own field set, and loosening it there would silently degrade that path too.
- "Gemini returned no grounded prompt" / 502 → this is a model-side or key-side failure, not a
  blank-field failure. Record it as such and do NOT change the pipeline; note whether it reproduces
  with the optional fields filled in.
- Empty/blank `groundedPrompt` reaching sessionStorage → tighten the existing
  `!ground.prompt?.trim()` check in `memory-pipeline.ts:77` rather than adding new state.
- "This memory isn't ready in this browser tab" → the handoff, not the blank fields; confirm
  `anchorImage` + `groundedPrompt` are both set on the stored object before changing anything.

Constraints on any fix: touch only `app/lib/memory-pipeline.ts` and/or `app/components/AddFamily.tsx`
unless the error points elsewhere; do not revert or redesign the seed-vs-real branching in
`app/live-world/page.tsx` or `app/lib/live-world-scenes.ts`; keep the existing comment style (these
files carry explanatory headers — extend them, don't strip them). Per `AGENTS.md`, if the fix
requires any Next.js API surface, read the relevant guide under
`node_modules/next/dist/docs/` first — this repo's Next version differs from training data.

If Task 2 reported "all steps passed", make NO changes under `app/`. The correct outcome of this
task is then a single updated section in the verification record.
  </action>
  <verify>
    <automated>npm run typecheck && ! grep -q '_Pending Task 2._' .planning/quick/260912-mjl-verify-add-family-can-still-save-run-whe/260912-mjl-VERIFICATION.md && grep -Eq '^## Observed live result' .planning/quick/260912-mjl-verify-add-family-can-still-save-run-whe/260912-mjl-VERIFICATION.md && git diff --name-only -- app | tee /dev/stderr | grep -vE '^app/(lib/memory-pipeline\.ts|components/AddFamily\.tsx)$' | wc -l | grep -qx '[[:space:]]*0'</automated>
  </verify>
  <done>
`## Observed live result` contains the real outcome (no placeholder left); `npm run typecheck`
passes; and the working tree under `app/` is either untouched (the expected case) or limited to
`memory-pipeline.ts` / `AddFamily.tsx`. If a fix was applied, the previously failing checkpoint step
was re-run and now passes.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → `/api/nano-banana`, `/api/orbis-prompt` | Family photo bytes + free-text family details cross into billable Gemini calls |
| `/add-family` → sessionStorage → `/live-world` | Base64 photo + grounded prompt persist in the tab across a navigation |
| browser → `/api/reactor/token` → Visko Orbis | Billable live-session minting |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-MJL-01 | Information disclosure | Task 2's live run on production | mitigate | Use a photo the presenter is willing to send to Gemini; `AddFamily.tsx:138` already redacts the base64 image from the console log — do not add any logging that reinstates it |
| T-MJL-02 | Denial of service / cost | `/api/nano-banana` + `/api/orbis-prompt` | accept | Both stay behind Google login via `proxy.ts`'s matcher; Task 2 spends exactly one save |
| T-MJL-03 | Tampering | `/api/orbis-prompt` required-field guard | mitigate | Task 3 forbids relaxing the route guard as a "fix" — `/internal/upload-test` shares that route and would silently lose its validation |
| T-MJL-SC | Tampering | npm/pip/cargo installs | mitigate | No new dependencies in this plan; if any task would need one, stop and escalate rather than installing |
</threat_model>

<verification>
- `npm run typecheck` passes (baseline: it passes clean on the current tree).
- The three fallback substitutions in `memory-pipeline.ts`, the `"a family member"` relationship
  default in `AddFamily.tsx`, and the required-field guard in `app/api/orbis-prompt/route.ts` are
  all confirmed present in non-comment code.
- `260912-mjl-VERIFICATION.md` states a verdict, cites current file:line evidence, lists
  reproducible manual steps, and records the real observed live result.
- `git diff --name-only -- app` is empty unless Task 2 surfaced an actual failure.
</verification>

<success_criteria>
The user has a direct, evidence-backed answer to "can it still run with the 'Tell us what you know'
fields blank?" — verdict plus the code path plus a real run, and either a confirmation that nothing
needed changing or a minimal targeted fix for the specific failure observed.
</success_criteria>

<output>
Create `.planning/quick/260912-mjl-verify-add-family-can-still-save-run-whe/260912-mjl-SUMMARY.md` when done.
Lead the summary with the one-line verdict so it is readable without opening the verification record.
</output>
