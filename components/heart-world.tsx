"use client";

import { useEffect, useRef, useState } from "react";

import {
  HEART_ZONES,
  MAX_SCALE_BPM,
  buildWorldPrompt,
  type HeartSample,
  type Trend,
  zoneForBpm,
} from "@/lib/heart-world";
import type { OrbisSession } from "@/hooks/use-orbis-session";

type Source = "manual" | "watch" | "replay";

const REPLAY_SPEED = 20; // 1 real second of the activity per 50ms tick

// Orbis applies a prompt at the next chunk boundary (~1.8s). Steering faster
// than that just queues prompts the model will never show.
const MIN_STEER_MS = 4000;
const BPM_DELTA = 4;
const TREND_DELTA = 3;

export function HeartWorld({ session }: { session: OrbisSession }) {
  const [source, setSource] = useState<Source>("manual");
  const [bpm, setBpm] = useState(62);
  const [auto, setAuto] = useState(true);
  const [deviceName, setDeviceName] = useState("");
  const [bleError, setBleError] = useState("");
  const [replay, setReplay] = useState<HeartSample[]>([]);
  const [replayName, setReplayName] = useState("");

  const replayIndex = useRef(0);
  const bpmRef = useRef(bpm);
  const steeredAt = useRef(0);
  const steeredBpm = useRef(-99);
  const history = useRef<number[]>([]);
  const [lastSteer, setLastSteer] = useState("");

  const zone = zoneForBpm(bpm);
  const live = session.connected && session.runStarted;

  bpmRef.current = bpm;

  // The whole product: the body moves, the world follows. The prompt is
  // rebuilt from the exact BPM and its direction, not from five fixed states.
  useEffect(() => {
    if (!auto || !live) return;

    const timer = setInterval(() => {
      const current = bpmRef.current;
      history.current = [...history.current, current].slice(-6);

      const now = Date.now();
      if (now - steeredAt.current < MIN_STEER_MS) return;
      if (Math.abs(current - steeredBpm.current) < BPM_DELTA) return;

      const oldest = history.current[0] ?? current;
      const drift = current - oldest;
      const trend: Trend =
        drift > TREND_DELTA ? "up" : drift < -TREND_DELTA ? "down" : "flat";

      steeredAt.current = now;
      steeredBpm.current = current;
      const nextPrompt = buildWorldPrompt(current, trend);
      setLastSteer(`${current} BPM · ${trend}`);
      void session.steerWith(nextPrompt);
    }, 1000);

    return () => clearInterval(timer);
  }, [auto, live, session]);

  // Source A — the watch, over Bluetooth. No cloud, no phone, no sync.
  const connectWatch = async () => {
    setBleError("");
    const bluetooth = (navigator as unknown as { bluetooth?: any }).bluetooth;
    if (!bluetooth) {
      setBleError("This browser has no Web Bluetooth. Use Chrome.");
      return;
    }
    try {
      const device = await bluetooth.requestDevice({
        filters: [{ services: ["heart_rate"] }],
      });
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService("heart_rate");
      const characteristic = await service.getCharacteristic(
        "heart_rate_measurement",
      );
      await characteristic.startNotifications();
      characteristic.addEventListener(
        "characteristicvaluechanged",
        (event: any) => {
          const value = event.target.value as DataView;
          const flags = value.getUint8(0);
          // Bit 0 of the flags byte picks the uint8 or uint16 BPM format.
          setBpm(flags & 0x1 ? value.getUint16(1, true) : value.getUint8(1));
        },
      );
      device.addEventListener("gattserverdisconnected", () =>
        setDeviceName(""),
      );
      setDeviceName(device.name || "Heart rate monitor");
      setSource("watch");
    } catch (caught) {
      setBleError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  // Source B — a real Garmin activity, replayed as the world clock.
  const loadReplay = async () => {
    try {
      const response = await fetch("/hr-replay.json", { cache: "no-store" });
      if (!response.ok) throw new Error("No hr-replay.json in public/");
      const data = (await response.json()) as {
        name?: string;
        samples: HeartSample[];
      };
      if (!data.samples?.length) throw new Error("Replay has no samples");
      setReplay(data.samples);
      setReplayName(data.name || "Garmin activity");
      replayIndex.current = 0;
      setSource("replay");
    } catch (caught) {
      setBleError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  useEffect(() => {
    if (source !== "replay" || !replay.length) return;
    const timer = setInterval(() => {
      replayIndex.current = (replayIndex.current + REPLAY_SPEED) % replay.length;
      setBpm(replay[replayIndex.current].bpm);
    }, 50);
    return () => clearInterval(timer);
  }, [replay, source]);

  return (
    <section className="heart-world">
      <header className="heart-head">
        <div>
          <p className="eyebrow">Fuente</p>
          <div className="button-row">
            <button
              className={source === "manual" ? "" : "secondary"}
              onClick={() => setSource("manual")}
              type="button"
            >
              Slider
            </button>
            <button
              className={source === "watch" ? "" : "secondary"}
              onClick={connectWatch}
              type="button"
            >
              {deviceName || "Conectar reloj"}
            </button>
            <button
              className={source === "replay" ? "" : "secondary"}
              onClick={loadReplay}
              type="button"
            >
              {replayName || "Replay Garmin"}
            </button>
          </div>
        </div>

        <label className="auto-toggle">
          <input
            checked={auto}
            onChange={(event) => setAuto(event.target.checked)}
            type="checkbox"
          />
          Steer automático
        </label>
      </header>

      <div className="bpm-readout" style={{ color: zone.color }}>
        <strong>{bpm}</strong>
        <span>BPM · {zone.label}</span>
      </div>

      <div className="zone-track">
        {HEART_ZONES.map((entry) => (
          <span
            className={entry.id === zone.id ? "zone on" : "zone"}
            key={entry.id}
            style={{ background: entry.id === zone.id ? entry.color : undefined }}
          >
            {entry.label}
          </span>
        ))}
      </div>

      {source === "manual" ? (
        <input
          max={MAX_SCALE_BPM}
          min={40}
          onChange={(event) => setBpm(Number(event.target.value))}
          type="range"
          value={bpm}
        />
      ) : null}

      <p className="hint">
        {live
          ? auto
            ? lastSteer
              ? `Último steer: ${lastSteer}`
              : "El mundo sigue tus pulsaciones."
            : "Steer automático apagado."
          : "Conectá Orbis y apretá Start para que el mundo reaccione."}
      </p>

      {bleError ? <p className="error">{bleError}</p> : null}
    </section>
  );
}
