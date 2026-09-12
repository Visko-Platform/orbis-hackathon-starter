---
spike: 015
name: memory-grounded-orbis-prompt
type: standard
validates: "Given the anchor image plus structured Person+Place+Year+Memory context, when analyzed by Gemini with an adapted system instruction, then produce one polished, production-ready Orbis video prompt grounded in the specific photo and memory — not generic motion"
verdict: VALIDATED (content) — render PENDING
related: [014, 016]
tags: [prompts, gemini, grounding, orbis, memory, privacy]
---

# Spike 015: Memory-Grounded Orbis Prompt

## What This Validates

Given the spike-014 anchor image plus a structured family memory (Person + Place + Year +
Memory, per PRD.md §8 "World Prompt Generation"), when analyzed by Gemini with a system
instruction, then the result is one polished, production-ready Orbis video prompt grounded in
that specific photo and that specific remembered detail — not a generic "motion" description.

## Research

`orbis-hackathon-starter`'s `lib/orbis-prompt.ts` grounds a free-text "requested motion" string
in a reference image via `gemini-3.5-flash` with a system instruction. Confirmed via web search
(2026-09-12) that `gemini-3.5-flash` is a real, GA model (released 2026-05-19) — not a stale or
guessed model id, so the starter's exact model choice carries over unchanged.

| Approach considered | Pros | Cons | Status |
|---|---|---|---|
| Reuse starter's `ORBIS_PROMPT_SYSTEM_INSTRUCTION` verbatim, just relabel the input as "memory" | Zero new work | The instruction's mental model is "requested motion", not "remembered person/place/time" — loses the PRD's actual input shape (§8) and gives the model no place to reason about a *real* person's identity | Rejected |
| Structured JSON in, structured JSON out | Easy to parse downstream | The model's own docs (and the starter's own choice) recommend concise plain-text video prompts, not structured data, as the actual generation input — round-tripping through JSON only to flatten it back to prose adds a step with no benefit | Rejected |
| **Adapted system instruction + a `buildMemoryContext()` text block, plain-text prompt out** | Matches PRD.md §8's exact input shape (person/location/year/memory); keeps the starter's proven "image is authoritative for appearance, request is authoritative for action" framing; output stays the single plain-text prompt Orbis's `set_prompt` actually wants | Requires writing new instruction text rather than reusing the starter's | **Chosen** |

**Chosen approach:** `MEMORY_PROMPT_SYSTEM_INSTRUCTION` in `my-orbis-app/app/lib/memory-prompt.ts`,
paired with `buildMemoryContext()` which renders `{relationship, age, city, country, year,
memory}` into the plain-text block Gemini sees alongside the image. Two changes from the
starter's instruction beyond the input shape:

1. **Real-person identity guard.** Added "Never introduce a different, invented identity for a
   real person visible in the photo" — the starter's generic motion-grounding had no reason to
   say this (its source image has no real, identifiable people); ours does, so it inherits this
   project's standing privacy rule (`CONVENTIONS.md` → "Real-family privacy: undocumented
   subjects") directly into the grounding instruction itself, not just the editing prompt (spike
   014).
2. **"Extend as a plausible continuation" clause.** The memory describes an *action* ("walked to
   the bakery"), which the photo likely doesn't show happening — the starter's instruction never
   needed this because "requested motion" and "what the image shows" were closer together by
   construction. Added explicit permission to extend the same person/place/period into the
   described action, while still forbidding a different invented identity.

## How to Run

Same as spike 014 — `/internal/upload-test`, fill in relationship/age/city/country/year/memory,
click **Run pipeline**. The "Gemini-grounded Orbis prompt" panel shows this spike's output.

## What to Expect

- One plain-text paragraph, under 180 words, ending on a finished sentence.
- No Markdown, headings, JSON, or meta-commentary ("the image shows...").
- The prompt should read as *this specific photo's people, in this place, doing the described
  memory* — not a generic scene that could apply to any similar photo.
- No invented name/identity for a real, unconsented person beyond what the memory itself supplies.

## Observability

`/api/orbis-prompt` returns `{ error: string }` with a specific reason on every failure path
(missing key, missing image, missing required field, Gemini `MAX_TOKENS`, empty candidate) —
mirroring the starter's error surface exactly. Spike 016's event log timestamps the grounding
stage.

## Investigation Trail

- Read the starter's exact instruction text first, then asked specifically "what does this
  instruction assume about its input that a family memory violates?" — found two assumptions
  (motion≈what's-already-in-frame; no real identifiable subject) rather than guessing at
  improvements.
- Considered a JSON-structured exchange before settling on the plain-text block, on the reasoning
  that Orbis's actual command surface (`set_prompt`) takes one string — an intermediate
  structured format would be pure overhead here.
- Same live-key limitation as spike 014: content and instruction design validated by construction
  and against the starter's proven pattern; the actual grounded-prompt *quality* (does it really
  stay faithful to the photo, does it avoid inventing identities) needs a live `GEMINI_API_KEY`
  run, deferred to whoever adds the key next.

## Results

**Verdict: VALIDATED (content) — render PENDING.**

Code (`app/lib/memory-prompt.ts`, `app/api/orbis-prompt/route.ts`) type-checks cleanly; the route
is reachable and correctly gated (see spike 016). The instruction directly encodes this project's
two hardest-won standing rules from earlier spikes — real-person identity protection and
photo-grounded fidelity — into the grounding step itself, not just left as an editorial
afterthought.

**Not yet verified:** actual grounded-prompt quality against a live photo + memory pair. First
live-key test should specifically check whether the model ever slips into naming/characterizing
a real, unconsented person from the photo (the exact failure mode spikes 004/005/012/013 spent
the most effort avoiding).
