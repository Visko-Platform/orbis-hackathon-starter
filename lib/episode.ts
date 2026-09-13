/**
 * Episode model: configuration, the plan, the chunk timeline, and the prompt
 * composition rules that keep an Orbis run on task.
 *
 * The single most important rule here is that a steering prompt is never a
 * delta. Orbis morphs the whole picture at each chunk boundary, so every
 * prompt restates the scene anchor, the embodiment and the camera lock, and
 * only the action sentence changes. Sending "now lift the block" on its own is
 * what makes the robot, the table and the lighting drift mid-episode.
 */

import { getCamera, getEnvironment, type RandomizationChoice } from "@/lib/scenes";
import { fillSlots, getTask, type Task } from "@/lib/tasks";
import { getRobot, type Robot } from "@/lib/robots";

/** Documented Orbis chunk duration: ~1.8 s of generated time (~33 frames @ 18 fps). */
export const CHUNK_SECONDS = 1.8;

/** The first chunk emits no frames while the upscaler primes. */
export const PRIMING_CHUNKS = 1;

export const DURATION_CHOICES = [30, 45, 60, 90] as const;

export type EpisodeConfig = {
  robotId: string;
  taskId: string;
  environmentId: string;
  cameraId: string;
  durationSeconds: number;
  seed: number;
  resolution: string;
  randomize: boolean;
  notes: string;
  /** Free-text overrides. Empty means "use the catalog value". */
  objectOverride: string;
  targetOverride: string;
  instructionOverride: string;
};

export type PlannedPhase = {
  id: string;
  label: string;
  /** Wall-clock seconds this phase owns. */
  seconds: number;
  /** Chunk index this phase takes over at (0-based, relative to start). */
  startChunk: number;
  endChunk: number;
  /** The one-sentence action, kept so a live correction can be recomposed. */
  action: string;
  /** The complete, self-contained prompt sent to Orbis for this phase. */
  prompt: string;
  /** What must be visibly true by the end of this phase. */
  cue: string;
  /** Prompt used when the verifier says the cue was not met. */
  recoveryPrompt: string;
};

export type EpisodePlan = {
  /** Authoritative description of the start frame, reused in every prompt. */
  sceneAnchor: string;
  /** Natural-language task instruction recorded with the episode. */
  instruction: string;
  phases: PlannedPhase[];
  totalChunks: number;
  /** "template" when built locally, "gemini" when grounded in the start frame. */
  source: "template" | "gemini";
};

export type PhaseSeed = {
  id: string;
  label: string;
  weight: number;
  action: string;
  cue: string;
  recovery: string;
};

export function defaultConfig(): EpisodeConfig {
  return {
    robotId: "franka_panda",
    taskId: "pick_place",
    environmentId: "research_lab",
    cameraId: "third_person",
    durationSeconds: 60,
    seed: 42,
    resolution: "",
    randomize: true,
    notes: "",
    objectOverride: "",
    targetOverride: "",
    instructionOverride: "",
  };
}

/** Resolves what the robot actually acts on: operator text wins over catalog. */
export function resolveObjects(config: EpisodeConfig, task: Task) {
  const object = config.objectOverride.trim() || task.object;
  const target = config.targetOverride.trim() || task.target;
  const instruction =
    config.instructionOverride.trim() ||
    fillSlots(task.instruction, { object, target });
  return { object, target, instruction };
}

export function slotsFor(
  config: EpisodeConfig,
  robot: Robot,
  task: Task,
  surface: string,
) {
  const { object, target, instruction } = resolveObjects(config, task);
  return {
    robot: robot.name,
    gripper: robot.gripper,
    object,
    target,
    instruction,
    surface,
  };
}

/**
 * Continuity clauses appended to every prompt. These are what hold a 60-second
 * run together: one take, one camera, one robot, objects that obey gravity.
 */
function continuityClause(cameraLock: string) {
  return [
    cameraLock,
    "One continuous unbroken take with no cuts, no transitions, no fades and no scene changes.",
    "The room, the lighting, the surface and every object keep the exact appearance and position they already have except where the described action moves them.",
    "Exactly one robot is present and no extra arms, hands or duplicate objects appear.",
    "Objects obey gravity: they rest on the surface, move only while they are actually held, and never slide, float or teleport on their own.",
    "Photorealistic robotics laboratory footage captured on a fixed camera.",
  ].join(" ");
}

/** Physical-contact clause — the part that keeps the grasp honest. */
function contactClause(robot: Robot) {
  return `${robot.contact} Contact is explicit and visible at every step: the ${robot.gripper} reaches the object before it closes, closes before the object moves, and opens before the object is left behind.`;
}

