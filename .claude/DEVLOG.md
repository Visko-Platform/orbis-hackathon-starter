# DEVLOG — feat/knowledge-director

## Context (2026-09-12)
- Teammate's `main` replaced the starter with a studio (`components/studio/*`, `hooks/use-live-continuation.ts`,
  `lib/{studio-data,continuation-prompt,live-direction,placement-frame}.ts`, prepare/pivot/eligible routes,
  node:test `.cjs` suites, no Gemini, no zod/vitest). HANDOVER.md said the knowledge base and viewer
  guardrail were "design work, not implemented".
- tay: "we have a pre built prototype but we are missing the knowledge base for the product and prompt
  engineering user prompt, add that feature". Earlier in the day the same feature was built on
  `feat/director` against the old starter; that branch cannot merge (every file it touches was deleted).

## Decisions
1. **Port, don't merge.** New branch from origin/main; `lib/knowledge/` is a port of the director's
   guard/retrieve/validate/ground/audit/suggest, adapted to the studio's Campaign ids and hand-validated
   (no zod) to match the codebase. feat/director stays as the reference for states/anchors.
2. **Engineer only the operator's text; keep the teammate's prompt scaffolding.** `buildContinuationPrompt`
   and `buildLiveDirection` are unchanged in shape and gain optional knowledge inputs. The 60/100-word
   prompt-guide limits from feat/director are not applied to the full prompt (theirs is long by design
   and live-tested); they apply to the engineered fragment via the role instructions only.
3. **Passthrough without a key = today's behaviour.** `engineerPrompt` with no engine returns the
   operator's words after guard + validation, so the prototype works unchanged without Gemini.
4. **Questions → overlay, never a prompt.** `isFactQuestion` gates it; 422 when no approved fact.
5. **Knowledge files are per machine (gitignored); seeds are the source in code.**
6. **Keep node:test.** `tests/load.cjs` transpiles TS in memory and follows `@/` imports in this realm
   (runInThisContext, esModuleInterop) so deepEqual and instanceof work.

## Landmines
- `.next/dev/types/validator.ts` from the other branch made `tsc` fail until the dev server on this
  branch regenerated it.
- `runInNewContext` (their original loader) breaks `assert.deepEqual` and `instanceof Error` across realms.
- `npm install` on this branch removed vitest/zod/sharp from node_modules; switching back to feat/director
  needs `npm install` again.
- Their API tests asserted the raw direction appears in the prompt; with engineering on that is false by
  design. Rewritten to assert the receipt (`engineered.source`) and that the prompt contains
  `engineered.text`.

## Verified (2026-09-12 14:30)
- `npm test` 34/34, `npm run test:api` 24/24 (Gemini on), `npm run typecheck`, `npm run build` clean.
- Browser: 04 / KNOWLEDGE loads Pepsi, Save → "Saved 01:32 PM"; "how many calories in a can?" → Ask →
  overlay on the stage with both calorie facts, receipt "Answered on screen"; suggestion chips are
  knowledge-derived. Directions themselves need a live take, so the "You → Sent" receipt was checked
  through the API response only.

## Next
- Live run; re-sample opening rewrites after the "no unasked product interaction" rule.
- PR #2 opened 2026-09-12 on tay's "open it" (push + PR). Later doc commits stay local until asked.
