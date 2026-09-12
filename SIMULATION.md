# Simulation runtime

Open `/sim-lab` to inspect the New in SF V2 scenario, manually replay the MDP,
or start an Orbis-backed render run.

## Scenario contract

Scenarios are YAML files in `scenarios/`. They declare a factored state
schema, initial state, a list of discrete actions, transition effects, and a
renderer-neutral visual intent. The server is authoritative: it validates
actions, applies deterministic transitions, and stores every step.

Each action's `available_when` guard is a partial state match; `requires`
adds numeric bounds such as `energy >= 1`. Its
`transition.set` values replace fields, while `transition.add` applies numeric
deltas. Every produced state is validated against the declared schema.

An optional `episode` block declares a maximum length, terminal success and
failure states, and symbolic rewards. Renderer judgments never change these.

## Runtime sequence

1. The API creates a server-side run in `data/simulation.sqlite`.
2. A policy selects one of the currently allowed actions.
3. The server persists the deterministic state transition and render intent.
4. The browser sends that intent to Orbis and waits for `chunks_per_action`.
5. The browser captures a frame and posts it back to the API.
6. Gemini judges visual alignment only; it cannot change symbolic truth.

## Useful commands

```bash
npm run dev
npm run sim:smoke
npm run sim:collect -- 500
npm run typecheck
```

`sim:smoke` validates YAML loading, legal-action selection, deterministic
transition application, graph expansion, and local SQLite persistence.

`sim:collect` stores a seeded 50/50 mix of balanced and random symbolic New
in SF episodes in `data/simulation.sqlite`, then writes an ignored JSONL
artifact under `data/episode-exports/`. It does not call Orbis or Gemini.
