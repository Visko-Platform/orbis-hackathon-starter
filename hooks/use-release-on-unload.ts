"use client";

import { useReactor } from "@reactor-team/js-sdk";
import { useEffect, useRef } from "react";

const RELEASE_PATH = "/api/sessions/release";

/**
 * Closes the live session when its page is closed, refreshed, or left. The
 * SDK's disconnect is asynchronous and cannot finish during unload, so the
 * session id goes to the server as a beacon (which outlives the page) and
 * the server deletes the session with the API key. Must run inside a
 * ReactorProvider; returns the current session id.
 */
export function useReleaseOnUnload(): string | undefined {
  const sessionId = useReactor((state) => state.sessionId);
  const current = useRef<string | undefined>(undefined);
  current.current = sessionId;

  useEffect(() => {
    const release = () => {
      const id = current.current;
      if (!id) return;
      // pagehide and beforeunload both fire on a close; send once.
      current.current = undefined;
      const body = new Blob([JSON.stringify({ sessionId: id })], { type: "application/json" });
      const sent = typeof navigator.sendBeacon === "function" && navigator.sendBeacon(RELEASE_PATH, body);
      if (!sent) void fetch(RELEASE_PATH, { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => undefined);
    };
    window.addEventListener("pagehide", release);
    window.addEventListener("beforeunload", release);
    return () => {
      window.removeEventListener("pagehide", release);
      window.removeEventListener("beforeunload", release);
    };
  }, []);

  return sessionId;
}
