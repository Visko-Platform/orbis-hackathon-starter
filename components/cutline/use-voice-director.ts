"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { speechRecognizer, type SpeechRecognizer } from "./speech";

/** One spoken instruction at a time; listening resumes after delivery settles. */
export function useVoiceDirector(options: {
  roomId: string;
  enabled: boolean;
  busy: boolean;
  onDirection: (text: string) => Promise<void>;
}) {
  const latest = useRef(options);
  useEffect(() => { latest.current = options; }, [options]);
  const [active, setActive] = useState(false);
  const [transcript, setTranscript] = useState("");
  const session = useRef(0);
  const recognizer = useRef<SpeechRecognizer | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = () => {
    session.current++;
    if (timer.current) clearTimeout(timer.current);
    recognizer.current?.abort();
    recognizer.current = null;
    setActive(false);
  };
  useEffect(() => {
    session.current++;
    if (timer.current) clearTimeout(timer.current);
    recognizer.current?.abort();
    recognizer.current = null;
    queueMicrotask(() => setActive(false));
    return () => {
      // This generation counter intentionally invalidates all late callbacks.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      session.current++;
      if (timer.current) clearTimeout(timer.current);
      recognizer.current?.abort();
    };
  }, [options.roomId, options.enabled]);
  const toggle = () => {
    if (active) { stop(); return; }
    const Recognizer = speechRecognizer();
    if (!Recognizer) {
      toast.error("Voice input is unavailable in this browser. Open Cutline in Chrome or Edge, or type a direction.");
      return;
    }
    if (!latest.current.enabled || latest.current.busy) {
      toast.info("Start or resume the live film and close voting before speaking.");
      return;
    }
    const id = ++session.current;
    let emptyTurns = 0;
    setActive(true);
    setTranscript("");
    const start = () => {
      if (id !== session.current) return;
      if (!latest.current.enabled) { stop(); return; }
      if (latest.current.busy) { timer.current = setTimeout(start, 350); return; }
      const recognition = new Recognizer();
      recognizer.current = recognition;
      recognition.lang = navigator.language || "en-US";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      let finalText = "";
      recognition.onresult = (event) => {
        if (id !== session.current) return;
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) finalText += " " + result[0].transcript;
          else interim += result[0].transcript;
        }
        setTranscript((finalText + " " + interim).trim().slice(0, 1200));
      };
      recognition.onerror = ({ error }) => {
        if (id !== session.current || error === "aborted" || error === "no-speech") return;
        stop();
        toast.error(error === "not-allowed" || error === "service-not-allowed"
          ? "Allow microphone access to direct the film by voice."
          : "Speech recognition stopped. Check your connection and try again.");
      };
      recognition.onend = () => {
        if (id !== session.current) return;
        recognizer.current = null;
        const text = finalText.trim().slice(0, 1200);
        if (text.length < 3) {
          if (++emptyTurns >= 3) { stop(); toast.info("Microphone stopped after silence. Tap to listen again."); return; }
          timer.current = setTimeout(start, 500);
          return;
        }
        emptyTurns = 0;
        if (!latest.current.enabled || latest.current.busy) {
          stop();
          toast.info("The film changed while you were speaking. Your transcript is still visible; retry when ready.");
          return;
        }
        void latest.current.onDirection(text).catch(() => {
          if (id === session.current) { stop(); toast.error("Direction failed. Retry when the film is ready."); }
        }).finally(() => {
          if (id === session.current) timer.current = setTimeout(start, 500);
        });
      };
      try { recognition.start(); }
      catch { stop(); toast.error("Could not start the microphone. Please try again."); }
    };
    start();
  };
  return { active, transcript, toggle };
}
