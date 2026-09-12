"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

import { AdBreak } from "./ad-break";
import { type AdPhase, adPhaseAt, formatClock } from "@/lib/watch/schedule";

// A YouTube-style player with its own controls. Fullscreen is requested on
// the whole container so the ad break renders inside the fullscreen element.

const HIDE_CONTROLS_MS = 2_600;
const SEEK_S = 5;

type Props = { src: string; poster: string; adAt: number; live: boolean };

function Icon({ name }: { name: "play" | "pause" | "volume" | "muted" | "full" | "exit" | "settings" | "theater" | "next" }) {
  const paths: Record<typeof name, string> = {
    play: "M8 5v14l11-7z",
    pause: "M6 19h4V5H6v14zm8-14v14h4V5h-4z",
    volume: "M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05A4.47 4.47 0 0 0 16.5 12zM14 3.23v2.06A7 7 0 0 1 14 18.7v2.07A9 9 0 0 0 14 3.23z",
    muted: "M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12a9 9 0 0 0-7-8.77v2.06A7 7 0 0 1 19 12zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-8.5-8.5L4.27 3zM12 4 9.91 6.09 12 8.18V4z",
    full: "M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z",
    exit: "M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z",
    settings: "M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.3 7.3 0 0 0-1.69-.98l-.38-2.65A.49.49 0 0 0 14 2h-4a.49.49 0 0 0-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.65zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z",
    theater: "M19 6H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zm0 10H5V8h14v8z",
    next: "M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z",
  };
  return <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d={paths[name]} /></svg>;
}

