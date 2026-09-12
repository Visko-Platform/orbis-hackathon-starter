"use client";

import type { OrbisSession } from "@/hooks/use-orbis-session";
import { DREAM_SEQUENCE } from "@/lib/dreams-prompts";

export function OrbisControls({ session }: { session: OrbisSession }) {
  const initial = DREAM_SEQUENCE[0];

  return (
    <div className="controls">
      <div className="button-row">
        {!session.connected ? (
          <button type="button" disabled={session.controlsBusy} onClick={session.connectSession}>
            Connect
          </button>
        ) : (
          <button type="button" disabled={session.controlsBusy} onClick={session.disconnectSession}>
            Disconnect
          </button>
        )}
      </div>

      <section className="sequence-card">
        <div className="sequence-heading">
          <div>
            <span className="card-label">Dream sequence</span>
            <h2>Guide the story</h2>
          </div>
          <span className="sequence-count">{DREAM_SEQUENCE.length} moments</span>
        </div>
        <p className="hint">Start the dream, then click each moment to steer the scene as it runs.</p>
        <div className="sequence-list">
          <button
            type="button"
            className="sequence-button"
            disabled={!session.connected || session.runStarted || session.controlsBusy}
            onClick={() => session.startRun(initial.prompt)}
          >
            <span className="step-number">01</span>
            <span><strong>{initial.label}</strong><small>Start the white dog’s story</small></span>
            <span className="step-action">Start</span>
          </button>
          {DREAM_SEQUENCE.slice(1).map((moment, index) => (
            <button
              key={moment.id}
              type="button"
              className="sequence-button"
              disabled={!session.connected || !session.runStarted || session.controlsBusy}
              onClick={() => session.steer(moment.prompt)}
            >
              <span className="step-number">{String(index + 2).padStart(2, "0")}</span>
              <span><strong>{moment.label}</strong><small>Send this next transition</small></span>
              <span className="step-action">Steer</span>
            </button>
          ))}
        </div>
      </section>

      <div className="button-row secondary">
        <button type="button" disabled={!session.connected || !session.runStarted || session.paused || session.controlsBusy} onClick={session.pause}>Pause</button>
        <button type="button" disabled={!session.connected || !session.runStarted || !session.paused || session.controlsBusy} onClick={session.resume}>Resume</button>
        <button type="button" disabled={!session.connected || !session.runStarted || session.controlsBusy} onClick={session.reset}>Reset</button>
      </div>

      {session.error && <p className="error">{session.error}</p>}
      <aside><strong>Recent model events</strong><code>{session.events.length ? session.events.join(" · ") : "No events yet"}</code></aside>
    </div>
  );
}
