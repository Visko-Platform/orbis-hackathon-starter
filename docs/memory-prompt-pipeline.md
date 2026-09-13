# How Add Family turns a photo into an Orbis prompt

What the presenter types on `/add-family` does reach Gemini, verbatim. This doc traces
exactly which fields travel, which are silently dropped, and what happens when a field is
left blank — the questions that come up every time someone demos the page and wonders
whether the optional boxes are doing anything.

## The path

```
AddFamily.tsx  →  memory-pipeline.ts  →  /api/orbis-prompt  →  Gemini
  (5 fields)       (restore + ground)      (buildMemoryContext)
```

1. **`AddFamily.tsx`** collects five answers per photo (`Answers`): `who`, `place`, `year`,
   `scene`, `context`.
2. **`memory-pipeline.ts` → `groundFamilyMemory()`** first sends the raw photo to
   `/api/nano-banana` (Nano Banana restores it and reframes to 16:9), then posts the
   restored anchor *plus the memory fields* to `/api/orbis-prompt`.
3. **`/api/orbis-prompt/route.ts`** hands Gemini the image and a plain-text block built by
   `buildMemoryContext()`, under `MEMORY_PROMPT_SYSTEM_INSTRUCTION`.

## What Gemini actually receives

`buildMemoryContext()` (`app/lib/memory-prompt.ts`) renders the fields as a labeled block
alongside the restored image:

```
Person: My grandmother (Lola)
Place: Cavite City, Philippines
Year: 1953
Remembered detail: She stirs a pot of meat stew over a wood-fired clay stove. Meat was
rare for them — this was a birthday. A blue-collar barrio family.
```

Generation runs at `temperature: 0.2` with thinking disabled, so output tracks the input
fields closely rather than embellishing freely.

## Field-by-field

| Form field | Becomes | Notes |
|---|---|---|
| Who is this? | `Person:` | Falls back to `"a family member"` if blank |
| Place | `Place:` | Falls back to `"a place remembered by the family"` |
| When | `Year:` | Falls back to `"an earlier era"` |
| What's happening? | `Remembered detail:` | Joined with the next field |
| What else do you know? | `Remembered detail:` | Joined with the previous field |

### The two memory boxes are merged

`AddFamily.tsx` joins `sceneDescription` and `familyContext` with a single space into one
`memory` string. Gemini sees one `Remembered detail:` line and cannot tell which half came
from which box. Treat them as one combined paragraph when writing demo copy — there is no
point phrasing the second box as though it answers a different question.

### Blank fields do not fail — they get generic filler

Every optional field has a fallback string in `groundFamilyMemory()`, so a save with only
"who" filled in still produces a usable prompt. Two consequences worth knowing:

- A blank year sends the literal string `"an earlier era"`, which nudges Gemini toward
  period framing. That is usually desirable for archival family photos, but it is a real
  input, not a no-op.
- Because nothing errors, a presenter can't tell from the result that a field was skipped.
  If a generated prompt feels generic, check whether the fields were actually filled.

### `age`, `city`, and `country` are dead parameters

`/api/orbis-prompt/route.ts` reads `age`, `city`, and `country` from the form and
`buildMemoryContext()` knows how to render them — but `groundFamilyMemory()` never sends
them. They are vestigial from the original spike, which posted a richer shape. The Add
Family UI has no age field, and `place` is a single free-text box rather than city+country.

Harmless as-is, but don't expect adding an age input to the form to change anything
without also threading it through `MemoryPipelineInput`.

## The photo outranks the text

`MEMORY_PROMPT_SYSTEM_INSTRUCTION` tells Gemini the reference photo is authoritative for
every visible subject's identity, appearance, clothing, expression, objects, environment,
and composition. The memory fields drive *what happens next*; the photo drives *who is in
it and what they look like*.

So the fields cannot fix a bad restoration, and they cannot override what the photo shows.
If a person comes out wrong, the fix is upstream in the Nano Banana step
(`app/lib/upload-anchor.ts`), not in the memory copy.

The same instruction pins clothing and styling to the photo's own era for the whole
generated scene, so extended action does not drift toward contemporary fashion.

## Where the grounded prompt goes

`groundFamilyMemory()` returns `{ anchorImage, groundedPrompt }`. `AddFamily.tsx` spreads
that into the saved record and stores it (`family-memory-store.ts`), so the presenter sees
the real grounded prompt on `/add-family` before leaving the page. `MemoryAutostart` later
replays it — upload anchor, `setImage`, `setPrompt`, `start` — with no further Gemini
calls.

The field names on both sides of that spread are deliberately identical. If they drift,
`groundedPrompt` silently lands as `undefined` and every saved world fails its readiness
gate.

## Reference

| Concern | File |
|---|---|
| Form fields and save flow | `app/components/AddFamily.tsx` |
| Restore + ground orchestration | `app/lib/memory-pipeline.ts` |
| System instruction, context block | `app/lib/memory-prompt.ts` |
| Gemini call | `app/api/orbis-prompt/route.ts` |
| Photo restoration prompt | `app/lib/upload-anchor.ts` |
