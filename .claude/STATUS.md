# Orbis-ad knowledge director — deploy prep 10/10, deploy blocked on Vercel login  updated 2026-09-12 16:10

Branch: feat/knowledge-director, pushed with tay's permission 2026-09-12; PR #2 merged into main 2026-09-12 (10702ca). Ports the knowledge base and
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

✓ 10 Vercel prep: Blob-backed knowledge store, image downscale for drafting, audit skips disk on Vercel, .vercelignore  me  verified (typecheck, 36 unit, clean build, 25 API vs local prod server)
… 11 deploy: vercel link → blob create-store (public, auto-injects token) → tay adds keys → deploy --prod  blocked: CLI token invalid, needs `vercel login`

## Subagents
- studio UI builder (general-purpose) — done in 8 min; every file read by me; browser-verified by me

## Open
- Engineered prompts not run on Orbis this phase (transport unchanged; same commands).
- Facts in the seeds are demo copy; operator must check before a real demo.
- Opening rewrites can add product interaction the brief did not ask for; instruction
  tightened after one sample, not re-sampled.

## Needs from tay
- `npx vercel login` (CLI token expired; the Vercel MCP connector shows no team)
- add REACTOR_API_KEY and GEMINI_API_KEY to the Vercel project yourself (keys are never handled by the agent)
- tell the teammate main moved: their next `git pull` brings the knowledge layer and the product-first studio
- live run to see engineered prompts on Orbis
