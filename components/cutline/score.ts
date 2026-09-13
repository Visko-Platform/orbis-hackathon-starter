"use client";
import { useEffect, useRef } from "react";

/**
 * Adaptive ambient score for the whole Cutline experience.
 * Generated live with Web Audio (no audio files, nothing copyrighted): a
 * slow evolving pad, a sub drone, filtered air, sparse sine "stars", and a
 * generated reverb. Every chapter has its own key, chord, brightness and
 * texture, and the score ducks underneath Orbis's own live audio.
 */
export interface ScoreInput {
  chapter: number; // 0 multiverse … 8 film
  opening: boolean;
  liveAudio: boolean; // Orbis audio audible → duck the score
  enabled: boolean;
}
interface Profile {
  root: number;
  chord: number[];
  cutoff: number;
  air: number;
  sparkle: number; // seconds between star notes (0 = none)
  level: number;
}
const PROFILES: Profile[] = [
  { root: 36.71, chord: [1, 1.5, 2, 3, 4.5], cutoff: 380, air: 0.05, sparkle: 4.5, level: 0.9 }, // multiverse
  { root: 41.2, chord: [1, 1.498, 2.245, 3, 4], cutoff: 620, air: 0.06, sparkle: 2.8, level: 1 }, // universe
  { root: 49, chord: [1, 1.2, 1.5, 2.4, 3], cutoff: 820, air: 0.07, sparkle: 2.2, level: 1 }, // cosmic web
  { root: 55, chord: [1, 1.25, 1.5, 2, 3], cutoff: 1200, air: 0.05, sparkle: 1.6, level: 1 }, // Milky Way
  { root: 65.41, chord: [1, 1.25, 1.5, 1.875, 2.5], cutoff: 1600, air: 0.04, sparkle: 1.3, level: 1 }, // solar
  { root: 73.42, chord: [1, 1.25, 1.5, 2, 2.5], cutoff: 1300, air: 0.05, sparkle: 1.8, level: 0.95 }, // Earth
  { root: 82.41, chord: [1, 1.2, 1.5, 1.8, 2.4], cutoff: 900, air: 0.11, sparkle: 3.2, level: 0.9 }, // San Francisco
  { root: 49, chord: [1, 1.5, 2, 2.5], cutoff: 480, air: 0.03, sparkle: 0, level: 0.6 }, // theater
  { root: 43.65, chord: [1, 1.189, 1.498, 2, 2.378], cutoff: 760, air: 0.06, sparkle: 3.6, level: 0.85 }, // film
];

