"use client";

import { ReactorView } from "@reactor-team/js-sdk";
import { useEffect, useRef, useState } from "react";
import type { LiveContinuationSession } from "@/hooks/use-live-continuation";
import type { ContractKind, ContractLine, SceneContract } from "@/lib/knowledge/contract";
import type { Engineered } from "@/lib/knowledge/engineer";
import type { Campaign } from "@/lib/studio-data";
import type { DirectionMode } from "@/lib/live-direction";
import { Icon } from "./icon";

// What the studio reports back for one submitted direction: a steer carries the
// engineered prompt, a product question carries the on-screen answer instead.
export type PivotResult = { ok: boolean; engineered?: Engineered; answer?: string; actionPrompt?: string | null };
export type FactOverlay = { text: string; at: number };
type Receipt = { source: string; engineered: Engineered | null; answered: boolean; actionPrompt?: string | null };

type Props = {
  session: LiveContinuationSession;
  campaign: Campaign;
  framePreview: string;
  originalPreview: string;
  preparing: boolean;
  runId: string;
  brandRetained: boolean;
  overlay: FactOverlay | null;
  knowledgeVersion: number;
  contract: SceneContract | null;
  onContractChange: (next: SceneContract) => void;
  onReadContract: (video: HTMLVideoElement | null) => Promise<void>;
  canReadContract: boolean;
  onStart: () => void;
  /** Opens the viewer's watch page (the user demo) in a new tab. */
  onUserDemo: () => void;
  onPivot: (direction: string, mode: DirectionMode, preserveBrand: boolean) => Promise<PivotResult>;
  onAction: (action: () => Promise<void>, label: string) => void;
  onAddProduct: () => void;
};

// Mirrors the server's question check: a trailing "?" is answered on screen, not sent to Orbis.
const QUESTION = /\?\s*$/;

const KIND_LABELS: Record<ContractKind, string> = { product: "Product", person: "Person", setting: "Setting", custom: "Custom" };
const MAX_CONTRACT_LINES = 12;

