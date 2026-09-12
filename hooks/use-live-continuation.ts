"use client";

import { useReactor, useReactorMessage } from "@reactor-team/js-sdk";
import { useEffect, useRef, useState } from "react";

import { type OrbisMessage, unwrapOrbisMessage } from "@/lib/orbis";

type StartInput = {
  image: File;
  prompt: string;
};

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
  const previousStatus = useRef(status);
  const imageReadyResolver = useRef<(() => void) | null>(null);
  const conditionsReadyResolver = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (
      status === "disconnected" &&
      previousStatus.current !== "disconnected"
    ) {
      setRunStarted(false);
      setPaused(false);
      setChunk(0);
      onDisconnected();
    }
    previousStatus.current = status;
  }, [onDisconnected, status]);

  useReactorMessage((raw) => {
    const message = unwrapOrbisMessage(raw);

    if (message.type === "state" && message.has_image === true) {
      imageReadyResolver.current?.();
      imageReadyResolver.current = null;
    }
    if (message.type === "conditions_ready") {
      conditionsReadyResolver.current?.();
      conditionsReadyResolver.current = null;
    }
    if (message.type === "generation_started") {
      setRunStarted(true);
      setPaused(false);
    }
    if (message.type === "generation_paused") setPaused(true);
    if (message.type === "generation_resumed") setPaused(false);
    if (message.type === "chunk_complete") {
      setChunk((current) => message.session_chunk ?? current + 1);
    }
    if (
      message.type === "generation_complete" ||
      message.type === "generation_reset"
    ) {
      setRunStarted(false);
      setPaused(false);
    }
    if (message.type === "command_error") {
      setError(`${message.command ?? "Command"}: ${message.reason ?? "rejected"}`);
    }
    if (message.type) {
      setEvents((current) => [message.type!, ...current].slice(0, 12));
    }
  });

  function waitForSignal(
    resolver: { current: (() => void) | null },
    signalName: string,
  ) {
    let timeout: ReturnType<typeof setTimeout>;
    const promise = new Promise<void>((resolve, reject) => {
      timeout = setTimeout(() => {
        resolver.current = null;
        reject(new Error(`Timed out waiting for Orbis ${signalName}.`));
      }, 20_000);
      resolver.current = () => {
        clearTimeout(timeout);
        resolve();
      };
    });
    return {
      promise,
      cancel: () => {
        clearTimeout(timeout);
        resolver.current = null;
      },
    };
  }

  async function runAction(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      throw caught;
    } finally {
      setBusy(false);
    }
  }

  async function startContinuation({ image, prompt }: StartInput) {
    await runAction(async () => {
      if (status !== "ready") await connect();

      const uploaded = await uploadFile(image, { name: image.name });
      const imageReady = waitForSignal(imageReadyResolver, "image state");
      const imageReply = unwrapOrbisMessage(
        await sendCommand("set_image", { image: uploaded }),
      );
      if (imageReply.type === "command_error") {
        imageReady.cancel();
        throw new Error(imageReply.reason ?? "Orbis rejected the handoff frame.");
      }
      await imageReady.promise;

      const conditionsReady = waitForSignal(
        conditionsReadyResolver,
        "continuation conditions",
      );
      const promptReply = unwrapOrbisMessage(
        await sendCommand("set_prompt", { prompt }),
      );
      if (promptReply.type === "command_error") {
        conditionsReady.cancel();
        throw new Error(promptReply.reason ?? "Orbis rejected the prompt.");
      }
      await conditionsReady.promise;

      await sendCommand("start", {});
      setRunStarted(true);
      setPaused(false);
      setChunk(0);
    });
  }

  async function steer(prompt: string) {
    await runAction(async () => {
      if (!runStarted) throw new Error("Start a continuation before steering.");
      await sendCommand("set_prompt", { prompt });
    });
  }

  async function pauseOrResume() {
    await runAction(async () => {
      await sendCommand(paused ? "resume" : "pause", {});
    });
  }

  async function reset() {
    await runAction(async () => {
      await sendCommand("reset", {});
      setRunStarted(false);
      setPaused(false);
      setChunk(0);
    });
  }

  async function disconnectSession() {
    await runAction(async () => {
      setRunStarted(false);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await disconnect();
    });
  }

  return {
    status,
    connected: status === "ready",
    busy,
    runStarted,
    paused,
    muted,
    chunk,
    error,
    events,
    startContinuation,
    steer,
    pauseOrResume,
    reset,
    disconnectSession,
    toggleMuted: () => setMuted((current) => !current),
  };
}

export type LiveContinuationSession = ReturnType<typeof useLiveContinuation>;
