---
quick_id: 260912-mjl
status: in-progress
---

## Question

On `/add-family`, if "Who is this?" is filled in but "Where are they?", "Around when?",
"What's happening here?", and "What else do you know about this time?" are all left
blank, does "Reconstruct their world" still save and let you enter the world?

## Verdict

**NO (as found) — fails at the sessionStorage handoff, for every save, not just blank
ones — FIXED below. After the fix: YES — runs end to end, pending the live checkpoint
in Task 2.**

The blank-optional-fields path itself was never the problem — every fallback
substitution the question is actually about is present and correct (see "Traced path").
Tracing the full path surfaced a **separate, unconditional bug**: `groundFamilyMemory()`
returned a field named `prompt`, but every consumer (`AddFamily.tsx`, `MemoryAutostart.tsx`,
the `FamilyPhotoInput` type itself) reads `groundedPrompt`. The object-spread at
`AddFamily.tsx:158` (`{ ...input, ...grounded }`) never renamed one to the other, so
`groundedPrompt` was always `undefined` on the stored memory — regardless of which
fields were filled in. `MemoryAutostart`'s gate (`found?.anchorImage && found?.groundedPrompt`,
`MemoryAutostart.tsx:64`) would therefore always evaluate false, and every single
`/add-family` save — blank fields or fully filled in — would show "This memory isn't
ready in this browser tab" on `/live-world`, never starting a session.

This was fixed in this task (see "Fix applied" below), scoped to exactly the field-name
mismatch. Task 2's live checkpoint below now verifies the fix against the real
Gemini/Nano-Banana/Reactor calls, which cannot be verified from code alone.

## Traced path

1. **Save button gate** — `complete = !!active && !!a.who.trim()` (`AddFamily.tsx:180`).
   Only "who" is required; the button enables with everything else blank.
2. **`toInput` mapping** (`AddFamily.tsx:56-67`) — `place: a.place.trim() || undefined`,
   `time: parseTime(a.year)` where `parseTime("")` returns `undefined`
   (`AddFamily.tsx:41-42`, empty string short-circuits before either regex runs),
   `sceneDescription`/`familyContext` likewise `|| undefined`. A blank field becomes
   `undefined` on the `FamilyPhotoInput`, not `""` and not a thrown error.
3. **`onSave`** (`AddFamily.tsx:130-176`) calls `groundFamilyMemory` with
   `relationship: input.person?.nameOrRelationship || "a family member"` (`:151`) and
   `memory: [sceneDescription, familyContext].filter(Boolean).join(" ")` (`:154-156`) —
   with everything blank this is `"a family member"` and `""` respectively. No throw yet.
4. **`groundFamilyMemory`** (`memory-pipeline.ts:33-82`) appends to the Gemini `FormData`
   with `?.trim() || "<fallback>"` for the three optional fields:
   `place` → `"a place remembered by the family"` (`:60-63`), `year` → `"an earlier era"`
   (`:64`), `memory` → `"A quiet family moment, remembered fondly."` (`:65-68`).
   Confirmed present in the current tree — `grep` count 3/3.
5. **`POST /api/orbis-prompt`** (`route.ts:14-17,44-60`): `requireField` returns `null`
   for a missing/whitespace value; the guard
   `if (!relationship || !year || !memory || !(place || (city && country)))` (`:52`)
   would 400 with `"relationship, year, memory, and either place or city+country are all
   required"` — but by this point `relationship` is `"a family member"`, and
   `place`/`year`/`memory` are all non-empty fallback strings from step 4. **The guard
   passes; no 400 for a blank-optional-fields save.** Confirmed present — `grep` count 1/1.
6. **`buildMemoryContext`** (`memory-prompt.ts`) flattens `relationship`/`place`/`year`/
   `memory` into the `Person/Place/Year/Remembered detail` block Gemini sees alongside
   the photo — with the fallback strings substituted in verbatim as if factual (see
   "Risks" below).
7. **Response handling** (`memory-pipeline.ts:73-79`): if Gemini returns a non-empty
   `prompt`, `groundFamilyMemory` used to return `{ anchorImage, prompt }` — **this is
   the bug**: the field was named `prompt`, not `groundedPrompt`.