export function ContinuationStage({ session, campaign, framePreview, originalPreview, preparing, runId, brandRetained, overlay, knowledgeVersion, contract, onContractChange, onReadContract, canReadContract, onStart, onUserDemo, onPivot, onAction, onAddProduct }: Props) {
  const player = useRef<HTMLDivElement>(null);
  const [compare, setCompare] = useState(false);
  const [direction, setDirection] = useState("");
  const [mode, setMode] = useState<DirectionMode>("pivot");
  const [preserveBrand, setPreserveBrand] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [fullscreenError, setFullscreenError] = useState("");
  const [newLine, setNewLine] = useState("");
  const [readingContract, setReadingContract] = useState(false);
  const live = session.connected && session.runStarted;
  const busy = preparing || session.busy;
  const isQuestion = QUESTION.test(direction.trim());
  const canSubmit = Boolean(direction.trim()) && !submitting && !busy && (live || isQuestion);

  useEffect(() => { setReceipt(null); setPreserveBrand(true); }, [runId]);
  // Before a take a direction sets the scene; during one, small adjustments are the usual case.
  useEffect(() => { setMode(live ? "refine" : "pivot"); }, [live]);
  useEffect(() => {
    const controller = new AbortController();
    setSuggestions([]);
    fetch(`/api/campaigns/${campaign.id}/suggestions`, { signal: controller.signal, cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(`Suggestions unavailable (${response.status})`)))
      .then((body: { suggestions?: unknown }) => { if (!controller.signal.aborted) setSuggestions(Array.isArray(body.suggestions) ? body.suggestions.filter((item): item is string => typeof item === "string") : []); })
      .catch(() => { if (!controller.signal.aborted) setSuggestions([]); });
    return () => controller.abort();
  }, [campaign.id, knowledgeVersion]);

  async function submit() {
    if (!canSubmit) return;
    const source = direction.trim();
    setSubmitting(true);
    try {
      const result = await onPivot(source, mode, preserveBrand);
      if (result.ok) { setReceipt({ source, engineered: result.engineered ?? null, answered: result.answer !== undefined, actionPrompt: result.actionPrompt ?? null }); setDirection(""); }
    } finally { setSubmitting(false); }
  }

  function updateLine(id: string, patch: Partial<ContractLine>) {
    if (!contract) return;
    onContractChange({ lines: contract.lines.map((line) => line.id === id ? { ...line, ...patch } : line) });
  }
  function removeLine(id: string) {
    if (!contract) return;
    onContractChange({ lines: contract.lines.filter((line) => line.id !== id) });
  }
  function addLine() {
    const text = newLine.trim();
    if (!text || (contract?.lines.length ?? 0) >= MAX_CONTRACT_LINES) return;
    onContractChange({ lines: [...(contract?.lines ?? []), { id: `custom-${Date.now().toString(36)}`, kind: "custom", text, pinned: true, source: "operator" }] });
    setNewLine("");
  }
  async function readContract() {
    if (readingContract) return;
    setReadingContract(true);
    try { await onReadContract(player.current?.querySelector("video") ?? null); } finally { setReadingContract(false); }
  }

  const footCopy = !live ? (isQuestion ? "Product questions are answered on screen from approved facts. No live take needed." : "Start a take to send directions, or ask a product question ending in “?”.")
    : session.paused ? "The new direction will appear when you resume."
    : isQuestion ? "Product questions are answered on screen and never sent to the model."
    : "Your direction shapes the next video chunk.";

  return <div className="preview-column">
    <section className="preview-panel" aria-labelledby="preview-heading">
      <div className="preview-heading">
        <div className="heading-inline"><span className={`state-dot ${live ? "live" : ""}`} /><h2 id="preview-heading">{live ? "Live output" : "Scene preview"}</h2><span className="subtle-label">{live ? (session.paused ? "Paused" : `Take ${runId.slice(0, 6)}`) : "16:9"}</span></div>
        <div className="preview-tools">
          {!live && originalPreview && <div className="segmented compact"><button type="button" className={compare ? "selected" : ""} onClick={() => setCompare(true)}>Original</button><button type="button" className={!compare ? "selected" : ""} onClick={() => setCompare(false)}>Placement</button></div>}
          <button className="icon-button" type="button" title="Fullscreen preview" aria-label="Fullscreen preview" onClick={() => { player.current?.requestFullscreen().catch(() => setFullscreenError("Fullscreen is unavailable in this browser.")); }}><Icon name="expand" /></button>
        </div>
      </div>
      <div className="cinema-stage" ref={player}>
        {live ? <ReactorView track="main_video" audioTrack="main_audio" muted={session.muted} className="reactor-view" videoObjectFit="contain" />
          : framePreview ? <img src={compare ? originalPreview : framePreview} alt={compare ? "Original reference frame" : "Preview of the product in the starting frame"} />
          : <div className="cinema-empty">
            <div className="empty-aperture" aria-hidden="true"><Icon name="film" size={30} /></div>
            <span className="eyebrow">YOUR PRODUCT, LIVE</span>
            <h3>Put your product<br />in the scene.</h3>
            <p>Add a product image and what is true about it.<br />Then direct what happens around it.</p>
            <button className="button primary" type="button" onClick={onAddProduct}><Icon name="upload" size={16} /> Add a product image</button>
            <span className="empty-caption">PNG, JPEG or WebP · a reference frame is optional</span>
          </div>}
        {busy && !live && <div className="render-overlay" role="status"><span className="spinner" /><strong>{preparing && !session.busy ? "Preparing your scene…" : session.phase || "Connecting to the live model…"}</strong><p>{session.phase === "Disconnecting" ? "Releasing your live session." : session.phase.startsWith("Orbis is busy") ? "The model had no free session. Waiting for one; nothing to do." : "The first frames may take a moment."}</p></div>}
        {live && <div className="live-corner"><span className="state-dot live" />{session.paused ? "PAUSED" : "LIVE"}</div>}
        {overlay && <div className="fact-overlay" key={overlay.at} role="status" aria-live="polite"><span className="fact-overlay-label">{campaign.brand}</span><p>{overlay.text}</p></div>}
      </div>
      <div className="player-footer">
        <div className="partner-info"><img src={campaign.logo} alt={campaign.brand} /><div><span>{live && !brandRetained ? "Original campaign" : "In-scene partner"}</span><strong>{campaign.brand}</strong></div></div>
        <div className="transport-controls">
          <button className="button secondary" type="button" title="Open the viewer experience in a new tab: a video page where the interactive Rolex ad takes over the player. Releases this studio's live session first (one live session per key)." onClick={onUserDemo}><Icon name="film" size={15} />User demo</button>
          {live ? <><button type="button" className="icon-button" onClick={session.toggleMuted} aria-label={session.muted ? "Enable audio" : "Mute audio"}><Icon name={session.muted ? "mute" : "audio"} /></button><button className="button secondary" disabled={busy} onClick={() => onAction(session.pauseOrResume, session.paused ? "Resumed" : "Paused")}><Icon name={session.paused ? "play" : "pause"} size={15} />{session.paused ? "Resume" : "Pause"}</button><button className="button stop-button" disabled={busy} onClick={() => onAction(session.reset, "Take ended")}><Icon name="stop" size={14} />End take</button></>
            : <button className="button primary" type="button" disabled={!framePreview || busy} onClick={onStart}>{busy ? <span className="spinner" /> : <Icon name="play" size={16} />}{busy ? "Preparing…" : "Generate live"}</button>}
        </div>
      </div>
      {fullscreenError && <p className="inline-error" role="alert">{fullscreenError}</p>}
    </section>

    <section className="director-panel" aria-labelledby="director-heading">
      <div className="director-heading"><div><span className="eyebrow">DIRECT THE SCENE</span><h2 id="director-heading">What should change around the product?</h2></div><span className={`subtle-badge ${live ? "live-badge" : ""}`}><span className="state-dot" />{live ? "Live control" : "Ready when you are"}</span></div>
      <div className="direction-modes" role="group" aria-label="Direction mode"><button type="button" disabled={submitting} aria-pressed={mode === "pivot"} className={mode === "pivot" ? "selected" : ""} onClick={() => setMode("pivot")}><Icon name="spark" size={16} />Change direction</button><button type="button" disabled={submitting} aria-pressed={mode === "refine"} className={mode === "refine" ? "selected" : ""} onClick={() => setMode("refine")}><Icon name="refresh" size={15} />Refine this scene</button></div>
      <form className="prompt-box" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <label className="sr-only" htmlFor="live-direction">Live direction prompt</label>
        <textarea id="live-direction" value={direction} disabled={submitting} maxLength={4000} onChange={(event) => setDirection(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder={mode === "pivot" ? "A new setting for the product. A rooftop at night, neon rain, the camera circles it…" : "Warmer light, move closer to the product, slow the camera down…"} />
        <div className="prompt-toolbar"><label className="switch-label"><input type="checkbox" disabled={submitting} checked={preserveBrand} onChange={(event) => setPreserveBrand(event.target.checked)} /><span className="switch-track" />Keep {campaign.brand} in scene</label><button className="button primary" type="submit" disabled={!canSubmit}>{submitting ? <span className="spinner" /> : <Icon name="arrow" size={17} />}{isQuestion ? "Ask" : mode === "pivot" ? "Pivot live" : "Apply direction"}</button></div>
      </form>
      <div className="director-foot"><span>{footCopy}</span><span>{direction.length}/4000 · ⌘/Ctrl ↵</span></div>
      {suggestions.length > 0 && <div className="prompt-suggestions"><span>Try a direction</span>{suggestions.map((suggestion, index) => <button key={`${index}-${suggestion}`} type="button" disabled={submitting} onClick={() => setDirection(suggestion)}>{suggestion}<Icon name="arrow" size={12} /></button>)}</div>}
      {receipt && (live || receipt.answered) && <div className="direction-receipt" role="status"><Icon name="check" size={16} /><div>
        <strong>{receipt.answered ? "Answered on screen" : session.pendingPrompt ? "Direction accepted by Orbis" : "Model reports this direction active"}</strong>
        {receipt.answered || !receipt.engineered ? <p>{receipt.source}</p> : <div className="receipt-compare"><p>You: {receipt.source}</p>{receipt.actionPrompt && <p>First: {receipt.actionPrompt.split("\n")[0]}</p>}<p>Sent: {receipt.engineered.text}</p><span>{receipt.engineered.model === "gemini" ? "engineered by Gemini" : "sent as written"}{receipt.engineered.notes.length > 0 && ` · using ${receipt.engineered.notes.length} product ${receipt.engineered.notes.length === 1 ? "note" : "notes"}`}</span></div>}
      </div></div>}
    </section>

    <section className="contract-panel" aria-labelledby="contract-heading">
      <div className="director-heading"><div><span className="eyebrow">STAYS TRUE</span><h2 id="contract-heading">Scene contract</h2></div><button className="button secondary" type="button" disabled={readingContract || busy || !(live || canReadContract)} onClick={readContract}>{readingContract ? <span className="spinner" /> : <Icon name="image" size={15} />}{readingContract ? "Reading…" : live ? "Read from live frame" : "Read from preview"}</button></div>
      <p className="contract-hint">Restated in every direction so the same person, product and place carry across chunks. Pinned lines also survive a full pivot; a pivot drops the other setting lines.</p>
      {contract?.lines.length ? <ul className="contract-lines">{contract.lines.map((line) => <li key={line.id} className={line.pinned ? "pinned" : ""}><span className={`contract-kind ${line.kind}`}>{KIND_LABELS[line.kind]}</span><span className="contract-text">{line.text}</span><span className="contract-source">{line.source}</span><button type="button" className={`contract-pin ${line.pinned ? "on" : ""}`} aria-pressed={line.pinned} aria-label={line.pinned ? "Unpin line" : "Pin line"} title={line.pinned ? "Pinned: survives a pivot" : "Pin: survive a pivot"} onClick={() => updateLine(line.id, { pinned: !line.pinned })}>{line.pinned ? "Pinned" : "Pin"}</button><button type="button" className="icon-button" aria-label="Remove line" onClick={() => removeLine(line.id)}><Icon name="close" size={13} /></button></li>)}</ul>
        : <p className="contract-empty">{contract ? "No lines. Add one below or read the frame." : "Set when you generate: the product from its info, the person and place from your brief."}</p>}
      <form className="contract-add" onSubmit={(event) => { event.preventDefault(); addLine(); }}><input type="text" aria-label="New contract line" value={newLine} maxLength={1000} placeholder="Add a line that must stay true, e.g. the man keeps his grey hoodie" disabled={!contract || busy} onChange={(event) => setNewLine(event.target.value)} /><button className="button secondary" type="submit" disabled={!contract || !newLine.trim() || busy}>Add</button></form>
    </section>
  </div>;
}
