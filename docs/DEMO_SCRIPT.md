# Demo script — run of show

Presenter's script for Adtractive. Target: **3 minutes** of demo in a 5-minute slot.

**The one line:** the ad break is the last surface on the internet you cannot talk to. We
made it answer back.

Everything else on a page responds to you — you click, you search, you ask. The pre-roll is
a wall. Thirty seconds of a file that was finished months before you arrived, and your only
input is a Skip button. That is not a design choice, it is a constraint: you cannot interact
with something that has already been rendered.

Orbis removes the constraint. The ad is generated at the moment it is watched, so it can
react while it runs. The demo is one thing: **a viewer directing an ad, inside a normal
video player.**

> Do not pitch this as product placement inside movies. That was the earlier idea. The ad
> here is clearly an ad — badged *Sponsored*, with a Skip button — it is just live and
> interactive.

---

## Before you start

- [ ] `REACTOR_API_KEY` set, with access to `reactor/visko-orbis-stable`.
- [ ] `GEMINI_API_KEY` set on the server. Without it there are no on-screen answers, no
      open-ended directions, and **no voiceover** — the ad plays silent.
- [ ] One live take run and **disconnected** today. Never let judges watch the day's first
      cold start.
- [ ] Exactly one session open anywhere. One JWT is one live session; a second tab takes the
      slot or gets a `429`.
- [ ] `/watch` loaded in its own tab and fullscreen tested, **with sound up and levels
      checked** — the ad narrates itself now, and the voiceover is the only audio in it.
- [ ] `/watch?live=0` open in a spare tab. That is your parachute: the whole break plays from
      a still, every control still works, no provider session needed.
- [ ] **Architecture** tab open and left on **Simple**. It is your slide. Only flip it to
      **Technical** if someone asks how it is built.

---

## The pitch (25 seconds, before you touch anything)

> Think about the last ad you were served. You could not ask it anything. You could not look
> closer at the thing it was selling. You waited five seconds and pressed Skip.
>
> That is not because advertisers like it that way. It is because video is a finished file.
> A rendered clip cannot answer a question.
>
> Orbis generates video live and responds while it runs. So we built the obvious thing that
> was never possible before: an ad break the viewer can actually direct.

---

## The map (20 seconds)

**Open the Architecture tab, on Simple.** Do not read it out. Point at three things and move
on — this exists so the room knows what it is about to watch.

> Here is the whole thing on one page, in four steps.
>
> *(point at 01)* The advertiser hands us a product and the rules around it — what it looks
> like, what is true, what may never be said.
>
> *(point at the highlighted box, 06)* That is Orbis. It is the only thing here that makes
> video, and it makes it while you watch.
>
> *(point at 03 and 07)* And this is the part that matters commercially. The viewer directs
> the ad — but everything they say goes through the brand's rules first.
>
> Every box is real. Nothing on this page is a roadmap.

If a technical judge leans in, tap **Technical** — the same ten boxes gain the models, the
routes and the guarantees. Do not open it unprompted; it is forty lines of jargon and it will
cost you the room.

---

## Act 1 — the demo (90 seconds)

**Open `/watch`. Fullscreen. Press play.**

> Ordinary video site, ordinary trailer. Watch the timeline — there is the yellow ad marker.

At **8 seconds** the break takes over.

> There is the ad. Rolex, badged Sponsored, with a Skip button — everything you expect.
>
> Two things that are not what you expect. It appeared with no buffering, because the session
> started warming six seconds ago while the trailer was still playing. And it says **"You
> direct this ad."**

**Click a bubble.** The path: boutique → try the Datejust → show the back → back on the
wrist → walk out.

> I am steering an ad. Each beat arrives as two prompts — an action, then the settled scene
> about three and a half seconds later — which is why it moves instead of cutting.

**Type instead of clicking**, to prove it is not a fixed rail:

```
show me the back
```

> I did not press that button. It matched the beat from my own words, and pulled in Rolex's
> approved case-back reference so the model knows what the back really looks like.

Then something off the path:

```
make it rain
```

> Not a beat, so it becomes an open direction. The path is a rail when you want one, not a
> cage.

**Let the narration land.** A line is written for each beat from the approved knowledge and
spoken over the take, with the words captioned underneath.

> That voice is not Orbis. Its audio is picture-driven and carries no reliable speech, so we
> write the line from the same approved facts the rest of the ad is built on, and speak it.
> The video model is never asked to say anything.

**Ask it a question** — the moment to slow down on:

```
how much is it?
```

> It answered. An ad that answers a question about the product. Notice it came up as text on
> screen and never went near the video model — a brand cannot have a video model improvising
> its pricing.

**Point at Skip, then don't press it.**

> Skip has been available this whole time. That is the business case in one gesture: the
> viewer had a reason to stay. And every one of those interactions is a signal the advertiser
> has never had from a video ad — not an impression, an actual question about the product.

---

## Act 2 — why a brand would sign this (45 seconds)

The obvious objection is coming, so get there first.

> Letting a generative model improvise a brand is every marketing director's nightmare. So
> the interesting engineering is not the video, it is the leash.

**Switch to the Studio tab. Open 02 / PRODUCT INFO.**

> Every campaign carries a knowledge base — approved appearance, portrayal rules, facts,
> never-say lines, competitors. For Rolex it specifies the boutique shows ROLEX and the crown
> on the back wall, the cases hold only Rolex, and the case back is plain steel.
>
> Four things sit between a viewer's words and the model. The scene contract pins what must
> stay true for the whole take. Competitors and forbidden claims are refused before send and
> rejected after rewrite. Every prompt is built server-side and logged before it goes — the
> browser never writes one. And questions are answered from approved facts and never sent at
> all.

