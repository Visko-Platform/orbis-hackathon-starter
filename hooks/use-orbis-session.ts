"use client";

import { useReactor, useReactorMessage } from "@reactor-team/js-sdk";
import { useEffect, useRef, useState } from "react";

import { type OrbisMessage, unwrapOrbisMessage } from "@/lib/orbis";

export function useOrbisSession(onDisconnected: () => void) {
  const { status, connect, disconnect, sendCommand, uploadFile } = useReactor(
    (state) => ({
      status: state.status,
      connect: state.connect,
      disconnect: state.disconnect,
      sendCommand: state.sendCommand,
      uploadFile: state.uploadFile,
    }),
  );

  const [muted, setMuted] = useState(true);
  const [busy, setBusy] = useState(false);
  const [runStarted, setRunStarted] = useState(false);
  const [error, setError] = useState("");

  const previousStatus = useRef(status);
  const disconnecting = useRef(false);
  const conditionsReadyResolver = useRef<(() => void) | null>(null);
  const imageReadyResolver = useRef<(() => void) | null>(null);

  const connected = status === "ready";
  const controlsBusy = busy;

  useEffect(() => {
    if (
      status === "disconnected" &&
      previousStatus.current !== "disconnected"
    ) {
      onDisconnected();
      setRunStarted(false);
      if (!disconnecting.current && previousStatus.current === "ready") {
        setError("Orbis closed the video connection. Start a new battle when it is available.");
      }
    }
    previousStatus.current = status;
  }, [onDisconnected, status]);

  const runAction = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  };

  const updateRunState = (message: OrbisMessage) => {
    if (message.type === "state") {
      if (typeof message.started === "boolean") setRunStarted(message.started);
    } else if (message.type === "generation_started") {
      setRunStarted(true);
      if (message.image_conditioned === false) {
        setError("Orbis started without the generated battle image.");
      }
    } else if (
      message.type === "generation_complete" ||
      message.type === "generation_reset"
    ) {
      setRunStarted(false);
    }
  };

  useReactorMessage((raw: unknown) => {
    const message = unwrapOrbisMessage(raw);

    if (message.type === "conditions_ready") {
      conditionsReadyResolver.current?.();
      conditionsReadyResolver.current = null;
    }

    if (message.type === "state" && message.has_image === true) {
      imageReadyResolver.current?.();
      imageReadyResolver.current = null;
    }

    if (!disconnecting.current) updateRunState(message);

    if (message.type === "command_error") {
      setError(
        `${message.command || "command"}: ${message.reason || "rejected"}`,
      );
      if (message.command === "start") setRunStarted(false);
    }
  });

  const waitForSignal = (
    resolver: { current: (() => void) | null },
    signalName: string,
  ) => {
    let timeout: ReturnType<typeof setTimeout>;
    const promise = new Promise<void>((resolve, reject) => {
      timeout = setTimeout(() => {
        resolver.current = null;
        reject(new Error(`Timed out waiting for Orbis ${signalName}.`));
      }, 15_000);
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
  };

  const startGeneration = async (
    startImage: File,
    runPrompt: string,
  ) => {
    if (!runPrompt.trim()) throw new Error("Enter a prompt before starting.");
    const uploaded = await uploadFile(startImage, { name: startImage.name });
    const imageReady = waitForSignal(imageReadyResolver, "state.has_image");
    const rawReply = await sendCommand("set_image", { image: uploaded });
    if (!rawReply) {
      imageReady.cancel();
      throw new Error("Orbis did not accept the generated battle image.");
    }

    const reply = unwrapOrbisMessage(rawReply);
    if (reply.type === "command_error") {
      imageReady.cancel();
      throw new Error(`set_image: ${reply.reason || "rejected"}`);
    }
    if (reply.type !== "image_accepted") {
      imageReady.cancel();
      throw new Error(
        `Expected image_accepted from Orbis, received ${reply.type || "an unknown reply"}.`,
      );
    }

    await imageReady.promise;

    const conditionsReady = waitForSignal(
      conditionsReadyResolver,
      "conditions_ready",
    );
    const promptReply = await sendCommand("set_prompt", {
      prompt: runPrompt.trim(),
    });
    if (!promptReply) {
      conditionsReady.cancel();
      throw new Error("Orbis did not accept the prompt.");
    }

    const promptMessage = unwrapOrbisMessage(promptReply);
    if (promptMessage.type === "command_error") {
      conditionsReady.cancel();
      throw new Error(`set_prompt: ${promptMessage.reason || "rejected"}`);
    }

    await conditionsReady.promise;
    await sendCommand("start", {});
    setRunStarted(true);
  };

  const steerPrompt = async (nextPrompt: string) => {
    if (!nextPrompt.trim()) throw new Error("Enter a prompt before steering.");
    const rawReply = await sendCommand("set_prompt", { prompt: nextPrompt.trim() });
    if (!rawReply) throw new Error("Orbis did not accept the battle prompt.");
    const reply = unwrapOrbisMessage(rawReply);
    if (reply.type === "command_error") {
      throw new Error(`set_prompt: ${reply.reason || "rejected"}`);
    }
  };

  const connectWithRetry = async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      onDisconnected();
      try {
        await connect();
        return;
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : String(caught);
        const noCapacity = /429|no available capacity|no available servers/i.test(message);
        if (!noCapacity) throw caught;
        if (attempt === 2) {
          throw new Error("Orbis has no available servers right now. Please try Connect again in a few minutes.");
        }
        setError(`Orbis is full. Retrying connection (${attempt + 2} of 3)…`);
        try { await disconnect(); } catch { /* A failed create-session may already be disconnected. */ }
        await new Promise<void>((resolve) => setTimeout(resolve, (attempt + 1) * 3000));
      }
    }
  };

  const beginBattle = (battleImage: File, battlePrompt: string) => runAction(async () => {
    if (!connected) await connectWithRetry();
    await startGeneration(battleImage, battlePrompt);
  });

  const disconnectSession = async () => {
    disconnecting.current = true;
    setRunStarted(false);

    // Remove ReactorView before closing the WebRTC tracks it is playing.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    try {
      await runAction(() => disconnect());
    } finally {
      disconnecting.current = false;
    }
  };

  return {
    status,
    connected,
    controlsBusy,
    runStarted,
    muted,
    error,
    disconnectSession,
    toggleMuted: () => setMuted((current) => !current),
    beginBattle,
    steerPrompt,
    pause: () => runAction(() => sendCommand("pause", {})),
  };
}
