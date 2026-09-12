"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  useViskoOrbisStable,
  useViskoState,
  sendSetImage,
  sendSetPrompt,
  sendStart,
  type StateMessage,
} from "../lib/visko";
import {
  dataUrlToFile,
  loadFamilyMemory,
  type GroundedFamilyMemory,
} from "../lib/family-memory-store";

type Stage = "starting" | "done" | "error";

// Looked up once the searchParams/sessionStorage read resolves client-side:
// "pending" keeps the first render identical to the server's (no memoryId
// lookup happens during SSR), "missing" means sessionStorage didn't have a
// fully-grounded memory for this id (different tab, expired, or /add-family's
// groundFamilyMemory() step never finished) — see loadFamilyMemory in
// family-memory-store.ts.
type MemoryLookup = "pending" | "missing" | GroundedFamilyMemory;

// /add-family already restores the photo and grounds an Orbis prompt in it
// (groundFamilyMemory(), run there so the presenter sees the prompt before
// leaving that page) and stores the result — anchor image + prompt — keyed
// by id. This component reads it back via `?memoryId=` and runs only the
// remaining steps: upload the anchor, setImage, setPrompt, start.
//
// Mounted in two places, both inside their own <ViskoOrbisStableProvider>:
// LiveWorldSession.tsx (the presenter-facing path — /live-world routes any
// non-seed memoryId there, see LiveWorld.tsx's isSeedMemoryId) and
// ViskoOrbisStableApp.tsx (/session, kept for direct debugging).
//
// Follows the same self-organizing pattern as ImageStarter/StatusBadge: reads
// connection state itself, renders null once there is nothing left to do.
// Per ViskoOrbisStableApp.tsx's rule, this never calls connect() itself —
// it only reacts once the user has connected on their own.
export function MemoryAutostart() {
  const memoryId = useSearchParams().get("memoryId");
  const s = useViskoOrbisStable();
  const { status, uploadFile } = s;
  const [snapshot, setSnapshot] = useState<StateMessage | null>(null);
  useViskoState((msg: StateMessage) => setSnapshot(msg));

  const [lookup, setLookup] = useState<MemoryLookup>("pending");
  const [stage, setStage] = useState<Stage | null>(null);
  const [error, setError] = useState("");
  const runningRef = useRef(false);

  useEffect(() => {
    if (status !== "ready") setSnapshot(null);
  }, [status]);

  useEffect(() => {
    if (!memoryId) return;
    const found = loadFamilyMemory(memoryId);
    setLookup(
      found && found.anchorImage && found.groundedPrompt
        ? (found as GroundedFamilyMemory)
        : "missing",
    );
  }, [memoryId]);

  const ready = status === "ready";
  const alreadyLive = snapshot?.started === true;
  const memory = typeof lookup === "object" ? lookup : null;

  async function run(current: GroundedFamilyMemory) {
    runningRef.current = true;
    setError("");
    setStage("starting");
    try {
      const anchor = await dataUrlToFile(
        current.anchorImage,
        `${current.id}-anchor.jpg`,
      );
      const ref = await uploadFile(anchor, { name: anchor.name });
      await sendSetImage(s, ref);
      await sendSetPrompt(s, current.groundedPrompt);
      await sendStart(s);
      setStage("done");
    } catch (caught) {
      runningRef.current = false;
      setError(caught instanceof Error ? caught.message : String(caught));
      setStage("error");
    }
  }

  useEffect(() => {
    if (!memory || !ready || alreadyLive) return;
    if (runningRef.current || stage === "done" || stage === "error") return;
    run(memory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memory, ready, alreadyLive]);

  if (!memoryId || alreadyLive || lookup === "pending") return null;

  if (lookup === "missing") {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-400">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500">
          Family memory
        </p>
        <p className="mt-1 leading-relaxed">
          This memory isn&apos;t ready in this browser tab (it may have
          expired, or wasn&apos;t fully generated).{" "}
          <a href="/add-family" className="text-brand underline">
            Add the family member again
          </a>
          .
        </p>
      </div>
    );
  }

  const who = memory?.person?.nameOrRelationship || "This family member";

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-400">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">
        Family memory
      </p>
      {!ready && (
        <p className="mt-1 leading-relaxed">
          {who}&apos;s world is ready. Click Connect above to bring it to
          life.
        </p>
      )}
      {ready && stage === "starting" && (
        <p className="mt-1">Starting {who}&apos;s world…</p>
      )}
      {stage === "error" && (
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="text-red-400">{error}</span>
          <button
            onClick={() => memory && run(memory)}
            className="shrink-0 rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
