"use client";

import { useEffect, useRef, useState } from "react";

import type { FilmTitle } from "@/lib/studio-data";

type CapturedFrame = {
  file: File;
  previewUrl: string;
  time: number;
  sourceKind?: "image" | "video";
};

type Props = {
  title: FilmTitle;
  clipUrl: string;
  clipName: string;
  framePreview: string;
  handoffTime: number;
  onClipSelected: (file: File) => void;
  onFrameCaptured: (frame: CapturedFrame) => void;
  disabled?: boolean;
  onError?: (message: string) => void;
};

type FrameFit = "cover" | "contain";

function canvasFile(canvas: HTMLCanvasElement, name: string) {
  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not save this frame. Try another position in the clip."));
        return;
      }
      resolve(new File([blob], name, { type: "image/jpeg" }));
    }, "image/jpeg", 0.94);
  });
}

function drawFrame(source: CanvasImageSource, width: number, height: number, fit: FrameFit) {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Frame capture is unavailable in this browser.");
  context.fillStyle = "#000000";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const scale = fit === "cover"
    ? Math.max(canvas.width / width, canvas.height / height)
    : Math.min(canvas.width / width, canvas.height / height);
  const targetWidth = width * scale;
  const targetHeight = height * scale;
  context.drawImage(source, (canvas.width - targetWidth) / 2, (canvas.height - targetHeight) / 2, targetWidth, targetHeight);
  return canvas;
}

