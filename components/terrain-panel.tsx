"use client";

import { useRef, useState } from "react";

import type { OrbisSession } from "@/hooks/use-orbis-session";
import { directorEdit, directorStart } from "@/lib/director";
import { TerrainMap } from "@/components/terrain-map";
import {
  buildTerrain,
  parseSurveyCSV,
  renderTerrain,
  terrainPrompt,
  terrainStats,
  terrainSummary,
  type RenderMode,
  type TerrainData,
  type TerrainSummary,
} from "@/lib/terrain";

// Instant preset edits (no LLM call) for the live demo.
const SCENE_PRESETS: Array<{ label: string; prompt: string }> = [
  {
    label: "Add building",
    prompt:
      "add a modern multi-storey building sitting on the terrain, realistic architecture, same site and lighting",
  },
  { label: "Add road", prompt: "add a paved road following the natural contour of the terrain" },
  { label: "Add trees", prompt: "add scattered trees and green vegetation across the terrain" },
  { label: "Winter", prompt: "the same terrain covered in fresh snow, winter, overcast" },
  { label: "Golden hour", prompt: "the same scene at golden hour, warm low sunlight, long shadows" },
  { label: "Dusk", prompt: "the same scene at dusk, blue hour, soft ambient light" },
];

export function TerrainPanel({ session }: { session: OrbisSession }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [terrain, setTerrain] = useState<TerrainData | null>(null);
  const [summary, setSummary] = useState<TerrainSummary | null>(null);
  const [mode, setMode] = useState<RenderMode>("oblique");
  const [prompt, setPrompt] = useState("");
  const [fileName, setFileName] = useState("");
  const [statsLine, setStatsLine] = useState("");
  const [error, setError] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState("");
  const [sceneInput, setSceneInput] = useState("");

  const draw = (data: TerrainData, m: RenderMode) => {
    const canvas = canvasRef.current;
    if (canvas) renderTerrain(canvas, data, m);
  };

  const writeWithAI = async (s: TerrainSummary) => {
    setAiBusy(true);
    setAiNote("Writing prompt with AI (Gemini)…");
    setError("");
    try {
      const aiPrompt = await directorStart(s);
      setPrompt(aiPrompt);
      setAiNote("Prompt written by AI. Edit it if you like.");
    } catch (e) {
      // Keep the local fallback prompt already in the box.
      setAiNote("AI unavailable — using the built-in prompt. Check GEMINI_API_KEY.");
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAiBusy(false);
    }
  };

  const onFile = async (file: File | null) => {
    if (!file) return;
    setError("");
    setAiNote("");
    setFileName(file.name);
    try {
      const text = await file.text();
      const points = parseSurveyCSV(text);
      const data = buildTerrain(points);
      const stats = terrainStats(data);
      const s = terrainSummary(data);
      setTerrain(data);
      setSummary(s);
      setPrompt(terrainPrompt(data)); // instant local fallback
      setStatsLine(
        `${points.length} points · ${Math.round(stats.width)}×${Math.round(
          stats.height,
        )} m · relief ${stats.relief.toFixed(1)} m · ${stats.steep}`,
      );
      draw(data, mode);
      void writeWithAI(s); // replace with the richer AI prompt
    } catch (e) {
      setTerrain(null);
      setSummary(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const switchMode = (m: RenderMode) => {
    setMode(m);
    if (terrain) draw(terrain, m);
  };

  const loadIntoOrbis = async () => {
    if (!terrain) return;
    setError("");
    try {
      // Text-to-video: the (AI-written) prompt drives Orbis, no mesh image.
      await session.startTextToVideo(prompt.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const applySceneEdit = async () => {
    const instruction = sceneInput.trim();
    if (!instruction) return;
    setAiBusy(true);
    setError("");
    try {
      const steerPrompt = await directorEdit(instruction, prompt);
      await session.steerWith(steerPrompt);
      setSceneInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAiBusy(false);
    }
  };

  const canLoad =
    !!terrain && session.connected && !session.runStarted && !session.controlsBusy && !aiBusy;
  const canSteer = session.runStarted && !session.controlsBusy;

  return (
    <section className="terrain-panel">
      <h2>Terrain from survey</h2>
      <p className="hint">
        Upload a CSV of survey points (X, Y, Z). It is triangulated locally and its
        shape is summarized for an AI director (Gemini) that writes the Orbis prompt.
        No Reactor credits are used until you generate.
      </p>

      <div className="button-row">
        <label className="file-button">
          {fileName ? "Change CSV" : "Choose CSV"}
          <input
            type="file"
            accept=".csv,.txt"
            hidden
            onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <button
          type="button"
          className={mode === "oblique" ? "active" : ""}
          onClick={() => switchMode("oblique")}
          disabled={!terrain}
        >
          Oblique 3D
        </button>
        <button
          type="button"
          className={mode === "top" ? "active" : ""}
          onClick={() => switchMode("top")}
          disabled={!terrain}
        >
          Top-down
        </button>
      </div>

      {statsLine && <p className="stats-line">{statsLine}</p>}
      {aiNote && <p className="hint">{aiNote}</p>}
      {error && <p className="error">{error}</p>}

      <canvas ref={canvasRef} width={1280} height={720} className="terrain-canvas" />

      {terrain && (
        <>
          <label className="field-label" htmlFor="terrain-prompt">
            Start prompt (AI-written, editable)
          </label>
          <textarea
            id="terrain-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
          />
          <div className="button-row">
            <button type="button" onClick={() => void loadIntoOrbis()} disabled={!canLoad}>
              Generate terrain in Orbis
            </button>
            <button
              type="button"
              onClick={() => summary && void writeWithAI(summary)}
              disabled={!summary || aiBusy}
            >
              Rewrite with AI
            </button>
          </div>
          {!session.connected && (
            <p className="hint">Connect to Orbis first (button above the player).</p>
          )}
        </>
      )}

      {terrain && (
        <div className="scene-presets">
          <span className="field-label">Steer the live scene</span>

          <div className="button-row">
            <input
              type="text"
              className="scene-input"
              placeholder='Describe a change, e.g. "add a glass office block near the hilltop"'
              value={sceneInput}
              onChange={(e) => setSceneInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void applySceneEdit();
              }}
              disabled={!canSteer || aiBusy}
            />
            <button
              type="button"
              onClick={() => void applySceneEdit()}
              disabled={!canSteer || aiBusy || !sceneInput.trim()}
            >
              Apply with AI
            </button>
          </div>

          <div className="preset-grid">
            {SCENE_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => void session.steerWith(p.prompt)}
                disabled={!canSteer}
                title={p.prompt}
              >
                {p.label}
              </button>
            ))}
          </div>
          {!canSteer && <p className="hint">Start a run to enable live steering.</p>}
        </div>
      )}

      {terrain && <TerrainMap session={session} terrain={terrain} />}
    </section>
  );
}
