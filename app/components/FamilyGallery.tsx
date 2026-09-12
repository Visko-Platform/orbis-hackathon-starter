"use client";

import { useRef, useState } from "react";

type Member = {
  id: string;
  seed: boolean;
  person: string;
  relationship: string;
  place: string;
  year: string;
  memory: string;
  photo: string;
};

type FormState = {
  relationship: string;
  place: string;
  year: string;
  memory: string;
};

const EMPTY_FORM: FormState = {
  relationship: "",
  place: "",
  year: "",
  memory: "",
};

// Ported from the "Family World" Claude Design import (Front Page.dc.html).
// Three example relatives seed the gallery; a presenter can drop in one
// more family photo and answer four questions to add it to the grid.
// "Enter their world" links to /session?memoryId=... — the query param
// isn't consumed by the session app yet, matching the design's own scope.
const SEEDS: Member[] = [
  {
    id: "seed-lola",
    seed: true,
    person: "Lola",
    relationship: "My grandmother",
    place: "Cavite City, Philippines",
    year: "1953",
    memory:
      "She ran a small sari-sari store on the corner and knew everyone who passed by.",
    photo: "/images/cavite-1953.jpg",
  },
  {
    id: "seed-yay",
    seed: true,
    person: "Yay",
    relationship: "My great-grandmother",
    place: "Phnom Penh, Cambodia",
    year: "1964",
    memory:
      "She crossed the wide boulevard barefoot on her way to school every morning.",
    photo: "/images/phnom-penh-1964.jpg",
  },
  {
    id: "seed-babushka",
    seed: true,
    person: "Babushka",
    relationship: "My babushka",
    place: "Leningrad, USSR",
    year: "1980s",
    memory: "She rode the tram past the old bell tower on her way to school.",
    photo: "/images/leningrad-1980s.jpg",
  },
];

function personFrom(relationship: string) {
  return (
    relationship
      .replace(/^my\s+/i, "")
      .trim()
      .replace(/^./, (c) => c.toUpperCase()) || "Someone"
  );
}

