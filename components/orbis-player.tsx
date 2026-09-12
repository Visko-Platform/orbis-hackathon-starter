"use client";

import { ReactorView } from "@reactor-team/js-sdk";
import { useEffect, useRef } from "react";

type OrbisPlayerProps = {
  connected: boolean;
  muted: boolean;
  runStarted: boolean;
  status: string;
  onVideoElement?: (element: HTMLVideoElement | null) => void;
};

export function OrbisPlayer({
  connected,
  muted,
  runStarted,
  status,
  onVideoElement,
}: OrbisPlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onVideoElement) return;
    const reportVideo = () => {
      onVideoElement(playerRef.current?.querySelector("video") ?? null);
    };
    reportVideo();
    const observer = new MutationObserver(reportVideo);
    if (playerRef.current) {
      observer.observe(playerRef.current, { childList: true, subtree: true });
    }
    return () => {
      observer.disconnect();
      onVideoElement(null);
    };
  }, [onVideoElement, runStarted]);

  return (
    <div className="player" ref={playerRef}>
      {runStarted ? (
        <ReactorView
          track="main_video"
          audioTrack="main_audio"
          muted={muted}
          videoObjectFit="contain"
        />
      ) : (
        <div className="player-placeholder">
          {connected ? "Configure and start a run" : "Connect to Orbis Stable"}
        </div>
      )}
      <span className={`status status-${status}`}>{status}</span>
    </div>
  );
}
