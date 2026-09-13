"use client";

import { useReactor, useReactorMessage } from "@reactor-team/js-sdk";
import type { Clip } from "@reactor-team/js-sdk";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  CHUNK_SECONDS,
  type EpisodeConfig,
  type EpisodePlan,
  type PhaseSeed,
  type PlannedPhase,
  buildPhasePrompt,
  buildPlan,
  buildStartFramePrompt,
  buildTemplateAnchor,
  buildTemplatePlan,
  defaultConfig,
  resolveObjects,
} from "@/lib/episode";
import { getRobot } from "@/lib/robots";
import { getTask } from "@/lib/tasks";
import {
  getCamera,
  getEnvironment,
  sampleRandomization,
} from "@/lib/scenes";
import { buildManifest, saveToDisk } from "@/lib/manifest";
import { currentReactorJwt } from "@/lib/orbis";
import {
  DOCUMENTED_RESOLUTIONS,
  type OrbisMessage,
  unwrapOrbisMessage,
} from "@/lib/orbis";

/**
 * Steering is sent this many chunks before the phase boundary, because Orbis
 * applies a new prompt at the *next* chunk boundary after it arrives.
 */
const LEAD_CHUNKS = 1;

/** How many chunks before a phase ends to grab a frame and check the cue. */
const VERIFY_LEAD_CHUNKS = 1;

/** Extra chunks granted to a phase whose cue was not met. */
const RECOVERY_CHUNKS = 2;

/** At most one recovery per phase, so a bad verdict can't stall the episode. */
const MAX_RECOVERIES_PER_PHASE = 1;

/** Hard stop, so a missed `chunk_complete` can't leave a run going forever. */
const OVERRUN_CHUNKS = 6;

/**
 * Ceiling on assembling one clip. `fetchPlaylist` polls HTTP 202 indefinitely
 * when it is given no deadline, so without this a clip that never finalizes
 * stalls the batch instead of failing the take.
 */
const CLIP_TIMEOUT_MS = 90_000;

export type Verdict = {
  achieved: boolean;
  observed: string;
  correction: string;
  severity: "ok" | "drift" | "broken";
};

export type TimelineEntry = {
  kind: "phase" | "recovery" | "verdict" | "note";
  chunk: number;
  t: number;
  phaseId: string;
  label: string;
  detail: string;
  severity?: Verdict["severity"];
};

/** One finished take in a batch, kept so every episode can be exported after. */
export type BatchEntry = {
  take: number;
  seed: number;
  chunks: number;
  clip: Clip | null;
  manifest: unknown;
  cuesMet: number;
  cuesChecked: number;
  recoveries: number;
};

export type DirectorStage =
  | "idle"
  | "framing"
  | "planning"
  | "arming"
  | "running"
  | "complete";

