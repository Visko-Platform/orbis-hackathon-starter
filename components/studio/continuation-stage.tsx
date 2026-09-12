"use client";

import { ReactorView } from "@reactor-team/js-sdk";
import { useEffect, useRef, useState } from "react";
import type { LiveContinuationSession } from "@/hooks/use-live-continuation";
import type { Campaign } from "@/lib/studio-data";
import type { DirectionMode } from "@/lib/live-direction";
import { Icon } from "./icon";

type Props = {
  session: LiveContinuationSession;
  campaign: Campaign;
  framePreview: string;
  originalPreview: string;
  preparing: boolean;
  runId: string;
  brandRetained: boolean;
  onStart: () => void;
  onPivot: (direction: string, mode: DirectionMode, preserveBrand: boolean) => Promise<boolean>;
  onAction: (action: () => Promise<void>, label: string) => void;
  onImport: () => void;
};

export function ContinuationStage({ session, campaign, framePreview, originalPreview, preparing, runId, brandRetained, onStart, onPivot, onAction, onImport }: Props) {
  const player = useRef<HTMLDivElement>(null);
  const [compare, setCompare] = useState(false);
  const [direction, setDirection] = useState("");
  const [mode, setMode] = useState<DirectionMode>("pivot");
  const [preserveBrand, setPreserveBrand] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastDirection, setLastDirection] = useState("");
  const [fullscreenError, setFullscreenError] = useState("");
  const live = session.connected && session.runStarted;
  const busy = preparing || session.busy;

  useEffect(() => { setLastDirection(""); setPreserveBrand(true); }, [runId]);

  async function submit() {
    if (!direction.trim() || submitting || busy || !live) return;
    setSubmitting(true);
    try {
      if (await onPivot(direction.trim(), mode, preserveBrand)) {
        setLastDirection(direction.trim());
        setDirection("");
      }
    } finally { setSubmitting(false); }
  }

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
          : framePreview ? <img src={compare ? originalPreview : framePreview} alt={compare ? "Original reference frame" : "Preview of actual campaign artwork placed in the reference frame"} />
          : <div className="cinema-empty">
            <div className="empty-aperture" aria-hidden="true"><Icon name="film" size={30} /></div>
            <span className="eyebrow">YOUR NEXT SCENE STARTS HERE</span>
            <h3>Bring your brand<br />into the story.</h3>
            <p>Import a film clip or reference frame.<br />Choose a campaign. Direct what happens next.</p>
            <button className="button primary" type="button" onClick={onImport}><Icon name="upload" size={16} /> Import a scene</button>
            <span className="empty-caption">MP4, WebM, MOV or a still image</span>
          </div>}
        {busy && !live && <div className="render-overlay" role="status"><span className="spinner" /><strong>{preparing && !session.busy ? "Preparing your scene…" : session.phase || "Connecting to the live model…"}</strong><p>{session.phase === "Disconnecting" ? "Releasing your live session." : "The first frames may take a moment."}</p></div>}
        {live && <div className="live-corner"><span className="state-dot live" />{session.paused ? "PAUSED" : "LIVE"}</div>}
      </div>
      <div className="player-footer">
        <div className="partner-info"><img src={campaign.logo} alt={campaign.brand} /><div><span>{live && !brandRetained ? "Original campaign" : "In-scene partner"}</span><strong>{campaign.brand}</strong></div></div>
        <div className="transport-controls">
          {live ? <><button type="button" className="icon-button" onClick={session.toggleMuted} aria-label={session.muted ? "Enable audio" : "Mute audio"}><Icon name={session.muted ? "mute" : "audio"} /></button><button className="button secondary" disabled={busy} onClick={() => onAction(session.pauseOrResume, session.paused ? "Resumed" : "Paused")}><Icon name={session.paused ? "play" : "pause"} size={15} />{session.paused ? "Resume" : "Pause"}</button><button className="button stop-button" disabled={busy} onClick={() => onAction(session.reset, "Take ended")}><Icon name="stop" size={14} />End take</button></>
            : <button className="button primary" type="button" disabled={!framePreview || busy} onClick={onStart}>{busy ? <span className="spinner" /> : <Icon name="play" size={16} />}{busy ? "Preparing…" : "Generate live"}</button>}
        </div>
      </div>
      {fullscreenError && <p className="inline-error" role="alert">{fullscreenError}</p>}
    </section>

    <section className="director-panel" aria-labelledby="director-heading">
      <div className="director-heading"><div><span className="eyebrow">YOU’RE IN THE DIRECTOR’S CHAIR</span><h2 id="director-heading">Where should the story go?</h2></div><span className={`subtle-badge ${live ? "live-badge" : ""}`}><span className="state-dot" />{live ? "Live control" : "Ready when you are"}</span></div>
      <div className="direction-modes" role="group" aria-label="Direction mode"><button type="button" disabled={submitting} aria-pressed={mode === "pivot"} className={mode === "pivot" ? "selected" : ""} onClick={() => setMode("pivot")}><Icon name="spark" size={16} />Change direction</button><button type="button" disabled={submitting} aria-pressed={mode === "refine"} className={mode === "refine" ? "selected" : ""} onClick={() => setMode("refine")}><Icon name="refresh" size={15} />Refine this scene</button></div>
      <div className="prompt-box">
        <label className="sr-only" htmlFor="live-direction">Live direction prompt</label>
        <textarea id="live-direction" value={direction} disabled={submitting} maxLength={1200} onChange={(event) => setDirection(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); void submit(); } }} placeholder={mode === "pivot" ? "Take us somewhere else. A rooftop in Tokyo, neon rain, the camera moves around the product…" : "Make the lighting warmer, move closer to the storefront, slow the camera down…"} />
        <div className="prompt-toolbar"><label className="switch-label"><input type="checkbox" disabled={submitting} checked={preserveBrand} onChange={(event) => setPreserveBrand(event.target.checked)} /><span className="switch-track" />Keep {campaign.brand} in scene</label><button className="button primary" type="button" disabled={!live || busy || submitting || !direction.trim()} onClick={submit}>{submitting ? <span className="spinner" /> : <Icon name="arrow" size={17} />}{mode === "pivot" ? "Pivot live" : "Apply direction"}</button></div>
      </div>
      <div className="director-foot"><span>{!live ? "Start a take to send directions. You can write one now." : session.paused ? "The new direction will appear when you resume." : "Your direction shapes the next video chunk."}</span><span>{direction.length}/1200 · ⌘/Ctrl ↵</span></div>
      <div className="prompt-suggestions"><span>Try a direction</span>{["A neon Tokyo rooftop at night", "Pull back into a sweeping aerial shot", "Turn the street into a snowy mountain pass"].map((suggestion) => <button key={suggestion} type="button" disabled={submitting} onClick={() => setDirection(suggestion)}>{suggestion}<Icon name="arrow" size={12} /></button>)}</div>
      {lastDirection && live && <div className="direction-receipt" role="status"><Icon name="check" size={16} /><div><strong>{session.pendingPrompt ? "Direction accepted by Orbis" : "Model reports this direction active"}</strong><p>{lastDirection}</p></div></div>}
    </section>
  </div>;
}
