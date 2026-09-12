"use client";

import { ReactorProvider } from "@reactor-team/js-sdk";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ImageSegmenter } from "@mediapipe/tasks-vision";

import { OrbisControls } from "@/components/orbis-controls";
import { OrbisPlayer } from "@/components/orbis-player";
import { useOrbisSession } from "@/hooks/use-orbis-session";
import { ORBIS_MODEL_NAME, ORBIS_TRACKS, requestReactorJwt } from "@/lib/orbis";

import styles from "./segmentation-lab.module.css";

const WASM_ROOT = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const DEEPLAB_V3_MODEL = "https://storage.googleapis.com/mediapipe-models/image_segmenter/deeplab_v3/float32/1/deeplab_v3.tflite";

const VOC_COLORS = [
  [0, 0, 0], [128, 0, 0], [0, 128, 0], [128, 128, 0], [0, 0, 128],
  [128, 0, 128], [0, 128, 128], [128, 128, 128], [64, 0, 0], [192, 0, 0],
  [64, 128, 0], [192, 128, 0], [64, 0, 128], [192, 0, 128], [64, 128, 128],
  [192, 128, 128], [0, 64, 0], [128, 64, 0], [0, 192, 0], [128, 192, 0], [0, 64, 128],
];

type Delegate = "GPU" | "CPU";

type Metrics = { fps: number; meanMs: number; p95Ms: number; frames: number };

function percentile(values: number[], value: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * value) - 1)];
}

export function SegmentationLab() {
  const tokenRef = useRef<Promise<string> | null>(null);
  const getJwt = useCallback(() => {
    tokenRef.current ??= requestReactorJwt();
    return tokenRef.current;
  }, []);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a href="/" className={styles.back}>← Back to stream</a>
        <p>REAL-TIME PERCEPTION LAB</p>
        <h1>Orbis × DeepLab-v3</h1>
        <span>Generated stream at left. Segmentation output and true end-to-end profiling at right.</span>
      </header>
      <ReactorProvider
        apiUrl="https://api.reactor.inc"
        modelName={ORBIS_MODEL_NAME}
        modelTracks={[...ORBIS_TRACKS]}
        connectOptions={{ autoConnect: false }}
        jwtToken={getJwt}
      >
        <LabSession clearJwt={() => { tokenRef.current = null; }} />
      </ReactorProvider>
    </main>
  );
}

function LabSession({ clearJwt }: { clearJwt: () => void }) {
  const session = useOrbisSession(clearJwt);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);

  return (
    <>
      <section className={styles.views}>
        <div className={styles.view}>
          <div className={styles.viewLabel}>Live Orbis stream</div>
          <OrbisPlayer
            connected={session.connected}
            muted={session.muted}
            runStarted={session.runStarted}
            status={session.status}
            onVideoElement={setVideo}
          />
        </div>
        <SegmentationView source={video} active={session.runStarted} />
      </section>
      <section className={styles.controls}>
        <OrbisControls session={session} />
      </section>
    </>
  );
}