**Point at the receipt.**

> You said, and what we sent. That is the audit trail a rights holder signs off on.

Mention in passing, do not tour: six campaigns are loaded — Pepsi, McDonald's, Nike, Rolex,
BMW, Ray-Ban — with real assets from the brands' own libraries, and audience matching that
picks the sponsor server-side.

> Go back to the map for a second — step 01 and step 03. That is what you just saw enforced.
> The ad was improvised. The brand was not.

---

## The close — what this becomes (20 seconds)

End on where it goes, not on what it does. Judges fund the second thing.

> Three things follow from this, and none of them need a new model.
>
> **The sponsor becomes a variable.** Selection already runs server-side against an audience
> profile. Swap our synthetic profiles for consented real ones and the same ad break renders
> a different advertiser for a different viewer — same slot, same second.
>
> **The metric changes.** Today an advertiser buys impressions and infers interest. Here a
> viewer asked what it costs, or asked to see the back. That is intent, stated out loud, and
> nobody has ever been able to sell it.
>
> **And the economics move.** One viewer is one live session, so this is premium inventory
> today — a launch, a flagship product, a sponsorship. Every month live generation gets
> cheaper, that line moves down the market.
>
> The ad break has been a thirty-second wall since television. It is the last part of the
> internet nobody could talk to. We think it becomes a conversation, and this is what the
> first one looks like.

---

## Free-text cheat sheet

Cues that jump to a beat (longest match wins — `resolveDemoStep`):

| Beat | Say any of |
|---|---|
| `street` | "walk the street", "walking", "city street", "start walking" |
| `boutique` | "boutique", "go inside", "walk in", "into the store", "the shop" |
| `swap` | "datejust", "switch", "swap", "another watch", "try on" |
| `inspect` | "show the back", "turn it over", "flip it", "caseback", "open the clasp" |
| `wear` | "put it back on", "wear it", "close the clasp", "on the wrist" |
| `exit` | "walk out", "leave", "exit", "outside", "head out" |

Anything else is an open direction. Safe off-path lines: "make it rain", "move to a rooftop
at dusk", "slow the camera down". Anything ending in `?` becomes an on-screen answer.

---

## If something goes wrong

**The break will not start.** Provider capacity. Do not retry twice on stage — switch to the
`/watch?live=0` tab. The break plays from the campaign still and every control still works.
Say plainly that the live session is unavailable and that what they are seeing is the same
interaction path. You lose the moving picture, not the argument.

**`429`.** Another session holds the slot. Close other tabs, leave the page so the release
beacon fires, retry once.

**A direction was accepted but nothing changed.** Expected. Acknowledgement means accepted,
not rendered; it lands over the next chunks. Say so — it is an honest property of live
generation.

**No voiceover.** `GEMINI_API_KEY` is missing on the server, or the speech call timed out.
The ad is unaffected apart from the silence — keep going and skip the narration beat.

**The logo drifts after many chunks.** Also expected, and better named by you than by a
judge: pixel-perfect logo lock over a long take is the placement-tracking work in
[`DYNAMIC_AD_PLATFORM_PLAN.md`](DYNAMIC_AD_PLATFORM_PLAN.md).

---

## Questions judges will ask

**"Isn't this just a longer ad people will skip anyway?"**
Skip is on screen the entire time. The bet is that an ad you can interrogate earns the
seconds a rendered clip never could — and unlike a clip, it reports what the viewer actually
asked about.

**"How do you stop it saying something the brand would hate?"**
Four layers: the scene contract pins what must stay true and survives a pivot; the approved
appearance is restated in every prompt; competitors and forbidden claims are refused before
send and rejected after rewrite; and answers are written from approved facts and never reach
the model. Every prompt is logged before it is sent.

**"Could the ad differ per viewer?"**
Campaign selection already runs server-side against an audience profile — affinity, then
priority, then a deterministic tie-break, across six campaigns. Swap the synthetic profiles
for consented real ones and the same break renders a different sponsor. Today's break is
pinned to Rolex so the demo is repeatable.

**"What does it cost?"**
One viewer is one Orbis session — roughly $0.58 per engaged minute at $0.0097/s, with 5
concurrent sessions per account by default. That is real money per impression, so this is
premium inventory, not a pre-roll replacement. Scale needs a commercial agreement with
Reactor; we are not pretending otherwise.

**"What is yours versus the platform?"**
Reactor and Orbis give us live video and the command protocol. Ours is everything that makes
it sellable: the knowledge base and guard pipeline, the scene contract, two-beat transitions,
cue-resolved beats, the audit trail — and the viewer-side break that puts it in a player with
a Skip button.

---

## Known gaps, if asked directly

- The viewer break is pinned to one campaign (Rolex) and one flow; the per-viewer selection
  runs in the studio, not in the break.
- Orbis's own audio stays muted in the break; the narrator is the only sound. That keeps the
  demo predictable, but there is no scene ambience under the voice.
- A question is answered on screen and deliberately not spoken, so the reader is not talked
  over.
- The watch page is a presentation of the viewer experience — fictional channel, comments and
  up-next. No ad auction, no real hosting.

---

## Credits to say out loud

- **Visko** — Orbis, the live model generating every frame.
- **Reactor** — the platform we reach it through: auth, WebRTC transport, command protocol.
- **Nebius** — the event's AI cloud partner and Builder Program credits.
