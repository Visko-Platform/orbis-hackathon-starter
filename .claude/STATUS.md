# Orbis-ad knowledge director (branch feat/knowledge-director, from origin/main) — 7/7  updated 2026-09-12 14:35

Branch: feat/knowledge-director, local only, never push without tay. Ports the knowledge base and
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

## Subagents
- studio UI builder (general-purpose) — done in 8 min; every file read by me; browser-verified by me

## Open
- Engineered prompts not run on Orbis this phase (transport unchanged; same commands).
- Facts in the seeds are demo copy; operator must check before a real demo.
- Opening rewrites can add product interaction the brief did not ask for; instruction
  tightened after one sample, not re-sampled.

## Needs from tay
- decision: push this branch / open a PR to mian-abd/Orbis-ad?
- live run to see engineered prompts on Orbis