export function VideoPlayer({ src, poster, adAt, live }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsShown, setControlsShown] = useState(true);
  const [phase, setPhase] = useState<AdPhase>("idle");

  const showControls = useCallback(() => {
    setControlsShown(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setControlsShown(false), HIDE_CONTROLS_MS);
  }, []);
  useEffect(() => () => { if (hideTimer.current) window.clearTimeout(hideTimer.current); }, []);
  // Metadata can arrive before React attaches its listeners; read it once on mount.
  useEffect(() => { const element = video.current; if (element && element.readyState >= 1) setDuration(element.duration); }, []);
  useEffect(() => { if (!playing) setControlsShown(true); }, [playing]);

  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement === container.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  // The ad takes the player over at its time: the video pauses under it.
  useEffect(() => {
    if (phase !== "show") return;
    video.current?.pause();
  }, [phase]);

  function togglePlay() {
    const element = video.current;
    if (!element || phase === "show") return;
    if (element.paused) { void element.play().catch(() => undefined); setStarted(true); } else element.pause();
  }
  function toggleFullscreen() {
    const element = container.current;
    if (!element) return;
    if (document.fullscreenElement === element) void document.exitFullscreen().catch(() => undefined);
    else void element.requestFullscreen().catch(() => undefined);
  }
  function toggleMuted() {
    const element = video.current;
    if (!element) return;
    element.muted = !element.muted;
    setMuted(element.muted);
  }
  function changeVolume(next: number) {
    const element = video.current;
    if (!element) return;
    element.volume = next; element.muted = next === 0;
    setVolume(next); setMuted(element.muted);
  }
  function seekTo(seconds: number) {
    const element = video.current;
    if (!element || phase === "show") return;
    element.currentTime = Math.min(Math.max(0, seconds), duration || 0);
  }
  function seekFromBar(event: ReactMouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    seekTo(((event.clientX - rect.left) / rect.width) * duration);
  }
  function onKey(event: React.KeyboardEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("input, button, textarea")) return;
    const key = event.key.toLowerCase();
    if (key === " " || key === "k") { event.preventDefault(); togglePlay(); }
    else if (key === "f") { event.preventDefault(); toggleFullscreen(); }
    else if (key === "m") { event.preventDefault(); toggleMuted(); }
    else if (key === "arrowleft") { event.preventDefault(); seekTo(time - SEEK_S); }
    else if (key === "arrowright") { event.preventDefault(); seekTo(time + SEEK_S); }
    else if (key === "j") { event.preventDefault(); seekTo(time - 2 * SEEK_S); }
    else if (key === "l") { event.preventDefault(); seekTo(time + 2 * SEEK_S); }
    showControls();
  }

  const progress = duration ? (time / duration) * 100 : 0;
  const adMarker = duration && adAt <= duration ? (adAt / duration) * 100 : null;
  const adOn = phase === "show";
  return <div ref={container} className={`yt-player ${adOn ? "ad-on" : ""} ${controlsShown || !playing ? "controls-on" : "controls-off"}`} tabIndex={0} onKeyDown={onKey} onMouseMove={showControls} onMouseLeave={() => { if (playing) setControlsShown(false); }} aria-label="Video player">
    <video
      ref={video}
      src={src}
      poster={poster}
      playsInline
      preload="metadata"
      onClick={togglePlay}
      onDoubleClick={toggleFullscreen}
      onPlay={() => { setPlaying(true); setStarted(true); }}
      onPause={() => setPlaying(false)}
      onEnded={() => setPlaying(false)}
      onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
      onDurationChange={(event) => setDuration(event.currentTarget.duration)}
      onVolumeChange={(event) => { setMuted(event.currentTarget.muted); setVolume(event.currentTarget.volume); }}
      onProgress={(event) => { const ranges = event.currentTarget.buffered; if (ranges.length) setBuffered(ranges.end(ranges.length - 1)); }}
      onTimeUpdate={(event) => { const now = event.currentTarget.currentTime; setTime(now); setPhase((previous) => adPhaseAt(now, adAt, previous)); }}
    />
    {!started && !adOn && <button className="yt-bigplay" type="button" aria-label="Play" onClick={togglePlay}><Icon name="play" /></button>}
    {started && !playing && !adOn && <button className="yt-bigplay faint" type="button" aria-label="Play" onClick={togglePlay}><Icon name="play" /></button>}

    {(phase === "prewarm" || phase === "show") && <AdBreak phase={phase} live={live} onFinished={() => { setPhase("done"); void video.current?.play().catch(() => undefined); }} />}

    {!adOn && <div className="yt-controls">
      <div className="yt-progress" role="slider" aria-label="Seek" aria-valuemin={0} aria-valuemax={Math.floor(duration)} aria-valuenow={Math.floor(time)} onClick={seekFromBar}>
        <div className="yt-buffered" style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }} />
        <div className="yt-played" style={{ width: `${progress}%` }} />
        {adMarker !== null && phase !== "done" && <span className="yt-ad-marker" style={{ left: `${adMarker}%` }} title="Ad" />}
        <span className="yt-knob" style={{ left: `${progress}%` }} />
      </div>
      <div className="yt-buttons">
        <button type="button" aria-label={playing ? "Pause" : "Play"} onClick={togglePlay}><Icon name={playing ? "pause" : "play"} /></button>
        <button type="button" aria-label="Next" disabled><Icon name="next" /></button>
        <div className="yt-volume">
          <button type="button" aria-label={muted ? "Unmute" : "Mute"} onClick={toggleMuted}><Icon name={muted || volume === 0 ? "muted" : "volume"} /></button>
          <input type="range" aria-label="Volume" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={(event) => changeVolume(Number(event.target.value))} />
        </div>
        <span className="yt-time">{formatClock(time)} / {formatClock(duration)}</span>
        <span className="yt-spacer" />
        <button type="button" aria-label="Settings" disabled><Icon name="settings" /></button>
        <button type="button" aria-label="Theater mode" disabled><Icon name="theater" /></button>
        <button type="button" aria-label={fullscreen ? "Exit full screen" : "Full screen"} onClick={toggleFullscreen}><Icon name={fullscreen ? "exit" : "full"} /></button>
      </div>
    </div>}
  </div>;
}
