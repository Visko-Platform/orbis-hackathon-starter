"use client";

import { useMemo, useState } from "react";

import { Avatar } from "@/components/avatar";
import {
  loadSettings,
  removeProfile,
  saveSettings,
  updateProfile,
  type Profile,
  type Settings,
} from "@/lib/profile";
import { deleteBooksFor } from "@/lib/shelf";

// A gear in the corner, a simple times-table gate, then the things a parent
// would actually want. Nobody at the demo will open it; everybody will notice
// that it's there.
export function GrownUps({
  profiles,
  activeId,
  onClose,
  onChanged,
}: {
  profiles: Profile[];
  activeId: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const gate = useMemo(() => {
    const a = 3 + Math.floor(Math.random() * 6);
    const b = 4 + Math.floor(Math.random() * 6);
    return { a, b, answer: a * b };
  }, []);
  const [entry, setEntry] = useState("");
  const [open, setOpen] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [confirmWipe, setConfirmWipe] = useState<string | null>(null);

  const press = (digit: string) => {
    const next = (entry + digit).slice(0, 3);
    setEntry(next);
    setWrong(false);
    if (Number(next) === gate.answer) setTimeout(() => setOpen(true), 180);
    else if (next.length >= String(gate.answer).length) {
      setWrong(true);
      setTimeout(() => {
        setEntry("");
        setWrong(false);
      }, 700);
    }
  };

  const update = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
    onChanged();
  };

  return (
    <div className="sb-gu" onClick={onClose}>
      <div className="sb-gu-card" onClick={(e) => e.stopPropagation()}>
        {!open ? (
          <div className="sb-gu-gate">
            <div className="sb-gu-title">grown-ups only</div>
            <div className="sb-gu-sub">
              what is {gate.a} × {gate.b}?
            </div>
            <div className={`sb-gu-entry ${wrong ? "wrong" : ""}`}>{entry || "·"}</div>
            <div className="sb-gu-pad">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "←", "0", "✕"].map((k) => (
                <button
                  key={k}
                  className="sb-gu-key"
                  onClick={() => {
                    if (k === "←") setEntry((e) => e.slice(0, -1));
                    else if (k === "✕") onClose();
                    else press(k);
                  }}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="sb-gu-panel">
            <div className="sb-gu-head">
              <div className="sb-gu-title">grown-ups corner</div>
              <button className="sb-mini sb-mini-text" onClick={onClose}>
                done
              </button>
            </div>

            <div className="sb-gu-section">
              <div className="sb-gu-label">how long a scene plays</div>
              <div className="sb-gu-row">
                <input
                  type="range"
                  min={30}
                  max={180}
                  step={15}
                  value={settings.sceneSeconds}
                  onChange={(e) => update({ sceneSeconds: Number(e.target.value) })}
                />
                <span className="sb-gu-value">{settings.sceneSeconds}s</span>
              </div>
              <div className="sb-gu-hint">
                a scene turns into a page when the time runs out, or when your kid says “the end”.
              </div>
            </div>

            <div className="sb-gu-section">
              <div className="sb-gu-label">read stories aloud</div>
              <button
                className={`sb-gu-toggle ${settings.narrate ? "on" : ""}`}
                onClick={() => update({ narrate: !settings.narrate })}
                aria-pressed={settings.narrate}
              >
                <span />
              </button>
            </div>

            <div className="sb-gu-section">
              <div className="sb-gu-label">storytellers</div>
              {profiles.map((p) => (
                <div key={p.id} className="sb-gu-profile">
                  <span className="sb-gu-face">
                    <Avatar id={p.avatar} />
                  </span>
                  <input
                    className="sb-gu-name"
                    defaultValue={p.name}
                    maxLength={16}
                    onBlur={(e) => {
                      updateProfile(p.id, { name: e.target.value });
                      onChanged();
                    }}
                  />
                  {p.id === activeId && <span className="sb-gu-tag">here now</span>}
                  <button
                    className="sb-gu-del"
                    onClick={() => {
                      if (confirmWipe === p.id) {
                        void deleteBooksFor(p.id).then(() => {
                          removeProfile(p.id);
                          setConfirmWipe(null);
                          onChanged();
                        });
                      } else setConfirmWipe(p.id);
                    }}
                  >
                    {confirmWipe === p.id ? "delete, books and all?" : "delete"}
                  </button>
                </div>
              ))}
            </div>

            <div className="sb-gu-foot">
              storybooks · everything stays on this device
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
