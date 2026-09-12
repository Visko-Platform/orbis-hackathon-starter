---
phase: quick-260911-qab
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - my-orbis-app/vercel.json
  - my-orbis-app/package.json
  - README.md
autonomous: true
requirements: [SETUP-01]

must_haves:
  truths:
    - "`pnpm build` in my-orbis-app/ completes successfully and leaves pnpm-lock.yaml byte-identical"
    - "A Vercel production deployment of my-orbis-app/ returns HTTP 200 and renders the 'Setup required' landing while REACTOR_API_KEY is unset"
    - "A developer with a clean checkout can deploy without guessing which directory is the Vercel project root"
    - "REACTOR_API_KEY appears in no committed file and in no client-side bundle"
  artifacts:
    - path: "my-orbis-app/vercel.json"
      provides: "Vercel framework detection pinned to nextjs for the app subdirectory"
      contains: "nextjs"
    - path: "README.md"
      provides: "Deploy-to-Vercel instructions covering root directory and env vars"
      contains: "Deploy"
  key_links:
    - from: "README.md"
      to: "my-orbis-app"
      via: "documented Vercel Root Directory + `cd my-orbis-app && vercel` CLI path"
      pattern: "my-orbis-app"
    - from: "my-orbis-app/vercel.json"
      to: "next build"
      via: "framework preset"
      pattern: "\"framework\"\\s*:\\s*\"nextjs\""
    - from: "my-orbis-app/app/api/reactor/token/route.ts"
      to: "process.env.REACTOR_API_KEY"
      via: "Vercel server-side environment variable (never NEXT_PUBLIC_)"
      pattern: "process\\.env\\.REACTOR_API_KEY"
---

<objective>
Publish the existing Family Video Memories demo app to Vercel as a real, reachable website, and
make the deploy path repeatable from a clean checkout.

Purpose: The hackathon is Sept 12 (tomorrow). A live public URL gives judges and the presenter a
stable place to load the demo, and removes "does it even deploy?" from the critical path before
the 5:00 PM slot. Deploying today — before the Reactor API key is even issued at check-in — is
possible because `app/page.tsx` already branches to `<SetupRequired />` when the key is absent.

Output: `my-orbis-app/vercel.json`, a `## Deploy` section in the root `README.md`, and a live
Vercel production URL serving the app.

Scope guard: this plan does NOT touch the Orbis-Stable session/steering code. `my-orbis-app/app/`
components, `app/lib/visko.ts`, and the token route are read-only reference here. Wiring the live
session belongs to roadmap Phases 1-3.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@README.md
@my-orbis-app/package.json
@my-orbis-app/next.config.ts
@my-orbis-app/pnpm-workspace.yaml
@my-orbis-app/app/page.tsx
@my-orbis-app/app/SetupRequired.tsx
@my-orbis-app/app/api/reactor/token/route.ts
@.claude/skills/spike-findings-family_videos_memories/references/scaffold-and-auth.md
</context>

<prior_state>
Verified on disk before planning — treat as given, do not re-derive:

- `my-orbis-app/` is the real, committed `create-reactor-app` scaffold (34 tracked files). The
  spike-findings skill says explicitly: reuse it, do not re-scaffold and do not hand-roll a
  replacement Next.js app.
- It is a Next.js 15 App Router app: `@reactor-models/visko-orbis-stable@^2.3.0`,
  `@reactor-team/js-sdk@^3.0.0`, `next@^15.5.0`, `react@^19.1.0`, Tailwind 4 via
  `@tailwindcss/postcss`. Scripts are the stock `dev` / `build` / `start`.
- `my-orbis-app/app/page.tsx` sets `export const dynamic = "force-dynamic"` and renders
  `<SetupRequired />` when `!process.env.REACTOR_API_KEY`. There is no static prerender of the
  env-dependent page, so a keyless build is expected to succeed.
- `my-orbis-app/next.config.ts` already sets `outputFileTracingRoot: __dirname`. This is correct
  when `my-orbis-app` is the deploy root. Do not change it.
- `my-orbis-app/pnpm-workspace.yaml` declares the folder its own pnpm workspace root.
- `my-orbis-app/pnpm-lock.yaml` is `lockfileVersion: '9.0'`. Local pnpm is **11.5.1** — a version
  skew that can silently rewrite the lockfile into a format Vercel's pnpm may not read. This is
  the single most likely way to break the deploy; Task 1 guards it.
