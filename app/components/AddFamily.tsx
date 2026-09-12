"use client";

import { useRef, useState } from "react";
import {
  saveFamilyMemory,
  type FamilyPhotoInput,
  type ParsedTime,
} from "../lib/family-memory-store";
import { groundFamilyMemory } from "../lib/memory-pipeline";

type Answers = {
  who: string;
  place: string;
  year: string;
  scene: string;
  context: string;
};

type Photo = {
  id: string;
  src: string;
  label: string;
  a: Answers;
  saved: boolean;
  input?: FamilyPhotoInput;
  /** True while groundFamilyMemory() is restoring/grounding this photo. */
  generating?: boolean;
  /** Set when groundFamilyMemory() throws; cleared on the next save attempt. */
  error?: string;
};

const EMPTY_ANSWERS: Answers = {
  who: "",
  place: "",
  year: "",
  scene: "",
  context: "",
};

function parseTime(text: string): ParsedTime | undefined {
  const s = text.trim();
  if (!s) return undefined;
  const decadeMatch = s.match(/\b(1[89]|20)(\d)0s\b/);
  const yearMatch = s.match(/\b(1[89]|20)\d{2}\b/);
  return {
    userText: s,
    approximateYear: yearMatch ? Number(yearMatch[0]) : undefined,
    decade: decadeMatch
      ? decadeMatch[0]
      : yearMatch
        ? yearMatch[0].slice(0, 3) + "0s"
        : undefined,
  };
}

