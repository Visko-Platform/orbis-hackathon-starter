"use client";

import { useEffect, useRef, useState } from "react";
import { ViskoOrbisStableProvider } from "@reactor-models/visko-orbis-stable";
import {
  fetchReactorToken,
  useViskoOrbisStable,
  useViskoState,
  sendSetImage,
  sendSetPrompt,
  sendStart,
  type StateMessage,
} from "../../lib/visko";
import { UPLOAD_ANCHOR_PROMPT } from "../../lib/upload-anchor";
import { Video } from "../../components/Video";
import { EvolveScene } from "../../components/EvolveScene";

// Spike 016 — raw internal test page for the upload → anchor-image →
// grounded-prompt → Orbis pipeline built in spikes 014/015. Deliberately
// mirrors orbis-hackathon-starter's NanoBananaExample/OrbisDemo shape: one
// page, every raw prompt visible, one pipeline button, no polished
// creation-flow chrome. See
// .planning/spikes/016-raw-upload-test-page/README.md.
//
// Gated the same way /session is (middleware.ts matches every route except
// api/auth + static assets), so this never needs its own auth check.

type Stage = "idle" | "editing" | "grounding" | "starting";

type LogEntry = { t: string; msg: string };

function useObjectUrl(file: File | null) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!file) {
      setUrl("");
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}

export function UploadTestApp() {
  return (
    <ViskoOrbisStableProvider jwtToken={fetchReactorToken}>
      <UploadTestSession />
    </ViskoOrbisStableProvider>
  );
}