export function SourceClipPanel({
  title, clipUrl, clipName, framePreview, handoffTime,
  onClipSelected, onFrameCaptured, disabled = false, onError,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const clipInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const operationRef = useRef(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [dimensions, setDimensions] = useState("");
  const [decoded, setDecoded] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fit, setFit] = useState<FrameFit>("cover");
  const [editing, setEditing] = useState(!framePreview);

  useEffect(() => {
    operationRef.current += 1;
    setDuration(0);
    setCurrentTime(0);
    setDimensions("");
    setDecoded(false);
    setSeeking(false);
    setBusy(false);
    setError("");
    setEditing(true);
  }, [clipUrl, title.id]);

  useEffect(() => { if (framePreview) setEditing(false); }, [framePreview]);
  useEffect(() => () => { operationRef.current += 1; }, []);

  const showVideo = Boolean(clipUrl && (editing || !framePreview));
  const locked = disabled || busy;

  function reportError(cause: unknown) {
    const message = cause instanceof Error ? cause.message : "The source could not be loaded. Please try another file.";
    setError(message);
    onError?.(message);
  }

  function selectClip(file: File) {
    if (locked) return;
    setError("");
    if (!(file.type.startsWith("video/") || (!file.type && /\.(mp4|m4v|webm|mov)$/i.test(file.name)))) {
      reportError(new Error("Choose an MP4, WebM, or MOV video."));
      return;
    }
    if (!file.size || file.size > 250 * 1024 * 1024) {
      reportError(new Error("Choose a video smaller than 250 MB."));
      return;
    }
    operationRef.current += 1;
    setDecoded(false);
    setEditing(true);
    onClipSelected(file);
  }

  async function selectImage(file: File) {
    if (locked) return;
    setError("");
    if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) {
      reportError(new Error("Choose a JPG, PNG, WebP, or AVIF reference image."));
      return;
    }
    if (!file.size || file.size > 10 * 1024 * 1024) {
      reportError(new Error("Choose an image smaller than 10 MB."));
      return;
    }
    const operation = ++operationRef.current;
    const sourceUrl = URL.createObjectURL(file);
    setBusy(true);
    try {
      const image = new Image();
      image.src = sourceUrl;
      await image.decode();
      if (!image.naturalWidth || !image.naturalHeight) throw new Error("This image has no readable pixels.");
      const canvas = drawFrame(image, image.naturalWidth, image.naturalHeight, fit);
      const captured = await canvasFile(canvas, `${title.id}-reference.jpg`);
      if (operation !== operationRef.current) return;
      setDimensions(`${image.naturalWidth} × ${image.naturalHeight}`);
      onFrameCaptured({ file: captured, previewUrl: URL.createObjectURL(captured), time: 0, sourceKind: "image" });
      setEditing(false);
    } catch (cause) {
      if (operation === operationRef.current) reportError(cause);
    } finally {
      URL.revokeObjectURL(sourceUrl);
      if (operation === operationRef.current) setBusy(false);
    }
  }

  async function captureVideoFrame() {
    const video = videoRef.current;
    if (locked || !video || !decoded || seeking || video.seeking || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
    const operation = ++operationRef.current;
    setBusy(true);
    setError("");
    video.pause();
    const time = video.currentTime;
    try {
      const canvas = drawFrame(video, video.videoWidth, video.videoHeight, fit);
      const file = await canvasFile(canvas, `${title.id}-handoff.jpg`);
      if (operation !== operationRef.current) return;
      onFrameCaptured({ file, previewUrl: URL.createObjectURL(file), time, sourceKind: "video" });
      setEditing(false);
    } catch (cause) {
      if (operation === operationRef.current) reportError(cause);
    } finally {
      if (operation === operationRef.current) setBusy(false);
    }
  }

  function readVideoMetadata(video: HTMLVideoElement) {
    setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    setDimensions(video.videoWidth && video.videoHeight ? `${video.videoWidth} × ${video.videoHeight}` : "");
  }

  return (
    <section className="panel source-panel" aria-labelledby="source-title">
      <div className="panel-heading">
        <div><span className="panel-eyebrow">SOURCE</span><h2 id="source-title">The original moment</h2></div>
        {framePreview && <span className="status-chip approved">Frame ready</span>}
      </div>

      <div className="source-stage">
        {showVideo ? (
          <video
            key={clipUrl} ref={videoRef} src={clipUrl} controls playsInline preload="auto"
            style={{ objectFit: fit, background: "#000" }}
            onLoadedMetadata={(event) => {
              const video = event.currentTarget;
              readVideoMetadata(video);
              if (framePreview && handoffTime > 0 && Number.isFinite(video.duration)) {
                setSeeking(true);
                video.currentTime = Math.min(handoffTime, Math.max(0, video.duration - 0.001));
              }
            }}
            onDurationChange={(event) => readVideoMetadata(event.currentTarget)}
            onLoadedData={(event) => {
              readVideoMetadata(event.currentTarget);
              setDecoded(event.currentTarget.readyState >= 2);
              setCurrentTime(event.currentTarget.currentTime);
            }}
            onCanPlay={(event) => setDecoded(event.currentTarget.readyState >= 2)}
            onSeeking={() => setSeeking(true)}
            onSeeked={(event) => {
              setSeeking(false);
              setDecoded(event.currentTarget.readyState >= 2);
              setCurrentTime(event.currentTarget.currentTime);
            }}
            onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
            onError={() => {
              setDecoded(false);
              reportError(new Error("This video could not be decoded. Try an MP4 with H.264 video."));
            }}
          />
        ) : framePreview ? (
          <img src={framePreview} alt="Selected starting frame for the live scene" />
        ) : (
          <div className="source-empty">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="3" /><path d="m10 9 5 3-5 3V9ZM3 8h3M3 16h3M18 8h3M18 16h3" strokeLinejoin="round" />
            </svg>
            <strong>Start with a film moment</strong>
            <p>Add a clip or a reference frame.</p>
            <span>MP4, WebM, MOV · up to 250 MB</span>
          </div>
        )}
        {(showVideo || framePreview) && <span className="timecode">{showVideo ? formatTime(currentTime) : clipUrl ? formatTime(handoffTime) : "REFERENCE FRAME"}</span>}
      </div>

      {showVideo && (
        <div className="source-timeline">
          <label className="scrubber-label" htmlFor="source-position">Choose a starting frame <span>{formatTime(currentTime)} / {formatTime(duration)}</span></label>
          <input
            id="source-position" aria-label="Clip position in seconds" type="range" min={0} max={duration || 1} step={0.04}
            value={Math.min(currentTime, duration || 0)} disabled={locked || !duration}
            onChange={(event) => {
              const video = videoRef.current;
              if (!video || !duration) return;
              const position = Math.min(Number(event.target.value), Math.max(0, duration - 0.001));
              video.pause();
              setCurrentTime(position);
              if (Math.abs(video.currentTime - position) > 0.001) {
                setSeeking(true);
                video.currentTime = position;
              }
            }}
          />
          <div className="source-meta">
            <span>{dimensions || "Reading clip…"}</span>
            <label>Framing <select value={fit} onChange={(event) => setFit(event.target.value as FrameFit)} disabled={locked} aria-label="Frame crop mode"><option value="cover">Fill 16:9</option><option value="contain">Fit with bars</option></select></label>
          </div>
        </div>
      )}

      <input ref={clipInputRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v,.mp4,.webm,.mov,.m4v" hidden disabled={locked} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) selectClip(file); }} />
      <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden disabled={locked} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void selectImage(file); }} />

      <div className="source-actions">
        {showVideo ? (
          <button className="button secondary" type="button" onClick={() => void captureVideoFrame()} disabled={locked || !decoded || seeking}>{busy ? "Capturing…" : seeking ? "Seeking…" : "Use this frame"}</button>
        ) : clipUrl && framePreview ? (
          <button className="button secondary" type="button" onClick={() => { setDecoded(false); setEditing(true); }} disabled={locked}>Edit frame</button>
        ) : (
          <button className="button secondary" type="button" onClick={() => clipInputRef.current?.click()} disabled={locked}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Upload clip
          </button>
        )}
        {clipUrl && <button className="button subtle" type="button" onClick={() => clipInputRef.current?.click()} disabled={locked}>Replace clip</button>}
        <button className="button subtle" type="button" onClick={() => imageInputRef.current?.click()} disabled={locked}>{busy && !showVideo ? "Loading…" : "Use image"}</button>
      </div>

      {(clipName || framePreview) && <div className="source-meta"><span title={clipName}>{clipName || "Reference image"}</span><span>{framePreview ? "1280 × 720 frame" : "Frame not selected"}</span></div>}
      {error && <p className="inline-error" role="alert">{error}</p>}
    </section>
  );
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "00:00.00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  const centiseconds = Math.floor((value % 1) * 100);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
}
