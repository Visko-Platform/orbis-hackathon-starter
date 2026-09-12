"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Badge, Button, Icon, SegmentedControl, Switch } from "@/components/ui";

import {
  MAX_SCALE_BPM,
  buildWorldPrompt,
  type HeartSample,
  type Trend,
  zoneForBpm,
  zonesFor,
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
  const watchDevice = useRef<any>(null);
  const [bleError, setBleError] = useState("");
  const [replay, setReplay] = useState<HeartSample[]>([]);
  const [replayName, setReplayName] = useState("");
  const [sourceBusy, setSourceBusy] = useState(false);
  const [bpmDraft, setBpmDraft] = useState<string | null>(null);
  const [promptApplied, setPromptApplied] = useState(false);
  const sourceRef = useRef<Source>(source);
  sourceRef.current = source;

  const replayIndex = useRef(0);
  const bpmRef = useRef(bpm);
  const steeredAt = useRef(0);
  const steeredBpm = useRef(-99);
  const steeredWorld = useRef<string | undefined>(undefined);
  const history = useRef<number[]>([]);
  const [lastSteer, setLastSteer] = useState("");

  const zone = zoneForBpm(bpm);
  const zones = zonesFor(false);
  const live = session.connected && session.runStarted && !session.paused;
  bpmRef.current = bpm;

  // Connecting is the only intent: as soon as the session is ready, the
  // world for the current BPM starts on its own. Stopping stays manual.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!session.connected) {
      autoStarted.current = false;
      return;
    }
    if (autoStarted.current || session.runStarted || session.controlsBusy) {
      return;
    }
    autoStarted.current = true;
    steeredWorld.current = zoneForBpm(bpmRef.current).id;
    void session.startWith(buildWorldPrompt(bpmRef.current, "flat"));
  }, [session]);

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
      // Pass the world we are leaving so the prompt asks Orbis to morph out
      // of it instead of cutting.
      const nextPrompt = buildWorldPrompt(
        current,
        trend,
        false,
        steeredWorld.current,
      );
      steeredWorld.current = zoneForBpm(current).id;
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
    setSourceBusy(true);
    try {
      const device = await bluetooth.requestDevice({
        filters: [{ services: ["heart_rate"] }],
      });
      watchDevice.current = device;
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService("heart_rate");
      const characteristic = await service.getCharacteristic(
        "heart_rate_measurement",
      );
      await characteristic.startNotifications();
      characteristic.addEventListener(
        "characteristicvaluechanged",
        (event: any) => {
          if (sourceRef.current !== "watch") return;
          const value = event.target.value as DataView;
          const flags = value.getUint8(0);
          // Bit 0 of the flags byte picks the uint8 or uint16 BPM format.
          setBpm(flags & 0x1 ? value.getUint16(1, true) : value.getUint8(1));
        },
      );
      device.addEventListener("gattserverdisconnected", () => {
        setDeviceName("");
        if (sourceRef.current === "watch") {
          setSource("manual");
          setBleError(
            "Watch disconnected. Use the slider or reconnect your watch.",
          );
        }
      });
      setDeviceName(device.name || "Heart rate monitor");
      sourceRef.current = "watch";
      setSource("watch");
    } catch (caught) {
      setBleError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSourceBusy(false);
    }
  };

  // Source B — a real Garmin activity, replayed as the world clock.
  const loadReplay = async () => {
    setBleError("");
    setSourceBusy(true);
    try {
      const response = await fetch("/hr-replay.json", { cache: "no-store" });
      if (!response.ok)
        throw new Error(
          "No saved activity is available yet. Try the slider or connect a watch.",
        );
      const data = (await response.json()) as {
        name?: string;
        samples: HeartSample[];
      };
      if (
        !Array.isArray(data.samples) ||
        !data.samples.length ||
        data.samples.some(
          (sample) =>
            !Number.isFinite(sample.bpm) || !Number.isFinite(sample.t),
        )
      )
        throw new Error("This activity has no valid heart-rate samples.");
      setReplay(data.samples);
      setReplayName(data.name || "Garmin activity");
      replayIndex.current = 0;
      setBpm(data.samples[0].bpm);
      setSource("replay");
    } catch (caught) {
      setBleError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSourceBusy(false);
    }
  };

  useEffect(() => {
    if (source !== "replay" || !replay.length) return;
    const timer = setInterval(() => {
      replayIndex.current =
        (replayIndex.current + REPLAY_SPEED) % replay.length;
      setBpm(replay[replayIndex.current].bpm);
    }, 50);
    return () => clearInterval(timer);
  }, [replay, source]);

  const updateManualBpm = (next: number) => {
    setSource("manual");
    setBpm(Math.min(MAX_SCALE_BPM, Math.max(40, Math.round(next))));
    setBpmDraft(null);
    setPromptApplied(false);
  };
  const commitBpm = () => {
    if (bpmDraft?.trim() && Number.isFinite(Number(bpmDraft)))
      updateManualBpm(Number(bpmDraft));
    else setBpmDraft(null);
  };

  const disconnectWatch = () => {
    const device = watchDevice.current;
    try {
      device?.gatt?.disconnect();
    } catch {
      // Already gone; clearing the UI below is all that is left to do.
    }
    watchDevice.current = null;
    setDeviceName("");
    setSource("manual");
  };

  return (
    <section
      id="heart-world"
      className="heart-world panel"
      aria-labelledby="heart-heading"
    >
      <div className="panel-heading">
        <h2 id="heart-heading" className="heading-6">
          <Icon name="activity" />
          Heart world
        </h2>
        <Badge tone="brand">Interactive</Badge>
      </div>
      <div className="heart-content">
        <div className="heart-session">
          <Button
            variant="default"
            disabled={session.controlsBusy}
            onClick={
              session.connected
                ? session.disconnectSession
                : session.connectSession
            }
          >
            {session.connected ? "Disconnect" : "Connect"}
          </Button>
          <Button
            variant="secondary"
            disabled={!session.connected || session.controlsBusy}
            onClick={() =>
              session.runStarted
                ? session.reset()
                : session.startWith(buildWorldPrompt(bpm, "flat"))
            }
          >
            {session.runStarted ? "Stop world" : "Start live world"}
          </Button>
          <Badge tone={session.connected ? "brand" : undefined}>
            {session.status}
          </Badge>
        </div>

        <div className="heart-intro">
          <p className="body-sm muted">Your heartbeat changes the story.</p>
          <span className="caption muted">7 worlds to explore</span>
        </div>
        <div className="heart-source-row">
          <SegmentedControl<Source>
            label="Heart-rate source"
            value={source}
            disabled={sourceBusy}
            options={[
              {
                value: "manual",
                label: "Slider",
                icon: <Icon name="sliders" />,
              },
              { value: "watch", label: "Watch", icon: <Icon name="watch" /> },
              {
                value: "replay",
                label: "Replay",
                icon: <Icon name="replay" />,
              },
            ]}
            onValueChange={(next) => {
              setBleError("");
              if (next === "watch") {
                if (deviceName) setSource("watch");
                else void connectWatch();
              } else if (next === "replay") {
                if (replay.length) setSource("replay");
                else void loadReplay();
              } else setSource("manual");
            }}
          />
          {deviceName ? (
            <Button variant="ghost" size="sm" onClick={disconnectWatch}>
              Disconnect watch
            </Button>
          ) : null}
          <span className="caption muted" role="status">
            {sourceBusy
              ? "Connecting source…"
              : source === "watch"
                ? deviceName
                : source === "replay"
                  ? replayName
                  : "You’re in control"}
          </span>
        </div>

        <div className="heart-meter">
          <div className="bpm-readout">
            <span className="heart-pulse">
              <Icon name="activity" />
            </span>
            <strong>{bpm}</strong>
            <span className="caption muted">BPM</span>
          </div>
          <div className="current-world">
            <span className="caption muted">Current world</span>
            <strong className="heading-5">{zone.label}</strong>
          </div>
        </div>
        <div className="manual-row">
          <div className="slider-field">
            <label htmlFor="heart-rate" className="sr-only">
              Heart rate
            </label>
            <input
              id="heart-rate"
              max={MAX_SCALE_BPM}
              min={40}
              onChange={(event) => updateManualBpm(Number(event.target.value))}
              type="range"
              value={bpm}
              style={
                {
                  "--range-progress": `${Math.min(
                    100,
                    Math.max(0, ((bpm - 40) / (MAX_SCALE_BPM - 40)) * 100),
                  )}%`,
                } as CSSProperties
              }
            />
            <div className="slider-labels caption muted">
              <span>40 · Rest</span>
              <span>220 · Beyond</span>
            </div>
          </div>
          <label className="manual-entry">
            <span className="sr-only">Set BPM</span>
            <input
              aria-label="Set BPM"
              max={MAX_SCALE_BPM}
              min={40}
              step={1}
              onChange={(event) => setBpmDraft(event.target.value)}
              onBlur={commitBpm}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitBpm();
                }
              }}
              type="number"
              value={bpmDraft ?? bpm}
            />
          </label>
        </div>

        <div className="zone-track" role="group" aria-label="Choose a world">
          {zones.map((entry, index) => (
            <button
              type="button"
              className="zone"
              aria-pressed={entry.id === zone.id}
              key={entry.id}
              onClick={() => updateManualBpm(entry.minBpm || 62)}
            >
              <span className="zone-number caption">
                {String(index + 1).padStart(2, "0")}
                {entry.id === zone.id && <Icon name="check" />}
              </span>
              <strong>{entry.label}</strong>
              <span className="caption">
                {entry.minBpm ? `${entry.minBpm}+` : "Rest"}
              </span>
            </button>
          ))}
        </div>

        <div className="heart-options">
          <Switch
            checked={auto}
            onCheckedChange={setAuto}
            label="Auto-steer"
            description="Let your pulse direct the scene"
          />
        </div>
        <div className="heart-footer">
          <p className="caption muted" role="status">
            {session.paused
              ? "Generation paused. Resume to follow your heart rate."
              : live
                ? auto
                  ? lastSteer
                    ? `Last update: ${lastSteer}`
                    : "The world follows your heart rate."
                  : "Auto-steer is off. Apply a world when you’re ready."
                : promptApplied
                  ? "World added to your scene. Ready to generate."
                  : "Choose a world and add it to your scene."}
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={session.controlsBusy}
            onClick={() => {
              const prompt = buildWorldPrompt(bpm, "flat");
              session.setPrompt(prompt);
              if (live) void session.steerWith(prompt);
              setPromptApplied(true);
            }}
          >
            {promptApplied ? <Icon name="check" /> : <Icon name="arrow" />}
            {live ? "Apply world" : "Use this world"}
          </Button>
        </div>
        {bleError && (
          <p className="error body-sm" role="alert">
            {bleError}
          </p>
        )}
      </div>
    </section>
  );
}
