"use client";

import { useState } from "react";

import { Icon } from "./icon";

/**
 * The system diagram, built to be presented. Two readings of the same ten
 * boxes: "Simple" is one plain sentence each, for a room that does not write
 * software; "Technical" adds the models, routes and guarantees underneath.
 * Static by design — it documents the build rather than reading from it.
 */

type Row = { icon: Parameters<typeof Icon>[0]["name"]; label: string; value: string };
type Box = {
  n: number;
  title: string;
  /** One sentence, no jargon. This is what a non-technical viewer reads. */
  plain: string;
  hero?: boolean;
  rows: Row[];
};
type Stage = { id: string; step: string; caption: string; boxes: Box[] };

const stages: Stage[] = [
  {
    id: "prepare",
    step: "01",
    caption: "What the advertiser sets up",
    boxes: [
      {
        n: 1,
        title: "The product",
        plain: "The advertiser brings one product photo. That is enough to start an ad.",
        rows: [
          { icon: "image", label: "Input", value: "Product image · Scene clip · Your own footage" },
          { icon: "film", label: "Tech", value: "Browser decode · Scrub · Canvas capture" },
          { icon: "check", label: "Limits", value: "Clip ≤ 250 MB · Still ≤ 10 MB · 16:9" },
        ],
      },
      {
        n: 2,
        title: "The opening frame",
        plain: "We build the single frame the ad opens on, sized to fit the player.",
        rows: [
          { icon: "layers", label: "Tech", value: "lib/placement-frame.ts · Canvas 2D" },
          { icon: "expand", label: "Functions", value: "Placement zone · 16:9 fit · Product-only frame" },
          { icon: "arrow", label: "Output", value: "One composed starting frame" },
        ],
      },
      {
        n: 3,
        title: "The brand's rules",
        plain: "What the brand has approved: how the product looks, what is true about it, and what may never be said.",
        rows: [
          { icon: "check", label: "Tech", value: "lib/knowledge/ · seeded per campaign · Vercel Blob" },
          { icon: "layers", label: "Data", value: "Appearance · Notes · Facts · Never-say · Protections" },
          { icon: "spark", label: "Brands", value: "Pepsi · McDonald's · Nike · Rolex · BMW · Ray-Ban" },
        ],
      },
      {
        n: 4,
        title: "The safety pass",
        plain: "Every instruction is rewritten against those rules, and refused if it breaks one.",
        rows: [
          { icon: "spark", label: "Model", value: "Gemini 3.5 Flash" },
          { icon: "layers", label: "Tech", value: "guard → retrieve → engineer → validate" },
          { icon: "check", label: "Functions", value: "Rewrite · Reject competitors · You said → Sent receipt" },
        ],
      },
    ],
  },
  {
    id: "live",
    step: "02",
    caption: "What makes the video",
    boxes: [
      {
        n: 5,
        title: "The pass to watch",
        plain: "The viewer's browser gets a short-lived pass, so our keys never leave the server.",
        rows: [
          { icon: "refresh", label: "Tech", value: "/api/token · Reactor REST · /api/sessions/release" },
          { icon: "check", label: "Functions", value: "Model-scoped JWT · 1 hour · 1 session · released on unload" },
          { icon: "layers", label: "Rule", value: "API key never leaves the server" },
        ],
      },
      {
        n: 6,
        title: "Orbis paints the ad",
        plain: "The video is generated frame by frame while the viewer is watching it. Nothing was rendered in advance.",
        hero: true,
        rows: [
          { icon: "spark", label: "Model", value: "Visko Orbis Stable (reactor/visko-orbis-stable)" },
          { icon: "play", label: "Tech", value: "Reactor SDK v3 · WebRTC · video + audio tracks" },
          { icon: "arrow", label: "Functions", value: "set_image → set_prompt → start · every command confirmed" },
        ],
      },
    ],
  },
  {
    id: "steer",
    step: "03",
    caption: "What the viewer does to it",
    boxes: [
      {
        n: 7,
        title: "The viewer directs",
        plain: "They click a suggestion or type their own words, and the scene changes without ever cutting.",
        rows: [
          { icon: "audio", label: "Input", value: "Viewer text · Bubbles · Questions" },
          { icon: "layers", label: "Tech", value: "lib/live-direction.ts · lib/demo/flows.ts" },
          { icon: "refresh", label: "Functions", value: "Two-beat pivot (3.6 s) · Refine · Cue-resolved beats" },
          { icon: "check", label: "Contract", value: "Scene contract restated every direction · pinned lines survive a pivot" },
        ],
      },
      {
        n: 8,
        title: "An ordinary player",
        plain: "All of it arrives inside a normal video page, with a Skip button the viewer stops pressing.",
        rows: [
          { icon: "play", label: "Tech", value: "/watch · lib/watch/schedule.ts · components/watch/" },
          { icon: "clock", label: "Timing", value: "Warms 6 s early so the ad pops instantly · skippable after 5 s" },
          { icon: "spark", label: "Functions", value: "Bubbles, free text and product questions, from the viewer" },
        ],
      },
      {
        n: 9,
        title: "The receipts",
        plain: "Every word the ad was given is written down, so the brand can check what its ad said.",
        rows: [
          { icon: "clock", label: "Tech", value: "PromptVersion log · browser activity history" },
          { icon: "check", label: "Functions", value: "Receipt · On-screen answers · JSON export" },
          { icon: "download", label: "Output", value: "Streaming video + audio, steerable live" },
        ],
      },
    ],
  },
];

