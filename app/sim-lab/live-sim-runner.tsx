"use client";

import { ReactorProvider } from "@reactor-team/js-sdk";
import { useCallback, useEffect, useRef, useState } from "react";

import { OrbisPlayer } from "@/components/orbis-player";
import { useOrbisSession } from "@/hooks/use-orbis-session";
import { ORBIS_MODEL_NAME, ORBIS_TRACKS, requestReactorJwt } from "@/lib/orbis";
import type { ActionDefinition, Judgment, RunRecord, ScenarioDefinition, StepRecord } from "@/lib/sim/types";

import styles from "./sim-lab.module.css";

type LiveRun = { run: RunRecord; allowedActions: ActionDefinition[]; step?: StepRecord };

async function json<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error || "Request failed.");
  return result;
}

export function LiveSimRunner({ scenario }: { scenario: ScenarioDefinition | null }) {
  const tokenRef = useRef<Promise<string> | null>(null);
  const getJwt = useCallback(() => {
    tokenRef.current ??= requestReactorJwt();
    return tokenRef.current;
  }, []);

  return (
    <section className={styles.liveCard}>
      <div className={styles.cardHeader}><h2>Live renderer run</h2><span>Orbis + Gemini judge</span></div>
      <ReactorProvider apiUrl="https://api.reactor.inc" modelName={ORBIS_MODEL_NAME} modelTracks={[...ORBIS_TRACKS]} connectOptions={{ autoConnect: false }} jwtToken={getJwt}>
        <LiveSession scenario={scenario} clearJwt={() => { tokenRef.current = null; }} />
      </ReactorProvider>
    </section>
  );
}