8. **`onSave`'s merge** (`AddFamily.tsx:158`): `const savedInput: FamilyPhotoInput = {
   ...input, ...grounded }`. TypeScript does not flag this — `groundedPrompt` is optional
   on `FamilyPhotoInput`, and excess/mismatched properties from a spread aren't caught by
   excess-property checks — so this compiled and built clean while being wrong at runtime.
   `savedInput.groundedPrompt` was `undefined`; `savedInput.prompt` existed but nothing
   reads it.
9. **`saveFamilyMemory(savedInput)`** (`family-memory-store.ts:37-49`) persists this
   (broken) object to `sessionStorage` under `family-world:memory:<id>`.
10. **`?memoryId=` link + `isSeedMemoryId` routing** (`live-world-scenes.ts:182-184`,
    `live-world/page.tsx`): an AddFamily photo id (`p<timestamp><rand>`) is never a seed
    id, so `/live-world?memoryId=<id>` renders `<LiveWorldSession>`.
11. **`MemoryAutostart`'s gate** (`MemoryAutostart.tsx:60-66`):
    `found?.anchorImage && found?.groundedPrompt ? found : "missing"`. With
    `groundedPrompt` always `undefined` (step 8), this was **always** `"missing"`,
    surfacing "This memory isn't ready in this browser tab (it may have expired, or
    wasn't fully generated)." (`MemoryAutostart.tsx:108-114`) — **for every save**,
    independent of blank vs. filled optional fields.

## Fix applied

`app/lib/memory-pipeline.ts`:
- `GroundedMemory.prompt` → `GroundedMemory.groundedPrompt` (type)
- `return { anchorImage, prompt: ground.prompt.trim() }` → `return { anchorImage, groundedPrompt: ground.prompt.trim() }`

One caller (`AddFamily.tsx:148-158`); no other file references `GroundedMemory` or
destructures `.prompt` off `groundFamilyMemory`'s result (confirmed via
`grep -rn "groundFamilyMemory\|GroundedMemory" app`). `npm run typecheck` and
`npm run build` both pass clean after the change. This is the same fix Task 3's
error-mapping table prescribes for "'This memory isn't ready in this browser tab' → the
handoff, not the blank fields" — applied here directly since it's provably unconditional
from static tracing, not something that needed the live checkpoint to diagnose.

## UI fallback copy with everything blank

- `gateNote` (`AddFamily.tsx:188-196`): `"Everything else is optional."` once "who" is
  filled in but before saving; `"Restoring the photo and grounding their world in it…"`
  while `generating`; `"Their world is ready."` once `saved`.
- Saved-card `meta` (`AddFamily.tsx:657-659`): `[place, year].filter(...).join(" · ") ||
  "Place and time to be reconstructed"` — with both blank, shows the fallback string,
  not an empty line or `"undefined"`.
- Saved-card `summary` (`AddFamily.tsx:660-664`): `groundedPrompt || scene || context ||
  "A little information was enough to begin."` — before the fix, since `groundedPrompt`
  was always `undefined`, this fell through to `scene`/`context` (both `""` when blank)
  down to the final fallback string. After the fix, a real grounded prompt shows here
  when present, same as it always should have.
- Card heading is `p.a.who` (`AddFamily.tsx:686` `alt={p.a.who}`; heading is nearby in
  the same card), which the save gate guarantees is non-empty.

## Manual test steps

(Copied from Task 2's checkpoint so this record stands alone.)

1. Open https://family-world-flax.vercel.app/add-family and sign in with Google (the
   route is gated in `proxy.ts`).
2. Drop in any family photograph.
3. In "2 · Tell us what you know", fill in ONLY "Who is this?" — e.g. `My grandmother`.
   Leave "Where are they?", "Around when?", "What's happening here?", and "What else do
   you know about this time?" completely blank.
4. Confirm "Reconstruct their world" is ENABLED and the note beside it reads "Everything
   else is optional."
5. Click "Reconstruct their world". Expect "Reconstructing their world…" then either:
   - PASS: "Their world is ready.", and a "Their world" paragraph with a real
     multi-sentence grounded prompt appears below the form.
   - FAIL: a red-ish error line under the button — copy its EXACT text.
6. Scroll to "Ready to enter". Confirm the card shows the who text as its heading,
   "Place and time to be reconstructed" where place · year would be, and the grounded
   prompt as its summary.
7. Click "Enter their world →". Confirm the URL is `/live-world?memoryId=p...` and shows
   the live session panel (video area + status badge), not the curated panorama
   narration.
8. Confirm the "Family memory" panel says "<who>'s world is ready. Click Connect above
   to bring it to life." — NOT "This memory isn't ready in this browser tab" (this is
   the exact failure the fix above addresses).
9. Click Connect. Wait through "Placing session…" (a cold pod can take minutes).
   - PASS: status reaches Connected, "Starting <who>'s world…", video frames appear.
   - FAIL: copy the exact error text from the status badge or the Family memory panel.
10. Open devtools Network tab and confirm the `orbis-prompt` request returned 200 (not
    400). Note the status either way.

Report back: the step number of any failure plus the exact error text, or "all steps
passed".

## Observed live result

_Pending Task 2._

## Risks / notes

- The fallback strings (`"a place remembered by the family"`, `"an earlier era"`,
  `"A quiet family moment, remembered fondly."`) are injected into Gemini's context as if
  factual — a quality observation (generic/low-motion scene bias), not a failure; the
  photo stays authoritative per `MEMORY_PROMPT_SYSTEM_INSTRUCTION`.
- There is no regression test for either the fallback substitutions or the
  `groundedPrompt` field name. Deleting a `|| "<fallback>"` would silently reintroduce a
  400; renaming the field back to `prompt` would silently reintroduce the handoff bug
  just fixed. The `<verify>` grep counts in this task's plan are the only guard for the
  first; there is currently no guard for the second beyond this record.
- sessionStorage locality means the `?memoryId=` link only works in the same browser
  tab that saved it — independent of which fields were filled in.
- This bug only affects AddFamily-created memories (non-seed `memoryId`s routed to
  `<LiveWorldSession>`). It is unrelated to the three curated seed grandmothers
  (`seed-lola`/`seed-yay`/`seed-babushka`), which route to the local-timer `LiveWorld`
  simulation instead and never touch `groundFamilyMemory`/`MemoryAutostart` at all.
