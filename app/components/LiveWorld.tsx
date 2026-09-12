"use client";

import { useEffect, useRef, useState } from "react";

type Beat = {
  id: string;
  title: string;
  hint?: string;
  narration: string;
};

type HistoryItem = {
  key: string;
  at: string;
  title: string;
  state: "Started" | "Queued" | "Landed";
  tagClass: string;
};

type Pending = {
  id: string;
  title: string;
  key: string;
  landsAt: number;
};

type Status = "idle" | "priming" | "live" | "done";

// Seed scene for the panorama_philippines.jpeg photograph — same place/year
// as the "Lola" entry on /explore-grandmas-world, a wider companion shot of
// the same Cavite City barrio street on a fiesta day.
const SCENE = {
  kicker: "Lola · My grandmother · Cavite City, Philippines · 1953",
  title: "Barrio street, fiesta day",
  image: "/images/panorama_philippines.jpeg",
  initial: {
    id: "initial",
    title: "Barrio street, fiesta day",
    narration:
      "A festive barrio street in Cavite City, Philippines: fruit stalls set along a bamboo fence, strings of fiesta buntings overhead, a jeepney idling past a San Miguel Beer signboard, and a cargo ship waiting at the harbor beyond the rooftops.",
  } satisfies Beat,
  evolutions: [
    {
      id: "buntings",
      title: "Fiesta buntings",
      hint: "Look up at the string of flags overhead.",
      narration:
        "Buntings like these crossed barrio streets for town fiestas — Cavite City's biggest is the Feast of the Immaculate Conception, when whole streets are strung with paper and cloth flags.",
    },
    {
      id: "stalls",
      title: "Market stalls",
      hint: "Settle on the fruit stalls along the road.",
      narration:
        "Roadside stalls like these sold whatever was in season, set out directly on the packed-earth street for anyone walking by.",
    },
    {
      id: "jeepney",
      title: "The jeepney",
      hint: "Follow the jeepney idling down the street.",
      narration:
        "Jeepneys were repurposed U.S. military jeeps left behind after World War Two, stretched and decorated into the Philippines' iconic shared taxi.",
    },
    {
      id: "harbor",
      title: "The harbor beyond",
      hint: "Look past the rooftops to the ship at anchor.",
      narration:
        "Cavite City sits on a peninsula built around a naval anchorage — a cargo ship waiting offshore was an everyday backdrop, not a special occasion.",
    },
    {
      id: "wide",
      title: "Wide barrio shot",
      hint: "Pull back to see the whole street.",
      narration:
        "Put together, this one photograph holds a household's entire world — market, transit, festival, and harbor within a single unhurried view.",
    },
  ] satisfies Beat[],
};

const MAX_CHUNKS = 60;
const TICK_MS = 1400;

const STATUS_META: Record<Status, [label: string, color: string, anim: string]> = {
  idle: ["Waiting", "var(--color-neutral-700)", "none"],
  priming: ["Priming", "var(--color-accent)", "fw-pulse 1s ease-in-out infinite"],
  live: ["Live", "var(--color-accent)", "none"],
  done: ["Run finished", "var(--color-accent-2)", "none"],
};

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