function SegmentationView({ source, active }: { source: HTMLVideoElement | null; active: boolean }) {
  const outputRef = useRef<HTMLCanvasElement>(null);
  const workRef = useRef<HTMLCanvasElement>(null);
  const gpuCanvasRef = useRef<HTMLCanvasElement>(null);
  const segmenterRef = useRef<ImageSegmenter | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastVideoTime = useRef(-1);
  const samples = useRef<number[]>([]);
  const frameTimes = useRef<number[]>([]);
  const frameCount = useRef(0);
  const [delegate, setDelegate] = useState<Delegate>("GPU");
  const [modelState, setModelState] = useState("Loading model…");
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState<Metrics>({ fps: 0, meanMs: 0, p95Ms: 0, frames: 0 });

  const drawMask = useCallback((mask: Uint8Array, width: number, height: number) => {
    const output = outputRef.current;
    const work = workRef.current;
    if (!output || !work) return;
    work.width = width;
    work.height = height;
    const workContext = work.getContext("2d");
    const outputContext = output.getContext("2d");
    if (!workContext || !outputContext) return;
    const image = workContext.createImageData(width, height);
    for (let index = 0; index < mask.length; index += 1) {
      const color = VOC_COLORS[mask[index] % VOC_COLORS.length];
      const destination = index * 4;
      image.data[destination] = color[0];
      image.data[destination + 1] = color[1];
      image.data[destination + 2] = color[2];
      image.data[destination + 3] = 255;
    }
    workContext.putImageData(image, 0, 0);
    output.width = width;
    output.height = height;
    outputContext.imageSmoothingEnabled = false;
    outputContext.drawImage(work, 0, 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      segmenterRef.current?.close();
      segmenterRef.current = null;
      setError("");
      setModelState(`Loading DeepLab-v3 (${delegate})…`);
      try {
        const { FilesetResolver, ImageSegmenter: Segmenter } = await import("@mediapipe/tasks-vision");
        const fileset = await FilesetResolver.forVisionTasks(WASM_ROOT);
        const segmenter = await Segmenter.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: DEEPLAB_V3_MODEL, delegate },
          runningMode: "VIDEO",
          outputCategoryMask: true,
          outputConfidenceMasks: false,
          canvas: delegate === "GPU" ? gpuCanvasRef.current ?? undefined : undefined,
        });
        if (cancelled) {
          segmenter.close();
          return;
        }
        segmenterRef.current = segmenter;
        setModelState(`DeepLab-v3 ready (${delegate})`);
      } catch (caught) {
        if (!cancelled) {
          setModelState("Model unavailable");
          setError(caught instanceof Error ? caught.message : "Could not load DeepLab-v3.");
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      segmenterRef.current?.close();
      segmenterRef.current = null;
    };
  }, [delegate]);

  useEffect(() => {
    if (!source || !active || !segmenterRef.current) return;
    let running = true;
    lastVideoTime.current = -1;
    samples.current = [];
    frameTimes.current = [];
    frameCount.current = 0;

    const tick = () => {
      if (!running) return;
      const segmenter = segmenterRef.current;
      if (
        !segmenter ||
        source.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        source.currentTime === lastVideoTime.current
      ) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }
      lastVideoTime.current = source.currentTime;
      const started = performance.now();
      try {
        segmenter.segmentForVideo(source, started, (result) => {
          const categoryMask = result.categoryMask;
          if (categoryMask) drawMask(categoryMask.getAsUint8Array(), categoryMask.width, categoryMask.height);
        });
        const finished = performance.now();
        samples.current.push(finished - started);
        if (samples.current.length > 120) samples.current.shift();
        frameTimes.current.push(finished);
        frameTimes.current = frameTimes.current.filter((time) => finished - time < 1_000);
        frameCount.current += 1;
        if (frameCount.current % 5 === 0) {
          const values = samples.current;
          setMetrics({
            fps: frameTimes.current.length,
            meanMs: values.reduce((sum, value) => sum + value, 0) / values.length,
            p95Ms: percentile(values, 0.95),
            frames: frameCount.current,
          });
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Segmentation failed.");
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      running = false;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [active, drawMask, source, modelState]);

  return (
    <div className={styles.segmentPanel}>
      <div className={styles.viewLabel}>DeepLab-v3 semantic mask</div>
      <div className={styles.maskStage}>
        <canvas ref={outputRef} className={styles.maskCanvas} />
        {!active && <span className={styles.placeholder}>Start an Orbis stream to profile it.</span>}
        <canvas ref={workRef} className={styles.hidden} />
        <canvas ref={gpuCanvasRef} className={styles.hidden} />
      </div>
      <div className={styles.profileHeader}>
        <strong>{modelState}</strong>
        <select value={delegate} onChange={(event) => setDelegate(event.target.value as Delegate)} disabled={active}>
          <option value="GPU">GPU</option>
          <option value="CPU">CPU</option>
        </select>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <dl className={styles.metrics}>
        <div><dt>FPS</dt><dd>{metrics.fps.toFixed(1)}</dd></div>
        <div><dt>Mean</dt><dd>{metrics.meanMs.toFixed(1)} ms</dd></div>
        <div><dt>P95</dt><dd>{metrics.p95Ms.toFixed(1)} ms</dd></div>
        <div><dt>Frames</dt><dd>{metrics.frames}</dd></div>
      </dl>
      <p className={styles.note}>FPS includes MediaPipe inference, GPU-to-CPU category-mask readback, and mask rendering. This is the cost your RL loop will actually pay.</p>
    </div>
  );
}
