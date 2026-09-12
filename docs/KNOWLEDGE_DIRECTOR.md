# Product knowledge base and prompt engineering

What this adds to the studio prototype: a per-campaign **knowledge base** the operator
edits in the inspector, and **prompt engineering** that rewrites the operator's own
words with that knowledge before they reach Orbis, for both the opening brief and every
live direction. Without a Gemini key the studio behaves exactly as before (the text is
used as written); with one, every prompt is grounded and the UI shows what changed.

```
operator ─► Product knowledge (04 / KNOWLEDGE) ─► data/knowledge/<campaign>.json (seeded per brand)
                                                              │
scene brief ──► POST /api/continuations/prepare ──► guard ─► retrieve notes ─► engineer (opening) ─► validate
                                                              │                                        │
direction  ──► POST /api/continuations/pivot ────► question? ─► facts ─► { outcome: "overlay", answer } │
                                                   otherwise ─► engineer (pivot | refine) ─► validate ──┤
                                                                                                        ▼
                                              PromptVersion (data/runs/<campaign>.jsonl) ◄── wrap into the existing prompt builders
                                                                                                        │
                                              set_image → set_prompt → start   /   set_prompt (steer) ◄─┘
```

## Knowledge (`lib/knowledge/types.ts`, `seeds.ts`, `store.ts`)

Per campaign: `product { name, aliases[], competitors[], appearance }`, `visualNotes[]`,
`facts[]`, `forbiddenClaims[]`, `protectedChanges[]`.

- `appearance` is the approved visual identity. It is restated in every prompt (opening:
  "Product reference: …"; directions that keep the brand: "The product looks like this: …").
  Keep it to what should be *seen*, not specs.
- `visualNotes` are retrieved into a rewrite only when the operator's text shares words
  with them (lexical coverage ≥ 0.34, top 3). "make the sign glow brighter" pulls in "The
  golden arches sign glows at night…"; "a snowy pass" pulls in nothing.
- `facts` answer questions on screen and are never sent to the model.
- `forbiddenClaims` and `competitors` are refused in the operator's text and rejected in
  a rewrite. `protectedChanges` are positive statements appended to the opening prompt.

Seeds for Pepsi, McDonald's and Nike live in `seeds.ts` (demo copy, not brand-approved).
The first save writes `data/knowledge/<campaignId>.json` (gitignored, per machine); until
then the seed is served. `parseKnowledge` validates every input and names the bad field.

## Prompt engineering (`lib/knowledge/engineer.ts`, `llm.ts`, `guard.ts`, `validate.ts`)

`engineerPrompt(knowledge, text, role, { engine, keepProduct })`:

1. **Guard** the operator's words: empty, > 1,200 chars, instruction-like ("ignore
   previous…"), unsafe words, competitor names → `RefusedError` → HTTP 400.
2. **Retrieve** visual notes for the text.
3. **Rewrite** with the engine (`GeminiEngine`, `gemini-3.5-flash`, temperature 0.2), one
   instruction per role:
   - `opening` — keep the operator's setting, action and camera; describe the product
     once as the appearance says; 2–4 sentences under 120 words.
   - `pivot` — the scene the video transitions into; place the product naturally if it
     stays; 1–3 sentences under 80 words. With **Keep brand** off the product is not
     mentioned at all.
   - `refine` — one or two specific visible changes; name the product only when the change
     involves it; under 60 words.
   All roles: only approved appearance/notes, no other brands, no negation, no product
   interactions the text did not ask for.
4. **Validate** the rewrite: non-empty, length, no competitor, no forbidden claim, and no
   sponsor mention when the direction drops the brand. A failed or invalid rewrite falls
   back to the operator's words (validated the same way; if *those* fail → 400).
5. Return `Engineered { source, text, model: "gemini" | "passthrough", notes, rejected }`.
   The routes wrap `text` into the existing prompt builders unchanged
   (`buildContinuationPrompt` gains `knowledge`, `buildLiveDirection` gains
   `productAppearance`) and return `engineered` so the UI can show "You said → Sent".

Questions (`isFactQuestion`: ends with "?" or asks how much/when/where/what…) never
become prompts: the pivot route answers from `facts` (`{ outcome: "overlay", answer }`)
or returns 422 when nothing approved matches.

## Scene contract (`lib/knowledge/contract.ts`)

What must stay true for the whole take, restated in every direction so the same person,
product and place carry across chunks. Lines have a kind (`product`, `person`, `setting`,
`custom`), a source (`knowledge`, `brief`, `frame`, `operator`) and a `pinned` flag.

