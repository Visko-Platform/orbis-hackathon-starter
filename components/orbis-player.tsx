"use client";

import { ReactorView } from "@reactor-team/js-sdk";

type OrbisPlayerProps = {
  connected: boolean;
  muted: boolean;
  runStarted: boolean;
  status: string;
  statusLabel?: string;
  posterUrl?: string;
  placeholder?: string;
};

export function OrbisPlayer({
  connected,
  muted,
  runStarted,
  status,
  statusLabel,
  posterUrl,
  placeholder,
}: OrbisPlayerProps) {
  return (
    <div className="player">
      {runStarted ? (
        <ReactorView
          track="main_video"
          audioTrack="main_audio"
          muted={muted}
          videoObjectFit="contain"
        />
      ) : (
        posterUrl ? (
          // The generated frame is the visible arena until Orbis starts streaming.
          // eslint-disable-next-line @next/next/no-img-element
          <img className="player-poster" src={posterUrl} alt="Battle opening frame" />
        ) : (
          <div className="player-placeholder">
            {placeholder || (connected ? "Generate a battlefield image to begin" : "Connect to Orbis Stable")}
          </div>
        )
      )}
      <span className={`status status-${status}`}>{statusLabel || status}</span>
    </div>
  );
}
