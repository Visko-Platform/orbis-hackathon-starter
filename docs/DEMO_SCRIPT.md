# Demo script — run of show

A presenter-facing script for the Orbis Ad demo. Everything here is authored in
[`lib/demo/flows.ts`](../lib/demo/flows.ts); this document is how to *drive* it.

Target length: **3 minutes** of demo inside a 5-minute slot, leaving time for the pitch
and questions. The **Architecture** tab in the app doubles as the architecture slide, so
you do not have to switch out of the product to explain it.

---

## Before you start

- [ ] `REACTOR_API_KEY` set, and the key has access to `reactor/visko-orbis-stable`.
- [ ] `GEMINI_API_KEY` set — without it the "you said → what we sent" receipt has nothing
      interesting to show.
- [ ] One live take already run and **disconnected** today. The first session of the day is
      the slowest; do not let the judges watch a cold start if you can avoid it.
- [ ] Only one session open. One JWT is scoped to one live session; a second tab will take
      the slot or get a `429`.
- [ ] Browser zoom at 100%, notifications off, and the **Activity** tab pre-opened once so
      it is populated.
- [ ] **Architecture** tab open in a second browser tab — it is your slide, and your
      fallback if live generation will not start.
- [ ] Know your fallback: if live generation stalls, you narrate the receipt and the
      knowledge base instead (both work with no video).

---

## The pitch (30 seconds, before you touch the app)

> Ads today interrupt the story. You watch a film, the film stops, an ad plays, the film
> resumes. That is a limitation of *finished* video — the ad has to be a separate clip
> because the film was rendered months ago.
>
> Orbis changes that. It generates video live and reacts while it runs. So the sponsor does
> not have to interrupt the scene — it can be *in* the scene. The storefront the character
> walks past. The watch on their wrist. And because it is generated at delivery time, it can
> differ by viewer, and it can respond to what the viewer asks to see.
>
> We built the studio for that. Real brands, real approved assets, and a live take you can
> direct while it plays.

---

## The run

### 0. Open on the architecture (20s)

**Architecture tab.** Leave it on screen while you finish the pitch — it is the slide.

> Eight stages. Everything on the left happens before the model sees anything: we compose
> the frame, load the brand's approved knowledge, and engineer the prompt against it.
> The centre box is Visko's Orbis running live through Reactor. Everything on the right is
> steering that scene while it plays, and logging what we sent.

Point at box 6 and box 4 specifically — Orbis is the only thing generating video, and
nothing reaches it that we did not build server-side from approved records.

### 1. Pick the brand (15s)

**Studio → 01 / PRODUCT → Rolex.**

> These are real Rolex assets, pulled from rolex.com — eight reference views, including the
> case backs and open clasps. Nothing here is AI-generated brand artwork. That matters: a
> brand will never let you invent their product.

### 2. Show the knowledge base (30s)

**02 / PRODUCT INFO** — scroll it.

> Every campaign carries a knowledge base: the approved appearance, portrayal rules, facts,
> and never-say lines. For Rolex, it says the boutique shows ROLEX and the crown on the back
> wall, that the cases hold only Rolex, and that the case back is plain and unengraved.
>
> This is not decoration. Nothing reaches the model without passing through it.

Optionally hit **Draft from product image** on another brand to show Gemini filling this in
from a photo.

### 3. Go live (20s)

**Generate live.**

> The product image is composed into a 16:9 starting frame, the brief is rewritten against
> that knowledge, and it goes to Orbis through Reactor — `set_image`, `set_prompt`, `start`.
> Every one of those is confirmed by the model's own events before we move on.

Watch the phase indicator while it warms. Keep talking; do not stare at the loader.

### 4. Walk the path (60s)

The director shows **ROLEX WALK · FIXED PATH**. Click the bubbles in order:

