"use client";

import { ReactorView } from "@reactor-team/js-sdk";

import type { LiveContinuationSession } from "@/hooks/use-live-continuation";
import type { Campaign, StoryBeat } from "@/lib/studio-data";

type Props = {
  session: LiveContinuationSession;
  campaign: Campaign | null;
  framePreview: string;
  preparing: boolean;
  runId: string;
  prompt: string;
  storyBeats: StoryBeat[];
  onStart: () => void;
  onSteer: (beat: StoryBeat) => void;
};

export function ContinuationStage({
  session,
  campaign,
  framePreview,
  preparing,
  runId,
  prompt,
  storyBeats,
  onStart,
  onSteer,
}: Props) {
  const live = session.connected && session.runStarted;

  return (
    <section className="panel continuation-panel" aria-labelledby="continuation-title">
      <div className="panel-heading continuation-heading">
        <div>
          <span className="step-number">03</span>
          <div>
            <h2 id="continuation-title">Live continuation</h2>
            <p>One unbroken sponsor-integrated scene, generated from the handoff.</p>
          </div>
        </div>
        <div className="live-state">
          <span className={live ? "live-dot active" : "live-dot"} />
          {live ? `Live · chunk ${session.chunk}` : session.status}
        </div>
      </div>

      <div className="live-stage">
        {live ? (
          <ReactorView
            track="main_video"
            audioTrack="main_audio"
            muted={session.muted}
            className="reactor-view"
            videoObjectFit="cover"
          />
        ) : framePreview ? (
          <img src={framePreview} alt="Prepared continuation handoff" />
        ) : (
          <div className="live-placeholder">
            <span>OR</span>
            <strong>Your continuation will appear here</strong>
            <p>Prepare a handoff frame and approved campaign to begin.</p>
          </div>
        )}
        <div className="safe-area" aria-hidden="true">
          <span>PLACEMENT SAFE AREA</span>
        </div>
        {campaign && (
          <div className="sponsor-label">
            <span>Integrated partner</span>
            <strong>{campaign.brand}</strong>
          </div>
        )}
      </div>

      <div className="transport-row">
        {!session.runStarted ? (
          <button
            className="button primary start-button"
            type="button"
            disabled={preparing || session.busy || !campaign || !framePreview}
            onClick={onStart}
          >
            {preparing || session.busy ? "Preparing continuation…" : "Start live continuation"}
          </button>
        ) : (
          <>
            <button
              className="button secondary"
              type="button"
              disabled={session.busy}
              onClick={session.pauseOrResume}
            >
              {session.paused ? "Resume" : "Pause"}
            </button>
            <button
              className="button secondary"
              type="button"
              disabled={session.busy}
              onClick={session.reset}
            >
              End run
            </button>
            <button className="text-button" type="button" onClick={session.toggleMuted}>
              {session.muted ? "Enable audio" : "Mute audio"}
            </button>
          </>
        )}
        <div className="run-meta">
          <span>Run</span>
          <strong>{runId ? runId.slice(0, 8) : "Not started"}</strong>
        </div>
      </div>

      {session.error && <p className="inline-error" role="alert">{session.error}</p>}

      <div className="beat-section">
        <div>
          <span className="eyebrow">Approved live controls</span>
          <h3>Steer the next beat</h3>
        </div>
        <div className="beat-grid">
          {storyBeats.map((beat) => (
            <button
              key={beat.id}
              className="beat-button"
              type="button"
              disabled={!session.runStarted || session.busy || !prompt}
              onClick={() => onSteer(beat)}
            >
              <strong>{beat.label}</strong>
              <span>{beat.detail}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