- **Built at prepare.** Product lines come from the knowledge base (appearance plus
  keep-true statements, pinned); person and setting lines are drafted by Gemini from the
  engineered brief (or, without a key, the brief's first sentence becomes the setting).
  The contract is returned with the prepared run and logged with its prompt version.
- **Carried by every direction.** The client sends the contract with each pivot; the
  server validates every line like operator input (guard, forbidden claims, caps), gives
  the lines to the engineer as "keep every line true", and appends
  `Keep true: …` to the live direction. The caps are sanity ceilings, not a budget
  (24 lines of up to 1,000 characters; the clause up to 6,000), so a full product
  description, every product rule and the cast all ride along. The
  response returns the advanced contract: a full pivot drops unpinned setting lines,
  dropping the brand drops the product lines, a refinement keeps everything.
- **Read from a frame.** `POST /api/continuations/contract` (multipart: campaignId, brief,
  current contract, optional image) re-drafts person and setting lines from the brief and
  the frame with Gemini vision, rebuilds the product lines, and keeps pinned and custom
  lines. The studio captures the live video frame (`lib/frame-capture.ts`) or uses the
  preview frame before a take.
- **Operator control.** The "Scene contract" card under the director panel lists the
  lines with pin, remove, and add; custom lines are pinned by default.
- **Demo beats.** `POST /api/continuations/demo` returns the contract the beat leaves the
  take under (`lib/demo/contract.ts`): the product lines, then the cast, the watch ledger
  and the brand marks as pinned lines, then the operator's own lines. The beat's prompt
  restates these as its continuity line rather than as the clause; free directions after
  the beat carry the contract as usual.

Not included: watching the video for violations or repairing automatically. The contract
is the record those would act on.

## Audit (`lib/knowledge/audit.ts`)

Every prepared or engineered prompt, and every on-screen answer, is appended to
`data/runs/<campaignId>.jsonl` before the response (`PromptVersion`: id, at, role,
engineered, prompt, outcome). Disk failure logs and does not block. The response carries
`promptVersionId`.

## Routes

- `GET/PUT /api/campaigns/:id/knowledge` — the operator's knowledge (400 names the field;
  404 unknown campaign).
- `POST /api/campaigns/:id/knowledge/describe` (multipart `image`) — `{ appearance,
  visualNotes, model }` drafted from a product image; 503 without a Gemini key.
- `GET /api/campaigns/:id/suggestions` — `{ suggestions, source }`: up to six short
  directions built from the knowledge (Gemini, or defaults), cached per knowledge content.
- `POST /api/continuations/prepare` — as before, plus `engineered`, `promptVersionId`, `contract`.
- `POST /api/continuations/pivot` — accepts `contract`; `{ outcome: "steer", prompt, mode, engineered,
  promptVersionId, contract }` or `{ outcome: "overlay", answer, mode }`; 400 refused or invalid
  contract; 422 no answer.
- `POST /api/continuations/contract` — multipart; `{ contract, model, source }`.

## Studio UI (product-first)

The Studio is organised around the product; the story side (scene presets) is parked as
a single paused sector in the nav.

- **01 / PRODUCT** — brand, product images, **Add product image** (PNG/JPEG/WebP ≤ 10 MB),
  and which image to place. The product photo is the default.
- **02 / PRODUCT INFO** (open by default, `components/studio/knowledge-panel.tsx`) — what it
  looks like first, then name, aliases, how it is shown, facts viewers can ask, never-say,
  keep-true, competitors. **Draft from product image** sends the chosen image to
  `POST /api/campaigns/:id/knowledge/describe` (Gemini vision) and fills the appearance and
  notes as a draft; nothing is saved until Save.
- **03 / REFERENCE FRAME** (optional, collapsed) — a clip or still to place the product
  into. Without it the product image itself is the starting frame, fitted inside 16:9 on
  black (`composeProductFrame`), so "Generate live" works from a product image alone.
- **04 / SCENE BRIEF** (collapsed) — the brief the engineer rewrites; artwork position
  controls appear only when a reference frame is used.
- Director panel: suggestions come from the knowledge; after a direction the receipt shows
  "You: …" and "Sent: …" with whether Gemini rewrote it and how many notes it used;
  questions are answered in an overlay on the stage and never sent.
- Scene library: shown as paused; preset buttons are disabled. The prepare route still
  receives the default title id.
- Activity records "Scene brief engineered", "Product info saved", "Product image added",
  and "Question answered on screen".

## Verified (2026-09-12)

- `npm test`: 34 unit tests (domain + knowledge) via `tests/load.cjs`, which transpiles
  TypeScript modules with their `@/` imports in memory.
- `npm run test:api` against a dev server with `GEMINI_API_KEY`: 24 tests, including
  engineered receipts, the on-screen answer, refusals, knowledge round-trip, suggestions.
- Live Gemini samples: "make the sign glow brighter" (refine, McDonald's) → "The yellow
  golden arches on the red McDonald's storefront sign glow with a brighter, more intense
  light that illuminates the street." using one retrieved note; "a runner sprints past
  the poster as it starts to snow" (pivot, Nike) → snow scene with the Air Max poster
  described as approved. Latency 0.7–1.7 s per call.
- Not verified on Orbis: how the engineered prompts steer the video. Same commands as
  before, so the transport path is unchanged.

## Not built

- Embedding retrieval (lexical coverage is the seam), a database for knowledge and prompt
  versions, approval states, and the product-state grid / anchor-frame machinery from the
  platform plan (that exists on the `feat/director` branch against the old starter UI).
