# Contributing to Cutline

Help make live storytelling easier to direct, easier to join, and easier to trust. Useful contributions improve the interaction loop, real provider behavior, accessibility, failure recovery, or evidence behind product claims.

## Development

Follow [SETUP.md](docs/SETUP.md) for the locked install, local D1 migration, and preview. Begin in rehearsal mode. It supports story and voting development without provider credits. Use separate browser profiles when checking ownership or audience behavior.

```sh
npm run typecheck
npm run lint
npm test
CUTLINE_TEST_BASE=http://localhost:3000 npm run test:integration
npm run build
```

The integration suite makes isolated test identities and stories on the selected server. Run it against a local test environment with no shared Nebius key; it intentionally refuses a configuration that could invoke the live director. Keep provider keys out of test fixtures. Changes to a live provider adapter also need a small manual provider check with an authorized key and a documented result.

## Pull requests

Explain the concrete trigger, resulting behavior, and verification. A useful PR description includes:

- The user-visible problem and an example of the changed behavior.
- The part of the story, voting, or live-session lifecycle affected.
- Relevant checks and any provider behavior you could not verify.
- A screenshot or short recording for a substantial UI change, with no credentials visible.

Keep a change focused enough to review. For schema changes, update `db/schema.ts`, generate a new SQL migration with `npm run db:generate`, and verify it on a fresh local database. Do not rewrite an applied migration to hide a later schema change.

## Invariants to preserve

- Spectators may read room state and vote; only the creator may direct, mint tokens, export, or delete.
- A closed poll's winner and tallies are committed together. Late votes cannot alter them.
- A voter can change one ballot while a poll is open. Empty polls have no fabricated winner; ties follow visible choice order.
- Story mutations use a version comparison. A stale mutation should fail rather than overwrite newer state.
- The director context follows parent links from the selected scene. Abandoned branches remain saved but do not become current memory.
- A planned prompt, a provider acknowledgement, and visually observed output are separate facts.
- Rehearsal remains labeled and does not silently impersonate a working sponsor integration.
- Browser cleanup stops media tracks, invalidates obsolete callbacks, and releases stream timers.

## Source and UI conventions

Use the existing TypeScript types and Zod boundaries. Put persistence and credential handling in server-only code. Keep the live provider lifecycle in `use-live-video.ts`, durable room behavior in `use-story.ts`, and visible product controls in the studio/audience components.

Use accessible button labels, visible keyboard focus, disabled states during pending actions, and errors a presenter can act on. Test the audience on a narrow phone viewport and the studio on a laptop. Keyboard shortcuts should not hijack typing in text fields or dialogs.

Do not market an event acknowledgement as measured visual compliance, a generated cosmic scene as a real observation, or a story branch as an exact video rewind. Describe the behavior the app actually implements.

## Secrets and private data

Never commit `.env` values, API keys, scoped JWTs, browser cookies, real story exports, or screenshots of credential inputs. Configuration examples must use blank values. Reproduction reports should include response status and safe error text, not provider request headers. If a credential is accidentally published, revoke it with its provider before discussing the incident publicly.

For a security issue, use the repository's private reporting channel if one is enabled; otherwise contact the maintainer through an already established private channel. Do not assume a public issue is private, and do not invent a maintainer email address.

## Attribution and licensing

The official Visko starter adaptation is pinned and attributed in [STARTER.md](docs/STARTER.md). That source commit has no declared license. Do not remove its notices or claim that a broad project license grants rights to every adapted source file. Keep its provenance separate while the rights status is resolved.

Preserve third-party notices in the build/vendor files and dependency packages. New artwork and science imagery need a source, credit, reuse statement, and an accurate display label. NASA source material and model-generated output must remain distinguishable. See [PROVENANCE.md](docs/PROVENANCE.md) and the individual asset records.

The public repository URL and contribution workflow will be finalized when the repository is created. Drafts should not imply an existing issue tracker, code of conduct, security policy, or license grant that has not been added.