// Ported from the "Family World" Claude Design import (Live World.dc.html).
// Simulates the Visko Orbis-via-Reactor live-generation states (idle →
// priming → live → done) with a local timer standing in for a real Reactor
// session — same standalone-port scope as AddFamily.tsx. Seeded with the
// wide Cavite City panorama; "steering" queues a beat that lands at the
// next simulated chunk boundary rather than calling a live backend.
export function LiveWorld() {
  const [status, setStatus] = useState<Status>("idle");
  const [chunk, setChunk] = useState(0);
  const [currentId, setCurrentId] = useState("initial");
  const [selectedId, setSelectedId] = useState("");
  const [customText, setCustomText] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const t0Ref = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const extraBeatsRef = useRef<Beat[]>([]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function elapsed() {
    const s = Math.max(0, Math.round((Date.now() - t0Ref.current) / 1000));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  function start() {
    if (timerRef.current) clearInterval(timerRef.current);
    t0Ref.current = Date.now();
    setStatus("priming");
    setChunk(1);
    setCurrentId("initial");
    setPending(null);
    setHistory([
      { key: "start", at: "0:00", title: SCENE.initial.title, state: "Started", tagClass: "fw-tag-accent" },
    ]);
    timerRef.current = setInterval(tick, TICK_MS);
  }

  function tick() {
    setChunk((prevChunk) => {
      const next = prevChunk + 1;
      setStatus((s) => (s === "priming" && next >= 2 ? "live" : s));
      setPending((p) => {
        if (p && next >= p.landsAt) {
          setCurrentId(p.id);
          setHistory((h) =>
            h.map((item) =>
              item.key === p.key ? { ...item, state: "Landed", tagClass: "fw-tag-accent" } : item,
            ),
          );
          return null;
        }
        return p;
      });
      if (next >= MAX_CHUNKS) {
        if (timerRef.current) clearInterval(timerRef.current);
        setStatus("done");
      }
      return next;
    });
  }

  function reset() {
    if (timerRef.current) clearInterval(timerRef.current);
    setStatus("idle");
    setChunk(0);
    setCurrentId("initial");
    setPending(null);
    setSelectedId("");
    setCustomText("");
    setHistory([]);
  }

  const allBeats = [SCENE.initial, ...SCENE.evolutions, ...extraBeatsRef.current];
  const current = allBeats.find((b) => b.id === currentId) ?? SCENE.initial;
  const isIdle = status === "idle";
  const isPriming = status === "priming";
  const isLive = status === "live";
  const isDone = status === "done";

  const steerable = [...SCENE.evolutions, ...extraBeatsRef.current];
  const options = [
    { id: "", label: "Choose a step…", disabled: false },
    ...steerable.map((b) => ({ id: b.id, label: b.title, disabled: b.id === currentId })),
    { id: "custom", label: "Something else…", disabled: false },
  ];
  const selected = steerable.find((b) => b.id === selectedId);
  const showCustom = selectedId === "custom";
  const canSteer = isLive && !pending && (!!selected || (showCustom && customText.trim().length > 0));

  const [statusLabel, statusColor, statusAnim] = STATUS_META[status];
  const idx = Math.max(0, allBeats.findIndex((b) => b.id === currentId));
  const videoFilter = [
    "grayscale(1) contrast(1.08)",
    isPriming ? "blur(6px)" : isLive && pending ? "blur(2px)" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const videoScale = isIdle ? 1 : 1 + 0.02 * idx;

  const selectedHint = pending
    ? `"${pending.title}" lands at the next chunk boundary…`
    : selected
      ? selected.hint
      : showCustom
        ? "Write what visibly changes next."
        : isLive
          ? "Pick a step from the dropdown, then steer."
          : "Enter the world first; steering opens once it is live.";

  function steer() {
    if (!canSteer) return;
    const key = "k" + Date.now();
    let item: Beat;
    if (showCustom) {
      item = { id: "custom-" + key, title: customText.trim().slice(0, 60), narration: "" };
      extraBeatsRef.current = [...extraBeatsRef.current, item];
    } else if (selected) {
      item = selected;
    } else {
      return;
    }
    setPending({ id: item.id, title: item.title, key, landsAt: chunk + 2 });
    setSelectedId("");
    setCustomText("");
    setHistory((h) => [...h, { key, at: elapsed(), title: item.title, state: "Queued", tagClass: "fw-tag-neutral" }]);
  }

  const stepCount = history.length ? plural(history.length, "step") : "";

  return (
    <>
      <section
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "end",
          gap: "16px 32px",
          flexWrap: "wrap",
          padding: "36px 0 20px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span
            style={{
              fontSize: 13,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--color-accent-700)",
            }}
          >
            {SCENE.kicker}
          </span>
          <h1 style={{ fontSize: "clamp(32px, 4.2vw, 56px)", lineHeight: 1.04, margin: "0 0 0 -0.04em" }}>
            {SCENE.title}
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: statusColor,
              display: "block",
              animation: statusAnim,
            }}
          />
          <span
            style={{
              fontSize: 13,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontFeatureSettings: "'tnum' 1",
            }}
          >
            {statusLabel}
          </span>
          <span style={{ fontSize: 13, color: "var(--color-neutral-700)", fontFeatureSettings: "'tnum' 1" }}>
            {isIdle ? "Seeded from the photograph" : `chunk ${chunk} · ${elapsed()}`}
          </span>
        </div>
      </section>

      <hr className="fw-hr" />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)",
          gap: "0 clamp(24px, 4vw, 56px)",
          padding: "24px 0 48px",
        }}
      >
        <section style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0, gridColumn: "1 / -1" }}>
          <div
            style={{
              position: "relative",
              aspectRatio: "832 / 480",
              background: "var(--color-neutral-900)",
              overflow: "hidden",
              display: "flex",
              alignItems: "flex-end",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- filter/scale is driven by local sim state, not a static asset */}
            <img
              src={SCENE.image}
              alt={SCENE.title}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                filter: videoFilter,
                transform: `scale(${videoScale})`,
                transition: "filter 1.6s ease, transform 8s linear",
              }}
            />
            {!isLive && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(20,17,15,0.55)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  padding: "clamp(16px, 3vw, 28px)",
                  color: "#fff",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--color-accent-300)",
                  }}
                >
                  {isIdle ? "Ready to enter" : isPriming ? "Priming · first frames arriving" : "Generation complete"}
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-start" }}>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: "clamp(22px, 3vw, 36px)",
                      lineHeight: 1.06,
                      letterSpacing: "-0.015em",
                      maxWidth: "24ch",
                    }}
                  >
                    {isIdle
                      ? "A single photograph. Step inside and walk the street."
                      : isPriming
                        ? "Building the world from your photograph…"
                        : "The run reached its end. Start again to keep exploring."}
                  </span>
                  {isIdle && (
                    <button
                      type="button"
                      className="fw-btn fw-btn-primary"
                      onClick={start}
                      style={{ justifyContent: "flex-start", whiteSpace: "nowrap", padding: "14px 20px", fontSize: 15 }}
                    >
                      Enter their world →
                    </button>
                  )}
                </div>
              </div>
            )}
            {isLive && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: "clamp(14px, 2.4vw, 24px)",
                  background: "linear-gradient(to top, rgba(20,17,15,0.85), rgba(20,17,15,0))",
                  color: "#fff",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--color-accent-300)",
                  }}
                >
                  Now showing
                </span>
                <span style={{ fontWeight: 700, fontSize: "clamp(18px, 2.2vw, 26px)", lineHeight: 1.1 }}>
                  {current.title}
                </span>
                {!!current.narration && (
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 15,
                      lineHeight: "24px",
                      maxWidth: "70ch",
                      color: "var(--color-neutral-300)",
                    }}
                  >
                    {current.narration}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 18, minWidth: 0 }}>
          <span
            style={{
              fontSize: 13,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--color-accent-700)",
            }}
          >
            Steer the world
          </span>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, alignItems: "end" }}>
            <div className="fw-field">
              <label htmlFor="steer">Where next?</label>
              <select
                id="steer"
                className="fw-input"
                value={selectedId}
                disabled={!isLive}
                onChange={(e) => setSelectedId(e.target.value)}
                style={{ width: "100%" }}
              >
                {options.map((o) => (
                  <option key={o.id || "none"} value={o.id} disabled={o.disabled}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="fw-btn fw-btn-primary"
              onClick={steer}
              disabled={!canSteer}
              style={{ justifyContent: "flex-start", whiteSpace: "nowrap", padding: "12px 18px" }}
            >
              Steer
            </button>
          </div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: "22px", color: "var(--color-neutral-700)" }}>
            {selectedHint}
          </p>
          {showCustom && (
            <div className="fw-field">
              <label htmlFor="custom">Describe one change</label>
              <textarea
                id="custom"
                className="fw-input"
                rows={3}
                placeholder="A neighbor crosses the alley carrying a basket of fish."
                value={customText}
                disabled={!isLive}
                onChange={(e) => setCustomText(e.target.value)}
              />
              <span style={{ fontSize: 12, lineHeight: "18px", color: "var(--color-neutral-700)" }}>
                One visible change at a time. The world keeps everything you don&apos;t mention.
              </span>
            </div>
          )}
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              borderTop: "2px solid var(--color-divider)",
              paddingTop: 14,
            }}
          >
            {isLive && (
              <button type="button" className="fw-btn fw-btn-secondary" onClick={reset} style={{ whiteSpace: "nowrap" }}>
                Reset world
              </button>
            )}
            {isDone && (
              <button
                type="button"
                className="fw-btn fw-btn-primary"
                onClick={start}
                style={{ justifyContent: "flex-start", whiteSpace: "nowrap" }}
              >
                Run again
              </button>
            )}
          </div>
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 18, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
            <span
              style={{
                fontSize: 13,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--color-accent-700)",
              }}
            >
              The path so far
            </span>
            <span style={{ fontSize: 13, color: "var(--color-neutral-700)", fontFeatureSettings: "'tnum' 1" }}>
              {stepCount}
            </span>
          </div>
          <ol
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              borderTop: "2px solid var(--color-divider)",
            }}
          >
            {history.map((h) => (
              <li
                key={h.key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "56px minmax(0, 1fr) auto",
                  gap: 12,
                  padding: "10px 0",
                  borderBottom: "1px solid var(--color-neutral-300)",
                  fontSize: 14,
                  lineHeight: "20px",
                }}
              >
                <span style={{ color: "var(--color-neutral-700)", fontFeatureSettings: "'tnum' 1" }}>{h.at}</span>
                <span style={{ fontWeight: 600 }}>{h.title}</span>
                <span className={`fw-tag ${h.tagClass}`} style={{ whiteSpace: "nowrap" }}>
                  {h.state}
                </span>
              </li>
            ))}
          </ol>
          {history.length === 0 && (
            <p style={{ margin: 0, fontSize: 14, lineHeight: "22px", color: "var(--color-neutral-700)" }}>
              Each step you take is listed here. Changes land at the next chunk boundary, usually 2–4 seconds.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
