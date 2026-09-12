# Setup and operation

## Requirements

- Node.js 22.13 or newer and npm, with the repository's lockfile.
- A browser that supports WebRTC. Chrome or Edge is the practical demo target; recording formats vary by browser.
- A Reactor account/key with access to Visko Orbis Dynamic for live video.
- A Nebius Token Factory key with access to the configured chat model for structured direction.
- A public HTTPS deployment for audience phones outside the development computer. A phone's `localhost` points at the phone, not the presenter computer.

No provider key is needed for the labeled rehearsal path, local voting, story persistence, branching, or text/JSON export.

## First local run

Run from the repository root:

```sh
npm run install:ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_magical_sway.sql
npm run dev -- --port 3000
```

`install:ci` installs locked dependencies once. Do not run overlapping installers. The first build creates `dist/server/wrangler.json`, including the local `DB` binding. Apply the checked-in migration once to a fresh local database; it creates the four application tables. When modifying the schema, generate and apply a new migration rather than replaying an already applied file.

Open `http://localhost:3000`. Rehearse the cosmic opening or create **The last train** from the story library. To test the audience, open the invitation link in a separate browser profile or private window. Tabs in the same profile normally share a cookie and therefore a single voting identity.

The portable dev profile defaults to port 5173 if a port is not supplied. `.wrangler/state` persists local D1 data. `.sites-runtime` and `.vinext` hold ignored development-tool state. Keep those directories local. Do not delete `.wrangler/state` if you need its stories.

To preview the built Worker:

```sh
npm run build
npm start -- --port 3000
```

Use one preview process per port. The built preview is local; it does not publish the application. When operating inside managed Sites tooling, use that environment's configured installation, preview, build, and publishing lifecycle.

## Personal credentials in Connections

1. Open **Connections** in the studio.
2. Paste your Reactor key into **Personal Reactor API key**.
3. Paste your Nebius Token Factory key into its field if you want AI-generated scene plans and choices.
4. Select **Use these connections**.
5. Start live cinema. Enter a short, visible direction and inspect the scene source and command status.

The fields are password inputs. The app holds them in the current tab's React state and sends them through the server only for the appropriate provider request. A refresh clears them. **Clear keys** removes the app's saved key state for that tab; ending a running media session is a separate action.

The Reactor API key is never used directly by the browser SDK. The creator-only server endpoint exchanges it for a scoped session JWT. Audience clients receive neither the API key nor that JWT.

## Shared presenter access

Use shared server credentials when the organizer wants a presenter to use host-managed credits without pasting provider keys into the UI. The included `.env.example` is a template:

```dotenv
# Leave these blank in committed source.
REACTOR_API_KEY=
NEBIUS_API_KEY=
LIVE_ACCESS_CODE=
REACTOR_MODEL=reactor/visko-orbis-dynamic
NEBIUS_MODEL=openai/gpt-oss-120b
SHARED_REACTOR_HOURLY_LIMIT=12
SHARED_NEBIUS_HOURLY_LIMIT=120
```

Make a local copy such as `.env.local` and fill it privately, or configure the same values as secret bindings in the deployed host. `.env*` is ignored except `.env.example`. Never add a `NEXT_PUBLIC_` or `VITE_` prefix to a provider credential.

The verified local Vite/Cloudflare preview loads the ignored environment file when started with:

```sh
npm run dev -- --port 3000
```

The server looks in Worker bindings first and `process.env` second. Hosting environments have their own secret provisioning mechanism; a local env file is not automatically a production secret. Confirm only the configuration flags through `/api/bootstrap`, then test an actual creator request. A flag does not validate a key or account balance.

Use a randomly generated presenter access code of at least 16 characters. Enter it in the Connections field labeled **Presenter access code for shared server keys**. A missing or short code makes shared-key requests fail closed; a wrong supplied code is rejected. Personal keys can be used independently of the shared configuration.

Provider credits, permissions, and model availability belong to the provider account. Atomic shared-provider counters limit requests across all browser identities; their defaults are 12 Reactor token requests and 120 Nebius calls per hour. The two `SHARED_*_HOURLY_LIMIT` settings accept positive integers up to 1,000. These are request limits, not currency limits. Keep shared access limited to intended presenters and use provider-side budgets for a spending ceiling.

