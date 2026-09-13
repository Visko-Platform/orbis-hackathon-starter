"use client";

import { useRef, useState } from "react";

import type { EpisodeDirector } from "@/hooks/use-episode-director";
import { buildStartFramePrompt } from "@/lib/episode";
import { sampleRandomization } from "@/lib/scenes";

/**
 * Step 2: the start frame.
 *
 * Orbis conditions the whole episode on this image, so the whole run's object
 * layout is decided here. Two ways in: generate one from the config, or bring a
 * photo of a real bench and let the image model place the robot and props into
 * it.
 */
export function StartFramePanel({ director }: { director: EpisodeDirector }) {
  const { config } = director;
  const [showPrompt, setShowPrompt] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState<File | null>(null);
  const locked = director.running || director.busy;

  const framePrompt = buildStartFramePrompt(
    config,
    config.randomize ? sampleRandomization(config.seed) : null,
  );

  return (
    <section className="panel">
      <header className="panel-head">
        <span className="step">2</span>
        <div>
          <h2>Start frame</h2>
          <p>
            Orbis conditions the episode on this image. Everything the robot
            will touch has to be visible here.
          </p>
        </div>
      </header>

      <div className="frame-stage">
        {director.startFrameUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={director.startFrameUrl} alt="Episode start frame" />
        ) : (
          <span className="frame-placeholder">
            {director.stage === "framing"
              ? "Generating the start frame…"
              : "No start frame yet"}
          </span>
        )}
      </div>

      <div className="button-row">
        <button
          type="button"
          disabled={locked}
          onClick={() => void director.generateStartFrame(null)}
        >
          {director.startFrame ? "Regenerate frame" : "Generate start frame"}
        </button>
        <button
          type="button"
          className="ghost"
          disabled={locked}
          onClick={() => {
            director.updateConfig({ seed: Math.floor(Math.random() * 100_000) });
          }}
        >
          New seed
        </button>
        <button
          type="button"
          className="ghost"
          disabled={locked || !pending}
          onClick={() => pending && void director.generateStartFrame(pending)}
        >
          Stage my photo
        </button>
        <button
          type="button"
          className="ghost"
          disabled={locked || !pending}
          onClick={() => pending && director.useOwnFrame(pending)}
        >
          Use as-is
        </button>
      </div>

      <label className="field">
        Or bring your own frame (16:9 works best)
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          disabled={locked}
          onChange={(event) => setPending(event.target.files?.[0] || null)}
        />
      </label>
      <p className="hint">
        <strong>Stage my photo</strong> sends your image to the image model with
        the composed scene prompt, so the chosen robot and task objects are
        placed into your real workspace. <strong>Use as-is</strong> skips that
        and conditions Orbis on your photo directly.
      </p>

      <button
        type="button"
        className="disclosure"
        onClick={() => setShowPrompt((value) => !value)}
      >
        {showPrompt ? "Hide" : "Show"} composed scene prompt
      </button>
      {showPrompt && <pre className="prompt-block">{framePrompt}</pre>}
    </section>
  );
}