/** Prompt for the text-to-image model that produces the start frame. */
export function buildStartFramePrompt(
  config: EpisodeConfig,
  randomization: RandomizationChoice | null,
): string {
  const robot = getRobot(config.robotId);
  const task = getTask(config.taskId);
  const environment = getEnvironment(config.environmentId);
  const camera = getCamera(config.cameraId);
  const slots = slotsFor(config, robot, task, environment.surface);

  const lighting = randomization?.lighting ?? environment.lighting;
  const finish = randomization?.surfaceFinish ?? "a clean matte surface";
  const clutter = randomization?.clutter ?? "an otherwise clear surface";
  const palette = randomization?.palette ?? "neutral colours throughout";

  return [
    `A photorealistic 16:9 photograph of ${robot.appearance}`,
    `The robot is ${robot.mount}, in ${robot.homePose}.`,
    `The scene is ${environment.description}, on ${finish} with ${clutter}.`,
    `On the ${environment.surface} in front of the robot: ${fillSlots(task.props, slots)}. The ${slots.object} is clearly visible, in full view, and has not been touched.`,
    `Framing: ${camera.framing}.`,
    `Lighting: ${lighting}. ${palette}.`,
    `The robot is about to: ${slots.instruction}. Everything that instruction refers to must be present and unobstructed in the frame.`,
    `This is the very first frame of a robot demonstration recording, before any motion has happened: the robot is at rest and every object is in its starting position.`,
    config.notes ? `Additional scene detail: ${config.notes}.` : "",
    `Sharp focus, realistic materials, real camera photograph, no text, no watermarks, no motion blur, no people in frame.`,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Composes one phase's Orbis prompt. `sceneAnchor` comes from the actual start
 * frame when Gemini is available, and from the catalog otherwise.
 */
export function buildPhasePrompt(options: {
  robot: Robot;
  instruction: string;
  cameraLock: string;
  sceneAnchor: string;
  action: string;
  correction?: string;
}): string {
  const { robot, instruction, cameraLock, sceneAnchor, action, correction } =
    options;
  return [
    sceneAnchor.trim().replace(/\s+/g, " "),
    `${robot.motion}`,
    `Happening now: ${action.trim().replace(/\s+/g, " ")}.`,
    correction ? `Correction: ${correction.trim()}.` : "",
    contactClause(robot),
    `The demonstration is one attempt at a single task: ${instruction}.`,
    continuityClause(cameraLock),
  ]
    .filter(Boolean)
    .join(" ");
}

/** Catalog-only scene anchor, used before (or instead of) Gemini grounding. */
export function buildTemplateAnchor(config: EpisodeConfig): string {
  const robot = getRobot(config.robotId);
  const task = getTask(config.taskId);
  const environment = getEnvironment(config.environmentId);
  const camera = getCamera(config.cameraId);
  const slots = slotsFor(config, robot, task, environment.surface);
  return [
    `${robot.appearance} The robot is ${robot.mount} in ${environment.description}.`,
    `On the ${environment.surface}: ${fillSlots(task.props, slots)}, together with the ${task.object}.`,
    `Framing: ${camera.framing}. Lighting: ${environment.lighting}.`,
  ].join(" ");
}

/**
 * Turns phase seeds plus a duration into a chunk-aligned plan.
 *
 * Chunk boundaries, not wall-clock timers, drive steering: Orbis applies a new
 * prompt at the next boundary, so the director counts `chunk_complete` events
 * and compares against `startChunk`.
 */
export function buildPlan(options: {
  config: EpisodeConfig;
  seeds: PhaseSeed[];
  sceneAnchor: string;
  source: "template" | "gemini";
}): EpisodePlan {
  const { config, seeds, sceneAnchor, source } = options;
  const robot = getRobot(config.robotId);
  const task = getTask(config.taskId);
  const environment = getEnvironment(config.environmentId);
  const camera = getCamera(config.cameraId);
  const slots = slotsFor(config, robot, task, environment.surface);

  const usable = seeds.length ? seeds : task.phases;
  const totalWeight = usable.reduce((sum, phase) => sum + (phase.weight || 1), 0);
  const totalChunks = Math.max(
    usable.length,
    Math.round(config.durationSeconds / CHUNK_SECONDS),
  );

  // Distribute chunks by weight, then repair rounding so every phase owns at
  // least one chunk and the last phase lands exactly on totalChunks.
  const rawChunks = usable.map((phase) =>
    Math.max(1, Math.round((totalChunks * (phase.weight || 1)) / totalWeight)),
  );
  let drift = rawChunks.reduce((sum, value) => sum + value, 0) - totalChunks;
  for (let i = rawChunks.length - 1; i >= 0 && drift > 0; i -= 1) {
    const take = Math.min(drift, rawChunks[i] - 1);
    rawChunks[i] -= take;
    drift -= take;
  }
  if (drift < 0) rawChunks[rawChunks.length - 1] -= drift;

  let cursor = 0;
  const phases: PlannedPhase[] = usable.map((phase, index) => {
    const startChunk = cursor;
    cursor += rawChunks[index];
    const action = fillSlots(phase.action, slots);
    return {
      id: phase.id,
      label: phase.label,
      seconds: Number((rawChunks[index] * CHUNK_SECONDS).toFixed(1)),
      startChunk,
      endChunk: cursor - 1,
      action,
      prompt: buildPhasePrompt({
        robot,
        instruction: slots.instruction,
        cameraLock: camera.lock,
        sceneAnchor,
        action,
      }),
      cue: fillSlots(phase.cue, slots),
      recoveryPrompt: buildPhasePrompt({
        robot,
        instruction: slots.instruction,
        cameraLock: camera.lock,
        sceneAnchor,
        action,
        correction: fillSlots(phase.recovery, slots),
      }),
    };
  });

  return {
    sceneAnchor,
    instruction: slots.instruction,
    phases,
    totalChunks: cursor,
    source,
  };
}

/** Plan built entirely from the catalog — the no-Gemini path. */
export function buildTemplatePlan(config: EpisodeConfig): EpisodePlan {
  return buildPlan({
    config,
    seeds: getTask(config.taskId).phases,
    sceneAnchor: buildTemplateAnchor(config),
    source: "template",
  });
}

export function chunkToSeconds(chunk: number): number {
  return Number((chunk * CHUNK_SECONDS).toFixed(1));
}

export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}