function LiveSession({ scenario, clearJwt }: { scenario: ScenarioDefinition | null; clearJwt: () => void }) {
  const session = useOrbisSession(clearJwt);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [liveRun, setLiveRun] = useState<LiveRun | null>(null);
  const [awaiting, setAwaiting] = useState<{ step: StepRecord; targetChunk: number } | null>(null);
  const [judgment, setJudgment] = useState<Judgment | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const recordingChunks = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [savingRecording, setSavingRecording] = useState(false);
  const [videoPath, setVideoPath] = useState("");

  const begin = async () => {
    if (!scenario || !session.connected) return;
    setBusy(true);
    try {
      const created = await json<{ run: RunRecord; initialRenderIntent: { prompt: string }; scenario: ScenarioDefinition }>("/api/sim/runs", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenarioId: scenario.id }),
      });
      await session.startWithPrompt(created.initialRenderIntent.prompt);
      setLiveRun({ run: created.run, allowedActions: scenario.actions.filter((action) => Object.entries(action.available_when ?? {}).every(([key, value]) => created.run.state[key] === value)) });
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not begin the live run.");
    } finally { setBusy(false); }
  };

  const takeAction = async (action: ActionDefinition) => {
    if (!liveRun || !session.runStarted || awaiting) return;
    setBusy(true);
    try {
      const result = await json<{ run: RunRecord; step: StepRecord; allowedActions: ActionDefinition[]; cadence: number }>(`/api/sim/runs/${liveRun.run.id}/step`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actionId: action.id }),
      });
      await session.steerWithPrompt(result.step.renderIntent.prompt);
      setLiveRun({ run: result.run, allowedActions: result.allowedActions, step: result.step });
      setAwaiting({ step: result.step, targetChunk: session.chunkCount + result.cadence });
      setJudgment(null);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send action to Orbis.");
    } finally { setBusy(false); }
  };

  useEffect(() => {
    if (!awaiting || session.chunkCount < awaiting.targetChunk || !video) return;
    let cancelled = false;
    const judge = async () => {
      setBusy(true);
      try {
        const canvas = document.createElement("canvas");
        const width = Math.min(640, video.videoWidth || 640);
        const height = Math.max(1, Math.round(width * ((video.videoHeight || 360) / (video.videoWidth || 640))));
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")?.drawImage(video, 0, 0, width, height);
        const frameDataUrl = canvas.toDataURL("image/jpeg", 0.78);
        const result = await json<{ judgment: Judgment }>(`/api/sim/runs/${awaiting.step.runId}/judge`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stepId: awaiting.step.id, frameDataUrl }),
        });
        if (!cancelled) setJudgment(result.judgment);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not judge rendered frame.");
      } finally {
        if (!cancelled) { setAwaiting(null); setBusy(false); }
      }
    };
    void judge();
    return () => { cancelled = true; };
  }, [awaiting, session.chunkCount, video]);

  const randomAction = liveRun?.allowedActions[Math.floor(Math.random() * (liveRun.allowedActions.length || 1))];
  const startRecording = () => {
    if (!video || !liveRun) return;
    const stream = video.srcObject instanceof MediaStream
      ? video.srcObject
      : (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.();
    if (!stream) {
      setError("The Orbis video stream is not ready for recording yet.");
      return;
    }
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : "video/webm";
    const nextRecorder = new MediaRecorder(stream, { mimeType });
    recordingChunks.current = [];
    nextRecorder.ondataavailable = (event) => {
      if (event.data.size) recordingChunks.current.push(event.data);
    };
    nextRecorder.onstop = () => {
      const blob = new Blob(recordingChunks.current, { type: mimeType });
      void (async () => {
        try {
          const form = new FormData();
          form.append("video", blob, "trajectory.webm");
          form.append("label", `sf-${liveRun.run.id.slice(0, 8)}`);
          const result = await json<{ videoPath: string }>(`/api/sim/runs/${liveRun.run.id}/video`, {
            method: "POST",
            body: form,
          });
          setVideoPath(result.videoPath);
          setError("");
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "Could not save recording.");
        } finally {
          setSavingRecording(false);
        }
      })();
    };
    nextRecorder.start(1_000);
    recorder.current = nextRecorder;
    setVideoPath("");
    setRecording(true);
    setError("");
  };

  const stopRecording = () => {
    if (!recorder.current || recorder.current.state === "inactive") return;
    setRecording(false);
    setSavingRecording(true);
    recorder.current.stop();
  };

  return (
    <div className={styles.liveGrid}>
      <div className={styles.livePlayer}><OrbisPlayer connected={session.connected} muted={session.muted} runStarted={session.runStarted} status={session.status} onVideoElement={setVideo} /></div>
      <div className={styles.liveControls}>
        <div className={styles.connectRow}>
          <button disabled={busy} onClick={() => void (session.connected ? session.disconnectSession() : session.connectSession())}>{session.connected ? "Disconnect" : "Connect Orbis"}</button>
          <button disabled={busy} onClick={session.toggleMuted}>{session.muted ? "Enable sound" : "Mute"}</button>
        </div>
        {!liveRun ? <button className={styles.primary} disabled={!session.connected || session.runStarted || busy || !scenario} onClick={() => void begin()}>Start scenario run</button> : (
          <>
            <p className={styles.liveStatus}>Step {liveRun.run.stepIndex} · chunk {session.chunkCount}{awaiting ? ` · waiting for chunk ${awaiting.targetChunk}` : ""}</p>
            <div className={styles.actionList}>{liveRun.allowedActions.map((action) => <button key={action.id} disabled={busy || Boolean(awaiting)} onClick={() => void takeAction(action)}>{action.label}</button>)}</div>
            <button className={styles.secondaryButton} disabled={busy || Boolean(awaiting) || !randomAction} onClick={() => randomAction && void takeAction(randomAction)}>Take random legal action</button>
            <button className={styles.secondaryButton} disabled={!video || recording || savingRecording} onClick={startRecording}>{recording ? "Recording…" : savingRecording ? "Saving recording…" : "Start MP4 recording"}</button>
            {recording && <button className={styles.secondaryButton} onClick={stopRecording}>Stop and save MP4</button>}
            {videoPath && <a className={styles.videoLink} href={videoPath} target="_blank">Open saved MP4</a>}
          </>
        )}
        {judgment && <div className={styles.judgment}><strong>Gemini renderer judgment</strong><span>Alignment {judgment.stateAlignment?.toFixed(1) ?? "—"}/10 · action {judgment.actionAlignment?.toFixed(1) ?? "—"}/10 · continuity {judgment.continuity?.toFixed(1) ?? "—"}/10</span><p>{judgment.summary}</p></div>}
        {(error || session.error) && <p className={styles.error}>{error || session.error}</p>}
      </div>
    </div>
  );
}