export function useEpisodeDirector(onDisconnected: () => void) {
  const {
    status,
    connect,
    disconnect,
    sendCommand,
    uploadFile,
    requestClip,
    downloadClipAsFile,
  } = useReactor((state) => ({
    status: state.status,
    connect: state.connect,
    disconnect: state.disconnect,
    sendCommand: state.sendCommand,
    uploadFile: state.uploadFile,
    requestClip: state.requestClip,
    downloadClipAsFile: state.downloadClipAsFile,
  }));

  const [config, setConfig] = useState<EpisodeConfig>(defaultConfig);
  const [startFrame, setStartFrame] = useState<File | null>(null);
  const [startFrameUrl, setStartFrameUrl] = useState("");
  const [plan, setPlan] = useState<EpisodePlan | null>(null);
  const [stage, setStage] = useState<DirectorStage>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [verifyEnabled, setVerifyEnabled] = useState(true);
  const [muted, setMuted] = useState(true);

  const [chunk, setChunk] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(-1);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [events, setEvents] = useState<string[]>([]);
  const [availableResolutions, setAvailableResolutions] =
    useState<string[]>(DOCUMENTED_RESOLUTIONS);
  const [clip, setClip] = useState<Clip | null>(null);
  const [takeCount, setTakeCount] = useState(1);
  const [takeIndex, setTakeIndex] = useState(0);
  const [batchLog, setBatchLog] = useState<BatchEntry[]>([]);

  const playerRef = useRef<HTMLDivElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const recordedRef = useRef<Blob | null>(null);
  const startFrameRef = useRef<File | null>(null);
  const verdictsRef = useRef<Record<string, Verdict>>({});
  const clipRef = useRef<Clip | null>(null);
  const timelineRef = useRef<TimelineEntry[]>([]);
  const episodeDone = useRef<(() => void) | null>(null);
  const batchCancel = useRef(false);

  // Live mirrors of state the message handler needs without re-subscribing.
  const chunkRef = useRef(0);
  const phaseRef = useRef(-1);
  const planRef = useRef<EpisodePlan | null>(null);
  const startsRef = useRef<number[]>([]);
  const endsRef = useRef<number[]>([]);
  const verifiedRef = useRef<Set<number>>(new Set());
  const recoveriesRef = useRef<Record<number, number>>({});
  const runningRef = useRef(false);
  const disconnectingRef = useRef(false);
  const previousStatus = useRef(status);
  const conditionsReady = useRef<(() => void) | null>(null);
  const imageReady = useRef<(() => void) | null>(null);

  const connected = status === "ready";
  const running = stage === "running";
  const elapsed = chunk * CHUNK_SECONDS;

  const context = useMemo(() => describeEpisode(config), [config]);
  const activePhase: PlannedPhase | null =
    plan && phaseIndex >= 0 ? plan.phases[phaseIndex] ?? null : null;

  useEffect(() => {
    if (status === "disconnected" && previousStatus.current !== "disconnected") {
      onDisconnected();
      runningRef.current = false;
      setStage((current) => (current === "running" ? "idle" : current));
    }
    previousStatus.current = status;
  }, [onDisconnected, status]);

  useEffect(() => {
    if (!startFrame) {
      setStartFrameUrl("");
      return;
    }
    const url = URL.createObjectURL(startFrame);
    setStartFrameUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [startFrame]);

  const log = useCallback((entry: Omit<TimelineEntry, "chunk" | "t">) => {
    setTimeline((current) => {
      const next =
      [
        ...current,
        {
          ...entry,
          chunk: chunkRef.current,
          t: Number((chunkRef.current * CHUNK_SECONDS).toFixed(1)),
        },
      ].slice(-120);
      timelineRef.current = next;
      return next;
    });
  }, []);

  /**
   * Records the player itself with MediaRecorder.
   *
   * Reactor's own clip recorder is the documented route, but its playlist
   * endpoint answers 202 indefinitely on this deployment, so the episode never
   * becomes downloadable. Capturing the <video> element gives exactly the
   * frames that were played, under our control, and still leaves `requestClip`
   * running so the manifest can record the playlist URL.
   */
  const startRecording = useCallback(() => {
    // captureStream is standard in Chrome but not in lib.dom's HTMLVideoElement.
    const video = playerRef.current?.querySelector("video") as
      | (HTMLVideoElement & { captureStream?: () => MediaStream })
      | null;
    if (!video || typeof video.captureStream !== "function") return;
    try {
      const stream = video.captureStream();
      if (!stream.getVideoTracks().length) return;
      const mime = [
        "video/mp4;codecs=avc1",
        "video/webm;codecs=vp9",
        "video/webm",
      ].find((candidate) => MediaRecorder.isTypeSupported(candidate));
      const recorder = new MediaRecorder(
        stream,
        mime ? { mimeType: mime, videoBitsPerSecond: 8_000_000 } : undefined,
      );
      recordedChunks.current = [];
      recordedRef.current = null;
      recorder.ondataavailable = (event) => {
        if (event.data.size) recordedChunks.current.push(event.data);
      };
      recorder.start(1_000);
      recorderRef.current = recorder;
    } catch {
      // Recording is a convenience; a failure must not stop the episode.
    }
  }, []);

  const stopRecording = useCallback(
    () =>
      new Promise<Blob | null>((resolve) => {
        const recorder = recorderRef.current;
        recorderRef.current = null;
        if (!recorder || recorder.state === "inactive") {
          resolve(null);
          return;
        }
        recorder.onstop = () => {
          const blob = recordedChunks.current.length
            ? new Blob(recordedChunks.current, {
                type: recorder.mimeType || "video/webm",
              })
            : null;
          recordedRef.current = blob;
          resolve(blob);
        };
        recorder.stop();
      }),
    [],
  );

  /** Snapshots the live <video> element. Returns null before the first frame. */
  const grabFrame = useCallback(async (): Promise<File | null> => {
    const video = playerRef.current?.querySelector("video");
    if (!video || !video.videoWidth || !video.videoHeight) return null;
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 768 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82),
    );
    if (!blob) return null;
    return new File([blob], "frame.jpg", { type: "image/jpeg" });
  }, []);

  /** Recomposes a phase prompt with the verifier's live correction folded in. */
  const recoveryPromptFor = useCallback(
    (phase: PlannedPhase, correction: string) => {
      const current = planRef.current;
      if (!current) return phase.recoveryPrompt;
      return buildPhasePrompt({
        robot: getRobot(config.robotId),
        instruction: current.instruction,
        cameraLock: getCamera(config.cameraId).lock,
        sceneAnchor: current.sceneAnchor,
        action: phase.action,
        correction: correction || undefined,
      });
    },
    [config.cameraId, config.robotId],
  );

  /** Pushes every later phase back so a recovered phase gets room to land. */
  const extendActivePhase = useCallback((index: number, extra: number) => {
    for (let i = index; i < endsRef.current.length; i += 1) {
      endsRef.current[i] += extra;
      if (i > index) startsRef.current[i] += extra;
    }
    setPlan((current) => {
      if (!current) return current;
      const phases = current.phases.map((phase, i) =>
        i < index
          ? phase
          : {
              ...phase,
              startChunk: i > index ? phase.startChunk + extra : phase.startChunk,
              endChunk: phase.endChunk + extra,
              seconds:
                i === index
                  ? Number((phase.seconds + extra * CHUNK_SECONDS).toFixed(1))
                  : phase.seconds,
            },
      );
      const next = { ...current, phases, totalChunks: current.totalChunks + extra };
      planRef.current = next;
      return next;
    });
  }, []);

  const finishEpisode = useCallback(
    async (reason: string) => {
      if (!runningRef.current) return;
      runningRef.current = false;
      setStage("complete");
      log({ kind: "note", phaseId: "end", label: "Episode complete", detail: reason });

      await stopRecording();

      // Order matters: ask for the clip while generation is still live. Pausing
      // first leaves the in-progress chunk unfinalized, and the playlist then
      // answers 202 forever instead of becoming fetchable.
      try {
        const seconds = Math.max(5, chunkRef.current * CHUNK_SECONDS + 4);
        clipRef.current = await requestClip(seconds);
        setClip(clipRef.current);
      } catch (caught) {
        const why = caught instanceof Error ? caught.message : String(caught);
        setNotice(`Episode finished, but the clip could not be requested: ${why}`);
        log({
          kind: "note",
          phaseId: "clip",
          label: "Clip",
          detail: `requestClip failed: ${why}`,
        });
      }

      // One more chunk of generated time so the clip's boundary chunk closes,
      // then stop.
      await new Promise((resolve) => setTimeout(resolve, CHUNK_SECONDS * 1000));
      try {
        await sendCommand("pause", {});
      } catch {
        // Pausing is best effort; the clip is what matters.
      }
      episodeDone.current?.();
      episodeDone.current = null;
    },
    [log, requestClip, sendCommand, stopRecording],
  );

  /** Grabs a frame near the end of a phase and checks its success cue. */
  const verifyPhase = useCallback(
    async (index: number) => {
      const current = planRef.current;
      const phase = current?.phases[index];
      if (!current || !phase) return;

      const frame = await grabFrame();
      if (!frame) return;

      let verdict: Verdict;
      try {
        const body = new FormData();
        body.append("image", frame);
        body.append("cue", phase.cue);
        body.append("context", `${context}\n\nScene anchor:\n${current.sceneAnchor}`);
        const response = await fetch("/api/verify-frame", { method: "POST", body });
        const result = (await response.json()) as Verdict & { error?: string };
        if (!response.ok) throw new Error(result.error || "verification failed");
        verdict = result;
      } catch (caught) {
        log({
          kind: "note",
          phaseId: phase.id,
          label: phase.label,
          detail: `Check skipped: ${caught instanceof Error ? caught.message : String(caught)}`,
        });
        return;
      }

      verdictsRef.current = { ...verdictsRef.current, [phase.id]: verdict };
      setVerdicts(verdictsRef.current);
      log({
        kind: "verdict",
        phaseId: phase.id,
        label: phase.label,
        detail: verdict.observed || (verdict.achieved ? "cue met" : "cue not met"),
        severity: verdict.severity,
      });

      // Only correct the phase that is still on screen.
      if (verdict.achieved || phaseRef.current !== index || !runningRef.current) {
        return;
      }
      const used = recoveriesRef.current[index] ?? 0;
      if (used >= MAX_RECOVERIES_PER_PHASE) return;
      recoveriesRef.current[index] = used + 1;

      extendActivePhase(index, RECOVERY_CHUNKS);
      const prompt = recoveryPromptFor(phase, verdict.correction);
      log({
        kind: "recovery",
        phaseId: phase.id,
        label: phase.label,
        detail:
          verdict.correction ||
          "steering re-sent to land the step before moving on",
        severity: verdict.severity,
      });
      try {
        await sendCommand("set_prompt", { prompt });
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      }
    },
    [context, extendActivePhase, grabFrame, log, recoveryPromptFor, sendCommand],
  );

  /** Rewrites one phase's action and recomposes its prompts in place. */
  const editPhaseAction = useCallback(
    (index: number, action: string) => {
      setPlan((current) => {
        if (!current) return current;
        const phase = current.phases[index];
        if (!phase) return current;
        const compose = (correction?: string) =>
          buildPhasePrompt({
            robot: getRobot(config.robotId),
            instruction: current.instruction,
            cameraLock: getCamera(config.cameraId).lock,
            sceneAnchor: current.sceneAnchor,
            action,
            correction,
          });
        const phases = current.phases.map((entry, i) =>
          i === index
            ? { ...entry, action, prompt: compose(), recoveryPrompt: compose(entry.cue) }
            : entry,
        );
        const next = { ...current, phases };
        planRef.current = next;
        return next;
      });
    },
    [config.cameraId, config.robotId],
  );

  /** Operator override mid-run: fold a free-text correction into the live phase. */
  const nudge = (text: string) =>
    guard(async () => {
      const current = planRef.current;
      const phase = current?.phases[phaseRef.current];
      if (!current || !phase) throw new Error("No phase is playing.");
      if (!text.trim()) throw new Error("Type what the robot should do instead.");
      log({
        kind: "recovery",
        phaseId: phase.id,
        label: phase.label,
        detail: `operator: ${text.trim()}`,
      });
      await sendCommand("set_prompt", {
        prompt: recoveryPromptFor(phase, text.trim()),
      });
    });

  const advanceTo = useCallback(
    async (index: number) => {
      const current = planRef.current;
      const phase = current?.phases[index];
      if (!current || !phase) return;
      phaseRef.current = index;
      setPhaseIndex(index);
      log({
        kind: "phase",
        phaseId: phase.id,
        label: phase.label,
        detail: phase.action,
      });
      try {
        await sendCommand("set_prompt", { prompt: phase.prompt });
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      }
    },
    [log, sendCommand],
  );

  /** Runs once per `chunk_complete`: verify, then steer, then maybe finish. */
  const onChunk = useCallback(() => {
    if (!runningRef.current) return;
    const current = planRef.current;
    if (!current) return;

    const next = chunkRef.current + 1;
    chunkRef.current = next;
    setChunk(next);

    const index = phaseRef.current;
    if (index >= 0) {
      const endsAt = endsRef.current[index];
      if (
        verifyEnabled &&
        !verifiedRef.current.has(index) &&
        next >= endsAt - VERIFY_LEAD_CHUNKS
      ) {
        verifiedRef.current.add(index);
        void verifyPhase(index);
      }
    }

    const upcoming = index + 1;
    if (upcoming < current.phases.length) {
      if (next + LEAD_CHUNKS >= startsRef.current[upcoming]) {
        void advanceTo(upcoming);
      }
      return;
    }

    const lastEnd = endsRef.current[endsRef.current.length - 1] ?? 0;
    if (next > lastEnd) void finishEpisode("all phases played out");
    else if (next > lastEnd + OVERRUN_CHUNKS) void finishEpisode("overrun guard");
  }, [advanceTo, finishEpisode, verifyEnabled, verifyPhase]);

  useReactorMessage((raw: unknown) => {
    const message = unwrapOrbisMessage(raw);

    if (message.type === "conditions_ready") {
      conditionsReady.current?.();
      conditionsReady.current = null;
    }
    if (message.type === "state" && message.has_image === true) {
      imageReady.current?.();
      imageReady.current = null;
    }
    if (message.type === "state" && message.available_resolutions?.length) {
      const reported = message.available_resolutions.map(String);
      setAvailableResolutions(reported);
      setConfig((current) =>
        !current.resolution || reported.includes(current.resolution)
          ? current
          : { ...current, resolution: "" },
      );
    }

    if (message.type === "generation_started" && !disconnectingRef.current) {
      chunkRef.current = 0;
      setChunk(0);
      runningRef.current = true;
      setStage("running");
      const first = planRef.current?.phases[0];
      if (first) {
        phaseRef.current = 0;
        setPhaseIndex(0);
        log({
          kind: "phase",
          phaseId: first.id,
          label: first.label,
          detail: first.action,
        });
      }
    }

    if (message.type === "chunk_complete") {
      // The first chunk emits no frames, so the element has no stream to
      // capture until the second one lands.
      if (!recorderRef.current && runningRef.current) startRecording();
      onChunk();
    }

    if (
      message.type === "generation_complete" ||
      message.type === "generation_reset"
    ) {
      runningRef.current = false;
    }

    if (message.type === "command_error") {
      setError(`${message.command || "command"}: ${message.reason || "rejected"}`);
    }

    if (message.type) {
      setEvents((current) => [message.type!, ...current].slice(0, 10));
    }
  });

  const waitFor = (
    slot: { current: (() => void) | null },
    name: string,
    ms = 20_000,
  ) => {
    let timer: ReturnType<typeof setTimeout>;
    const promise = new Promise<void>((resolve, reject) => {
      timer = setTimeout(() => {
        slot.current = null;
        reject(new Error(`Timed out waiting for Orbis ${name}.`));
      }, ms);
      slot.current = () => {
        clearTimeout(timer);
        resolve();
      };
    });
    return { promise, cancel: () => { clearTimeout(timer); slot.current = null; } };
  };

  /** Reactor surfaces transport failures as raw JSON; make the common ones readable. */
  const explain = (caught: unknown) => {
    const raw = caught instanceof Error ? caught.message : String(caught);
    if (raw.includes("no available capacity") || raw.includes("no available servers")) {
      return "Orbis has no free capacity right now — this is a Reactor-side queue, not your setup. Wait a moment and connect again.";
    }
    if (raw.includes("quota_exceeded") || raw.includes("concurrent_sessions")) {
      return "Reactor allows one concurrent Orbis session. Close any other tab connected to Orbis, then connect again.";
    }
    if (raw.includes("disposed")) {
      return "The Orbis session was torn down by the server. Reload the page to build a new connection, then run the next take.";
    }
    if (raw.includes("401") || raw.includes("Unauthorized")) {
      return "Reactor rejected the token. Check REACTOR_API_KEY in .env.";
    }
    return raw;
  };

  const guard = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await action();
      return true;
    } catch (caught) {
      setError(explain(caught));
      return false;
    } finally {
      setBusy(false);
    }
  };

  /** Step 1: produce the start frame, from text or from an uploaded photo. */
  /** Core step: returns the generated frame so a batch can chain without a render. */
  const generateFrameCore = async (
    source: File | null,
    forConfig: EpisodeConfig,
  ) => {
    setStage("framing");
    const randomization = forConfig.randomize
      ? sampleRandomization(forConfig.seed)
      : null;
    const body = new FormData();
    body.append("prompt", buildStartFramePrompt(forConfig, randomization));
    if (source) body.append("image", source);

    const response = await fetch("/api/scene-image", { method: "POST", body });
    if (!response.ok) {
      const result = (await response.json()) as { error?: string };
      throw new Error(result.error || "Start frame generation failed");
    }
    const blob = await response.blob();
    const frame = new File(
      [blob],
      `start-${forConfig.robotId}-${forConfig.taskId}-seed${forConfig.seed}.png`,
      { type: blob.type || "image/png" },
    );
    startFrameRef.current = frame;
    setStartFrame(frame);
    setPlan(null);
    planRef.current = null;
    setStage("idle");
    return frame;
  };

  const generateStartFrame = (source?: File | null) =>
    guard(async () => {
      setNotice("");
      await generateFrameCore(source ?? null, config);
    });

  const useOwnFrame = (file: File) => {
    startFrameRef.current = file;
    setStartFrame(file);
    setPlan(null);
    planRef.current = null;
    setNotice("");
  };

  /** Step 2 core: returns the plan so a batch can chain without a render. */
  const buildPlanCore = async (frame: File | null, forConfig: EpisodeConfig) => {
    const config = forConfig;
      setStage("planning");
      const template = buildTemplatePlan(config);
      const startFrame = frame;

      if (!startFrame) {
        setPlan(template);
        planRef.current = template;
        setNotice(
          "No start frame yet — planned from the catalog. Orbis will run text-to-video.",
        );
        setStage("idle");
        return template;
      }

      const skeleton: PhaseSeed[] = getTask(config.taskId).phases;
      const body = new FormData();
      body.append("image", startFrame);
      body.append("context", describeEpisode(config));
      body.append("skeleton", JSON.stringify(skeleton));

      let grounded: EpisodePlan = template;
      try {
        const response = await fetch("/api/episode-plan", {
          method: "POST",
          body,
        });
        const result = (await response.json()) as {
          anchor?: string;
          instruction?: string;
          phases?: PhaseSeed[];
          error?: string;
        };
        if (!response.ok || !result.phases?.length || !result.anchor) {
          throw new Error(result.error || "Planner returned nothing usable");
        }
        grounded = buildPlan({
          config,
          seeds: result.phases,
          sceneAnchor: result.anchor,
          source: "gemini",
        });
        if (result.instruction) grounded.instruction = result.instruction;
      } catch (caught) {
        grounded = {
          ...template,
          sceneAnchor: buildTemplateAnchor(config),
        };
        setNotice(
          `Grounded planning unavailable (${
            caught instanceof Error ? caught.message : String(caught)
          }). Using the catalog plan.`,
        );
      }

      setPlan(grounded);
      planRef.current = grounded;
      setStage("idle");
      return grounded;
  };

  const buildEpisodePlan = () =>
    guard(async () => {
      setNotice("");
      await buildPlanCore(startFrameRef.current, config);
    });

  /** Step 3 core: arm Orbis with seed, image, resolution and phase 0, then start. */
  const armAndStart = async (forConfig: EpisodeConfig, frame: File | null) => {
      const config = forConfig;
      const startFrame = frame;
      const current = planRef.current;
      if (!current?.phases.length) throw new Error("Build the episode plan first.");
      setStage("arming");
      setClip(null);
      clipRef.current = null;
      setTimeline([]);
      timelineRef.current = [];
      setVerdicts({});
      verdictsRef.current = {};
      setChunk(0);
      chunkRef.current = 0;
      phaseRef.current = -1;
      setPhaseIndex(-1);
      verifiedRef.current = new Set();
      recoveriesRef.current = {};
      startsRef.current = current.phases.map((phase) => phase.startChunk);
      endsRef.current = current.phases.map((phase) => phase.endChunk);

      // Best effort: neither command is required for a valid run.
      try {
        await sendCommand("set_seed", { seed: config.seed });
      } catch {
        /* older deployments may not expose set_seed */
      }
      try {
        await sendCommand("set_audio_enabled", { audio_enabled: false });
      } catch {
        /* audio stays on; harmless for manipulation footage */
      }

      if (startFrame) {
        const uploaded = await uploadFile(startFrame, { name: startFrame.name });
        const ready = waitFor(imageReady, "state.has_image");
        const reply = unwrapOrbisMessage(
          await sendCommand("set_image", { image: uploaded }),
        );
        if (reply?.type === "command_error") {
          ready.cancel();
          throw new Error(`set_image: ${reply.reason || "rejected"}`);
        }
        if (reply?.type !== "image_accepted") {
          ready.cancel();
          throw new Error(
            `Expected image_accepted from Orbis, received ${reply?.type || "nothing"}.`,
          );
        }
        await ready.promise;
      }

      if (config.resolution) {
        await sendCommand("set_resolution", { resolution: config.resolution });
      }

      const ready = waitFor(conditionsReady, "conditions_ready");
      const promptReply = unwrapOrbisMessage(
        await sendCommand("set_prompt", { prompt: current.phases[0].prompt }),
      );
      if (promptReply?.type === "command_error") {
        ready.cancel();
        throw new Error(`set_prompt: ${promptReply.reason || "rejected"}`);
      }
      await ready.promise;
      await sendCommand("start", {});
  };

  const runEpisode = () =>
    guard(async () => {
      // Connect at roll time, not before. Generating the start frame and
      // planning take ~80 s, and an Orbis session left idle that long gets
      // reclaimed — which showed up as the run failing with "disposed".
      if (status !== "ready") {
        setStage("arming");
        await connect();
      }
      await armAndStart(config, startFrameRef.current);
    });

  /** Resolves when the current episode reaches `finishEpisode`. */
  const waitForEpisodeEnd = (limitMs: number) =>
    new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        episodeDone.current = null;
        resolve();
      }, limitMs);
      episodeDone.current = () => {
        clearTimeout(timer);
        resolve();
      };
    });

  /**
   * Runs `count` takes back to back: new seed, new start frame, new grounded
   * plan, new episode. Each finished take is kept in `batchLog` so all of them
   * can be exported after the batch, not just the last one.
   */
  const runBatch = (count: number) =>
    guard(async () => {
      batchCancel.current = false;
      setBatchLog([]);
      setNotice("");
      const baseSeed = config.seed;

      for (let take = 0; take < count; take += 1) {
        if (batchCancel.current) {
          setNotice(`Batch stopped after ${take} of ${count} takes.`);
          return;
        }
        setTakeIndex(take + 1);
        const takeConfig: EpisodeConfig = { ...config, seed: baseSeed + take };
        setConfig(takeConfig);

        // Frame and plan first, then connect: holding a session open across
        // those ~80 s is what gets it reclaimed mid-batch.
        const frame = await generateFrameCore(null, takeConfig);
        const plan = await buildPlanCore(frame, takeConfig);
        if (status !== "ready") {
          setStage("arming");
          await connect();
        }
        await armAndStart(takeConfig, frame);

        // Generous ceiling: the plan's length plus priming, steering lead and
        // any recovery extensions, so a slow take is not cut short.
        await waitForEpisodeEnd(
          (plan.totalChunks + 12) * CHUNK_SECONDS * 1000 + 30_000,
        );

        const entry = collectTake(take + 1, takeConfig, plan);
        setBatchLog((current) => [...current, entry]);

        // Export now, not at the end: a clip's playlist URL is short-lived, so
        // collecting clips and downloading them after the batch fails with 401.
        await exportTake(entry, takeConfig);

        if (take < count - 1) {
          // Orbis keeps the previous run's conditioning until it is cleared.
          try {
            await sendCommand("reset", {});
          } catch {
            /* a rejected reset is not fatal for the next take */
          }
        }
      }
      setNotice(`Batch complete — ${count} takes recorded.`);
    });

  /** Snapshots everything the export needs before the next take overwrites it. */
  const collectTake = (
    take: number,
    takeConfig: EpisodeConfig,
    takePlan: EpisodePlan,
  ): BatchEntry => {
    const checked: Verdict[] = Object.values(verdictsRef.current);
    return {
      take,
      seed: takeConfig.seed,
      chunks: chunkRef.current,
      clip: clipRef.current,
      manifest: buildManifest({
        config: takeConfig,
        plan: takePlan,
        timeline: timelineRef.current,
        verdicts: verdictsRef.current,
        chunks: chunkRef.current,
        startFrameName: startFrameRef.current?.name ?? null,
        clipUrl: clipRef.current?.playlistUrl ?? null,
      }),
      cuesChecked: checked.length,
      cuesMet: checked.filter((verdict) => verdict.achieved).length,
      recoveries: Object.values(recoveriesRef.current).reduce(
        (sum, value) => sum + value,
        0,
      ),
    };
  };

  /** Writes one take's manifest and MP4 to the browser's download folder. */
  const exportTake = async (entry: BatchEntry, takeConfig: EpisodeConfig) => {
    const stem = `episode_${takeConfig.robotId}_${takeConfig.taskId}_take${String(
      entry.take,
    ).padStart(2, "0")}_seed${entry.seed}`;
    try {
      await saveToDisk(
        `${stem}.json`,
        new Blob([JSON.stringify(entry.manifest, null, 2)], {
          type: "application/json",
        }),
      );
      if (startFrameRef.current) {
        await saveToDisk(`${stem}.start.png`, startFrameRef.current);
      }
      const recorded = recordedRef.current;
      if (recorded) {
        const ext = recorded.type.includes("mp4") ? "mp4" : "webm";
        const saved = await saveToDisk(`${stem}.${ext}`, recorded);
        log({
          kind: "note",
          phaseId: "export",
          label: `Take ${entry.take}`,
          detail: `saved ${saved}`,
        });
      } else if (entry.clip) {
        // The signal matters: fetchPlaylist polls HTTP 202 forever when it is
        // given no deadline, which wedges the whole batch.
        const blob = await downloadClipAsFile(entry.clip, null, {
          jwt: currentReactorJwt() ?? undefined,
          signal: AbortSignal.timeout(CLIP_TIMEOUT_MS),
        });
        const saved = await saveToDisk(`${stem}.mp4`, blob);
        log({
          kind: "note",
          phaseId: "export",
          label: `Take ${entry.take}`,
          detail: `saved ${saved}`,
        });
      }
    } catch (caught) {
      log({
        kind: "note",
        phaseId: "export",
        label: `Take ${entry.take}`,
        detail: `Export failed: ${caught instanceof Error ? caught.message : String(caught)}`,
      });
    }
  };

  const stopBatch = () => {
    batchCancel.current = true;
    episodeDone.current?.();
    episodeDone.current = null;
  };

  const stopEpisode = () =>
    guard(async () => {
      await finishEpisode("stopped by operator");
    });

  const resetEpisode = () =>
    guard(async () => {
      runningRef.current = false;
      await sendCommand("reset", {});
      setStage("idle");
      setChunk(0);
      chunkRef.current = 0;
      phaseRef.current = -1;
      setPhaseIndex(-1);
      setClip(null);
    });

  const disconnectSession = async () => {
    disconnectingRef.current = true;
    runningRef.current = false;
    setStage("idle");
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    try {
      await guard(() => disconnect());
    } finally {
      disconnectingRef.current = false;
    }
  };

  const updateConfig = (patch: Partial<EpisodeConfig>) =>
    setConfig((current) => ({ ...current, ...patch }));

  return {
    status,
    connected,
    running,
    stage,
    busy,
    error,
    notice,
    events,
    muted,
    config,
    context,
    plan,
    startFrame,
    startFrameUrl,
    chunk,
    elapsed,
    phaseIndex,
    activePhase,
    timeline,
    verdicts,
    verifyEnabled,
    availableResolutions,
    clip,
    playerRef,
    recordedRef,
    setVerifyEnabled,
    takeCount,
    takeIndex,
    batchLog,
    setTakeCount,
    runBatch,
    stopBatch,
    updateConfig,
    editPhaseAction,
    nudge,
    toggleMuted: () => setMuted((current) => !current),
    connectSession: () => guard(() => connect()),
    disconnectSession,
    generateStartFrame,
    useOwnFrame,
    buildEpisodePlan,
    runEpisode,
    stopEpisode,
    resetEpisode,
    clearError: () => setError(""),
  };
}

export type EpisodeDirector = ReturnType<typeof useEpisodeDirector>;

/** Compact human-readable episode context, reused by both Gemini routes. */
export function describeEpisode(config: EpisodeConfig): string {
  const robot = getRobot(config.robotId);
  const task = getTask(config.taskId);
  const environment = getEnvironment(config.environmentId);
  const camera = getCamera(config.cameraId);
  const { object, target, instruction } = resolveObjects(config, task);
  return [
    `Robot: ${robot.name} (${robot.vendor}), ${robot.dof}, ${robot.gripper}, ${robot.mount}.`,
    `Embodiment motion: ${robot.motion}`,
    `Contact behaviour: ${robot.contact}`,
    `Task: ${task.name} — ${task.summary}`,
    `Instruction: ${instruction}`,
    `Primary object: ${object}. Target: ${target}.`,
    `Environment: ${environment.name} — ${environment.description}.`,
    `Camera: ${camera.name} — ${camera.framing}.`,
    `Episode length: ${config.durationSeconds} s at ~${CHUNK_SECONDS} s per steering chunk.`,
    config.notes ? `Operator notes: ${config.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