export function FamilyGallery() {
  const [added, setAdded] = useState<Member[]>([]);
  const [removed, setRemoved] = useState<Record<string, true>>({});
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoTitle, setPhotoTitle] = useState("");
  const [drag, setDrag] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [toast, setToast] = useState<{ person: string; href: string } | null>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const family = [...SEEDS, ...added].filter((m) => !removed[m.id]);
  const hasPhoto = !!photo;
  const complete =
    hasPhoto &&
    form.relationship.trim() &&
    form.place.trim() &&
    form.year.trim() &&
    form.memory.trim();

  function readFile(file: File | null | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhoto(e.target?.result as string);
      setPhotoTitle(file.name.replace(/\.[^.]+$/, ""));
      setDrag(false);
      setToast(null);
    };
    reader.readAsDataURL(file);
  }

  function removeMember(id: string) {
    setRemoved((r) => ({ ...r, [id]: true }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!complete || !photo) return;
    const id = "mem-" + Date.now();
    const person = personFrom(form.relationship);
    setAdded((a) => [
      ...a,
      {
        id,
        seed: false,
        person,
        relationship: form.relationship.trim(),
        place: form.place.trim(),
        year: form.year.trim(),
        memory: form.memory.trim(),
        photo,
      },
    ]);
    setPhoto(null);
    setPhotoTitle("");
    setForm(EMPTY_FORM);
    setToast({ person, href: "/session?memoryId=" + encodeURIComponent(id) });
  }

  return (
    <>
      <section style={{ padding: "28px 0 42px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 14,
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
            The family
          </span>
          <span style={{ fontSize: 13, color: "var(--color-neutral-700)" }}>
            {family.length} relatives
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
            gap: 3,
          }}
        >
          {family.map((m) => (
            <article
              key={m.id}
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                background: "var(--color-surface)",
                borderTop: "2px solid var(--color-text)",
              }}
            >
              <div
                className="fw-grayscale"
                style={{
                  aspectRatio: "4 / 3",
                  overflow: "hidden",
                  background: "var(--color-neutral-900)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- mix of static assets and uploaded data: URIs */}
                <img
                  src={m.photo}
                  alt={m.person}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </div>
              <div
                style={{
                  padding: "16px 16px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  flex: 1,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: 12,
                  }}
                >
                  <h3 style={{ fontSize: 24, margin: 0 }}>{m.person}</h3>
                  <span
                    className={`fw-tag ${m.seed ? "fw-tag-neutral" : "fw-tag-accent"}`}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {m.seed ? "Example" : "Added"}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 13,
                    lineHeight: "20px",
                    margin: 0,
                    color: "var(--color-neutral-700)",
                  }}
                >
                  {m.relationship} · {m.place} · {m.year}
                </p>
                <p style={{ fontSize: 15, lineHeight: "24px", margin: "6px 0 0" }}>
                  {m.memory}
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
                    href={`/session?memoryId=${encodeURIComponent(m.id)}`}
                    className="fw-btn fw-btn-primary"
                    style={{ justifyContent: "flex-start", whiteSpace: "nowrap" }}
                  >
                    Enter their world →
                  </a>
                  {!m.seed && (
                    <button
                      type="button"
                      className="fw-btn fw-btn-ghost"
                      onClick={() => removeMember(m.id)}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}

          <div
            id="add"
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
              setDrag(false);
              readFile(e.dataTransfer.files?.[0]);
            }}
            onClick={() => {
              if (!hasPhoto) fileRef.current?.click();
            }}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && !hasPhoto) {
                e.preventDefault();
                fileRef.current?.click();
              }
            }}
            tabIndex={0}
            role="button"
            aria-label="Add someone: drop a family photograph or tap to browse"
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: 320,
              padding: 20,
              background: hasPhoto
                ? "var(--color-neutral-900)"
                : drag
                  ? "var(--color-accent-100)"
                  : "transparent",
              border: `2px ${hasPhoto ? "solid" : "dashed"} ${
                drag || hasPhoto ? "var(--color-accent)" : "var(--color-divider)"
              }`,
              cursor: "pointer",
              overflow: "hidden",
            }}
          >
            {!hasPhoto && (
              <>
                <span
                  style={{
                    width: 12,
                    height: 12,
                    background: "var(--color-accent)",
                    display: "block",
                  }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-heading)",
                      fontWeight: 800,
                      fontSize: "clamp(26px, 3vw, 40px)",
                      lineHeight: 1.06,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Add someone
                  </span>
                  <span
                    style={{ fontSize: 14, lineHeight: "22px", color: "var(--color-neutral-700)" }}
                  >
                    {drag
                      ? "Release to drop the photograph."
                      : "Drop a family photograph here, or tap to browse."}
                  </span>
                </div>
              </>
            )}
            {hasPhoto && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- uploaded data: URI preview */}
                <img
                  src={photo ?? undefined}
                  alt="Your family photograph"
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
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to top, rgba(32,30,29,0.85) 0%, rgba(32,30,29,0.05) 55%)",
                    pointerEvents: "none",
                  }}
                />
                <span
                  className="fw-tag fw-tag-accent"
                  style={{ position: "relative", alignSelf: "flex-start" }}
                >
                  Photo ready
                </span>
                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    color: "var(--color-bg)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-heading)",
                      fontWeight: 800,
                      fontSize: "clamp(22px, 2.6vw, 32px)",
                      lineHeight: 1.06,
                      letterSpacing: "-0.015em",
                    }}
                  >
                    {photoTitle}
                  </span>
                  <span style={{ fontSize: 14, color: "var(--color-neutral-300)" }}>
                    Tell us who this is below, then enter their world.
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
        <input
          type="file"
          accept="image/*"
          ref={fileRef}
          onChange={(e) => {
            readFile(e.target.files?.[0]);
            e.target.value = "";
          }}
          style={{ display: "none" }}
        />
      </section>

      {hasPhoto && (
        <>
          <hr className="fw-hr" />
          <section
            style={{
              padding: "28px 0 42px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "28px clamp(24px, 4vw, 72px)",
              alignItems: "start",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <span
                style={{
                  fontSize: 13,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--color-accent-700)",
                }}
              >
                Add someone
              </span>
              <h2 style={{ fontSize: "clamp(26px, 3vw, 40px)", margin: 0 }}>
                Who is in this photograph?
              </h2>
              <p
                style={{
                  fontSize: 15,
                  lineHeight: "28px",
                  margin: 0,
                  color: "var(--color-neutral-700)",
                  maxWidth: "48ch",
                }}
              >
                Four answers make a memory. The photo stays black and white
                here; their world renders in full.
              </p>
              <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="fw-btn fw-btn-secondary"
                  onClick={() => fileRef.current?.click()}
                  style={{ whiteSpace: "nowrap" }}
                >
                  Change photo
                </button>
                <button
                  type="button"
                  className="fw-btn fw-btn-ghost"
                  onClick={() => {
                    setPhoto(null);
                    setPhotoTitle("");
                  }}
                  style={{ whiteSpace: "nowrap" }}
                >
                  Remove photo
                </button>
              </div>
            </div>
            <form
              onSubmit={onSubmit}
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 12px" }}
            >
              <div className="fw-field" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="rel">Who is this?</label>
                <input
                  id="rel"
                  className="fw-input"
                  placeholder="e.g. My grandmother"
                  value={form.relationship}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, relationship: e.target.value }))
                  }
                />
              </div>
              <div className="fw-field">
                <label htmlFor="place">Where did they live?</label>
                <input
                  id="place"
                  className="fw-input"
                  placeholder="Cavite City, Philippines"
                  value={form.place}
                  onChange={(e) => setForm((f) => ({ ...f, place: e.target.value }))}
                />
              </div>
              <div className="fw-field">
                <label htmlFor="year">Around when?</label>
                <input
                  id="year"
                  className="fw-input"
                  placeholder="1953"
                  value={form.year}
                  onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                />
              </div>
              <div className="fw-field" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="mem">Anything you remember?</label>
                <textarea
                  id="mem"
                  className="fw-input"
                  placeholder="She ran a small sari-sari store on the corner…"
                  value={form.memory}
                  onChange={(e) => setForm((f) => ({ ...f, memory: e.target.value }))}
                />
              </div>
              <div
                style={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="submit"
                  className="fw-btn fw-btn-primary"
                  disabled={!complete}
                  style={{
                    justifyContent: "flex-start",
                    whiteSpace: "nowrap",
                    padding: "14px 20px",
                    fontSize: 15,
                  }}
                >
                  Enter their world →
                </button>
                <span style={{ fontSize: 13, color: "var(--color-neutral-700)" }}>
                  {complete
                    ? "Everything is filled in."
                    : "All four answers and a photo are needed."}
                </span>
              </div>
            </form>
          </section>
        </>
      )}

      {toast && (
        <div
          role="status"
          style={{
            borderTop: "2px solid var(--color-accent)",
            padding: "14px 0 28px",
            display: "flex",
            gap: 16,
            alignItems: "baseline",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 16 }}>
            Saved {toast.person}
          </span>
          <a href={toast.href} style={{ fontSize: 14 }}>
            Enter their world →
          </a>
        </div>
      )}
    </>
  );
}
