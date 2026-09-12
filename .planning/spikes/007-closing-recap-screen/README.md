---
spike: 007
name: closing-recap-screen
type: standard
validates: "Given the three worlds exist, when a closing '1953 Cavite · 1964 Phnom Penh · 1980s Leningrad — every family has a world that disappeared' recap screen is built, then it renders as a low-effort, high-impact closer (cut first under time pressure)"
verdict: VALIDATED ✓
related: [006]
tags: [ui, low-risk, stretch]
---

# Spike 007: Closing Recap Screen

## What This Validates

Given the three worlds exist, when a closing recap screen (the three eras stacked, plus the "every
family has a world that disappeared" line) is built, then it renders as a genuinely low-effort,
high-impact closer for the live demo's last 15 seconds — confirming this is a safe, cheap stretch
goal rather than something that needs real de-risking. This is the lowest-risk spike in the pivot;
built to confirm that belief rather than to discover anything.

## How to Run

Same file as spike 006 — `../006-world-select-landing/mockup.html` — open it and click
"4. Closing recap (007)" in the demo nav strip, or click through Landing → any world → "Enter her
memory" → then jump via the nav strip (the real app wouldn't need the nav strip; it's a demo-only
convenience for reviewing all four screens from one file, per this project's convention of sharing
one HTML artifact across closely-coupled spikes rather than duplicating markup).

## What to Expect

Centered layout: "1953 · Cavite 🇵🇭", "1964 · Phnom Penh 🇰🇭", "1980s · Leningrad 🇷🇺" in a row, then
"Every family has a world that disappeared." followed by "Family World lets the next generation
enter it." in the brand color. One small factual correction from the user's own original sketch:
Phnom Penh reads **1964**, not 1963 — matching spike 004's actual sourced photo date rather than the
round number from the initial pitch (see spike 004's README for why).

## Investigation Trail

Built directly as the fourth screen inside spike 006's `mockup.html`, sharing its palette, fonts,
and screen-switching mechanism rather than a separate file — the two spikes are different risk
questions but the same UI surface, and duplicating the shell would just be copy-paste with no new
information. Confirmed it renders correctly as part of validating spike 006 (same file, same
click-through pass).

## Results

**Verdict: VALIDATED ✓ — no findings requiring a decision.**

- Trivial to build once the three world entries exist — confirms the user's own framing of this as
  a "fantastic closing demo screen" that costs almost nothing, not something that needed spike time
  to de-risk.
- If build-day time runs short, this is confirmed as the correct thing to cut first (per the user's
  own alignment choice for this session) — cutting it loses a nice closing beat, not any of the
  pivot's substantive risk (that risk lives entirely in spikes 004/005/006).