- Local toolchain: Node v22.23.2 (matches Vercel's current default Node 22 — no `engines` field
  needed), `vercel` CLI 54.14.2 at `/usr/local/bin/vercel`.
- The repo root has **no** `package.json`. Vercel's framework auto-detection at the repo root will
  fail. The app lives one level down. This is the core deployability problem this plan solves.
- Root `.gitignore` already ignores `.vercel` (unanchored, so it matches `my-orbis-app/.vercel`)
  and `.env.*` with a carve-out for `.env.example`. No `.env` file is tracked. There is no
  `vercel.json` anywhere in the repo yet.
- `public/images/cavite-1953.jpg` is the already-sanitized seed photo and is already public in
  this repo. Serving it from Vercel introduces no new privacy exposure.
</prior_state>

<tasks>

<task type="auto">
  <name>Task 1: Pin Vercel build config and prove a keyless production build</name>
  <files>my-orbis-app/vercel.json, my-orbis-app/package.json</files>
  <action>
    Create `my-orbis-app/vercel.json` containing only a `$schema` key pointing at
    `https://openapi.vercel.sh/vercel.json` and a `framework` key set to `nextjs`. Deliberately do
    NOT set `installCommand`, `buildCommand`, or `outputDirectory`: Vercel's Next.js preset already
    derives all three from `package.json` and the detected pnpm lockfile, and overriding them adds
    failure modes (notably a hard-coded pnpm invocation that breaks when Vercel's pnpm major
    differs from the one written here) without buying anything. The file exists to make framework
    detection explicit and to mark `my-orbis-app` as the project root for anyone reading the repo.

    Then reproduce Vercel's build locally, from inside `my-orbis-app/`: run
    `pnpm install --frozen-lockfile`, then `pnpm build`.

    Guard the lockfile, which is the highest-risk item here. Local pnpm is 11.5.1 while
    `pnpm-lock.yaml` is `lockfileVersion: '9.0'`. After installing, run
    `git diff --exit-code -- pnpm-lock.yaml` inside `my-orbis-app/`. If the lockfile was rewritten,
    or if `--frozen-lockfile` refused to install against it, restore it immediately with
    `git checkout -- pnpm-lock.yaml` and instead add a `packageManager` field to
    `my-orbis-app/package.json` pinning a pnpm 9 release (e.g. `pnpm@9.15.9`) so that Vercel's
    Corepack and any local run resolve the same major as the lockfile format. Do NOT resolve the
    skew by regenerating the lockfile at a newer format version — a v10/v11 lockfile is exactly
    what Vercel's builder may fail to read, and this is the day before the event.

    Do not add an `engines` field: local Node v22.23.2 already matches Vercel's default Node 22.
    Do not modify `next.config.ts` — `outputFileTracingRoot: __dirname` is already the correct
    setting for deploying `my-orbis-app` as its own root.

    If `pnpm build` fails, fix the build; do not work around it by relaxing TypeScript or ESLint
    settings in `next.config.ts`. A build that only passes with checks disabled is not a build that
    is safe to demo from.
  </action>
  <verify>
    <automated>cd my-orbis-app && pnpm install --frozen-lockfile && pnpm build && git diff --exit-code -- pnpm-lock.yaml && test -f vercel.json && grep -q '"framework"[[:space:]]*:[[:space:]]*"nextjs"' vercel.json</automated>
  </verify>
  <done>`my-orbis-app/vercel.json` pins `framework: nextjs`; `pnpm install --frozen-lockfile && pnpm build` both succeed; `pnpm-lock.yaml` is unchanged in git after the install.</done>
</task>

