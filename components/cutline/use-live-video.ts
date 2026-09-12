"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Reactor, ConnectionStats } from "@reactor-team/js-sdk";
import type { Keys, Story } from "@/lib/cutline/types";
import {
  unwrapOrbisMessage,
  type OrbisMessage,
} from "@/lib/cutline/orbis/starter";
import { referenceFile } from "@/lib/cutline/references";
export type LiveStatus =
  | "rehearsal"
  | "connecting"
  | "priming"
  | "live"
  | "paused"
  | "error";
export type CueTrace = {
  label: string;
  sentAt: number;
  ackMs: number | null;
  chunkMs: number | null;
  status: "sending" | "accepted" | "next-chunk" | "failed";
};
export function keyHeaders(keys: Keys) {
  return {
    "Content-Type": "application/json",
    ...(keys.reactor ? { "x-reactor-key": keys.reactor } : {}),
    ...(keys.nebius ? { "x-nebius-key": keys.nebius } : {}),
    ...(keys.accessCode ? { "x-cutline-access-code": keys.accessCode } : {}),
  };
}
type Waiter = {
  accept: (message: OrbisMessage) => void;
  fail: (error: Error) => void;
};
export function useLiveVideo(keys: Keys) {
  const videoRef = useRef<HTMLVideoElement>(null),
    clientRef = useRef<Reactor | null>(null);
  const busyRef = useRef(false),
    traceRef = useRef<CueTrace | null>(null),
    generationRef = useRef(0),
    awaitingFrame = useRef(true);
  const expiryRef = useRef<ReturnType<typeof setTimeout> | null>(null),
    frameDeadline = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waiters = useRef(new Set<Waiter>()),
    recordingCancel = useRef<(() => void) | null>(null);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<LiveStatus>("rehearsal"),
    [error, setError] = useState<string | null>(null),
    [stats, setStats] = useState<ConnectionStats | null>(null),
    [trace, setTrace] = useState<CueTrace | null>(null);
  const [sending, setSending] = useState(false),
    [muted, setMuted] = useState(true),
    [exporting, setExporting] = useState(false),
    [recordRemaining, setRecordRemaining] = useState(0),
    [hasFrames, setHasFrames] = useState(false);
  const [resolutions, setResolutions] = useState<string[]>([]),
    [resolution, setResolution] = useState(""),
    [imageConfirmed, setImageConfirmed] = useState(false),
    [liveResolutionSwitching, setLiveResolutionSwitching] = useState(false);
  const cancelWaits = useCallback((message: string) => {
    for (const waiter of [...waiters.current]) waiter.fail(new Error(message));
  }, []);
  const command = useCallback(
    async (name: string, data: Record<string, unknown>) => {
      const client = clientRef.current;
      if (!client || client.getStatus() !== "ready")
        throw new Error("Start a live Orbis session first.");
      const previousError = client.getLastError(),
        raw = await client.sendCommand(name, data),
        response = unwrapOrbisMessage(raw);
      if (
        response.type === "command_error" ||
        client.getLastError() !== previousError
      )
        throw new Error(
          response.reason ||
            "Orbis did not accept this command. Check the live connection and retry.",
        );
      return response;
    },
    [],
  );
  // Install the listener before the command; Promise.all observes timeout/error immediately.
  const withSignal = useCallback(
    async (type: string, work: () => Promise<unknown>) => {
      let timer: ReturnType<typeof setTimeout>, waiter: Waiter;
      const signal = new Promise<OrbisMessage>((resolve, reject) => {
        const cleanup = () => {
          clearTimeout(timer);
          waiters.current.delete(waiter);
        };
        waiter = {
          accept: (m) => {
            if (m.type === type) {
              cleanup();
              resolve(m);
            }
          },
          fail: (e) => {
            cleanup();
            reject(e);
          },
        };
        waiters.current.add(waiter);
        timer = setTimeout(
          () =>
            waiter.fail(
              new Error(
                `Orbis did not confirm ${type.replaceAll("_", " ")}. Try starting this take again.`,
              ),
            ),
          20000,
        );
      });
      try {
        const [message] = await Promise.all([signal, work()]);
        return message;
      } finally {
        clearTimeout(timer!);
        waiters.current.delete(waiter!);
      }
    },
    [],
  );
  const disconnect = useCallback(async () => {
    generationRef.current++;
    cancelWaits("The live session ended.");
    recordingCancel.current?.();
    if (expiryRef.current) clearTimeout(expiryRef.current);
    if (frameDeadline.current) clearTimeout(frameDeadline.current);
    expiryRef.current = null;
    frameDeadline.current = null;
    const client = clientRef.current;
    clientRef.current = null;
    try {
      void client?.disconnect().catch(() => {});
    } catch {}
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setConnected(false);
    setStatus("rehearsal");
    setHasFrames(false);
    setImageConfirmed(false);
    setStats(null);
    setTrace(null);
    setResolutions([]);
    setResolution("");
    traceRef.current = null;
    setSending(false);
    busyRef.current = false;
  }, [cancelWaits]);
  const startTake = useCallback(
    async (prompt: string, imagePath?: string) => {
      const generation = generationRef.current,
        client = clientRef.current;
      const current = () => {
        if (
          !client ||
          generation !== generationRef.current ||
          client !== clientRef.current
        )
          throw new DOMException("Connection cancelled.", "AbortError");
      };
      current();
      setStatus("priming");
      setHasFrames(false);
      setImageConfirmed(false);
      awaitingFrame.current = true;
      if (frameDeadline.current) clearTimeout(frameDeadline.current);
      if (imagePath) {
        const file = await referenceFile(imagePath);
        current();
        const reference = await client!.uploadFile(file);
        current();
        const accepted = await command("set_image", { image: reference });
        current();
        if (accepted.type !== "image_accepted")
          throw new Error(
            "Orbis did not confirm the reference image. The take was not started.",
          );
      }
      await withSignal("conditions_ready", () =>
        command("set_prompt", { prompt }),
      );
      current();
      const started = await withSignal("generation_started", () =>
        command("start", {}),
      );
      current();
      if (imagePath && started.image_conditioned === false)
        throw new Error(
          "Orbis started without the reference image. Retry this take.",
        );
      setImageConfirmed(!!imagePath && started.image_conditioned === true);
      frameDeadline.current = setTimeout(() => {
        if (awaitingFrame.current) {
          setError(
            "Orbis accepted the take, but video frames have not arrived. End this session and reconnect.",
          );
          setStatus("error");
        }
      }, 45000);
    },
    [command, withSignal],
  );
  const connect = useCallback(
    async (story: Story, prompt: string, imagePath?: string) => {
      if (busyRef.current)
        throw new Error("A connection is already in progress.");
      if (clientRef.current) {
        if (clientRef.current.getStatus() === "disconnected")
          await disconnect();
        else
          throw new Error("End the current live session before reconnecting.");
      }
      busyRef.current = true;
      const generation = ++generationRef.current;
      setStatus("connecting");
      setError(null);
      setHasFrames(false);
      try {
        const res = await fetch(
          `/api/stories/${story.id}/token?model=${encodeURIComponent(keys.model || "")}`,
          { method: "POST", headers: keyHeaders(keys) },
        );
        const data = (await res.json()) as {
          jwt: string;
          model: string;
          error?: string;
        };
        if (!res.ok)
          throw new Error(data.error || "Could not create a live session.");
        if (generation !== generationRef.current)
          throw new DOMException("Connection cancelled.", "AbortError");
        const { Reactor } = await import("@reactor-team/js-sdk");
        if (generation !== generationRef.current)
          throw new DOMException("Connection cancelled.", "AbortError");
        const client = new Reactor({
          modelName: data.model,
          readyTimeoutMs: 80000,
          clipRequestTimeoutMs: 15000,
          controlRequestTimeoutMs: 12000,
        });
        clientRef.current = client;
        const stream = new MediaStream();
        client.on("trackReceived", (name, track) => {
          if (
            generation !== generationRef.current ||
            !["main_video", "main_audio"].includes(name)
          )
            return;
          for (const old of stream
            .getTracks()
            .filter((t) => t.kind === track.kind))
            stream.removeTrack(old);
          stream.addTrack(track);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            void videoRef.current
              .play()
              .catch(() =>
                setError(
                  "Playback needs a click. Press Start playback below the scene.",
                ),
              );
          }
        });
        client.on("statusChanged", (s) => {
          if (generation !== generationRef.current) return;
          if (s === "waiting") setStatus("connecting");
          if (s === "disconnected") {
            setConnected(false);
            setHasFrames(false);
            cancelWaits("The provider disconnected.");
            recordingCancel.current?.();
            setStatus("error");
            setError(
              "The live session disconnected. End it and reconnect to continue.",
            );
          }
        });
        client.on("error", () => {
          if (generation !== generationRef.current) return;
          setError(
            "The live provider reported a connection or command error. Your story is saved.",
          );
        });
        client.on("statsUpdate", (s) => {
          if (generation === generationRef.current) setStats(s);
        });
        client.on("message", (raw) => {
          if (generation !== generationRef.current) return;
          const m = unwrapOrbisMessage(raw);
          for (const waiter of [...waiters.current]) waiter.accept(m);
          if (m.live_resolution_switching !== undefined)
            setLiveResolutionSwitching(m.live_resolution_switching);
          if (m.available_resolutions?.length)
            setResolutions(m.available_resolutions.map(String));
          if (m.resolution) setResolution(m.resolution);
          if (m.type === "command_error") {
            cancelWaits(m.reason || "Orbis rejected the command.");
            setError(
              m.reason || "Orbis rejected a command. Try a simpler direction.",
            );
            if (traceRef.current) {
              traceRef.current = { ...traceRef.current, status: "failed" };
              setTrace(traceRef.current);
            }
          }
          if (m.type === "generation_paused") setStatus("paused");
          if (m.type === "generation_resumed") setStatus("live");
          if (m.type === "generation_complete") {
            setStatus("paused");
            setError(
              "This take has finished. Start a new chapter or end the session.",
            );
          }
          if (m.type === "chunk_complete") {
            if (
              awaitingFrame.current &&
              m.frames !== 0 &&
              m.frames_emitted !== 0
            ) {
              const v = videoRef.current;
              const show = () => {
                if (generation !== generationRef.current) return;
                if (v && v.readyState >= 2 && v.videoWidth > 0) {
                  awaitingFrame.current = false;
                  if (frameDeadline.current)
                    clearTimeout(frameDeadline.current);
                  setHasFrames(true);
                  setStatus("live");
                }
              };
              if (v?.requestVideoFrameCallback)
                v.requestVideoFrameCallback(show);
              else show();
            }
            if (
              traceRef.current?.status === "accepted" &&
              m.frames !== 0 &&
              m.frames_emitted !== 0
            ) {
              traceRef.current = {
                ...traceRef.current,
                chunkMs: Math.round(
                  performance.now() - traceRef.current.sentAt,
                ),
                status: "next-chunk",
              };
              setTrace(traceRef.current);
            }
          }
        });
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            client.connect(data.jwt),
            new Promise<never>((_, reject) => {
              timer = setTimeout(
                () =>
                  reject(
                    new Error(
                      "Orbis took too long to allocate a session. Try again.",
                    ),
                  ),
                90000,
              );
            }),
          ]);
        } finally {
          if (timer) clearTimeout(timer);
        }
        if (generation !== generationRef.current)
          throw new DOMException("Connection cancelled.", "AbortError");
        setConnected(true);
        await startTake(prompt, imagePath);
        expiryRef.current = setTimeout(
          () => {
            void disconnect();
            setError(
              "The 15-minute live session has ended. Your story is saved. Start another session to continue.",
            );
          },
          14.5 * 60 * 1000,
        );
      } catch (e) {
        if (generation !== generationRef.current)
          throw new DOMException("Connection cancelled.", "AbortError");
        const raw = e instanceof Error ? e.message : "Could not start Orbis.";
        const message = raw.includes("no available capacity")
          ? "This Orbis model has no available capacity. Choose the other Orbis model in Connections or try again shortly."
          : raw;
        await disconnect();
        setStatus("error");
        setError(message);
        throw new Error(message);
      } finally {
        if (generation === generationRef.current) busyRef.current = false;
      }
    },
    [keys, disconnect, cancelWaits, startTake],
  );
  const sendPrompt = useCallback(
    async (prompt: string, label: string) => {
      if (busyRef.current)
        throw new Error("Wait for the current live cue to finish.");
      busyRef.current = true;
      setSending(true);
      setError(null);
      const trace: CueTrace = {
        label,
        sentAt: performance.now(),
        ackMs: null,
        chunkMs: null,
        status: "sending",
      };
      traceRef.current = trace;
      setTrace(trace);
      try {
        const response = await command("set_prompt", { prompt });
        if (response.type !== "prompt_accepted")
          throw new Error("Orbis did not acknowledge the direction.");
        const next = {
          ...trace,
          ackMs: Math.round(performance.now() - trace.sentAt),
          status: "accepted" as const,
        };
        traceRef.current = next;
        setTrace(next);
        return next.ackMs;
      } catch (e) {
        traceRef.current = { ...trace, status: "failed" };
        setTrace(traceRef.current);
        throw e;
      } finally {
        busyRef.current = false;
        setSending(false);
      }
    },
    [command],
  );
  const pause = useCallback(async () => {
    if (exporting)
      throw new Error("Finish or cancel the recording before pausing.");
    await withSignal(
      status === "paused" ? "generation_resumed" : "generation_paused",
      () => command(status === "paused" ? "resume" : "pause", {}),
    );
  }, [status, command, withSignal, exporting]);
  const restart = useCallback(
    async (prompt: string, imagePath?: string) => {
      if (busyRef.current)
        throw new Error("Wait for the current live command to finish.");
      if (exporting)
        throw new Error(
          "Finish or cancel the recording before changing takes.",
        );
      busyRef.current = true;
      setSending(true);
      setError(null);
      try {
        await command("reset", {});
        await startTake(prompt, imagePath);
      } catch (e) {
        setStatus("paused");
        setError((e as Error).message);
        throw e;
      } finally {
        busyRef.current = false;
        setSending(false);
      }
    },
    [command, startTake, exporting],
  );
  const changeResolution = useCallback(
    async (value: string) => {
      if (!resolutions.includes(value))
        throw new Error("This resolution is not offered by the current model.");
      await command("set_resolution", { resolution: value });
      setResolution(value);
    },
    [command, resolutions],
  );
  const download = useCallback(async () => {
    const video = videoRef.current,
      source = video?.srcObject as MediaStream | null;
    if (
      status !== "live" ||
      !hasFrames ||
      video?.paused ||
      !source?.getVideoTracks().some((t) => t.readyState === "live")
    )
      throw new Error("Play live video before recording a take.");
    if (recordingCancel.current)
      throw new Error("A recording is already in progress.");
    if (typeof MediaRecorder === "undefined")
      throw new Error(
        "This browser does not support recording. Use Chrome or Edge.",
      );
    const stream = new MediaStream(source.getTracks()),
      mime = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/mp4",
        "video/webm",
      ].find((t) => MediaRecorder.isTypeSupported(t));
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {}),
      chunks: BlobPart[] = [];
    setExporting(true);
    setRecordRemaining(10);
    try {
      await new Promise<void>((resolve, reject) => {
        let cancelled = false;
        const began = Date.now();
        const timer = setInterval(() => {
          setRecordRemaining(
            Math.max(0, 10 - Math.floor((Date.now() - began) / 1000)),
          );
          if (Date.now() - began >= 10000 && recorder.state !== "inactive")
            recorder.stop();
        }, 250);
        const cleanup = () => {
          clearInterval(timer);
          recordingCancel.current = null;
        };
        recordingCancel.current = () => {
          cancelled = true;
          if (recorder.state !== "inactive") recorder.stop();
        };
        recorder.ondataavailable = (e) => {
          if (e.data.size) chunks.push(e.data);
        };
        recorder.onerror = () => {
          cleanup();
          reject(new Error("The browser could not record this live take."));
        };
        recorder.onstop = () => {
          cleanup();
          if (cancelled) reject(new Error("Recording cancelled."));
          else resolve();
        };
        try {
          recorder.start(1000);
        } catch (e) {
          cleanup();
          reject(e);
        }
      });
      const blob = new Blob(chunks, {
        type: recorder.mimeType || "video/webm",
      });
      if (!blob.size)
        throw new Error(
          "No video frames were recorded. Try again while the scene is playing.",
        );
      const url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download =
        "cutline-live-take." + (blob.type.includes("mp4") ? "mp4" : "webm");
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } finally {
      setExporting(false);
      setRecordRemaining(0);
      recordingCancel.current = null;
    }
  }, [status, hasFrames]);
  const onPlaying = useCallback(() => {
    setError((e) => (e?.startsWith("Playback") ? null : e));
    if (!awaitingFrame.current) {
      setHasFrames(true);
      setStatus((s) => (s === "paused" ? "paused" : "live"));
    }
  }, []);
  useEffect(
    () => () => {
      generationRef.current++;
      if (expiryRef.current) clearTimeout(expiryRef.current);
      if (frameDeadline.current) clearTimeout(frameDeadline.current);
      cancelWaits("Player closed.");
      recordingCancel.current?.();
      void clientRef.current?.disconnect().catch(() => {});
    },
    [cancelWaits],
  );
  const play = useCallback(async () => {
    if (videoRef.current) {
      await videoRef.current.play();
      setError(null);
    }
  }, []);
  return {
    play,
    videoRef,
    status,
    error,
    setError,
    stats,
    trace,
    sending,
    muted,
    setMuted,
    exporting,
    recordRemaining,
    cancelRecording: () => recordingCancel.current?.(),
    hasFrames,
    imageConfirmed,
    liveResolutionSwitching,
    resolutions,
    resolution,
    changeResolution,
    connect,
    disconnect,
    sendPrompt,
    pause,
    restart,
    download,
    onPlaying,
    isConnected: connected,
  };
}