function toInput(photo: Photo): FamilyPhotoInput {
  const a = photo.a;
  return {
    id: photo.id,
    image: photo.src,
    person: a.who.trim() ? { nameOrRelationship: a.who.trim() } : undefined,
    place: a.place.trim() || undefined,
    time: parseTime(a.year),
    sceneDescription: a.scene.trim() || undefined,
    familyContext: a.context.trim() || undefined,
  };
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

// Ported from the "Family World" Claude Design import (Add Family.dc.html).
// A fuller, standalone alternative to the single-photo "Add someone" tile
// on the front page (FamilyGallery.tsx): drop one or several family
// photographs, answer who/where/when plus two optional context questions
// per photo, and save each one into a "Ready to enter" list.
//
// Saving runs groundFamilyMemory() (memory-pipeline.ts) right here — Nano
// Banana restores/reframes the photo, Gemini grounds an Orbis prompt in it —
// so the presenter sees the actual grounded prompt on this page before ever
// leaving it. The result (photo + prompt) is stashed in sessionStorage
// (family-memory-store.ts) keyed by photo id; "Enter their world" links to
// /live-world?memoryId=..., which (per LiveWorld.tsx's isSeedMemoryId check)
// renders <LiveWorldSession> for this id — a real Visko Orbis Stable session
// that just uploads the anchor and starts (no Gemini calls left to make
// there). This page is gated behind Google sign-in (proxy.ts) since saving
// now burns GEMINI_API_KEY.
export function AddFamily() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | null | undefined) {
    Array.from(files ?? [])
      .filter((file) => file.type.startsWith("image/"))
      .forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const photo: Photo = {
            id: "p" + Date.now() + Math.random().toString(36).slice(2, 6),
            src: e.target?.result as string,
            label: file.name.replace(/\.[^.]+$/, ""),
            a: EMPTY_ANSWERS,
            saved: false,
          };
          setPhotos((prev) => [...prev, photo]);
          setActiveId((prev) => prev ?? photo.id);
          setDrag(false);
        };
        reader.readAsDataURL(file);
      });
  }

  function update(id: string, patch: Partial<Answers>) {
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, a: { ...p.a, ...patch }, saved: false } : p,
      ),
    );
  }

  function removeActive() {
    const rest = photos.filter((p) => p.id !== activeId);
    setPhotos(rest);
    setActiveId(rest[0] ? rest[0].id : null);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!active || !complete || active.generating) return;
    const id = active.id;
    const input = toInput(active);
    // Deviation from the design, deliberate (T-KEG-03): the design logs the
    // full FamilyPhotoInput including the base64 image inline. Redact the
    // image before logging so family photo bytes never land in the console.
    console.log("FamilyPhotoInput", {
      ...input,
      image: `[data URL, ${input.image.length} chars]`,
    });
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, generating: true, error: undefined } : p,
      ),
    );
    try {
      const grounded = await groundFamilyMemory({
        id,
        photoDataUrl: input.image,
        relationship: input.person?.nameOrRelationship || "a family member",
        place: input.place,
        year: input.time?.userText,
        memory: [input.sceneDescription, input.familyContext]
          .filter((v): v is string => !!v?.trim())
          .join(" "),
      });
      const savedInput: FamilyPhotoInput = { ...input, ...grounded };
      saveFamilyMemory(savedInput);
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, saved: true, generating: false, input: savedInput }
            : p,
        ),
      );
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : String(caught);
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, generating: false, error: message } : p,
        ),
      );
    }
  }

  const active = photos.find((p) => p.id === activeId) ?? null;
  const a = active?.a ?? EMPTY_ANSWERS;
  const complete = !!active && !!a.who.trim();
  const savedList = photos.filter((p) => p.saved);
  const hasSaved = savedList.length > 0;

  const progressLabel = photos.length
    ? `${plural(photos.length, "photograph")} · ${savedList.length} described`
    : "None yet";

  const gateNote = !active
    ? "Add a photograph on the left to begin."
    : active.generating
      ? "Restoring the photo and grounding their world in it…"
      : active.saved
        ? "Their world is ready."
        : complete
          ? "Everything else is optional."
          : "Just tell us who this is to begin.";

  const dropBg = drag ? "var(--color-accent-100)" : "transparent";
  const dropBorder = drag ? "var(--color-accent)" : "var(--color-divider)";
  const dropHint = drag
    ? "Release to add."
    : photos.length
      ? "We'll prepare each photograph for the world."
      : "Or tap to browse. Add one or several at once.";

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
          gap: "0 clamp(24px, 4vw, 56px)",
          padding: "28px 0 48px",
        }}
      >
        <section style={{ display: "flex", flexDirection: "column", gap: 14, gridColumn: "span 1" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 16,
            }}
          >
            <span
              style={{
                fontSize: 13,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--color-accent-700)",
              }}
            >
              1 · Photographs
            </span>
            <span
              style={{
                fontSize: 13,
                color: "var(--color-neutral-700)",
                fontFeatureSettings: "'tnum' 1",
              }}
            >
              {progressLabel}
            </span>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!drag) setDrag(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDrag(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              addFiles(e.dataTransfer.files);
            }}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileRef.current?.click();
              }
            }}
            tabIndex={0}
            role="button"
            aria-label="Drop family photographs or tap to browse"
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 18,
              minHeight: 180,
              padding: 20,
              background: dropBg,
              border: `2px dashed ${dropBorder}`,
              cursor: "pointer",
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                background: "var(--color-accent)",
                display: "block",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span
                style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: 700,
                  fontSize: "clamp(22px, 2.4vw, 30px)",
                  lineHeight: 1.06,
                  letterSpacing: "-0.02em",
                }}
              >
                Drop family photographs here
              </span>
              <span style={{ fontSize: 14, lineHeight: "22px", color: "var(--color-neutral-700)" }}>
                {dropHint}
              </span>
            </div>
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            ref={fileRef}
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
            style={{ display: "none" }}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: 3,
            }}
          >
            {photos.map((p) => {
              const isActive = p.id === activeId;
              const stateLabel = p.saved ? "Ready" : isActive ? "Selected" : "";
              const stateColor = p.saved
                ? "var(--color-accent-300)"
                : "var(--color-neutral-300)";
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveId(p.id)}
                  aria-pressed={isActive}
                  style={{
                    position: "relative",
                    aspectRatio: "4 / 3",
                    padding: 0,
                    border: `2px solid ${isActive ? "var(--color-accent)" : "var(--color-bg)"}`,
                    background: "var(--color-neutral-900)",
                    cursor: "pointer",
                    overflow: "hidden",
                    textAlign: "left",
                    font: "inherit",
                    color: "#fff",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- uploaded data: URI thumbnail */}
                  <img
                    src={p.src}
                    alt={p.label}
                    className="fw-grayscale"
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(to top, rgba(20,17,15,0.85) 0%, rgba(20,17,15,0) 55%)",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      left: 10,
                      right: 10,
                      bottom: 8,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        lineHeight: 1.2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.label}
                    </span>
                    <span style={{ fontSize: 11, color: stateColor, whiteSpace: "nowrap" }}>
                      {stateLabel}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 18, gridColumn: "span 1" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 16,
            }}
          >
            <span
              style={{
                fontSize: 13,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--color-accent-700)",
              }}
            >
              2 · Tell us what you know
            </span>
            {!!active && (
              <button
                type="button"
                className="fw-btn fw-btn-ghost"
                onClick={removeActive}
                style={{ whiteSpace: "nowrap" }}
              >
                Remove photo
              </button>
            )}
          </div>

          {!!active && (
            <div
              className="fw-grayscale"
              style={{
                aspectRatio: "16 / 9",
                overflow: "hidden",
                background: "var(--color-neutral-900)",
                borderTop: "2px solid var(--color-divider)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded data: URI preview */}
              <img
                src={active.src}
                alt="Selected photograph"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
          )}

          <form
            onSubmit={onSave}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px 12px",
              borderTop: "2px solid var(--color-divider)",
              paddingTop: 16,
            }}
          >
            <div className="fw-field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="who">Who is this?</label>
              <input
                id="who"
                className="fw-input"
                disabled={!active}
                placeholder="My grandmother"
                value={a.who}
                onChange={(e) => active && update(active.id, { who: e.target.value })}
              />
              <span style={{ fontSize: 12, lineHeight: "18px", color: "var(--color-neutral-700)" }}>
                A name, nickname, or relationship is enough.
              </span>
            </div>
            <div className="fw-field">
              <label htmlFor="place">Where are they?</label>
              <input
                id="place"
                className="fw-input"
                disabled={!active}
                placeholder="Cavite City, Philippines"
                value={a.place}
                onChange={(e) => active && update(active.id, { place: e.target.value })}
              />
              <span style={{ fontSize: 12, lineHeight: "18px", color: "var(--color-neutral-700)" }}>
                City, neighborhood, region, or country — whatever you know.
              </span>
            </div>
            <div className="fw-field">
              <label htmlFor="year">Around when?</label>
              <input
                id="year"
                className="fw-input"
                disabled={!active}
                placeholder="Around 1953"
                value={a.year}
                onChange={(e) => active && update(active.id, { year: e.target.value })}
              />
              <span style={{ fontSize: 12, lineHeight: "18px", color: "var(--color-neutral-700)" }}>
                An approximate year or decade is fine.
              </span>
            </div>
            <div className="fw-field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="scene">What&apos;s happening here?</label>
              <input
                id="scene"
                className="fw-input"
                disabled={!active}
                placeholder="She is sitting outside the family store with her brothers."
                value={a.scene}
                onChange={(e) => active && update(active.id, { scene: e.target.value })}
              />
              <span style={{ fontSize: 12, lineHeight: "18px", color: "var(--color-neutral-700)" }}>
                Optional. If you don&apos;t know, leave it blank.
              </span>
            </div>
            <div className="fw-field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="context">What else do you know about this time?</label>
              <textarea
                id="context"
                className="fw-input"
                disabled={!active}
                rows={5}
                style={{ minHeight: 120 }}
                placeholder="Her mother ran the store. The children spent most of the day outside."
                value={a.context}
                onChange={(e) => active && update(active.id, { context: e.target.value })}
              />
              <span style={{ fontSize: 12, lineHeight: "18px", color: "var(--color-neutral-700)" }}>
                Optional. A family story, routine, place, person, or small detail can help build
                the world.
              </span>
            </div>

            <div
              style={{
                gridColumn: "1 / -1",
                borderTop: "2px solid var(--color-divider)",
                paddingTop: 14,
                display: "flex",
                alignItems: "center",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              {active && !active.saved && (
                <button
                  type="submit"
                  className="fw-btn fw-btn-primary"
                  disabled={!complete || active.generating}
                  style={{
                    justifyContent: "flex-start",
                    whiteSpace: "nowrap",
                    padding: "14px 20px",
                    fontSize: 15,
                  }}
                >
                  {active.generating
                    ? "Reconstructing their world…"
                    : "Reconstruct their world"}
                </button>
              )}
              {active && active.saved && (
                <a
                  href={`/live-world?memoryId=${encodeURIComponent(active.id)}`}
                  className="fw-btn fw-btn-primary"
                  style={{
                    justifyContent: "flex-start",
                    whiteSpace: "nowrap",
                    padding: "14px 20px",
                    fontSize: 15,
                  }}
                >
                  Enter their world →
                </a>
              )}
              <span style={{ fontSize: 13, color: "var(--color-neutral-700)" }}>{gateNote}</span>
            </div>
            {active?.error && (
              <p
                style={{
                  gridColumn: "1 / -1",
                  fontSize: 13,
                  lineHeight: "20px",
                  margin: 0,
                  color: "var(--color-accent-700)",
                }}
              >
                {active.error}
              </p>
            )}
            {active?.input?.groundedPrompt && (
              <div className="fw-field" style={{ gridColumn: "1 / -1" }}>
                <label>Their world</label>
                <p
                  style={{
                    fontSize: 14,
                    lineHeight: "22px",
                    margin: 0,
                    color: "var(--color-neutral-700)",
                  }}
                >
                  {active.input.groundedPrompt}
                </p>
              </div>
            )}
          </form>
        </section>
      </div>

      {hasSaved && (
        <>
          <hr className="fw-hr" />
          <section style={{ padding: "28px 0 48px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--color-accent-700)",
                }}
              >
                Ready to enter
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: "var(--color-neutral-700)",
                  fontFeatureSettings: "'tnum' 1",
                }}
              >
                {progressLabel}
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
                gap: 3,
              }}
            >
              {savedList.map((p) => {
                const meta =
                  [p.a.place, p.a.year].filter((x) => x.trim()).join(" · ") ||
                  "Place and time to be reconstructed";
                const summary =
                  p.input?.groundedPrompt ||
                  p.a.scene.trim() ||
                  p.a.context.trim() ||
                  "A little information was enough to begin.";
                return (
                  <article
                    key={p.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      background: "var(--color-surface)",
                      borderTop: "2px solid var(--color-text)",
                    }}
                  >
                    <div
                      className="fw-grayscale"
                      style={{
                        aspectRatio: "16 / 9",
                        overflow: "hidden",
                        background: "var(--color-neutral-900)",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- uploaded data: URI thumbnail */}
                      <img
                        src={p.src}
                        alt={p.a.who}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    </div>
                    <div
                      style={{
                        padding: 16,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        flex: 1,
                      }}
                    >
                      <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 22, lineHeight: 1.1, margin: 0 }}>
                        {p.a.who}
                      </h3>
                      <p style={{ fontSize: 13, lineHeight: "20px", margin: 0, color: "var(--color-neutral-700)" }}>
                        {meta}
                      </p>
                      <p
                        style={{
                          fontSize: 14,
                          lineHeight: "22px",
                          margin: "6px 0 0",
                          color: "var(--color-neutral-700)",
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {summary}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                          marginTop: "auto",
                          paddingTop: 14,
                        }}
                      >
                        <a
                          href={`/live-world?memoryId=${encodeURIComponent(p.id)}`}
                          className="fw-btn fw-btn-primary"
                          style={{ justifyContent: "flex-start", whiteSpace: "nowrap" }}
                        >
                          Enter their world →
                        </a>
                        <button
                          type="button"
                          className="fw-btn fw-btn-ghost"
                          onClick={() => setActiveId(p.id)}
                          style={{ whiteSpace: "nowrap" }}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}
    </>
  );
}
