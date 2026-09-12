# Adtractive (was Orbis-ad) knowledge director — 10/10  updated 2026-09-12 15:50

Current branch: feat/scene-contract from origin/main (1541c3e, which includes the teammate's real-footage scene library). Not pushed.

Branch: feat/knowledge-director, pushed with tay's permission 2026-09-12; PR #2 https://github.com/mian-abd/orbis-hackathon-adtractive/pull/2. Ports the knowledge base and
prompt engineering into the teammate's studio prototype. The older feat/director branch is the
full director (states, anchors, overlay) against the old starter UI; kept as reference.

## Tasks
✓ 1 lib/knowledge: types + seeds (Pepsi, McDonald's, Nike) + file store   me   verified (unit)
✓ 2 guard, retrieval (notes/facts, question detection), validation         me   verified (unit)
✓ 3 prompt engineer + GeminiEngine per role, passthrough fallback, audit  me   verified (unit + API live)
✓ 4 routes: knowledge GET/PUT, suggestions, prepare + pivot engineered    me   verified (API suite 24/24 with Gemini)
✓ 5 tests: tests/load.cjs TS loader, knowledge.test.cjs, api.test.cjs updated  me  verified (npm test 34, test:api 24)
✓ 6 docs: docs/KNOWLEDGE_DIRECTOR.md, README, HANDOVER, .env.example       me   written
✓ 7 studio UI: 04 / KNOWLEDGE panel, receipt, overlay, suggestions         agent  verified (typecheck, build, browser: overlay + save)

✓ 8 product-first studio: 01 PRODUCT (add image), 02 PRODUCT INFO open + draft-from-image, frame optional, scene library paused  me  verified (typecheck, tests, browser)
✓ 9 describe endpoint (Gemini vision → appearance + notes draft), product image as starting frame  me  verified (unit + API live + browser)

✓ 10 scene contract: product/person/setting/custom lines, built at prepare, restated in every direction, advanced per pivot, read from a frame, editable card  me  verified (unit 43, API 29, typecheck, build, browser)

## Subagents
- studio UI builder (general-purpose) — done in 8 min; every file read by me; browser-verified by me

## Open
- Contract is level 0 only (restatement). No watchdog, no repair; the pitch's other steps are not built.
- Contract lines from a live frame are unverified (no Orbis session); the preview-frame path is browser-verified.
- Engineered prompts not run on Orbis this phase (transport unchanged; same commands).
- Facts in the seeds are demo copy; operator must check before a real demo.
- Opening rewrites can add product interaction the brief did not ask for; instruction
  tightened after one sample, not re-sampled.

## Needs from tay
- say "push" to update PR #2 with the product-first commits (not pushed)
- review/merge PR #2 with the teammate
- live run to see engineered prompts on Orbis