<task type="auto">
  <name>Task 2: Document the deploy path and verify no secret is committed or bundled</name>
  <files>README.md</files>
  <action>
    Add a `## Deploy` section to the root `README.md`, placed after the existing `## Event` section
    and before `## Planning docs`. It must answer the one thing a clean checkout cannot guess: the
    deployable app is `my-orbis-app/`, not the repo root, and the repo root has no `package.json`
    at all, so a Vercel project pointed at the repo root will fail framework detection.

    Cover both deploy paths explicitly:
    - CLI: `cd my-orbis-app` then `vercel` for a preview and `vercel --prod` for production. The
      CLI treats the current working directory as the project root, so no extra configuration is
      needed on this path.
    - Git integration via the Vercel dashboard: the project's **Root Directory** setting must be
      set to `my-orbis-app`. State plainly that this cannot be set from `vercel.json` — it is a
      project setting only — so it is the one manual step someone connecting the GitHub repo has
      to remember.

    Document the environment variable: `REACTOR_API_KEY` is set in Vercel Project Settings →
    Environment Variables, as a plain server-side variable. Call out that it must never be prefixed
    `NEXT_PUBLIC_`, because that prefix inlines a value into the client bundle and would publish
    the account key. Note that it is read only by the server route at
    `my-orbis-app/app/api/reactor/token/route.ts`, which exchanges it for a short-lived,
    model-scoped JWT.

    Note the deliberate keyless-deploy property: with `REACTOR_API_KEY` unset the site still builds
    and serves, rendering the "Setup required" landing rather than crashing, so the site can go up
    before the key is issued at event check-in.

    Add a short warning that once `REACTOR_API_KEY` is set, `/api/reactor/token` is a public,
    unauthenticated endpoint on a public URL that mints billable GPU session tokens, and that the
    per-second Orbis-Stable rate is still unconfirmed (open blocker in STATE.md). Recommend
    enabling Vercel Deployment Protection (password or SSO) on the deployment before adding the
    key, and removing the key again after the demo. This is threat T-QAB-02 below.

    Then verify secret hygiene across the repo. Confirm no `.env` or `.env.local` file is tracked
    by git (only `my-orbis-app/.env.example` should appear), and confirm no Reactor key literal
    (`rk_` prefix) exists in any tracked file or in the `.next` build output produced by Task 1 —
    especially not in `.next/static`, which is what ships to the browser. If a key literal is found
    anywhere in tracked files, stop and report it rather than quietly deleting it; a committed key
    needs revocation at reactor.inc, not just removal.
  </action>
  <verify>
    <automated>grep -q '^## Deploy' README.md && grep -q 'my-orbis-app' README.md && grep -qi 'Root Directory' README.md && grep -q 'REACTOR_API_KEY' README.md && test -z "$(git ls-files | grep -E '(^|/)\.env($|\.)' | grep -v '\.env\.example')" && test -z "$(git grep -l 'rk_[A-Za-z0-9]\{16,\}' -- . ':!.planning' || true)" && test -z "$(grep -rl 'rk_[A-Za-z0-9]\{16,\}' my-orbis-app/.next/static 2>/dev/null || true)"</automated>
  </verify>
  <done>Root README.md has a `## Deploy` section naming `my-orbis-app` as the Vercel root directory, documenting the dashboard Root Directory setting, the server-side `REACTOR_API_KEY` variable, the keyless-deploy fallback, and the Deployment Protection warning. No `.env`/`.env.local` is tracked and no `rk_` key literal exists in tracked files or in `.next/static`.</done>
</task>

<task type="auto">
  <name>Task 3: Deploy to Vercel production and confirm the live URL serves</name>
  <files>(no repo files modified — deployment only; `my-orbis-app/.vercel/` is gitignored)</files>
  <action>
    Deploy `my-orbis-app/` to Vercel production using the already-installed CLI (v54.14.2 at
    `/usr/local/bin/vercel`). Run every command from inside `my-orbis-app/` so the CLI uses that
    directory as the project root.

    First check authentication with `vercel whoami`. If it reports a logged-in user, proceed. If it
    fails because no credential is present, this is an authentication gate, not a task failure:
    stop, report that `vercel login` must be run interactively by the user, and surface the exact
    remaining commands so the deploy can be finished in one step afterward. Do not attempt to
    script an interactive browser login.

    Once authenticated, link the project with `vercel link --yes` and deploy with
    `vercel deploy --prod --yes`. Capture the production URL printed on stdout and export it as
    `DEPLOY_URL` for the verification step; record the same URL verbatim in the SUMMARY, since it
    is the deliverable the user actually asked for.

    Do NOT set `REACTOR_API_KEY` in the Vercel project environment in this task, and do not copy
    any value out of the local `.env.local`. Two reasons: the event key is not issued until
    check-in tomorrow, and an unprotected public deployment holding a live key exposes a
    billable, unauthenticated token-minting endpoint (threat T-QAB-02). The deployment is expected
    and intended to land on the "Setup required" landing page. Task 2's README section already
    documents how the presenter adds the key behind Deployment Protection when the time comes.

    If the Vercel build fails with a pnpm or lockfile error despite Task 1 passing locally, the
    version skew documented in Task 1 is the prime suspect — apply the `packageManager` pin from
    Task 1's fallback branch and redeploy rather than regenerating the lockfile.
  </action>
  <verify>
    <automated>test -n "$DEPLOY_URL" && curl -sSfL --max-time 30 "$DEPLOY_URL" -o /tmp/qab-deploy.html && grep -q 'Setup required' /tmp/qab-deploy.html && ! grep -qE 'rk_[A-Za-z0-9]{16,}' /tmp/qab-deploy.html</automated>
    <human-check>Open the production URL in a browser. Confirm the page renders the dark "Setup required" card with the Reactor header and is not an error page or a raw 404. Confirm the URL is one you are willing to share with judges.</human-check>
  </verify>
  <done>A Vercel production deployment exists; the URL returns HTTP 200, renders the "Setup required" landing (proving the keyless fallback works in the real deploy environment), leaks no `rk_` literal in the served HTML, and is recorded in the SUMMARY. `REACTOR_API_KEY` is intentionally unset in the Vercel project.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| public internet → Vercel-hosted `/api/reactor/token` | Unauthenticated request crosses into a route that mints billable, session-scoped GPU credentials |
