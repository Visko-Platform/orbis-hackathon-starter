"use client";

import { ReactorView, useReactor } from "@reactor-team/js-sdk";
import { useState } from "react";

import type { EpisodeDirector } from "@/hooks/use-episode-director";
import { CHUNK_SECONDS, formatClock } from "@/lib/episode";
import {
  buildManifest,
  downloadBlob,
  downloadJson,
  episodeFilename,
  saveToDisk,
} from "@/lib/manifest";
import { currentReactorJwt } from "@/lib/orbis";

const STAGE_LABEL: Record<string, string> = {
  idle: "idle",
  framing: "generating start frame",
  planning: "planning episode",
  arming: "arming Orbis",
  running: "recording episode",
  complete: "episode complete",
};

/**
 * The live stage: the stream, the transport controls, the director's running
 * log, and the export of the finished episode.
 *
 * `playerRef` wraps ReactorView so the director can pull frames straight off
 * the <video> element for cue checking.
 */
export function LabStage({ director }: { director: EpisodeDirector }) {
  const downloadClipAsFile = useReactor((state) => state.downloadClipAsFile);
  const [clipBusy, setClipBusy] = useState(false);
  const [nudgeText, setNudgeText] = useState("");
  const [clipError, setClipError] = useState("");

  const canRun =
    director.connected && !!director.plan && !director.running && !director.busy;

  const saveClip = async () => {
    if (!director.clip) return;
    setClipBusy(true);
    setClipError("");
    try {
      const name = episodeFilename(director.config, "mp4");
      const blob = await downloadClipAsFile(director.clip, null, {
        jwt: currentReactorJwt() ?? undefined,
        signal: AbortSignal.timeout(90_000),
      });
      downloadBlob(name, blob);
    } catch (caught) {
      setClipError(
        caught instanceof Error ? caught.message : String(caught),
      );
    } finally {
      setClipBusy(false);
    }
  };

  const saveBatch = async () => {
    setClipBusy(true);
    setClipError("");
    try {
      for (const entry of director.batchLog) {
        const stem = `episode_${director.config.robotId}_${director.config.taskId}_take${String(entry.take).padStart(2, "0")}_seed${entry.seed}`;
        downloadJson(`${stem}.json`, entry.manifest);
        if (entry.clip) {
          // Sequential on purpose: each clip is assembled from HLS fragments.
          const blob = await downloadClipAsFile(entry.clip, null, {
            jwt: currentReactorJwt() ?? undefined,
            signal: AbortSignal.timeout(90_000),
          });
          downloadBlob(`${stem}.mp4`, blob);
        }
      }
    } catch (caught) {
      setClipError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setClipBusy(false);
    }
  };

  const [savedPath, setSavedPath] = useState("");

  /** Writes both files into the project's episodes/ directory. */
  const saveToProject = async () => {
    if (!director.plan) return;
    setClipBusy(true);
    setClipError("");
    try {
      const stem = episodeFilename(director.config, "").replace(/\.$/, "");
      const manifest = buildManifest({
        config: director.config,
        plan: director.plan,
        timeline: director.timeline,
        verdicts: director.verdicts,
        chunks: director.chunk,
        startFrameName: director.startFrame?.name ?? null,
        clipUrl: director.clip?.playlistUrl ?? null,
      });
      await saveToDisk(
        `${stem}.json`,
        new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" }),
      );
      if (director.startFrame) {
        await saveToDisk(`${stem}.start.png`, director.startFrame);
      }
      let where = `${stem}.json`;
      const recorded = director.recordedRef.current;
      if (recorded) {
        const ext = recorded.type.includes("mp4") ? "mp4" : "webm";
        where = await saveToDisk(`${stem}.${ext}`, recorded);
      } else if (director.clip) {
        // Fall back to Reactor's recorder when the player capture produced
        // nothing.
        const blob = await downloadClipAsFile(director.clip, null, {
          jwt: currentReactorJwt() ?? undefined,
          signal: AbortSignal.timeout(60_000),
        });
        where = await saveToDisk(`${stem}.mp4`, blob);
      }
      setSavedPath(where);
    } catch (caught) {
      setClipError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setClipBusy(false);
    }
  };

  const saveManifest = () => {
    if (!director.plan) return;
    downloadJson(
      episodeFilename(director.config, "json"),
      buildManifest({
        config: director.config,
        plan: director.plan,
        timeline: director.timeline,
        verdicts: director.verdicts,
        chunks: director.chunk,
        startFrameName: director.startFrame?.name ?? null,
        clipUrl: director.clip?.playlistUrl ?? null,
      }),
    );
  };

  return (
    <section className="stage">
      <div className="stage-head">
        <div className="connection">
          {!director.connected ? (
            <button
              type="button"
              disabled={director.busy}
              onClick={() => void director.connectSession()}
            >
              Connect to Orbis
            </button>
          ) : (
            <button
              type="button"
              className="ghost"
              disabled={director.busy}
              onClick={() => void director.disconnectSession()}
            >
              Disconnect
            </button>
          )}
          <span className={`status status-${director.status}`}>{director.status}</span>
          <span className="stage-label">{STAGE_LABEL[director.stage]}</span>
        </div>
        <div className="clock">
          <strong>{formatClock(director.elapsed)}</strong>
          <span>
            chunk {director.chunk}
            {director.plan ? ` / ${director.plan.totalChunks}` : ""}
          </span>
        </div>
      </div>

      <div className="player" ref={director.playerRef}>
        {director.running || director.stage === "complete" ? (
          <ReactorView
            track="main_video"
            audioTrack="main_audio"
            muted={director.muted}
            videoObjectFit="contain"
          />
        ) : (
          <div className="player-placeholder">
            {director.connected
              ? "Build a plan, then roll the episode"
              : "Connect to Orbis Stable to begin"}
          </div>
        )}
        {director.activePhase && director.running && (
          <div className="now-playing">
            <span className="np-dot" />
            <span className="np-label">{director.activePhase.label}</span>
            <span className="np-action">{director.activePhase.action}</span>
          </div>
        )}
      </div>

      <div className="button-row">
        <button type="button" disabled={!canRun} onClick={() => void director.runEpisode()}>
          Roll episode
        </button>
        <button
          type="button"
          disabled={!director.connected || director.busy || director.running}
          onClick={() => void director.runBatch(director.takeCount)}
        >
          Roll {director.takeCount} takes
        </button>
        <label className="takes">
          <input
            type="number"
            min={1}
            max={20}
            value={director.takeCount}
            disabled={director.busy || director.running}
            onChange={(event) =>
              director.setTakeCount(
                Math.max(1, Math.min(20, Number(event.target.value) || 1)),
              )
            }
          />
        </label>
        <button
          type="button"
          className="ghost"
          disabled={!director.running}
          onClick={() => void director.stopEpisode()}
        >
          Cut
        </button>
        <button
          type="button"
          className="ghost"
          disabled={!director.connected || director.busy || director.running}
          onClick={() => void director.resetEpisode()}
        >
          Reset model
        </button>
        <button type="button" className="ghost" onClick={director.toggleMuted}>
          {director.muted ? "Unmute" : "Mute"}
        </button>
      </div>

      {director.running && (
        <form
          className="nudge"
          onSubmit={(event) => {
            event.preventDefault();
            void director.nudge(nudgeText).then(() => setNudgeText(""));
          }}
        >
          <input
            type="text"
            value={nudgeText}
            placeholder="Nudge the live run — e.g. the gripper missed, close on the cube itself"
            onChange={(event) => setNudgeText(event.target.value)}
          />
          <button type="submit" className="ghost" disabled={!nudgeText.trim()}>
            Send
          </button>
        </form>
      )}

      {director.batchLog.length > 0 || director.takeIndex > 0 ? (
        <div className="batch">
          <strong>
            Batch — take {director.takeIndex} of {director.takeCount}
          </strong>
          <ol>
            {director.batchLog.map((entry) => (
              <li key={entry.take}>
                <span className="log-t">#{entry.take}</span>
                <span className="log-kind">seed {entry.seed}</span>
                <span className="log-label">
                  {entry.chunks} chunks ·{" "}
                  {(entry.chunks * CHUNK_SECONDS).toFixed(0)}s
                </span>
                <span className="log-detail">
                  {entry.cuesChecked
                    ? `${entry.cuesMet}/${entry.cuesChecked} cues met`
                    : "no cue checks"}
                  {entry.recoveries ? ` · ${entry.recoveries} recovered` : ""}
                  {entry.clip ? "" : " · no clip"}
                </span>
              </li>
            ))}
          </ol>
          {director.batchLog.length > 0 && (
            <button
              type="button"
              disabled={clipBusy}
              onClick={() => void saveBatch()}
            >
              {clipBusy
                ? "Exporting…"
                : `Export all ${director.batchLog.length} takes`}
            </button>
          )}
        </div>
      ) : null}

      {director.error && (
        <p className="error" onClick={director.clearError}>
          {director.error}
        </p>
      )}
      {director.notice && <p className="notice">{director.notice}</p>}

      <div className="log">
        <strong>Director log</strong>
        <ol>
          {director.timeline.length === 0 && (
            <li className="log-empty">
              Phase transitions, cue verdicts and corrections appear here as the
              episode runs.
            </li>
          )}
          {[...director.timeline].reverse().map((entry, index) => (
            <li key={`${entry.kind}-${entry.chunk}-${index}`} className={`log-${entry.kind}`}>
              <span className="log-t">{formatClock(entry.t)}</span>
              <span className="log-kind">{entry.kind}</span>
              <span className="log-label">{entry.label}</span>
              <span className="log-detail">{entry.detail}</span>
            </li>
          ))}
        </ol>
      </div>

      {(director.stage === "complete" || director.clip) && (
        <div className="export">
          <strong>Export episode</strong>
          <div className="button-row">
            <button
              type="button"
              disabled={!director.clip || clipBusy}
              onClick={() => void saveClip()}
            >
              {clipBusy ? "Assembling MP4…" : "Download MP4"}
            </button>
            <button type="button" className="ghost" onClick={saveManifest}>
              Download manifest JSON
            </button>
            <button type="button" disabled={clipBusy} onClick={() => void saveToProject()}>
              {clipBusy ? "Saving…" : "Save to episodes/"}
            </button>
          </div>
          <p className="hint">
            The manifest records the instruction, embodiment, scene, seed, every
            phase with its chunk range and steering prompt, and every cue
            verdict — enough to reproduce or filter the episode later.
          </p>
          {savedPath && <p className="hint">Saved {savedPath}</p>}
          {clipError && <p className="error">{clipError}</p>}
        </div>
      )}

      <aside className="events">
        <strong>Orbis events</strong>
        <code>
          {director.events.length ? director.events.join(" · ") : "none yet"}
        </code>
        <span className="chunk-note">
          one chunk ≈ {CHUNK_SECONDS}s · first chunk emits no frames
        </span>
      </aside>
    </section>
  );
}
