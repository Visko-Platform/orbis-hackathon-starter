"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { OrbisSession } from "@/hooks/use-orbis-session";
import { Badge, Button, Chip, Icon } from "@/components/ui";

const PRESETS = [
  {
    name: "Cinematic",
    prompt:
      "A lone explorer walks through an immense desert at golden hour. Wind lifts the sand, sunlight catches the dunes, and the camera slowly follows behind. Cinematic, photorealistic, one continuous shot.",
  },
  {
    name: "Nature",
    prompt:
      "A quiet forest comes alive in the early morning. Sunlight filters through tall trees, mist drifts over a winding stream, and the camera glides forward. Photorealistic, peaceful, one continuous shot.",
  },
  {
    name: "City lights",
    prompt:
      "A slow journey through a neon-lit city at night. Rain reflects colorful signs on the pavement as people pass under umbrellas. Cinematic, photorealistic, one continuous shot.",
  },
];

export function OrbisControls({ session }: { session: OrbisSession }) {
  const [imageUrl, setImageUrl] = useState("");
  const imageInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!session.image) {
      setImageUrl("");
      return;
    }
    const url = URL.createObjectURL(session.image);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [session.image]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!session.connected) void session.connectSession();
    else if (session.runStarted) void session.steer();
    else void session.startRun();
  };
  const setupLocked = session.runStarted || session.controlsBusy;

  return (
    <form
      className="controls panel"
      onSubmit={submit}
      aria-labelledby="scene-heading"
    >
      <div className="panel-heading">
        <h2 id="scene-heading" className="heading-6">
          <Icon name="sliders" />
          Scene settings
        </h2>
        <Badge>Studio</Badge>
      </div>
      <div className="controls-body">
        <div className="field">
          <div className="field-heading">
            <label htmlFor="scene-prompt" className="body-sm">
              Describe your scene
            </label>
            <Icon name="sparkles" />
          </div>
          <textarea
            id="scene-prompt"
            value={session.prompt}
            placeholder="A place, a moment, a little imagination…"
            onChange={(event) => session.setPrompt(event.target.value)}
            aria-describedby="prompt-help"
          />
          <p id="prompt-help" className="caption muted">
            {session.runStarted
              ? "Edit your prompt to change what happens next."
              : "Describe the subject, setting, and movement."}
          </p>
          <div className="preset-row" aria-label="Prompt inspiration">
            {PRESETS.map((preset) => (
              <Chip
                key={preset.name}
                selected={session.prompt === preset.prompt}
                onClick={() => session.setPrompt(preset.prompt)}
              >
                {preset.name}
              </Chip>
            ))}
          </div>
        </div>

        <fieldset disabled={setupLocked} className="setup-fields">
          <legend className="sr-only">Generation settings</legend>
          <div className="field">
            <div className="field-heading">
              <label htmlFor="start-image" className="body-sm">
                Reference image
              </label>
              <span className="caption muted">Optional</span>
            </div>
            <label
              className={`upload-zone ${imageUrl ? "has-image" : ""}`}
              htmlFor="start-image"
            >
              {imageUrl ? (
                <img src={imageUrl} alt="Selected reference" />
              ) : (
                <span className="upload-icon">
                  <Icon name="upload" />
                </span>
              )}
              <span>
                <strong className="body-sm">
                  {session.image?.name || "Choose an image"}
                </strong>
                <span className="caption muted">
                  {session.image
                    ? "Click to replace"
                    : "A 16:9 image works best"}
                </span>
              </span>
              <input
                ref={imageInput}
                id="start-image"
                type="file"
                accept="image/*"
                onChange={(event) =>
                  session.selectImage(event.target.files?.[0] || null)
                }
              />
            </label>
            {session.image && (
              <Button
                variant="ghost"
                size="sm"
                className="remove-image"
                onClick={() => {
                  session.selectImage(null);
                  if (imageInput.current) imageInput.current.value = "";
                }}
              >
                <Icon name="close" />
                Remove image
              </Button>
            )}
            {session.imageStatus && (
              <p className="caption muted">{session.imageStatus}</p>
            )}
          </div>
          <div className="field">
            <label htmlFor="resolution" className="body-sm">
              Output resolution
            </label>
            <select
              id="resolution"
              value={session.resolution}
              onChange={(event) => session.setResolution(event.target.value)}
            >
              <option value="">Auto · 2k default</option>
              {session.availableResolutions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <p className="caption muted">
              {session.runStarted
                ? "Reset the generation to change these settings."
                : "Applies when you start a new generation."}
            </p>
          </div>
        </fieldset>

        <div className="generation-action">
          <Button
            type="submit"
            className="primary-action"
            loading={session.controlsBusy}
            disabled={session.connected && !session.prompt.trim()}
          >
            {!session.controlsBusy && (
              <Icon
                name={
                  !session.connected
                    ? "link"
                    : session.runStarted
                      ? "sparkles"
                      : "play"
                }
              />
            )}
            {session.controlsBusy
              ? "Working…"
              : !session.connected
                ? "Connect to Orbis"
                : session.runStarted
                  ? "Update live scene"
                  : "Generate video"}
            {!session.controlsBusy && <Icon name="arrow" />}
          </Button>
          <p className="caption muted action-help">
            {!session.connected
              ? "Connect when you’re ready to create."
              : !session.prompt.trim()
                ? "Add a prompt or choose a preset to begin."
                : session.runStarted
                  ? "Your changes apply to the next video segment."
                  : "Your first frames will appear in the live preview."}
          </p>
        </div>
        {session.error && (
          <p className="error body-sm" role="alert">
            {session.error}
          </p>
        )}
        <details className="session-details">
          <summary>
            <span className="body-sm">Session activity</span>
            <span className="caption muted">
              {session.events.length
                ? `${session.events.length} recent events`
                : "No activity yet"}
            </span>
            <Icon name="chevron" />
          </summary>
          <div className="event-list">
            {session.events.length ? (
              session.events.map((event, index) => (
                <div className="event-row caption" key={`${index}-${event}`}>
                  <span className="status-dot" />
                  {event.replaceAll("_", " ")}
                </div>
              ))
            ) : (
              <p className="caption muted">
                Connection and generation updates will appear here.
              </p>
            )}
          </div>
        </details>
        {session.connected && (
          <Button
            variant="ghost"
            size="sm"
            onClick={session.disconnectSession}
            disabled={session.controlsBusy}
          >
            Disconnect session
          </Button>
        )}
      </div>
    </form>
  );
}