| Bubble | What lands on screen |
|---|---|
| **Walk the street** | Charcoal overcoat, golden hour, Submariner catching the light |
| **Enter the boutique** | Green facade, gold crown, ROLEX in gold capitals, inside to the cases |
| **Try the Datejust** | Associate presents the Datejust 41 on a green tray, clasp swapped |
| **Show the back** | Turns it over — plain polished case back, Jubilee flat, crown on the clasp |
| **Put it back on** | Clasp closes, slate dial and fluted bezel facing up |
| **Walk out** | Back through the door, evening light on the Datejust |

Say this while the boutique beat lands:

> Notice each beat arrives in two prompts — an action, then the settled scene about three
> and a half seconds later. That is why it reads as a move rather than a jump cut.

### 5. Prove it is not on rails (30s)

**Type instead of clicking.** Into the director:

```
show me the back
```

> I did not press the button. It matched that to the beat by its cues — and it pulled in the
> approved case-back reference so the model knows what the back actually looks like.

Then type something off-path:

```
make it rain and slow the camera
```

> And that one is *not* a beat, so it stays an open-ended direction. The fixed path is a
> rail when you want one, not a cage.

### 6. The question that never reaches the model (20s)

Type, with the question mark:

```
how much does it cost?
```

> That is answered on screen, from approved facts. It never goes to the model — because
> generated video does not render text reliably, and because a brand cannot have a video
> model improvising its pricing.

### 7. The receipt and the audit trail (15s)

Point at the receipt, then open **Activity**.

> Every prompt we sent was built server-side from approved records and logged before it was
> sent. The browser never authors a prompt. That is the difference between a demo and
> something a rights holder would actually sign off on.

---

## Free-text cheat sheet

Phrases that resolve to a beat (longest match wins — see `resolveDemoStep`):

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

**Generation will not start / stuck warming.** Provider capacity. Disconnect, wait, retry
once. If it fails twice, stop retrying on stage — switch to the **Architecture** tab and
narrate the pipeline, then the knowledge base, the receipt, and Activity. All four work
with no video at all, and that is your whole story minus the moving pictures.

**`429` from the token endpoint.** Another session is holding the slot. Close other tabs,
disconnect, retry.

**A direction was accepted but nothing changed.** Expected — acknowledgement means accepted,
not rendered. It lands over the next chunks. Say so; it is an honest property of live
generation, not a bug to hide.

**The logo drifts after many chunks.** Also expected. Say it plainly: pixel-perfect logo
lock over a long take is exactly what the placement-tracking work in
[`DYNAMIC_AD_PLATFORM_PLAN.md`](DYNAMIC_AD_PLATFORM_PLAN.md) is for.

**Save product info errors on the deployed site.** Known — the store writes to the local
filesystem, which is read-only on serverless. Demo it locally, or just read from the seed.

---

## Questions judges will ask

**"Is this editing the original movie?"**
No. It generates a *continuation* from one composed frame. Frame-accurate modification of an
existing encoded clip needs an inpainting or compositing provider — the handoff, continuity,
and placement records we already keep are what such a provider would consume.

**"How do you stop it hallucinating the brand?"**
Three layers: the approved appearance is restated in every prompt; competitors and forbidden
claims are refused before send and rejected after rewrite; and protected details are
appended as positive statements. Plus product questions are answered from facts and never
sent at all.

**"Could this be personalized per viewer?"**
That is the point. Campaign selection already runs server-side against an audience profile
(affinity → priority → deterministic tie-break). Swap the synthetic profiles for consented
real ones and the same take renders a different sponsor.

**"What does it cost to run?"**
One viewer is one Orbis session. At roughly $0.0097/s that is about $0.58 per engaged minute,
with a default of 5 concurrent sessions per account. Interactive ads at scale need a
commercial agreement with Reactor — we are not pretending otherwise.

**"What is actually yours versus the platform?"**
Reactor and Orbis give us live video and the command protocol. Ours is everything that makes
it usable for a brand: the frame composition, the knowledge base, the guard and validation
pipeline, the two-beat transitions, the cue-resolved demo path, and the audit trail.

---

## Credits to say out loud

- **Visko** — Orbis, the live model doing all the generation.
- **Reactor** — the platform we reach it through: auth, WebRTC transport, command protocol.
- **Nebius** — the event's AI cloud partner and Builder Program credits.
