/**
 * Episode manifest: the record that turns a generated clip into a usable
 * sample.
 *
 * Field names follow the conventions used by open robot-learning episode
 * metadata (`language_instruction`, `episode_index`, per-step annotations), so
 * the JSON can be mapped onto an existing loader without re-reading this app.
 */

import {
  CHUNK_SECONDS,
  type EpisodeConfig,
  type EpisodePlan,
  resolveObjects,
} from "@/lib/episode";
import type { TimelineEntry, Verdict } from "@/hooks/use-episode-director";
import { getRobot } from "@/lib/robots";
import { getTask } from "@/lib/tasks";
import { getCamera, getEnvironment, sampleRandomization } from "@/lib/scenes";

export type EpisodeManifest = ReturnType<typeof buildManifest>;

export function buildManifest(options: {
  config: EpisodeConfig;
  plan: EpisodePlan;
  timeline: TimelineEntry[];
  verdicts: Record<string, Verdict>;
  chunks: number;
  startFrameName: string | null;
  clipUrl: string | null;
}) {
  const { config, plan, timeline, verdicts, chunks } = options;
  const robot = getRobot(config.robotId);
  const task = getTask(config.taskId);
  const environment = getEnvironment(config.environmentId);
  const camera = getCamera(config.cameraId);
  const { object, target } = resolveObjects(config, task);

  const checked = Object.values(verdicts);
  const met = checked.filter((verdict) => verdict.achieved).length;

  return {
    schema: "orbis-manipulation-episode/v1",
    generated_at: new Date().toISOString(),
    language_instruction: plan.instruction,
    generator: {
      video_model: "reactor/visko-orbis-stable",
      chunk_seconds: CHUNK_SECONDS,
      plan_source: plan.source,
      closed_loop_verification: checked.length > 0,
    },
    embodiment: {
      id: robot.id,
      name: robot.name,
      vendor: robot.vendor,
      class: robot.class,
      dof: robot.dof,
      end_effector: robot.gripper,
      mount: robot.mount,
    },
    task: {
      id: task.id,
      name: task.name,
      category: task.category,
      primary_object: object,
      target,
      operator_defined: Boolean(
        config.objectOverride.trim() ||
          config.targetOverride.trim() ||
          config.instructionOverride.trim(),
      ),
    },
    scene: {
      environment: environment.id,
      surface: environment.surface,
      camera: camera.id,
      camera_framing: camera.framing,
      domain_randomization: config.randomize
        ? sampleRandomization(config.seed)
        : null,
    },
    run: {
      seed: config.seed,
      resolution: config.resolution || "model default",
      requested_seconds: config.durationSeconds,
      generated_chunks: chunks,
      generated_seconds: Number((chunks * CHUNK_SECONDS).toFixed(1)),
      start_frame: options.startFrameName,
      clip_playlist: options.clipUrl,
      operator_notes: config.notes || null,
    },
    quality: {
      phases_checked: checked.length,
      cues_met: met,
      cue_pass_rate: checked.length ? Number((met / checked.length).toFixed(2)) : null,
      recoveries: timeline.filter((entry) => entry.kind === "recovery").length,
      degraded: checked.some((verdict) => verdict.severity === "broken"),
    },
    scene_anchor: plan.sceneAnchor,
    phases: plan.phases.map((phase, index) => ({
      index,
      id: phase.id,
      label: phase.label,
      start_chunk: phase.startChunk,
      end_chunk: phase.endChunk,
      start_seconds: Number((phase.startChunk * CHUNK_SECONDS).toFixed(1)),
      end_seconds: Number(((phase.endChunk + 1) * CHUNK_SECONDS).toFixed(1)),
      action: phase.action,
      success_cue: phase.cue,
      steering_prompt: phase.prompt,
      verdict: verdicts[phase.id] ?? null,
    })),
    timeline: timeline.map((entry) => ({
      kind: entry.kind,
      chunk: entry.chunk,
      t: entry.t,
      phase_id: entry.phaseId,
      label: entry.label,
      detail: entry.detail,
      severity: entry.severity ?? null,
    })),
  };
}

export function downloadJson(name: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  downloadBlob(name, blob);
}

/**
 * Writes a file into the project's episode directory via the dev-only save
 * route. Batch runs use this instead of browser downloads, which Chrome
 * throttles once a page saves several files in a row.
 */
export async function saveToDisk(name: string, blob: Blob) {
  const body = new FormData();
  body.append("file", blob, name);
  body.append("name", name);
  const response = await fetch("/api/save-episode", { method: "POST", body });
  const result = (await response.json()) as { path?: string; error?: string };
  if (!response.ok || !result.path) {
    throw new Error(result.error || "Could not save the episode");
  }
  return result.path;
}

export function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function episodeFilename(config: EpisodeConfig, extension: string) {
  return `episode_${config.robotId}_${config.taskId}_seed${config.seed}.${extension}`;
}
