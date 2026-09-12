"use client";

import { Icon } from "./icon";

/**
 * The system diagram, presentation-first: every box names a model, the tech
 * behind it, and what it actually does, so a screenshot of this tab can carry a
 * slide on its own. Content is static by design — it documents the build rather
 * than reading from it.
 */

type Row = { icon: Parameters<typeof Icon>[0]["name"]; label: string; value: string };
type Box = { n: number; title: string; hero?: boolean; rows: Row[] };
type Stage = { id: string; caption: string; boxes: Box[] };

const stages: Stage[] = [
  {
    id: "prepare",
    caption: "Prepare — nothing reaches the model unapproved",
    boxes: [
      {
        n: 1,
        title: "SOURCE INPUT",
        rows: [
          { icon: "image", label: "Input", value: "Product image · Scene-library clip · Your own footage" },
          { icon: "film", label: "Tech", value: "Browser decode · Scrub · Canvas capture" },
          { icon: "check", label: "Limits", value: "Clip ≤ 250 MB · Still ≤ 10 MB · 16:9" },
        ],
      },
      {
        n: 2,
        title: "FRAME COMPOSITION",
        rows: [
          { icon: "layers", label: "Tech", value: "lib/placement-frame.ts · Canvas 2D" },
          { icon: "expand", label: "Functions", value: "Placement zone · 16:9 fit · Product-only frame" },
          { icon: "arrow", label: "Output", value: "One composed starting frame" },
        ],
      },
      {
        n: 3,
        title: "BRAND KNOWLEDGE",
        rows: [
          { icon: "check", label: "Tech", value: "lib/knowledge/ · seeded per campaign · Vercel Blob" },
          { icon: "layers", label: "Data", value: "Appearance · Visual notes · Facts · Never-say · Protections" },
          { icon: "spark", label: "Brands", value: "Pepsi · McDonald's · Nike · Rolex · BMW · Ray-Ban" },
        ],
      },
      {
        n: 4,
        title: "PROMPT ENGINEERING",
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
    caption: "Go live — Reactor carries us to Orbis",
    boxes: [
      {
        n: 5,
        title: "SESSION AUTH",
        rows: [
          { icon: "refresh", label: "Tech", value: "/api/token · Reactor REST · /api/sessions/release" },
          { icon: "check", label: "Functions", value: "Model-scoped JWT · 1 hour · 1 session · released on unload" },
          { icon: "layers", label: "Rule", value: "API key never leaves the server" },
        ],
      },
      {
        n: 6,
        title: "LIVE GENERATION",
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
    caption: "Direct — the scene keeps running",
    boxes: [
      {
        n: 7,
        title: "LIVE DIRECTION",
        rows: [
          { icon: "audio", label: "Input", value: "Operator text · Demo bubbles · Questions" },
          { icon: "layers", label: "Tech", value: "lib/live-direction.ts · lib/demo/flows.ts" },
          { icon: "refresh", label: "Functions", value: "Two-beat pivot (3.6 s) · Refine · Cue-resolved beats" },
          { icon: "check", label: "Contract", value: "Scene contract restated every direction · pinned lines survive a pivot" },
        ],
      },
      {
        n: 8,
        title: "NARRATOR VOICEOVER",
        rows: [
          { icon: "spark", label: "Model", value: "Gemini 3.5 Flash writes · Gemini TTS speaks (voice: Charon)" },
          { icon: "audio", label: "Tech", value: "/api/continuations/voiceover · WAV played in the browser" },
          { icon: "check", label: "Rule", value: "Orbis audio is picture-driven, so the words come from us — and never reach the model" },
        ],
      },
    ],
  },
  {
    id: "deliver",
    caption: "Deliver — where a viewer actually meets it",
    boxes: [
      {
        n: 9,
        title: "VIEWER AD BREAK",
        rows: [
          { icon: "play", label: "Tech", value: "/watch · lib/watch/schedule.ts · components/watch/" },
          { icon: "clock", label: "Timing", value: "Warms 6 s early so the ad pops instantly · skippable after 5 s" },
          { icon: "spark", label: "Functions", value: "The viewer steers the ad: bubbles, free text, product questions" },
        ],
      },
      {
        n: 10,
        title: "AUDIT & OUTPUT",
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
  { title: "The browser never authors a prompt", body: "Every prompt is built server-side from approved records and logged as a PromptVersion before it is sent." },
  { title: "The brand's own words win", body: "Forbidden claims, competitors, and protected details are enforced before send — not corrected afterwards." },
  { title: "Words never reach the model", body: "Product answers and narrator lines are written from approved facts and played over the take. The video model is never asked to render speech or text." },
];

export function ArchitecturePanel() {
  return <section className="architecture" aria-label="System architecture">
    <div className="arch-legend">
      <span><span className="arch-key arch-key-visko" />Visko · Orbis</span>
      <span><span className="arch-key arch-key-reactor" />Reactor</span>
      <span><span className="arch-key arch-key-ours" />Built by us</span>
    </div>

    {stages.map((stage, index) => <div className="arch-stage" key={stage.id}>
      <div className="arch-stage-head">
        <span className="arch-stage-rule" aria-hidden="true" />
        <span className="panel-eyebrow">{stage.caption}</span>
      </div>
      <div className="arch-row">
        {stage.boxes.map((box) => <article className={`arch-box${box.hero ? " hero" : ""}`} key={box.n}>
          <header>
            <span className="arch-n">{box.n}</span>
            <h3>{box.title}</h3>
          </header>
          <dl>
            {box.rows.map((row) => <div className="arch-line" key={row.label}>
              <span className="arch-ico"><Icon name={row.icon} size={15} /></span>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>)}
          </dl>
        </article>)}
      </div>
      {index < stages.length - 1 && <div className="arch-flow" aria-hidden="true"><span /><Icon name="chevron" size={18} /></div>}
    </div>)}

    <div className="arch-principles">
      {principles.map((item) => <div key={item.title}>
        <h4>{item.title}</h4>
        <p>{item.body}</p>
      </div>)}
    </div>
  </section>;
}
