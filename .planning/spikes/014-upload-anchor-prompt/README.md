---
spike: 014
name: upload-anchor-prompt
type: standard
validates: "Given a real, imperfect uploaded family photo, when edited via Gemini's image model (gemini-2.5-flash-image, \"Nano Banana\") with a restoration + reframe prompt, then produce a clean 16:9 Orbis-ready anchor image that preserves the real people's identity/likeness unaltered"
verdict: VALIDATED (content) — render PENDING
related: [015, 016]
tags: [prompts, nano-banana, gemini, upload, privacy, orbis]
---

# Spike 014: Upload Anchor Prompt

## What This Validates

Given a real, imperfect uploaded family photo (arbitrary aspect ratio, scan quality, era — not
a curated stock image), when edited via Gemini's image-editing model with a purpose-written
prompt, then the output is a clean, 16:9, Orbis-ready anchor image that never alters a real
person's face, body, or identity.

## Research

`orbis-hackathon-starter`'s `lib/nano-banana.ts` is the closest working reference: a single
`NANO_BANANA_PROMPT` string fed to `gemini-2.5-flash-image` alongside a bundled `street.png`,
asking for a mood/lighting edit only ("golden late-afternoon sun... Keep the people, vehicles,
and buildings unchanged"). That prompt already establishes the right pattern (identity-lock
language + a single edit instruction) but solves a narrower problem — a curated, already-16:9,
already-clean stock photo.

Confirmed via web search (2026-09-12) that `gemini-2.5-flash-image` is the correct, current
model id for "Nano Banana" image editing — not a placeholder or guessed name.

Real family photo uploads (per PRD.md §7 "Create-Your-Own Flow" and §16 "Live Demo Mode") differ
from the starter's input in three ways that change the prompt:

| Difference | Starter's input | This project's input |
|---|---|---|
| Aspect ratio | Already 16:9 | Arbitrary (phone photos, old prints, scans) |
| Quality | Clean, AI-generated | Scratches, dust, fading, creases |
| Subject | Generic street scene | Real, specific family members |

| Approach considered | Pros | Cons | Status |
|---|---|---|---|
| Reuse starter's prompt as-is | Zero new prompt-design work | Doesn't address aspect ratio or restoration; no identity-lock language beyond "keep people unchanged" | Rejected |
| Crop to 16:9 | Simple, no generative risk | Destroys content at the edges — the opposite of "faithful to the photo" | Rejected |
| Let Orbis squash non-16:9 images | No edit step needed at all | Documented behavior (`ImageStarter.tsx`): "resized to 832×480 with no crop" — visibly distorts anyone in a portrait-orientation photo | Rejected |
| **Restoration + outward 16:9 extension, identity-locked** | Preserves the whole original photo; produces a proper 16:9 anchor; explicit non-negotiable identity-preservation language | Outpainting quality unverified without a live key; extending backgrounds is inherently generative (mitigated by scoping invention to background only) | **Chosen** |

**Chosen approach:** `UPLOAD_ANCHOR_PROMPT` in `my-orbis-app/app/lib/upload-anchor.ts` — one
prompt with three explicit jobs: (1) restoration (scratches/dust/fading/exposure), (2) a hard
identity-lock clause forbidding any retouching, reshaping, or invention of real people/objects,
(3) 16:9 normalization via outward background extension (never crop, never squash), with the
extension itself constrained to never touch or reinterpret a real person.

This directly extends this project's existing privacy convention (`CONVENTIONS.md` → "Real-family
privacy: undocumented subjects") — never invent a likeness for a real person — into the upload
path specifically, which is new: prior spikes (004/005/012/013) only handled curated/archival
photos, never a live user upload.

## How to Run

1. Add `GEMINI_API_KEY` to `my-orbis-app/.env.local` (not committed; see `.env.example`).
2. `pnpm dev` from `my-orbis-app/`, sign in with the allowlisted Google account, open
   `/internal/upload-test` (spike 016's page).
3. Upload a real family photo (ideally non-16:9, and/or visibly aged) and click **Run pipeline**.
   The "Orbis start image" panel shows the Nano Banana output.

## What to Expect

- The output image is 16:9.
- Every person/object visible in the original photo is still recognizably present and unaltered.
- If the input was already 16:9 and clean, the output should look nearly identical (restoration
  with nothing to restore).
- If the input was portrait/square, the added edges should look like plausible extensions of the
  same scene (matching period, lighting, texture) — not an obviously different background pasted
  on, and never a second/altered person in the extended area.

## Observability

None beyond the raw HTTP error surfaced by `/api/nano-banana` (`{ error: string }` on failure) and
spike 016's event log, which timestamps each pipeline stage transition.

## Investigation Trail

- Started from the starter's `NANO_BANANA_PROMPT` and asked: what does a *real* family photo need
  that a curated stock photo doesn't? Landed on three concrete gaps (aspect ratio, quality,
  identity risk) rather than assuming the starter's prompt would just work if pointed at a
  different image.
- Considered cropping and letting-Orbis-squash as simpler alternatives to outpainting — both
  rejected because they discard or distort real photo content, which conflicts with this
  project's standing "faithful to the photo" stance (see spike 004/005's sourcing rules).
- No live `GEMINI_API_KEY` was available in this session (confirmed via a non-printing presence
  check on `.env.local`), so the actual edit call could not be exercised end-to-end. This mirrors
  spikes 004/005's "render PENDING" pattern: content/prompt design is validated by construction
  and cross-checked against the model documentation; the live render is deferred to whoever adds
  the key next (see spike 016's how-to-run).

## Results

**Verdict: VALIDATED (content) — render PENDING.**

The prompt is grounded in the starter's proven working pattern, extended with explicit
restoration + identity-lock + outpaint-not-crop clauses that address the three real differences
between a curated stock photo and a real family upload. Model id confirmed current via web
search. Code (`app/lib/upload-anchor.ts`, `app/api/nano-banana/route.ts`) type-checks cleanly and
the route is reachable and correctly gated (see spike 016's Results for the auth-gating incident
this session also caught and fixed).

**Not yet verified:** actual Nano Banana output quality — does it really preserve identity under
this instruction, and does it actually outpaint to 16:9 rather than just returning the original
dimensions unchanged? Both require a live `GEMINI_API_KEY`. Flagging as the first thing to check
once the key is added.