class Score {
  private ctx: AudioContext;
  private master: GainNode;
  private duck: GainNode;
  private filter: BiquadFilterNode;
  private pad: { osc: OscillatorNode; gain: GainNode }[] = [];
  private sub: OscillatorNode;
  private subGain: GainNode;
  private air: GainNode;
  private timer = 0;
  private profile: Profile = PROFILES[0];
  private lfo: OscillatorNode;
  constructor() {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    this.ctx = new Ctx();
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.duck = ctx.createGain();
    this.duck.gain.value = 1;
    const reverb = ctx.createConvolver();
    reverb.buffer = this.impulse(5.5, 2.4);
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    const dry = ctx.createGain();
    dry.gain.value = 0.7;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 500;
    this.filter.Q.value = 0.7;
    this.filter.connect(dry).connect(this.duck);
    this.filter.connect(reverb).connect(wet).connect(this.duck);
    this.duck.connect(this.master).connect(ctx.destination);
    // Slow breathing on the filter.
    this.lfo = ctx.createOscillator();
    this.lfo.frequency.value = 0.045;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 140;
    this.lfo.connect(lfoGain).connect(this.filter.frequency);
    this.lfo.start();
    // Pad: detuned voices per chord tone.
    for (let i = 0; i < 5; i++) {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      const osc = ctx.createOscillator();
      osc.type = i % 2 ? "triangle" : "sawtooth";
      osc.detune.value = (i - 2) * 4;
      osc.connect(gain).connect(this.filter);
      osc.start();
      this.pad.push({ osc, gain });
    }
    // Sub drone.
    this.sub = ctx.createOscillator();
    this.sub.type = "sine";
    this.subGain = ctx.createGain();
    this.subGain.gain.value = 0.16;
    this.sub.connect(this.subGain).connect(this.duck);
    this.sub.start();
    // Air: filtered noise texture.
    const noise = ctx.createBufferSource();
    const seconds = 4;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02; // brown-ish
      data[i] = last * 3.5;
    }
    noise.buffer = buffer;
    noise.loop = true;
    const airFilter = ctx.createBiquadFilter();
    airFilter.type = "bandpass";
    airFilter.frequency.value = 900;
    airFilter.Q.value = 0.5;
    this.air = ctx.createGain();
    this.air.gain.value = 0;
    noise.connect(airFilter).connect(this.air).connect(reverb);
    noise.start();
    this.apply(PROFILES[0], true);
    this.schedule();
  }
  private impulse(seconds: number, decay: number) {
    const rate = this.ctx.sampleRate,
      length = rate * seconds,
      buffer = this.ctx.createBuffer(2, length, rate);
    for (let c = 0; c < 2; c++) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < length; i++)
        data[i] =
          (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay) * 0.5;
    }
    return buffer;
  }
  private schedule() {
    const tick = () => {
      const p = this.profile;
      if (p.sparkle > 0 && this.master.gain.value > 0.01) this.star();
      const wait = p.sparkle > 0 ? p.sparkle * (0.6 + Math.random()) : 3;
      this.timer = window.setTimeout(tick, wait * 1000);
    };
    this.timer = window.setTimeout(tick, 1500);
  }
  private star() {
    const ctx = this.ctx,
      p = this.profile,
      now = ctx.currentTime;
    const tone = p.chord[Math.floor(Math.random() * p.chord.length)];
    const octave = Math.random() < 0.5 ? 8 : 16;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = p.root * tone * octave;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.05 + Math.random() * 0.04, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 2.8);
    osc.connect(gain).connect(this.filter);
    osc.start(now);
    osc.stop(now + 3);
  }
  private apply(profile: Profile, immediate = false) {
    this.profile = profile;
    const t = this.ctx.currentTime,
      glide = immediate ? 0.01 : 6;
    this.pad.forEach(({ osc, gain }, i) => {
      const tone = profile.chord[i % profile.chord.length];
      osc.frequency.setTargetAtTime(profile.root * tone * 2, t, glide / 3);
      gain.gain.setTargetAtTime(
        i < profile.chord.length ? 0.085 : 0,
        t,
        glide / 3,
      );
    });
    this.sub.frequency.setTargetAtTime(profile.root, t, glide / 3);
    this.filter.frequency.setTargetAtTime(profile.cutoff, t, glide / 3);
    this.air.gain.setTargetAtTime(profile.air, t, glide / 3);
  }
  update(input: ScoreInput) {
    const profile = PROFILES[Math.min(8, Math.max(0, input.chapter))];
    const target = input.opening ? profile : PROFILES[8];
    if (target !== this.profile) this.apply(target);
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(input.enabled ? 0.34 * target.level : 0, t, 1.2);
    this.duck.gain.setTargetAtTime(input.liveAudio ? 0.18 : 1, t, 0.8);
    if (input.enabled && this.ctx.state === "suspended") void this.ctx.resume();
  }
  dispose() {
    window.clearTimeout(this.timer);
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
    window.setTimeout(() => void this.ctx.close(), 1200);
  }
}

/** Starts the score on the first user gesture (browser autoplay rules). */
export function useScore({ chapter, opening, liveAudio, enabled }: ScoreInput) {
  const score = useRef<Score | null>(null);
  const latest = useRef<ScoreInput>({ chapter, opening, liveAudio, enabled });
  useEffect(() => {
    latest.current = { chapter, opening, liveAudio, enabled };
    score.current?.update(latest.current);
  }, [chapter, opening, liveAudio, enabled]);
  useEffect(() => {
    const start = () => {
      if (!score.current && latest.current.enabled) {
        try {
          score.current = new Score();
        } catch {
          return;
        }
      }
      score.current?.update(latest.current);
    };
    window.addEventListener("pointerdown", start, { passive: true });
    window.addEventListener("keydown", start);
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
      score.current?.dispose();
      score.current = null;
    };
  }, []);
}
