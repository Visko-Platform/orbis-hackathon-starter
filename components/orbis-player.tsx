"use client";

import { ReactorView } from "@reactor-team/js-sdk";
import type { OrbisSession } from "@/hooks/use-orbis-session";
import { Badge, Button, Icon } from "@/components/ui";

export function OrbisPlayer({ session }: { session: OrbisSession }) {
  const { connected, muted, runStarted, paused, controlsBusy } = session;
  const stateLabel = paused
    ? "Paused"
    : runStarted
      ? "Live"
      : connected
        ? "Ready"
        : controlsBusy
          ? "Connecting"
          : "Not connected";

  return (
    <section className="preview-panel panel" aria-labelledby="preview-heading">
      <div className="panel-heading">
        <h2 id="preview-heading" className="heading-6">
          <Icon name="play" />
          Live preview
        </h2>
        <Badge tone={connected ? "success" : "neutral"}>
          <span className="status-dot" />
          {stateLabel}
        </Badge>
      </div>
      <div className="player">
        {runStarted ? (
          <ReactorView
            track="main_video"
            audioTrack="main_audio"
            muted={muted}
            videoObjectFit="contain"
          />
        ) : (
          <div className="player-placeholder">
            <div className="preview-orbit">
              <Icon name="orbit" />
            </div>
            <h3 className="heading-5">Your next world starts here.</h3>
            <p className="body-sm">
              {connected
                ? "Describe your scene, then generate your first frame."
                : "Set the scene. Connect to Orbis. Bring it to life."}
            </p>
            <span className="preview-caption caption">
              <span className="status-dot" />
              Continuous video, shaped by you
            </span>
          </div>
        )}
        <span className="video-format caption">16:9</span>
      </div>
      <div className="player-toolbar">
        <span className="caption muted" role="status">
          {paused
            ? "Generation paused"
            : runStarted
              ? "Your scene is evolving"
              : "Waiting for your first frame"}
        </span>
        <div className="playback-actions">
          <Button
            variant="ghost"
            size="icon"
            aria-label={muted ? "Enable sound" : "Mute sound"}
            title={muted ? "Enable sound" : "Mute sound"}
            onClick={session.toggleMuted}
          >
            <Icon name={muted ? "muted" : "volume"} />
          </Button>
          <span className="toolbar-divider" />
          <Button
            variant="ghost"
            size="icon"
            aria-label={paused ? "Resume generation" : "Pause generation"}
            title={paused ? "Resume generation" : "Pause generation"}
            disabled={!connected || !runStarted || controlsBusy}
            onClick={paused ? session.resume : session.pause}
          >
            <Icon name={paused ? "play" : "pause"} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Reset generation"
            title="Reset generation"
            disabled={!connected || !runStarted || controlsBusy}
            onClick={session.reset}
          >
            <Icon name="reset" />
          </Button>
        </div>
      </div>
    </section>
  );
}
