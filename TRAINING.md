# Training plan: New in SF V2

## What an episode records

Each symbolic step has the true state before and after the action, the legal-action context implied by the scenario, action id, deterministic reward, terminal flag, render intent, and optional renderer judgment/frame path. Collection writes this data to the local SQLite database and an ignored JSONL export under `data/episode-exports/`.

The initial collection mix is deliberately split between two behavior policies:

- `balanced`: a simple hand-authored successful policy that alternates work and park visits;
- `random`: samples a legal action with a seeded PRNG and supplies failure/off-distribution trajectories.

This makes the data useful for both imitation learning and evaluation, without making a renderer or VLM part of the reward function.

## Recommended policy sequence

### 1. Exact Bellman planner

V2 is a fully specified finite, deterministic MDP, so use exact Bellman
backward induction first. The solver enumerates reachable states and chooses:

```text
V(s) = max_a [ reward(s, a) + V(next_state(s, a)) ]
```

It is the source-of-truth symbolic policy and gives an exact expected return
for every reachable state. The Simulation Lab surfaces this value and action.

### 2. Tabular Q-learning baseline

Use the exact symbolic state as the key and retain a Q-value for each globally defined action. Mask out illegal actions before selecting `argmax` or an exploratory action. This is the best first policy because V2 is deterministic, compact, and fully observable; it proves that the rewards and terminal conditions are learnable before introducing a neural network.

Train online against the environment rather than only from logged episodes. The logged corpus is primarily an audit trail, a behavior-cloning seed set, and a held-out evaluation set.

### 3. Small masked MLP policy

Once the tabular agent is reliable, replace the table with a two-layer MLP (64 hidden units per layer is ample):

```text
input: one-hot(day, time, location) + normalized(energy, money, connections)
output: one logit for every global action
selection: set illegal-action logits to -infinity, then sample / argmax
```

Start by behavior-cloning the `balanced` trajectories. Then improve with PPO or DQN against the deterministic simulator. PPO is a reasonable default if we want a reusable policy interface across later, larger scenarios; DQN is also valid here but less convenient with changing action masks.

### 4. Visual belief model (later)

Do not train an RGB-to-action policy first. Rendered video is expensive and 500 episodes is far too little for that. Instead use rendered runs with their symbolic labels to train a small *belief model*:

```text
RGB frame (+ optional segmentation) -> location, time, energy proxy, money proxy, connections proxy
```

Use a frozen lightweight image encoder such as MobileNetV3 or ViT-S/16 with small classification heads. Feed its predicted symbolic belief into the already-tested masked policy. This separates renderer/perception failures from decision-policy failures.

Gemini's alignment score remains a dataset-quality filter and renderer metric. It must not become the source of truth for state, reward, or episode termination.

## Evaluation

Keep a fixed seed split. Report:

- success rate;
- mean return;
- mean episode length;
- money and connections at termination;
- rendered-subset Gemini state/action alignment separately from RL return.

The practical first milestone is: a tabular policy reaches near-100% success from the standard initial state and outperforms both random and the hand-authored balanced policy on mean return.
