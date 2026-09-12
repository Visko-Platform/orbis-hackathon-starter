"use client";

import { useCallback, useMemo, useState } from "react";

import type { ActionDefinition, RunRecord, ScenarioDefinition, StepRecord } from "@/lib/sim/types";

import { LiveSimRunner } from "./live-sim-runner";
import styles from "./sim-lab.module.css";

export type ScenarioResponse = {
  scenario: ScenarioDefinition;
  graph: {
    states: Array<{ id: string; state: Record<string, unknown> }>;
    edges: Array<{ from: string; to: string; actionId: string }>;
    truncated: boolean;
  };
};

type RunResponse = {
  run: RunRecord;
  scenario: ScenarioDefinition;
  allowedActions: ActionDefinition[];
  steps: StepRecord[];
};

async function requestJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error || "Request failed.");
  return result;
}

export function SimLab({ initialScenarioData }: { initialScenarioData: ScenarioResponse }) {
  const [scenarioData, setScenarioData] = useState<ScenarioResponse>(initialScenarioData);
  const [runData, setRunData] = useState<RunResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadScenario = useCallback(async () => {
    try {
      setError("");
      setScenarioData(await requestJson<ScenarioResponse>("/api/sim/scenarios/tiny-life"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load scenario.");
    }
  }, []);

  const createRun = async () => {
    setBusy(true);
    try {
      const created = await requestJson<{ run: RunRecord }>("/api/sim/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: "tiny-life" }),
      });
      const details = await requestJson<RunResponse>(`/api/sim/runs/${created.run.id}`);
      setRunData(details);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create run.");
    } finally {
      setBusy(false);
    }
  };

  const step = async (actionId: string) => {
    if (!runData) return;
    setBusy(true);
    try {
      await requestJson(`/api/sim/runs/${runData.run.id}/step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId }),
      });
      setRunData(await requestJson<RunResponse>(`/api/sim/runs/${runData.run.id}`));
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not advance run.");
    } finally {
      setBusy(false);
    }
  };

  const edgesByState = useMemo(() => {
    const result = new Map<string, string[]>();
    for (const edge of scenarioData?.graph.edges ?? []) {
      result.set(edge.from, [...(result.get(edge.from) ?? []), edge.actionId]);
    }
    return result;
  }, [scenarioData]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a href="/" className={styles.back}>← Back to stream</a>
        <p>DEVELOPER TOOL · DETERMINISTIC MDP</p>
        <h1>Tiny Life Simulation Lab</h1>
        <span>YAML state machine as truth. Live video is a renderer; Gemini judges its alignment.</span>
      </header>

      {error && <p className={styles.error}>{error}</p>}

      <section className={styles.summary}>
        <div><small>Scenario</small><strong>{scenarioData.scenario.title}</strong></div>
        <div><small>Action cadence</small><strong>{scenarioData.scenario.runtime.chunks_per_action} Orbis chunks</strong></div>
        <div><small>Graph coverage</small><strong>{scenarioData.graph.states.length} reachable states</strong></div>
      </section>

      <section className={styles.grid}>
        <article className={styles.card}>
          <div className={styles.cardHeader}><h2>Reachable state graph</h2><button onClick={() => void loadScenario()}>Reload YAML</button></div>
          <p className={styles.muted}>Each card is a reachable symbolic state. Listed actions are the permitted outgoing edges.</p>
          <div className={styles.graph}>
            {scenarioData.graph.states.map(({ id, state }, index) => (
              <div className={styles.node} key={id}>
                <span>#{index + 1}</span>
                <code>{Object.entries(state).map(([key, value]) => `${key}: ${value}`).join(" · ")}</code>
                <div>{(edgesByState.get(id) ?? []).map((action) => <i key={action}>{action}</i>)}</div>
              </div>
            ))}
          </div>
          {scenarioData.graph.truncated && <p className={styles.muted}>Graph expansion stopped at the developer safety limit.</p>}
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}><h2>Mock / manual run</h2><button disabled={busy} onClick={() => void createRun()}>New run</button></div>
          {!runData ? <p className={styles.muted}>Create a run to step through the same server-side MDP without any model calls.</p> : (
            <>
              <StateBlock title={`State · step ${runData.run.stepIndex}`} state={runData.run.state} />
              <div className={styles.actionList}>
                {runData.allowedActions.map((action) => <button key={action.id} disabled={busy} onClick={() => void step(action.id)}>{action.label}</button>)}
              </div>
              <h3>Trace</h3>
              <ol className={styles.trace}>
                {runData.steps.map((stepRecord) => <li key={stepRecord.id}><strong>{stepRecord.actionId}</strong><span>{stepRecord.renderIntent.event}</span></li>)}
              </ol>
            </>
          )}
        </article>
      </section>

      <LiveSimRunner scenario={scenarioData.scenario} />
    </main>
  );
}

function StateBlock({ title, state }: { title: string; state: Record<string, unknown> }) {
  return <div className={styles.stateBlock}><h3>{title}</h3>{Object.entries(state).map(([key, value]) => <div key={key}><span>{key}</span><strong>{String(value)}</strong></div>)}</div>;
}
