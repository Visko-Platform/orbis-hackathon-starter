"use client";

import { useState } from "react";

import type { EpisodeDirector } from "@/hooks/use-episode-director";
import { CHUNK_SECONDS, formatClock } from "@/lib/episode";

/**
 * Step 3: the phase plan, and the live read-out of it during a run.
 *
 * The bar is chunk-aligned rather than time-aligned, because chunks are what
 * the director actually steers on — a recovered phase visibly grows here.
 */
export function PlanPanel({ director }: { director: EpisodeDirector }) {
  const { plan } = director;
  const [openPhase, setOpenPhase] = useState<string | null>(null);
  const locked = director.running || director.busy;

  const total = plan?.totalChunks || 1;
  const progress = Math.min(1, director.chunk / total);

  return (
    <section className="panel">
      <header className="panel-head">
        <span className="step">3</span>
        <div>
          <h2>Episode plan</h2>
          <p>
            Each phase is a complete self-contained prompt. The director sends
            the next one a chunk before its boundary.
          </p>
        </div>
      </header>

      <div className="button-row">
        <button
          type="button"
          disabled={locked}
          onClick={() => void director.buildEpisodePlan()}
        >
          {plan ? "Rebuild plan" : "Build episode plan"}
        </button>
        <label className="checkbox inline">
          <input
            type="checkbox"
            checked={director.verifyEnabled}
            disabled={director.running}
            onChange={(event) => director.setVerifyEnabled(event.target.checked)}
          />
          <span>Closed-loop cue checking</span>
        </label>
      </div>

      {!plan && (
        <p className="hint">
          The plan turns the task skeleton into chunk-aligned phases. With a
          start frame present it is rewritten against what is actually in that
          frame.
        </p>
      )}

      {plan && (
        <>
          <div className="plan-meta">
            <span className={`tag tag-${plan.source}`}>
              {plan.source === "gemini" ? "grounded in start frame" : "catalog plan"}
            </span>
            <span className="tag">{plan.phases.length} phases</span>
            <span className="tag">
              {plan.totalChunks} chunks · {formatClock(plan.totalChunks * CHUNK_SECONDS)}
            </span>
          </div>

          <p className="instruction">
            <span>language_instruction</span>
            <code>{plan.instruction}</code>
          </p>

          <div className="phase-bar" role="img" aria-label="Episode phase timeline">
            {plan.phases.map((phase, index) => (
              <span
                key={phase.id}
                className={`phase-seg${index === director.phaseIndex ? " active" : ""}${
                  director.verdicts[phase.id]
                    ? ` v-${director.verdicts[phase.id].severity}`
                    : ""
                }`}
                style={{ flexGrow: phase.endChunk - phase.startChunk + 1 }}
                title={`${phase.label} · ${phase.seconds}s`}
              />
            ))}
            {director.running && (
              <span className="playhead" style={{ left: `${progress * 100}%` }} />
            )}
          </div>

          <ol className="phase-list">
            {plan.phases.map((phase, index) => {
              const verdict = director.verdicts[phase.id];
              const state =
                index < director.phaseIndex
                  ? "done"
                  : index === director.phaseIndex
                    ? "active"
                    : "pending";
              return (
                <li key={phase.id} className={`phase-row ${state}`}>
                  <button
                    type="button"
                    className="phase-head"
                    onClick={() =>
                      setOpenPhase((current) =>
                        current === phase.id ? null : phase.id,
                      )
                    }
                  >
                    <span className="phase-time">
                      {formatClock(phase.startChunk * CHUNK_SECONDS)}
                    </span>
                    <span className="phase-label">{phase.label}</span>
                    {verdict && (
                      <span className={`verdict verdict-${verdict.severity}`}>
                        {verdict.achieved ? "cue met" : verdict.severity}
                      </span>
                    )}
                    <span className="phase-dur">{phase.seconds}s</span>
                  </button>
                  {openPhase === phase.id && (
                    <div className="phase-detail">
                      <label className="field">
                        <strong>Action — edit to change what happens here</strong>
                        <textarea
                          rows={3}
                          value={phase.action}
                          disabled={director.running}
                          onChange={(event) =>
                            director.editPhaseAction(index, event.target.value)
                          }
                        />
                      </label>
                      <p>
                        <strong>Success cue</strong> {phase.cue}
                      </p>
                      {verdict && (
                        <p>
                          <strong>Observed</strong> {verdict.observed}
                          {verdict.correction ? ` → ${verdict.correction}` : ""}
                        </p>
                      )}
                      <details>
                        <summary>Steering prompt sent to Orbis</summary>
                        <pre className="prompt-block">{phase.prompt}</pre>
                      </details>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}