const principles = [
  { title: "The viewer's words never reach the model", body: "What they type is matched to an approved beat or rewritten against the brand's rules. The sentence that reaches Orbis was written by us, from records the brand signed off." },
  { title: "The brand's own words win", body: "Forbidden claims, competitors and protected details are refused before sending and rejected after rewriting — not corrected once they are on screen." },
  { title: "Nothing is asked to say anything", body: "Answers are written from approved facts and shown over the take. The video model is never asked to render speech or text." },
];

export function ArchitecturePanel() {
  const [technical, setTechnical] = useState(false);

  return <section className={`architecture${technical ? " technical" : ""}`} aria-label="How Adtractive works">
    <div className="arch-intro">
      <p className="arch-story">
        An advertiser approves a product and the rules around it. <strong>Orbis generates the ad
        live.</strong> The viewer directs it while it plays. Everything sent is written down.
      </p>
      <div className="arch-controls">
        <div className="arch-toggle" role="group" aria-label="Level of detail">
          <button type="button" className={technical ? "" : "on"} aria-pressed={!technical} onClick={() => setTechnical(false)}>Simple</button>
          <button type="button" className={technical ? "on" : ""} aria-pressed={technical} onClick={() => setTechnical(true)}>Technical</button>
        </div>
        <div className="arch-legend">
          <span><span className="arch-key arch-key-visko" />Visko · Orbis</span>
          <span><span className="arch-key arch-key-reactor" />Reactor</span>
          <span><span className="arch-key arch-key-ours" />Built by us</span>
        </div>
      </div>
    </div>

    {stages.map((stage, index) => <div className="arch-stage" key={stage.id}>
      <div className="arch-stage-head">
        <span className="arch-step">{stage.step}</span>
        <h2>{stage.caption}</h2>
        <span className="arch-stage-rule" aria-hidden="true" />
      </div>
      <div className="arch-row">
        {stage.boxes.map((box) => <article className={`arch-box${box.hero ? " hero" : ""}`} key={box.n}>
          <header>
            <span className="arch-n">{box.n}</span>
            <h3>{box.title}</h3>
          </header>
          <p className="arch-plain">{box.plain}</p>
          {technical && <dl>
            {box.rows.map((row) => <div className="arch-line" key={row.label}>
              <span className="arch-ico"><Icon name={row.icon} size={15} /></span>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>)}
          </dl>}
        </article>)}
      </div>
      {index < stages.length - 1 && <div className="arch-flow" aria-hidden="true"><span /><Icon name="chevron" size={18} /></div>}
    </div>)}

    <div className="arch-principles">
      <span className="panel-eyebrow">Why a brand would sign this</span>
      <div className="arch-principle-row">
        {principles.map((item) => <div key={item.title}>
          <h4>{item.title}</h4>
          <p>{item.body}</p>
        </div>)}
      </div>
    </div>
  </section>;
}
