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
  type FamilyPhotoInput,
} from "../lib/family-memory-store";

type Stage = "editing" | "grounding" | "starting" | "done" | "error";

// Looked up once the searchParams/sessionStorage read resolves client-side:
// "pending" keeps the first render identical to the server's (no memoryId
// lookup happens during SSR), "missing" means sessionStorage didn't have it
// (different tab, or it expired) — see loadFamilyMemory in family-memory-store.ts.
type MemoryLookup = "pending" | "missing" | FamilyPhotoInput;

// /add-family stores a FamilyPhotoInput (photo + who/where/when/context)
// keyed by id; this component reads it back via `?memoryId=` and runs the
// same restore -> ground -> start pipeline app/internal/upload-test/UploadTestApp.tsx
// (spike 016) exercises by hand: Nano Banana repairs + reframes the photo to
// 16:9, Gemini grounds a Person+Place+Year+Memory prompt in that anchor, then
// the anchor + prompt start the live Orbis stream.
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
    setLookup(loadFamilyMemory(memoryId) ?? "missing");
  }, [memoryId]);

  const ready = status === "ready";
  const alreadyLive = snapshot?.started === true;
  const memory = typeof lookup === "object" ? lookup : null;

  async function run(current: FamilyPhotoInput) {
    runningRef.current = true;
    setError("");
    try {
      setStage("editing");
      const source = await dataUrlToFile(current.image, `${current.id}.jpg`);
      const editForm = new FormData();
      editForm.append("image", source);
      const editResponse = await fetch("/api/nano-banana", {
        method: "POST",
        body: editForm,
      });
      if (!editResponse.ok) {
        const result = (await editResponse.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(result.error || "Photo restoration failed");
      }
      const editedBlob = await editResponse.blob();
      const extension = editedBlob.type === "image/jpeg" ? "jpg" : "png";
      const anchor = new File(
        [editedBlob],
        `${current.id}-anchor.${extension}`,
        { type: editedBlob.type || "image/png" },
      );

      setStage("grounding");
      const groundForm = new FormData();
      groundForm.append("image", anchor);
      groundForm.append(
        "relationship",
        current.person?.nameOrRelationship || "a family member",
      );
      groundForm.append(
        "place",
        current.place?.trim() || "a place remembered by the family",
      );
      groundForm.append("year", current.time?.userText || "an earlier era");
      groundForm.append(
        "memory",
        [current.sceneDescription, current.familyContext]
          .filter((v): v is string => !!v?.trim())
          .join(" ") || "A quiet family moment, remembered fondly.",
      );
      const groundResponse = await fetch("/api/orbis-prompt", {
        method: "POST",
        body: groundForm,
      });
      const ground = (await groundResponse.json().catch(() => ({}))) as {
        prompt?: string;
        error?: string;
      };
      if (!groundResponse.ok || !ground.prompt?.trim()) {
        throw new Error(ground.error || "Gemini returned no grounded prompt");
      }

      setStage("starting");
      const ref = await uploadFile(anchor, { name: anchor.name });
      await sendSetImage(s, ref);
      await sendSetPrompt(s, ground.prompt.trim());
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
          This memory link has expired in this browser tab.{" "}
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
          {who}&apos;s photo is ready. Click Connect above to bring their
          world to life.
        </p>
      )}
      {ready && stage === "editing" && (
        <p className="mt-1">Restoring {who}&apos;s photo…</p>
      )}
      {ready && stage === "grounding" && (
        <p className="mt-1">Grounding {who}&apos;s memory…</p>
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
