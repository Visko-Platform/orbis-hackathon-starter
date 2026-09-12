# Demo script — run of show

A presenter-facing script for the Adtractive demo. The beats are authored in
[`lib/demo/flows.ts`](../lib/demo/flows.ts); this document is how to *drive* them.

Target: **3 minutes** of demo inside a 5-minute slot, leaving room for the pitch and
questions. Lead with `/watch` — the viewer demo is the moment that lands. The studio is the
answer to "how", not the opening act. The **Architecture** tab doubles as your architecture
slide, so you never have to leave the product.

---

## Before you start

- [ ] `REACTOR_API_KEY` set, with access to `reactor/visko-orbis-stable`.
- [ ] `GEMINI_API_KEY` set. Without it there is no prompt-engineering receipt and **no
      voiceover at all** — two of your three best moments.
- [ ] One live take already run and **disconnected** today. The first session of the day is
      the slowest; never let judges watch a cold start.
- [ ] Only one session open anywhere. One JWT is one live session; a second tab takes the
      slot or gets a `429`.
- [ ] `/watch` loaded in its own tab, fullscreen tested, **sound on and levels checked** —
      the voiceover is audio-only and dies in a noisy room.
- [ ] **Architecture** tab open in a third tab. It is your slide and your fallback.
- [ ] Browser zoom 100%, notifications off, **Activity** opened once so it is populated.
- [ ] Know the dry run: `/watch?live=0` renders the whole ad break from a still, with no
      provider session. If capacity is gone, this still tells the story.

---

## The pitch (30 seconds, before you touch anything)

> Every ad you have ever seen was finished before you saw it. That is why it interrupts —
> the film stops, a clip plays, the film resumes. The ad cannot be part of the story,
> because the story was rendered months ago.
>
> Orbis changes the constraint. It generates video live and reacts while it runs. So the
> sponsor does not have to interrupt the scene. It can be *in* the scene — the storefront
> the character passes, the watch on their wrist. And because it is made at the moment of
> delivery, it can differ by viewer, and it can answer what the viewer asks.
>
> Let me show you what that feels like from the couch.

---

## Act 1 — the viewer demo (90s)

This is the demo. Do not skip it for the studio.

**Open `/watch`. Go fullscreen. Press play.**

> This is a video site. Ordinary trailer, ordinary player.

Let it run. At **8 seconds** the break arrives.

> There is the ad break. Two things to notice.
>
> First, it appeared instantly — no buffering. The session started warming six seconds ago,
> while the video was still playing. The viewer never waits.
>
> Second, this is not a clip. Nobody rendered this. Orbis is generating it right now.

**Click a bubble** — the Rolex walk: boutique → try the Datejust → show the back → back on
the wrist → walk out.

> And the viewer is *directing the ad*. Each beat lands as two prompts — an action, then the
> settled scene about three and a half seconds later — which is why it reads as a move
> rather than a cut.

**Type free text**, not a bubble:

```
show me the back
```

> I did not press a button. That matched a beat by its cues, and it pulled in Rolex's own
> approved case-back reference, so the model knows what the back actually looks like.

**Ask a question**, with the question mark:

```
how much is it?
```

> Answered on screen, from approved facts — and never sent to the video model. A brand
> cannot have a video model improvising its pricing.

**Point at Skip Ad.**

> Skippable after five seconds, like any pre-roll. The viewer was never trapped. They just
> had an ad worth staying in.

---

## Act 2 — how it is made (60s)

**Switch to the Studio tab.**

### The product and its knowledge

**01 / PRODUCT → Rolex**, then **02 / PRODUCT INFO**.

> Real Rolex assets from rolex.com — eight reference views including case backs and open
> clasps. No AI-generated brand artwork anywhere: a brand will never let you invent their
> product.
>
> And every campaign carries a knowledge base — approved appearance, portrayal rules, facts,
> never-say lines. For Rolex it says the boutique shows ROLEX and the crown on the back wall,
> the cases hold only Rolex, and the case back is plain steel. Nothing reaches the model
> without passing through this.

Six campaigns are loaded — Pepsi, McDonald's, Nike, Rolex, BMW and Ray-Ban — across
beverage, food, apparel, luxury, automotive and eyewear. Mention it; do not tour it.

