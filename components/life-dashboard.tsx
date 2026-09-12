"use client";

import { ReactorProvider } from "@reactor-team/js-sdk";
import { useCallback, useEffect, useRef, useState } from "react";

import { OrbisPlayer } from "@/components/orbis-player";
import { useOrbisSession } from "@/hooks/use-orbis-session";
import { ORBIS_MODEL_NAME, ORBIS_TRACKS, requestReactorJwt } from "@/lib/orbis";
import type { ActionDefinition, RunRecord, Scalar, ScenarioDefinition, SimState, StepRecord } from "@/lib/sim/types";

import styles from "@/app/life/life.module.css";

type LiveRun = { run: RunRecord; allowedActions: ActionDefinition[] };
type AgentNote = { id: string; kind: "system" | "thought" | "action"; text: string };
type Decision = { thought: string; inferredState: Partial<SimState>; actionId: string; source: "gemini" | "bellman-fallback" };

async function requestJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error || "Request failed.");
  return result;
}

export function LifeDashboard({ scenario }: { scenario: ScenarioDefinition }) {
  const tokenRef = useRef<Promise<string> | null>(null);
  const getJwt = useCallback(() => {
    tokenRef.current ??= requestReactorJwt();
    return tokenRef.current;
  }, []);

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.logo}><span>◆</span><h1>Teaching AI<br />how to live</h1></div>
        <p>LIVE SAN FRANCISCO LIFE SIM</p>
      </header>
      <ReactorProvider apiUrl="https://api.reactor.inc" modelName={ORBIS_MODEL_NAME} modelTracks={[...ORBIS_TRACKS]} connectOptions={{ autoConnect: false }} jwtToken={getJwt}>
        <LivingWorld scenario={scenario} clearJwt={() => { tokenRef.current = null; }} />
      </ReactorProvider>
    </main>
  );
}