## Models and limits

| Setting                         | Default / accepted value           | Meaning                                                                                               |
| ------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `REACTOR_MODEL`                 | `reactor/visko-orbis-dynamic`      | Default model for live steering                                                                       |
| Alternate Reactor model         | `reactor/visko-orbis-stable`       | Select the offered model in Connections; retest its prompt behavior before presenting                 |
| `NEBIUS_MODEL`                  | `openai/gpt-oss-120b`              | Model sent to Token Factory; confirm access and current availability in your account                  |
| Reactor token                   | 30-minute credential expiry        | One matching model, at most one session                                                               |
| Live session                    | 15-minute maximum authorization    | Browser ends the session before that limit; model-specific generation limits may finish earlier       |
| Story                           | 120 beats                          | Start another story after the cap                                                                     |
| Cookie hourly counters          | 30 create / 100 direct / 12 tokens | Per browser-derived identity                                                                          |
| Shared-provider hourly counters | 12 Reactor / 120 Nebius by default | Atomic across browser identities when using server keys; personal keys use their own provider account |

## Troubleshooting

| Symptom                                            | Next action                                                                                                                                                      |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Story storage unavailable or no such table         | Check the `DB` binding, build the Worker config, and apply the initial local migration to the same `.wrangler/state` directory.                                  |
| Reactor rejects credentials                        | Confirm the key, Orbis model access, available credits, and model name. Re-enter Connections values after a refresh.                                             |
| Shared-key request asks for presenter code         | Enter the private code in Connections; verify the server value is at least 16 characters.                                                                        |
| Nebius is unavailable                              | Check key, account/model permissions, rate limits, and connectivity. Failed real requests report errors; they are not silently relabeled as successful AI plans. |
| Video is connected but needs a click               | Use **Start playback**. Browser autoplay may require a user gesture.                                                                                             |
| Video remains on the reference frame               | Check connection/priming status. A source image is not evidence that live frames arrived. End and reconnect after an error.                                      |
| Orbis model has no available capacity              | Choose the other supported Orbis model in Connections or wait and reconnect; keep the story saved.                                                               |
| Command is accepted but the exact action is absent | Use a simple visible change, preserve the same subject/setting, and allow subsequent chunks. Acceptance does not guarantee semantic compliance.                  |
| Image looks stretched                              | Ensure the reference fitting path runs before upload. Original agency images should be contained in a 16:9 frame, not stretched.                                 |
| Audience cannot open a localhost room              | Use the checked public HTTPS deployment. Copying a desktop localhost URL cannot connect a phone.                                                                 |
| Two tabs count as one voter                        | Use distinct browser profiles/devices; the ballot is keyed to the shared cookie identity.                                                                        |
| Voting shows reconnecting briefly                  | SSE reconnects after a bounded stream lifetime. Check that the next snapshot restores current totals.                                                            |
| Story changed in another tab                       | A version conflict prevented an overwrite. Let the latest snapshot arrive, then retry the intended action.                                                       |
| Recording is empty or unsupported                  | Wait for live playback and use a MediaRecorder-capable browser. Record the next ten seconds; this does not retrieve previous footage.                            |
| Creator library disappeared                        | The creator cookie may have been cleared or belongs to another browser profile. There is no account-based recovery in this release.                              |

## Deployment preparation

1. Build and verify the current checkout; apply the production SQL migration through the deployment platform's migration flow.
2. Provision a production D1 `DB` binding and server secrets through the platform. The checked-in placeholder local database ID is not a production database.
3. Publish using the hosting environment's supported flow. Confirm the resulting real HTTPS URL before adding it to README, GitHub About, QR demos, or slides.
4. Create a fresh story on the deployed app; open it from a second device, vote, apply a winner, and inspect the shared live screen.
5. Run a real live session and record a short demo take. Keep the secret fields and session JWT out of screenshots, logs, and exports.

The public URL, deployment account, final migration status, and publication date remain release-specific facts to fill in after they are verified.