| Vercel server runtime → api.reactor.inc | `REACTOR_API_KEY` (account-level credential) crosses here; must never cross toward the browser |
| local working tree → public git remote / Vercel upload | Secrets in `.env.local` must not cross this boundary |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-QAB-01 | Information Disclosure | `REACTOR_API_KEY` in build output or git | mitigate | Task 2 asserts no `.env`/`.env.local` is tracked and greps tracked files plus `.next/static` for any `rk_` literal; README forbids the `NEXT_PUBLIC_` prefix. Task 3 re-greps the served HTML from the live URL. |
| T-QAB-02 | Denial of Service (cost abuse) | Public `GET /api/reactor/token` on the deployed URL | mitigate | Deploy with `REACTOR_API_KEY` unset so the endpoint mints nothing (Task 3). README documents enabling Vercel Deployment Protection before adding the key and removing it after the demo. Reinforced by the route's existing `max_sessions: 10` cap and 1h token lifetime. Per-second billing rate is an open STATE.md blocker, so exposure is unbounded until confirmed at check-in. |
| T-QAB-03 | Elevation of Privilege | Minted JWT scope | accept | Already mitigated upstream by `authorization_details` in the existing token route, which downscopes the JWT to `reactor/visko-orbis-stable` sessions it created itself. Not modified by this plan; no new exposure introduced. |
| T-QAB-04 | Tampering | Lockfile rewrite during install | mitigate | Task 1 runs `--frozen-lockfile` and asserts `git diff --exit-code` on `pnpm-lock.yaml`, so dependency resolution cannot silently drift between local verification and the Vercel build. |
| T-QAB-SC | Tampering | npm/pnpm package installs | accept | No new packages are added by this plan. `pnpm install --frozen-lockfile` resolves only the already-committed, already-audited dependency set from the existing `pnpm-lock.yaml`. Package Legitimacy Gate does not apply — no new package enters the tree. |
</threat_model>

<verification>
- `cd my-orbis-app && pnpm install --frozen-lockfile && pnpm build` exits 0
- `cd my-orbis-app && git diff --exit-code -- pnpm-lock.yaml` exits 0
- `my-orbis-app/vercel.json` exists and pins `"framework": "nextjs"`
- Root `README.md` contains a `## Deploy` section naming `my-orbis-app` and the Root Directory setting
- No `.env` / `.env.local` tracked by git; no `rk_` literal in tracked files, `.next/static`, or the served HTML
- The Vercel production URL returns 200 and renders "Setup required"
- No file under `my-orbis-app/app/` was modified (session/steering code untouched)
</verification>

<success_criteria>
The Family Video Memories demo app is live at a public Vercel URL, that URL is recorded in the
SUMMARY, and a developer with a clean checkout can reproduce the deploy from the root README
without guessing the project root. The deployment carries no Reactor API key, and the path to
adding one safely — behind Deployment Protection, server-side only — is documented.
</success_criteria>

<output>
Create `.planning/quick/260911-qab-create-a-vercel-website/260911-qab-SUMMARY.md` when done.
Record the production URL verbatim, whether the `packageManager` pin fallback was needed, and
whether `vercel login` required user interaction.
</output>
