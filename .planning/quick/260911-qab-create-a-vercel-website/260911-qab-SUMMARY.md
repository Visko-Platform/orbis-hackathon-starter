---
phase: quick-260911-qab
plan: 1
subsystem: deploy
tags: [vercel, nextjs, deploy-config, docs]
dependency-graph:
  requires: []
  provides: [vercel-framework-pin, deploy-docs]
  affects: [my-orbis-app, README.md]
tech-stack:
  added: []
  patterns: ["vercel.json framework pin without command overrides", "keyless-deploy fallback via SetupRequired"]
key-files:
  created:
    - my-orbis-app/vercel.json
  modified:
    - README.md
decisions:
  - "No packageManager pin fallback needed — local pnpm 11.5.1 installed against the v9.0 lockfile with --frozen-lockfile and produced zero lockfile diff, so the documented skew risk did not materialize."
metrics:
  duration: "~15 min"
  completed: 2026-09-11
---

# Quick Task 260911-qab: Vercel Deployment Setup Summary

Pinned Vercel's Next.js framework detection for `my-orbis-app/`, documented the full deploy
path (CLI + dashboard) and secret-hygiene requirements in the root README, and deployed the app
to Vercel production. The site is live at **https://my-orbis-app.vercel.app** with
`REACTOR_API_KEY` intentionally unset, serving the "Setup required" landing.

## Tasks Completed

### Task 1: Pin Vercel build config and prove a keyless production build

- Created `my-orbis-app/vercel.json` with only `$schema` and `"framework": "nextjs"` — no
  `installCommand`/`buildCommand`/`outputDirectory` overrides, per plan (Vercel's Next.js preset
  already derives these correctly).
- Ran `pnpm install --frozen-lockfile` inside `my-orbis-app/` with local pnpm 11.5.1 against the
  committed `lockfileVersion: '9.0'` lockfile — succeeded with **zero lockfile diff**
  (`git diff --exit-code -- pnpm-lock.yaml` passed). The documented version-skew risk did not
  materialize, so the `packageManager` pin fallback in `package.json` was **not needed** and
  `package.json` was left unmodified.
- Ran `pnpm build` — succeeded (`✓ Compiled successfully`, all 4 pages generated, no
  TypeScript/ESLint relaxation).
- Full verify command from the plan passed: install + build + lockfile-unchanged +
  `vercel.json` framework pin all green.
- Commit: `57e8d40` — `feat(quick-260911-qab): pin Vercel framework detection to nextjs`

### Task 2: Document the deploy path and verify no secret is committed or bundled

- Added a `## Deploy` section to root `README.md`, placed between `## Event` and
  `## Planning docs`, covering:
  - **CLI path:** `cd my-orbis-app && vercel` (preview) / `vercel --prod` (production).
  - **Dashboard Git integration:** explicit callout that **Root Directory** must be set to
    `my-orbis-app` in Project Settings → General, and that this cannot be set via `vercel.json`.
  - **Environment variable:** `REACTOR_API_KEY` as server-side only, never `NEXT_PUBLIC_`-prefixed,
    read only by `my-orbis-app/app/api/reactor/token/route.ts`.
  - **Keyless-deploy fallback:** the app builds/serves the "Setup required" landing with the key
    unset, so the site can go live before the event key is issued.
  - **T-QAB-02 warning:** once the key is set, the token route is a public, unauthenticated,
    billable endpoint — recommends enabling Vercel Deployment Protection before adding the key
    and removing it after the demo, and references the open per-second billing rate blocker in
    `.planning/STATE.md`.
- Verified secret hygiene:
  - `git ls-files | grep -E '(^|/)\.env($|\.)'` → only `my-orbis-app/.env.example` is tracked;
    no `.env`/`.env.local`.
  - `git grep 'rk_[A-Za-z0-9]{16,}'` across tracked files (excluding `.planning`) → none found.
  - `grep -rl 'rk_[A-Za-z0-9]{16,}' my-orbis-app/.next/static` → none found (checked against the
    build output produced in Task 1).
- Full verify command from the plan passed.
- Commit: `463367a` — `docs(quick-260911-qab): document Vercel deploy path and secret hygiene`

### Task 3: Deploy to Vercel production and confirm the live URL serves

Ran after explicit user authorization (Tasks 1-2 were executed first, unauthenticated deploy
gated on a go/no-go check per the plan's own instruction).

- `vercel whoami` confirmed an authenticated session (`romyilano-7670`) — no interactive login
  needed.
- `vercel link --yes` created and linked `romyilano-7670s-projects/my-orbis-app`.
- `vercel deploy --prod --yes` built and deployed successfully from `my-orbis-app/`:
  - Deployment id: `dpl_H7v3A5TZfsmmhUferZqaAzGrykNm`
  - Deployment URL: `https://my-orbis-hm70zpn32-romyilano-7670s-projects.vercel.app`
  - Stable production alias: **`https://my-orbis-app.vercel.app`**
  - Remote build used pnpm 10.x against the same `lockfileVersion: '9.0'` lockfile with no
    resolution step needed ("Lockfile is up to date") — confirms Task 1's local build result
    reproduces on Vercel's builder.
- `REACTOR_API_KEY` was **not** set in the Vercel project, per plan — deploy is intentionally
  keyless.
- Live-URL verification (via the stable alias):
  - `curl` → HTTP 200
  - Response body contains "Setup required" (keyless fallback confirmed in the real deploy
    environment)
  - No `rk_[A-Za-z0-9]{16,}` literal in the served HTML
- Human-check: not performed by the agent (browser confirmation is the user's own follow-up, per
  the plan's `<human-check>` note) — the automated checks above cover the functional and secret-
  hygiene requirements.

**Live URL:** https://my-orbis-app.vercel.app

## Deviations from Plan

None. All three tasks executed as written. Two things worth noting:
- The `packageManager` pin fallback in Task 1 was correctly skipped — the documented pnpm 11
  vs. lockfile v9.0 skew did not cause a lockfile rewrite, locally or on Vercel's builder.
- Task 3 was split into two dispatches (Tasks 1-2, then Task 3) so the production deploy step
  could get explicit human authorization before running — not a plan deviation, an execution-
  sequencing choice given the action's externally-visible nature.

## Verification Status

- [x] Task 1 automated verify: PASSED
- [x] Task 2 automated verify: PASSED
- [x] Task 3 automated verify: PASSED (live URL returns 200, renders "Setup required", no key leak)
- [ ] Task 3 human-check (open URL in browser, confirm shareable with judges): left for the user

## Known Stubs

None introduced by this plan. `REACTOR_API_KEY` remains unset by design until event check-in.

## Threat Flags

- T-QAB-01 (key leak): mitigated and verified — no `rk_` literal in tracked files, `.next/static`,
  or the served production HTML.
- T-QAB-02 (cost-abuse DoS via public token endpoint): mitigated for now — key is unset, so the
  endpoint mints nothing. **Live flag for the user:** once `REACTOR_API_KEY` is added at event
  check-in, enable Vercel Deployment Protection on this project *before* saving the env var, per
  the README `## Deploy` section.
- T-QAB-04 (lockfile tampering): mitigated and verified on both local and Vercel builds.

## Self-Check: PASSED

- FOUND: my-orbis-app/vercel.json
- FOUND: README.md contains `## Deploy` section
- FOUND: commit 57e8d40
- FOUND: commit 463367a