### The receipt

Send a direction and point at the receipt.

> You said, and what we sent. Gemini rewrote it against the approved knowledge, we validated
> it for competitors and forbidden claims, and we logged it before it went. The browser never
> authors a prompt.

### The voiceover

> The narration you heard is not Orbis. Its audio is picture-driven and carries no reliable
> speech, so we write the line from the same approved knowledge, speak it with Gemini's TTS
> voice, and play it over the take. Words never go to the video model — not the answers, not
> the narration.

### The architecture

**Architecture tab.**

> Ten boxes. Everything on the left happens before the model sees anything. The centre box is
> Visko's Orbis through Reactor — the only thing generating video. Everything on the right is
> steering it, narrating it, and logging it, ending in the ad break you just watched.

---

## Free-text cheat sheet

Phrases that resolve to a beat (longest match wins — `resolveDemoStep`):

| Beat | Say any of |
|---|---|
| `street` | "walk the street", "walking", "city street", "start walking" |
| `boutique` | "boutique", "go inside", "walk in", "into the store", "the shop" |
| `swap` | "datejust", "switch", "swap", "another watch", "try on" |
| `inspect` | "show the back", "turn it over", "flip it", "caseback", "open the clasp" |
| `wear` | "put it back on", "wear it", "close the clasp", "on the wrist" |
| `exit` | "walk out", "leave", "exit", "outside", "head out" |

Anything else stays an open direction. Good off-path lines: "move to a rooftop at dusk",
"make it rain and slow the camera", "switch to black and white".

---

## If something goes wrong

**The break will not start / stuck warming.** Provider capacity. Do not retry twice on
stage. Reload `/watch?live=0` — the whole break plays from a still, and every interaction
still works. Say plainly that you are showing it without a live session, then finish on the
Architecture tab and the receipt.

**`429`.** Another session holds the slot. Close other tabs, hit `/api/sessions/release` by
leaving the page, retry once.

**A direction was accepted but nothing changed.** Expected. Acknowledgement means accepted,
not rendered; it lands over the next chunks. Say so — it is an honest property of live
generation, not a bug to hide.

**The logo drifts after many chunks.** Also expected, and worth naming before a judge does:
pixel-perfect logo lock over a long take is exactly the placement-tracking work in
[`DYNAMIC_AD_PLATFORM_PLAN.md`](DYNAMIC_AD_PLATFORM_PLAN.md).

**No voiceover.** `GEMINI_API_KEY` is missing or TTS timed out. The take is unaffected;
skip that line in Act 2.

---

## Questions judges will ask

**"Is this editing the original movie?"**
No. It generates a *continuation* from one composed frame. Frame-accurate modification of an
existing encoded clip needs an inpainting or compositing provider — the handoff, continuity
and placement records we already keep are what such a provider would consume.

**"How do you stop it hallucinating the brand?"**
Four layers: the approved appearance is restated in every prompt; the scene contract pins
what must stay true and survives a pivot; competitors and forbidden claims are refused before
send and rejected after rewrite; and answers and narration are written from approved facts
and never sent to the model at all.

**"Could this be personalised per viewer?"**
That is the point. Campaign selection already runs server-side against an audience profile —
affinity, then priority, then a deterministic tie-break, across six campaigns. Swap the
synthetic profiles for consented real ones and the same break renders a different sponsor.

**"What does it cost?"**
One viewer is one Orbis session — roughly $0.58 per engaged minute at $0.0097/s, default 5
concurrent sessions per account. Interactive ads at scale need a commercial agreement with
Reactor. We are not pretending otherwise.

**"What is yours versus the platform?"**
Reactor and Orbis give us live video and the command protocol. Ours is everything that makes
it usable for a brand: frame composition, the knowledge base, the guard and validation
pipeline, the scene contract, two-beat transitions, the cue-resolved path, the voiceover, the
audit trail — and the viewer-side ad break that puts it all in a player.

---

## Credits to say out loud

- **Visko** — Orbis, the live model doing all the generation.
- **Reactor** — the platform we reach it through: auth, WebRTC transport, command protocol.
- **Nebius** — the event's AI cloud partner and Builder Program credits.
