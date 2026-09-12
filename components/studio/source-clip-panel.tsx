"use client";

import { useEffect, useRef, useState } from "react";

import type { FilmTitle } from "@/lib/studio-data";

type CapturedFrame = {
  file: File;
  previewUrl: string;
  time: number;
};

type Props = {
  title: FilmTitle;
  clipUrl: string;
  clipName: string;
  framePreview: string;
  handoffTime: number;
  onClipSelected: (file: File) => void;
  onFrameCaptured: (frame: CapturedFrame) => void;
};

function canvasFile(canvas: HTMLCanvasElement, name: string) {
  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not create the handoff frame."));
          return;
        }
        resolve(new File([blob], name, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  });
}

export function SourceClipPanel({
  title,
  clipUrl,
  clipName,
  framePreview,
  handoffTime,
  onClipSelected,
  onFrameCaptured,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    setDuration(0);
    setCurrentTime(0);
  }, [clipUrl]);

  async function captureVideoFrame() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const context = canvas.getContext("2d");
    if (!context) return;

    const sourceRatio = video.videoWidth / video.videoHeight;
    const targetRatio = 16 / 9;
    let sx = 0;
    let sy = 0;
    let sourceWidth = video.videoWidth;
    let sourceHeight = video.videoHeight;
    if (sourceRatio > targetRatio) {
      sourceWidth = video.videoHeight * targetRatio;
      sx = (video.videoWidth - sourceWidth) / 2;
    } else {
      sourceHeight = video.videoWidth / targetRatio;
      sy = (video.videoHeight - sourceHeight) / 2;
    }
    context.drawImage(
      video,
      sx,
      sy,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    const file = await canvasFile(canvas, `${title.id}-handoff.jpg`);
    onFrameCaptured({
      file,
      previewUrl: URL.createObjectURL(file),
      time: video.currentTime,
    });
  }

  async function useDemoFrame() {
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const context = canvas.getContext("2d");
    if (!context) return;

    const sky = context.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, "#111a31");
    sky.addColorStop(0.55, title.palette);
    sky.addColorStop(1, "#17100c");
    context.fillStyle = sky;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "rgba(15, 14, 18, .86)";
    const blocks = [
      [0, 260, 250, 330],
      [215, 210, 190, 380],
      [890, 235, 210, 355],
      [1060, 175, 220, 415],
    ];
    for (const [x, y, width, height] of blocks) {
      context.fillRect(x, y, width, height);
    }

    context.fillStyle = "rgba(255, 212, 144, .75)";
    for (let index = 0; index < 11; index += 1) {
      context.fillRect(80 + index * 105, 340 + (index % 3) * 24, 36, 14);
    }

    context.fillStyle = "#121116";
    context.beginPath();
    context.moveTo(410, 720);
    context.lineTo(570, 410);
    context.lineTo(700, 410);
    context.lineTo(885, 720);
    context.closePath();
    context.fill();

    context.fillStyle = "rgba(255, 255, 255, .9)";
    context.font = "500 24px Arial";
    context.fillText(title.title.toUpperCase(), 48, 56);
    context.font = "18px Arial";
    context.fillStyle = "rgba(255, 255, 255, .66)";
    context.fillText(`${title.moment} · continuity reference`, 48, 86);

    const file = await canvasFile(canvas, `${title.id}-demo-handoff.jpg`);
    onFrameCaptured({
      file,
      previewUrl: URL.createObjectURL(file),
      time: 0,
    });
  }

  return (
    <section className="panel source-panel" aria-labelledby="source-title">
      <div className="panel-heading">
        <div>
          <span className="step-number">01</span>
          <div>
            <h2 id="source-title">Source moment</h2>
            <p>Choose the exact frame where the live continuation begins.</p>
          </div>
        </div>
        <span className={`status-chip ${framePreview ? "approved" : ""}`}>
          {framePreview ? "Handoff ready" : "Frame needed"}
        </span>
      </div>

      <div className="source-stage">
        {clipUrl ? (
          <video
            ref={videoRef}
            src={clipUrl}
            controls
            playsInline
            onLoadedMetadata={(event) => {
              setDuration(event.currentTarget.duration || 0);
              setCurrentTime(event.currentTarget.currentTime || 0);
            }}
            onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          />
        ) : framePreview ? (
          <img src={framePreview} alt="Selected cinematic handoff frame" />
        ) : (
          <div className="empty-frame" style={{ "--scene-accent": title.palette } as React.CSSProperties}>
            <div className="scene-copy">
              <span>Licensed title</span>
              <strong>{title.title}</strong>
              <p>{title.moment}</p>
            </div>
            <div className="scene-horizon" aria-hidden="true" />
          </div>
        )}
        <div className="frame-corners" aria-hidden="true" />
        <span className="timecode">{clipUrl ? formatTime(currentTime) : title.timecode}</span>
      </div>

      {clipUrl && (
        <label className="scrubber-label">
          Handoff position
          <input
            type="range"
            min={0}
            max={Math.max(duration, 0.1)}
            step={0.04}
            value={Math.min(currentTime, duration || 0)}
            onChange={(event) => {
              const value = Number(event.target.value);
              setCurrentTime(value);
              if (videoRef.current) videoRef.current.currentTime = value;
            }}
          />
          <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
        </label>
      )}

      <div className="source-actions">
        <label className="file-button">
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onClipSelected(file);
            }}
          />
          {clipName ? "Replace clip" : "Upload licensed clip"}
        </label>
        {clipUrl ? (
          <button className="button secondary" type="button" onClick={captureVideoFrame}>
            Capture current frame
          </button>
        ) : (
          <button className="button secondary" type="button" onClick={useDemoFrame}>
            Use demo handoff
          </button>
        )}
        <div className="handoff-meta">
          <span>16:9 crop</span>
          <strong>{framePreview ? formatTime(handoffTime) : "Not selected"}</strong>
        </div>
      </div>
    </section>
  );
}

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "00:00.00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  const centiseconds = Math.floor((value % 1) * 100);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
}
