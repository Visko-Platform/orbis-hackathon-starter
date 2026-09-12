"use client";

import { useReactor, useReactorMessage } from "@reactor-team/js-sdk";
import { useEffect, useRef, useState } from "react";

import { TRANSITION_BEAT_MS } from "@/lib/live-direction";
import { type OrbisMessage, unwrapOrbisMessage } from "@/lib/orbis";

type StartInput = { image: File; prompt: string };
type MessageWaiter = {
  receive: (message: OrbisMessage) => void;
  cancel: () => void;
};

function cancelled() {
  return new DOMException("The live session was cancelled.", "AbortError");
}

function validatePrompt(prompt: string) {
  const trimmed = prompt.trim();
  if (!trimmed) throw new Error("Describe what should happen in the scene.");
  if (trimmed.length > 4_000) {
    throw new Error("Keep the complete scene direction under 4,000 characters.");
  }
  return trimmed;
}

export function useLiveContinuation(onDisconnected: () => void) {
  const { status, connect, disconnect, sendCommand, uploadFile } = useReactor(
    (state) => ({
      status: state.status,
      connect: state.connect,
      disconnect: state.disconnect,
      sendCommand: state.sendCommand,
      uploadFile: state.uploadFile,
    }),
  );

  const [busy, setBusy] = useState(false);
  const [runStarted, setRunStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [chunk, setChunk] = useState(0);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [modelSnapshot, setModelSnapshot] = useState("");
  const [activePrompt, setActivePrompt] = useState("");
  const [pendingPrompt, setPendingPrompt] = useState("");
  const [phase, setPhase] = useState("Ready to create");
  const activePromptRef = useRef("");
  const previousStatus = useRef(status);
  const mounted = useRef(true);
  const busyRef = useRef(false);
  const runStartedRef = useRef(false);
  const acceptMessages = useRef(true);
  const operation = useRef(0);
  const waiters = useRef(new Set<MessageWaiter>());
  const disconnectedCallback = useRef(onDisconnected);
  disconnectedCallback.current = onDisconnected;

  function cancelWaiters() {
    for (const waiter of waiters.current) waiter.cancel();
  }

  function clearRun() {
    runStartedRef.current = false;
    activePromptRef.current = "";
    setRunStarted(false);
    setPaused(false);
    setChunk(0);
    setActivePrompt("");
    setPendingPrompt("");
  }

  useEffect(() => {
    mounted.current = true;
    acceptMessages.current = true;
    return () => {
      mounted.current = false;
      acceptMessages.current = false;
      operation.current += 1;
      for (const waiter of waiters.current) waiter.cancel();
    };
  }, []);

  useEffect(() => {
    if (status === "disconnected" && previousStatus.current !== "disconnected") {
      operation.current += 1;
      cancelWaiters();
      acceptMessages.current = false;
      busyRef.current = false;
      setBusy(false);
      clearRun();
      setPhase("Disconnected");
      disconnectedCallback.current();
    }
    previousStatus.current = status;
  }, [status]);

  function receiveMessage(message: OrbisMessage) {
    if (!mounted.current || !acceptMessages.current) return;
    for (const waiter of waiters.current) waiter.receive(message);

    if (message.type === "state" || message.type === "chunk_complete") {
      if (message.type === "state") setModelSnapshot(JSON.stringify({
        started: message.started,
        paused: message.paused,
        chunk: message.session_chunk ?? message.current_chunk,
        resolution: message.resolution,
        imageConditioned: message.has_image,
        activePrompt: message.active_prompt ?? "Not reported by this provider session",
      }, null, 2));
      if (typeof message.active_prompt === "string") {
        activePromptRef.current = message.active_prompt;
        setActivePrompt(message.active_prompt);
        setPendingPrompt((current) =>
          current === message.active_prompt ? "" : current,
        );
      }
      if (typeof message.session_chunk === "number") setChunk(message.session_chunk);
      else if (typeof message.current_chunk === "number") setChunk(message.current_chunk);
      if (typeof message.started === "boolean") {
        runStartedRef.current = message.started;
        setRunStarted(message.started);
      }
      if (typeof message.paused === "boolean") setPaused(message.paused);
    }
    if (message.type === "generation_started") {
      runStartedRef.current = true;
      setRunStarted(true);
      setPaused(false);
      setPhase("Live");
    }
    if (message.type === "generation_paused") {
      setPaused(true);
      setPhase("Paused");
    }
    if (message.type === "generation_resumed") {
      setPaused(false);
      setPhase("Live");
    }
    if (message.type === "chunk_complete" && message.session_chunk === undefined && message.current_chunk === undefined) {
      setChunk((current) => current + 1);
    }
    if (message.type === "generation_complete") {
      runStartedRef.current = false;
      setRunStarted(false);
      setPaused(false);
      setPendingPrompt("");
      setPhase("Take complete");
    }
    if (message.type === "generation_reset") {
      clearRun();
      setPhase("Ready for another take");
    }
    if (message.type === "command_error") {
      setError(`${message.command ?? "Command"}: ${message.reason ?? "rejected"}`);
    }
    if (message.type && message.type !== "state") {
      setEvents((current) => [message.type!, ...current].slice(0, 30));
    }
  }

  useReactorMessage((raw) => receiveMessage(unwrapOrbisMessage(raw)));

  function waitForMessage(
    command: string,
    matches: (message: OrbisMessage) => boolean,
    description: string,
  ) {
    let resolvePromise: () => void;
    let rejectPromise: (error: Error) => void;
    const promise = new Promise<void>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });
    // Cancellation can occur before a pending SDK request resolves.
    void promise.catch(() => {});
    let settled = false;
    const finish = (failure?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      waiters.current.delete(waiter);
      if (failure) rejectPromise(failure);
      else resolvePromise();
    };
    const waiter: MessageWaiter = {
      receive(message) {
        if (
          message.type === "command_error" &&
          (!message.command || message.command === command)
        ) {
          finish(new Error(message.reason || `Orbis rejected ${command}.`));
        } else if (matches(message)) {
          finish();
        }
      },
      cancel: () => finish(cancelled()),
    };
    const timeout = setTimeout(() => {
      finish(new Error(`Orbis did not confirm ${description}. Try again or reconnect.`));
    }, 30_000);
    waiters.current.add(waiter);
    return { promise, cancel: waiter.cancel };
  }

  async function confirmedCommand(
    command: string,
    data: Record<string, unknown>,
    matches: (message: OrbisMessage) => boolean,
    description: string,
  ) {
    // Subscribe first: model events can arrive before the correlated SDK reply.
    const confirmation = waitForMessage(command, matches, description);
    const commandOperation = operation.current;
    try {
      await Promise.all([
        confirmation.promise,
        sendCommand(command, data).then((reply) => {
          if (reply && commandOperation === operation.current) {
            receiveMessage(unwrapOrbisMessage(reply));
          }
          // start legitimately resolves undefined; it still needs a model event.
        }),
      ]);
    } finally {
      confirmation.cancel();
    }
  }

  async function runAction(
    action: (check: () => void) => Promise<void>,
    interrupt = false,
  ) {
    if (busyRef.current && !interrupt) throw new Error("Wait for the current action to finish.");
    if (interrupt) cancelWaiters();
    const actionId = ++operation.current;
    const check = () => {
      if (!mounted.current || actionId !== operation.current) throw cancelled();
    };
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await action(check);
    } catch (caught) {
      if (mounted.current && actionId === operation.current) {
        if (!(caught instanceof DOMException && caught.name === "AbortError")) {
          setError(caught instanceof Error ? caught.message : String(caught));
          setPhase(runStartedRef.current ? (paused ? "Paused" : "Live") : "Needs attention");
        }
      }
      throw caught;
    } finally {
      if (mounted.current && actionId === operation.current) {
        busyRef.current = false;
        setBusy(false);
      }
    }
  }

  async function startContinuation({ image, prompt }: StartInput) {
    await runAction(async (check) => {
      const nextPrompt = validatePrompt(prompt);
      if (!image || !image.size || !image.type.startsWith("image/")) {
        throw new Error("Choose a valid handoff image before starting.");
      }
      if (runStartedRef.current) throw new Error("Reset the current take before starting another.");
      acceptMessages.current = true;
      setPhase(status === "ready" ? "Preparing your scene" : "Connecting to Orbis");
      if (status !== "ready") await connect();
      check();

      setPhase("Uploading the handoff frame");
      const uploaded = await uploadFile(image, { name: image.name });
      check();
      await confirmedCommand(
        "set_image", { image: uploaded },
        (message) => message.type === "image_accepted",
        "the handoff image",
      );
      check();

      setPhase("Preparing your scene");
      const conditions = waitForMessage("set_prompt", (message) => message.type === "conditions_ready", "scene readiness");
      try {
        await Promise.all([
          conditions.promise,
          confirmedCommand("set_prompt", { prompt: nextPrompt }, (message) => message.type === "prompt_accepted", "your scene prompt"),
        ]);
      } finally {
        conditions.cancel();
      }
      check();
      setPendingPrompt(activePromptRef.current === nextPrompt ? "" : nextPrompt);
      setChunk(0);
      setPhase("Starting your live take");
      await confirmedCommand(
        "start", {},
        (message) => message.type === "generation_started" || (message.type === "state" && message.started === true),
        "generation start",
      );
      check();
      setPhase("Live");
    });
  }

  /**
   * Sends a direction. With an action beat, the beat goes first so the change
   * is visible at the next chunk boundary, then the settled prompt follows
   * two chunks later. Any newer action cancels the pending settle.
   */
  async function steer(prompt: string, actionPrompt?: string | null) {
    await runAction(async (check) => {
      const nextPrompt = validatePrompt(prompt);
      if (!runStartedRef.current || status !== "ready") {
        throw new Error("Start a live continuation before sending a direction.");
      }
      if (actionPrompt) {
        const beat = validatePrompt(actionPrompt);
        setPhase("Transitioning");
        await confirmedCommand("set_prompt", { prompt: beat }, (message) => message.type === "prompt_accepted", "your transition");
        check();
        setPendingPrompt(beat);
        await new Promise<void>((resolve) => setTimeout(resolve, TRANSITION_BEAT_MS));
        check();
      }
      setPhase(actionPrompt ? "Settling the new scene" : "Sending your direction");
      await confirmedCommand("set_prompt", { prompt: nextPrompt }, (message) => message.type === "prompt_accepted", "your new direction");
      check();
      setPendingPrompt(activePromptRef.current === nextPrompt ? "" : nextPrompt);
      setPhase(paused ? "Paused" : "Live");
    });
  }

  async function pauseOrResume() {
    await runAction(async (check) => {
      if (!runStartedRef.current) throw new Error("Start a live continuation first.");
      const command = paused ? "resume" : "pause";
      await confirmedCommand(command, {}, (message) => message.type === (paused ? "generation_resumed" : "generation_paused"), command);
      check();
    });
  }

  async function reset() {
    if (status !== "ready") return disconnectSession();
    await runAction(async (check) => {
      setPhase("Resetting the take");
      await confirmedCommand("reset", {}, (message) => message.type === "generation_reset", "the reset");
      check();
    }, true);
  }

  async function disconnectSession() {
    await runAction(async () => {
      acceptMessages.current = false;
      clearRun();
      setPhase("Disconnecting");
      // Let the player unmount before the SDK closes its media tracks.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await disconnect();
      if (mounted.current) setPhase("Disconnected");
    }, true);
  }

  return {
    status, connected: status === "ready", busy, runStarted, paused, muted,
    chunk, error, events, modelSnapshot, activePrompt, pendingPrompt, phase,
    startContinuation, steer, pauseOrResume, reset, disconnectSession,
    clearError: () => setError(""),
    toggleMuted: () => setMuted((current) => !current),
  };
}

export type LiveContinuationSession = ReturnType<typeof useLiveContinuation>;