function LivingWorld({ scenario, clearJwt }: { scenario: ScenarioDefinition; clearJwt: () => void }) {
  const session = useOrbisSession(clearJwt);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [liveRun, setLiveRun] = useState<LiveRun | null>(null);
  const [phase, setPhase] = useState<"idle" | "starting" | "watching" | "thinking" | "choosing" | "finished">("idle");
  const [decision, setDecision] = useState<Decision | null>(null);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<AgentNote[]>([{ id: "hello", kind: "system", text: "Ready to enter the city." }]);
  const nextDecisionChunk = useRef<number | null>(null);
  const chunkRef = useRef(0);
  const runningDecision = useRef(false);
  const reconnecting = useRef(false);

  useEffect(() => { chunkRef.current = session.chunkCount; }, [session.chunkCount]);
  const addNote = (kind: AgentNote["kind"], text: string) =>
    setNotes((current) => [...current.slice(-6), { id: `${Date.now()}-${Math.random()}`, kind, text }]);

  useEffect(() => {
    if (session.status !== "disconnected" || !liveRun || reconnecting.current || phase === "finished") return;
    reconnecting.current = true;
    setPhase("starting");
    addNote("system", "The video transport blinked. Reconnecting to the live world…");
    void (async () => {
      const restored = await session.reconnectSession();
      reconnecting.current = false;
      if (restored) {
        nextDecisionChunk.current = chunkRef.current + 4;
        setPhase("watching");
        addNote("system", "I’m back in the same live world. Continuing the episode.");
      } else {
        nextDecisionChunk.current = null;
        setLiveRun(null);
        setDecision(null);
        setPhase("idle");
        addNote("system", "The renderer session could not be restored. Start a new life to begin a fresh live world.");
      }
    })();
  }, [liveRun, session.status]);

  const captureFrame = () => {
    if (!video || !video.videoWidth) throw new Error("The live frame is not ready yet.");
    const canvas = document.createElement("canvas");
    const width = Math.min(640, video.videoWidth);
    canvas.width = width;
    canvas.height = Math.max(1, Math.round(width * video.videoHeight / video.videoWidth));
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.78);
  };

  const decide = async (run: LiveRun) => {
    if (runningDecision.current || run.run.status !== "active") return;
    runningDecision.current = true;
    setPhase("thinking");
    addNote("system", "I’m reading the live scene…");
    try {
      const result = await requestJson<{ decision: Decision; allowedActions: ActionDefinition[] }>(`/api/sim/runs/${run.run.id}/observe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frameDataUrl: captureFrame() }),
      });
      setDecision(result.decision);
      setPhase("choosing");
      addNote("thought", result.decision.thought);
      window.setTimeout(() => void applyDecision(run, result.decision, result.allowedActions), 1500);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The agent could not read the scene.");
      setPhase("watching");
      nextDecisionChunk.current = chunkRef.current + 4;
      runningDecision.current = false;
    }
  };

  const applyDecision = async (run: LiveRun, next: Decision, actions: ActionDefinition[]) => {
    try {
      const selected = actions.find((action) => action.id === next.actionId);
      if (!selected) throw new Error("The selected action is no longer legal.");
      addNote("action", `I choose: ${selected.label}.`);
      const result = await requestJson<{ run: RunRecord; step: StepRecord; allowedActions: ActionDefinition[]; cadence: number }>(`/api/sim/runs/${run.run.id}/step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId: selected.id }),
      });
      await session.steerWithPrompt(result.step.renderIntent.prompt);
      setLiveRun({ run: result.run, allowedActions: result.allowedActions });
      setDecision(null);
      if (result.run.status === "completed") {
        setPhase("finished");
        addNote("system", result.run.outcome === "success" ? "I built a foothold in the city!" : "This episode is over. I’ll learn from this run.");
        nextDecisionChunk.current = null;
      } else {
        setPhase("watching");
        nextDecisionChunk.current = chunkRef.current + result.cadence;
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The selected action could not be applied.");
      setPhase("watching");
      nextDecisionChunk.current = chunkRef.current + 4;
    } finally {
      runningDecision.current = false;
    }
  };

  useEffect(() => {
    if (!liveRun || phase !== "watching" || !video || nextDecisionChunk.current === null || session.chunkCount < nextDecisionChunk.current) return;
    void decide(liveRun);
  }, [liveRun, phase, session.chunkCount, video]);

  const begin = async () => {
    if (phase !== "idle") return;
    setPhase("starting");
    setError("");
    try {
      if (!session.connected && !(await session.connectSession())) throw new Error("Could not connect to Orbis.");
      const created = await requestJson<{ run: RunRecord; initialRenderIntent: { prompt: string }; scenario: ScenarioDefinition }>("/api/sim/runs", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenarioId: scenario.id }),
      });
      if (!(await session.startWithPrompt(created.initialRenderIntent.prompt))) throw new Error("Could not start the Orbis world.");
      setLiveRun({ run: created.run, allowedActions: scenario.actions.filter((action) => Object.entries(action.available_when ?? {}).every(([key, value]) => created.run.state[key] === value)) });
      setPhase("watching");
      nextDecisionChunk.current = 4;
      addNote("system", "I just arrived in San Francisco. Let’s see what the city offers.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start the living world.");
      setPhase("idle");
    }
  };

  const state = liveRun?.run.state;
  const actions = liveRun?.allowedActions ?? [];
  return (
    <>
      <section className={styles.worldCard}>
        <div className={styles.stats}>
          <Stat emoji="🪙" label="Coins" value={state?.money ?? 1} color="blue" />
          <Stat emoji="💚" label="Friends" value={state?.connections ?? 0} color="green" />
          <Stat emoji="⚡" label="Energy" value={state?.energy ?? 2} color="yellow" />
          <Stat emoji="🗓️" label="Day" value={state?.day ?? 1} color="pink" />
        </div>
        <div className={styles.worldHeader}>
          <div><span>{state?.time === "night" ? "🌙" : "☀️"} {state?.time ?? "day"}</span><strong>{state?.location ?? "Room"}</strong></div>
          <p>{phase === "finished" ? "Episode complete" : phase === "thinking" ? "Agent is thinking…" : phase === "choosing" ? "Decision locked in!" : "Live world"}</p>
        </div>
        <div className={styles.stage}>
          <OrbisPlayer connected={session.connected} muted={session.muted} runStarted={session.runStarted} status={session.status} onVideoElement={setVideo} />
          {liveRun && phase !== "finished" && <div className={styles.actionOverlay}>
            <span className={styles.overlayTitle}>{phase === "thinking" ? "What should I do?" : phase === "choosing" ? "I’ve decided!" : "Possible actions"}</span>
            <div>{actions.map((action) => <div key={action.id} className={`${styles.actionChip} ${decision?.actionId === action.id ? styles.chosen : ""}`}><span>{actionEmoji(action.id)}</span>{action.label}</div>)}</div>
          </div>}
          {phase === "idle" && <div className={styles.startOverlay}><button onClick={() => void begin()} disabled={session.controlsBusy}>▶ Start a new life</button><span>One click starts the live closed loop</span></div>}
        </div>
      </section>
      <aside className={styles.journal}>
        <div className={styles.brain}>🧠 <div><strong>Agent brain</strong><span>Gemini vision + constrained policy</span></div><i className={phase === "thinking" ? styles.pulse : ""} /></div>
        <div className={styles.inferred}><span>Visible state estimate</span>{decision ? <p>{Object.entries(decision.inferredState).map(([key, value]) => `${key}: ${value}`).join(" · ") || "Reading visual clues…"}</p> : <p>Waiting for the next frame…</p>}</div>
        <div className={styles.notes}>{notes.map((note) => <p key={note.id} className={styles[note.kind]}>{note.text}</p>)}</div>
        <div className={styles.loop}>VIDEO <b>→</b> SEE <b>→</b> DECIDE <b>→</b> LIVE</div>
        {(error || session.error) && <p className={styles.error}>{error || session.error}</p>}
      </aside>
    </>
  );
}

function Stat({ emoji, label, value, color }: { emoji: string; label: string; value: Scalar; color: string }) {
  return <div className={`${styles.stat} ${styles[color]}`}><span>{emoji}</span><div><small>{label}</small><strong>{value}</strong></div></div>;
}

function actionEmoji(id: string) {
  if (id.includes("office") || id.includes("work")) return "💼";
  if (id.includes("park") || id.includes("people")) return "🌳";
  if (id.includes("waymo")) return "🚕";
  return "🏠";
}