function UploadTestSession() {
  const s = useViskoOrbisStable();
  const { status, connect, disconnect, uploadFile } = s;
  const [snapshot, setSnapshot] = useState<StateMessage | null>(null);
  useViskoState((msg: StateMessage) => setSnapshot(msg));
  useEffect(() => {
    if (status !== "ready") setSnapshot(null);
  }, [status]);

  const [photo, setPhoto] = useState<File | null>(null);
  const [relationship, setRelationship] = useState("Grandma");
  const [age, setAge] = useState("11");
  const [city, setCity] = useState("Warsaw");
  const [country, setCountry] = useState("Poland");
  const [year, setYear] = useState("1952");
  const [memory, setMemory] = useState(
    "Her mother sent her out every morning to buy bread.",
  );

  const [anchorImage, setAnchorImage] = useState<File | null>(null);
  const [groundedPrompt, setGroundedPrompt] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const logCounter = useRef(0);

  const photoUrl = useObjectUrl(photo);
  const anchorUrl = useObjectUrl(anchorImage);
  const busy = stage !== "idle";
  const ready = status === "ready";
  const started = snapshot?.started === true;

  function note(msg: string) {
    logCounter.current += 1;
    setLog((current) =>
      [{ t: new Date().toISOString(), msg }, ...current].slice(0, 20),
    );
  }

  async function runPipeline() {
    if (!photo) {
      setError("Choose a photo first.");
      return;
    }
    if (!relationship.trim() || !city.trim() || !country.trim() || !year.trim() || !memory.trim()) {
      setError("Fill in relationship, city, country, year, and memory.");
      return;
    }

    setError("");
    setAnchorImage(null);
    setGroundedPrompt("");

    try {
      setStage("editing");
      note("Sending photo to Nano Banana for restoration + 16:9 reframe…");
      const editForm = new FormData();
      editForm.append("image", photo);
      const editResponse = await fetch("/api/nano-banana", {
        method: "POST",
        body: editForm,
      });
      if (!editResponse.ok) {
        const result = (await editResponse.json()) as { error?: string };
        throw new Error(result.error || "Nano Banana image edit failed");
      }
      const editedBlob = await editResponse.blob();
      const extension = editedBlob.type === "image/jpeg" ? "jpg" : "png";
      const anchor = new File([editedBlob], `anchor.${extension}`, {
        type: editedBlob.type || "image/png",
      });
      setAnchorImage(anchor);
      note("Anchor image ready.");

      setStage("grounding");
      note("Grounding the memory in the anchor image via Gemini…");
      const groundForm = new FormData();
      groundForm.append("image", anchor);
      groundForm.append("relationship", relationship.trim());
      if (age.trim()) groundForm.append("age", age.trim());
      groundForm.append("city", city.trim());
      groundForm.append("country", country.trim());
      groundForm.append("year", year.trim());
      groundForm.append("memory", memory.trim());
      const groundResponse = await fetch("/api/orbis-prompt", {
        method: "POST",
        body: groundForm,
      });
      const ground = (await groundResponse.json()) as {
        prompt?: string;
        error?: string;
      };
      if (!groundResponse.ok || !ground.prompt?.trim()) {
        throw new Error(ground.error || "Gemini returned no grounded prompt");
      }
      const prompt = ground.prompt.trim();
      setGroundedPrompt(prompt);
      note("Grounded prompt ready.");

      if (!ready) {
        note("Not connected to Orbis — stopping here. Connect, then run again to start the stream.");
        return;
      }

      setStage("starting");
      note("Uploading anchor image to Orbis and starting the stream…");
      const ref = await uploadFile(anchor, { name: anchor.name });
      await sendSetImage(s, ref);
      await sendSetPrompt(s, prompt);
      await sendStart(s);
      note("Stream started.");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setError(message);
      note(`Error: ${message}`);
    } finally {
      setStage("idle");
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 lg:p-6">
      <header className="border-b border-zinc-800 pb-3">
        <h1 className="text-sm font-semibold tracking-tight text-zinc-100">
          Upload → anchor image → grounded prompt (raw test)
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          Internal page — not part of the presenter demo. Uploads a real
          photo, edits it into an Orbis-ready 16:9 anchor via Gemini (&quot;Nano
          Banana&quot;), grounds a Person+Place+Year+Memory prompt in that anchor,
          then optionally starts a live Orbis stream from it. Mirrors
          orbis-hackathon-starter&apos;s raw demo pattern.
        </p>
      </header>

      <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
        <span className="text-sm text-zinc-200">
          Orbis: {status}
          {started ? " · streaming" : ""}
        </span>
        {status === "disconnected" ? (
          <button
            onClick={() => connect()}
            className="rounded-md bg-brand px-3 py-1 text-xs font-medium text-brand-fg hover:opacity-90"
          >
            Connect
          </button>
        ) : (
          <button
            onClick={() => disconnect()}
            className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            Disconnect
          </button>
        )}
      </div>
      {!ready && (
        <p className="text-[11px] text-zinc-500">
          You can run the edit + grounding steps without connecting — only
          starting the Orbis stream requires it.
        </p>
      )}

      <div className="grid gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-zinc-400 sm:col-span-2">
          Photo
          <input
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            className="text-xs text-zinc-300"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Relationship
          <input
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            disabled={busy}
            className="rounded-md border border-zinc-800 bg-zinc-950 p-2 text-sm text-zinc-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Age (approximate)
          <input
            value={age}
            onChange={(e) => setAge(e.target.value)}
            disabled={busy}
            className="rounded-md border border-zinc-800 bg-zinc-950 p-2 text-sm text-zinc-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          City
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={busy}
            className="rounded-md border border-zinc-800 bg-zinc-950 p-2 text-sm text-zinc-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Country
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            disabled={busy}
            className="rounded-md border border-zinc-800 bg-zinc-950 p-2 text-sm text-zinc-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Year
          <input
            value={year}
            onChange={(e) => setYear(e.target.value)}
            disabled={busy}
            className="rounded-md border border-zinc-800 bg-zinc-950 p-2 text-sm text-zinc-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-400 sm:col-span-2">
          Memory
          <textarea
            value={memory}
            onChange={(e) => setMemory(e.target.value)}
            disabled={busy}
            rows={2}
            className="resize-none rounded-md border border-zinc-800 bg-zinc-950 p-2 text-sm text-zinc-100"
          />
        </label>
      </div>

      <button
        disabled={busy || !photo}
        onClick={runPipeline}
        className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-brand-fg hover:opacity-90 disabled:opacity-40"
      >
        {stage === "editing" && "Editing photo…"}
        {stage === "grounding" && "Grounding prompt…"}
        {stage === "starting" && "Starting stream…"}
        {stage === "idle" && "Run pipeline"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <figure className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
          <div className="relative aspect-video w-full overflow-hidden rounded-md bg-zinc-900">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="Uploaded source photo" className="h-full w-full object-contain" />
            ) : (
              <span className="grid h-full place-items-center text-[11px] text-zinc-600">
                Source photo
              </span>
            )}
          </div>
          <figcaption className="mt-1 text-[11px] text-zinc-500">Source</figcaption>
        </figure>
        <figure className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
          <div className="relative aspect-video w-full overflow-hidden rounded-md bg-zinc-900">
            {anchorUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={anchorUrl} alt="Nano Banana anchor output" className="h-full w-full object-contain" />
            ) : (
              <span className="grid h-full place-items-center text-[11px] text-zinc-600">
                {stage === "editing" ? "Editing…" : "Anchor image (16:9)"}
              </span>
            )}
          </div>
          <figcaption className="mt-1 text-[11px] text-zinc-500">Orbis start image</figcaption>
        </figure>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500">
          Nano Banana edit prompt (fixed)
        </p>
        <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-zinc-400">
          {UPLOAD_ANCHOR_PROMPT}
        </p>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500">
          Gemini-grounded Orbis prompt
        </p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-300">
          {groundedPrompt || "Generated after grounding the memory in the anchor image."}
        </p>
      </div>

      <Video />
      <EvolveScene />

      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500">Event log</p>
        <ul className="mt-1 space-y-1 text-[11px] text-zinc-500">
          {log.length === 0 && <li>No events yet.</li>}
          {log.map((entry, i) => (
            <li key={i} className="font-mono">
              <span className="text-zinc-600">{entry.t.slice(11, 19)}</span> {entry.msg}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
