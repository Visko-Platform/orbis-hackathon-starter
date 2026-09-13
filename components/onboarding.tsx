"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Avatar } from "@/components/avatar";
import { Backdrop } from "@/components/backdrop";
import { AVATARS, addProfile, tidyName, type AvatarId, type Profile } from "@/lib/profile";

type Step = "name" | "ears" | "hello";

// Two short steps before the theme picker. The second one is doing real work:
// it gets the microphone permission out of the way while it is still charming,
// instead of mid-story when a kid is mid-sentence.
export function Onboarding({ onDone }: { onDone: (p: Profile) => void }) {
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<AvatarId>(
    () => AVATARS[Math.floor(Math.random() * AVATARS.length)].id,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const clean = tidyName(name);

  useEffect(() => {
    if (step === "name") setTimeout(() => inputRef.current?.focus(), 400);
  }, [step]);

  const finish = useCallback(() => {
    const profile = addProfile(clean || "Friend", avatar);
    setStep("hello");
    setTimeout(() => onDone(profile), 1500);
  }, [clean, avatar, onDone]);

  return (
    <div className="sb-onb">
      <Backdrop />
      <div className="sb-onb-inner">
        {step === "name" && (
          <div className="sb-onb-step" key="name">
            <div className="sb-onb-eyebrow">welcome to</div>
            <div className="sb-title sb-onb-title">
              storybooks<span className="sb-dots"><i>.</i><i>.</i><i>.</i></span>
            </div>
            <div className="sb-onb-q">what should we call you?</div>
            <form
              className="sb-onb-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (clean) setStep("ears");
              }}
            >
              <input
                ref={inputRef}
                className="sb-onb-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="your first name"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={16}
                aria-label="your first name"
              />
              <button className="sb-onb-go" type="submit" disabled={!clean}>
                that’s me →
              </button>
            </form>

            <div className="sb-onb-pick-label">pick your buddy</div>
            <div className="sb-onb-avatars">
              {AVATARS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`sb-onb-avatar ${a.id === avatar ? "on" : ""}`}
                  onClick={() => setAvatar(a.id)}
                  aria-label={a.label}
                >
                  <Avatar id={a.id} />
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "ears" && <EarsStep name={clean} avatar={avatar} onDone={finish} />}

        {step === "hello" && (
          <div className="sb-onb-step sb-onb-hello" key="hello">
            <div className="sb-onb-bigavatar">
              <Avatar id={avatar} />
            </div>
            <div className="sb-onb-q sb-onb-q-big">hi, {clean || "friend"}!</div>
            <div className="sb-onb-note">let’s make a story</div>
          </div>
        )}
      </div>
    </div>
  );
}

// Microphone check: asks for permission, then shows the kid their own voice
// moving five bars. Advances by itself once it actually hears something.
function EarsStep({
  name,
  avatar,
  onDone,
}: {
  name: string;
  avatar: AvatarId;
  onDone: () => void;
}) {
  const [state, setState] = useState<"asking" | "listening" | "heard" | "denied">("asking");
  const [level, setLevel] = useState(0);
  const stream = useRef<MediaStream | null>(null);
  const raf = useRef<number>(0);
  const heard = useRef(false);

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);

  const listen = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      setState("listening");
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const src = ctx.createMediaStreamSource(s);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i] - 128) / 128);
        setLevel((cur) => cur * 0.6 + peak * 0.4);
        if (peak > 0.11 && !heard.current) {
          heard.current = true;
          setState("heard");
          setTimeout(() => {
            stop();
            void ctx.close();
            onDone();
          }, 1400);
          return;
        }
        raf.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      setState("denied");
    }
  }, [onDone, stop]);

  useEffect(() => {
    const t = setTimeout(() => void listen(), 600);
    return () => {
      clearTimeout(t);
      stop();
    };
  }, [listen, stop]);

  return (
    <div className="sb-onb-step" key="ears">
      <div className="sb-onb-bigavatar">
        <Avatar id={avatar} />
      </div>
      <div className="sb-onb-q">
        {state === "heard"
          ? `I can hear you, ${name}!`
          : state === "denied"
            ? "I can’t hear you yet"
            : `can you say hi, ${name}?`}
      </div>
      <div className="sb-onb-note">
        {state === "denied"
          ? "turn the microphone on in your browser, or keep going and tap instead"
          : state === "heard"
            ? "perfect"
            : "storybooks listens to you tell the story"}
      </div>

      {state !== "denied" && (
        <div className={`sb-onb-bars ${state === "heard" ? "on" : ""} ${state === "listening" ? "waiting" : ""}`} aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => {
            const w = [0.5, 0.8, 1, 0.8, 0.5][i];
            const h = state === "heard" ? 1 : Math.min(1, 0.2 + level * w * 3.2);
            return <i key={i} style={{ transform: `scaleY(${h})` }} />;
          })}
        </div>
      )}

      <button className="sb-onb-go sb-onb-skip" onClick={onDone}>
        {state === "denied" ? "keep going →" : "skip"}
      </button>
    </div>
  );
}
