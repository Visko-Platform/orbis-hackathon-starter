"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Clapperboard,
  Film,
  Loader2,
  Mic,
  MicOff,
  Radio,
  Users,
} from "lucide-react";
import type { Snapshot } from "@/lib/cutline/types";
import { COSMIC_CHAPTERS, TEMPLATES } from "@/lib/cutline/content";
import { requestJson } from "./use-story";
import { speechRecognizer, type SpeechRecognizer } from "./speech";
export default function Audience({ id }: { id: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(false);
  // Talk to the film: every finished sentence is sent to the room.
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [lastSent, setLastSent] = useState("");
  const recognizer = useRef<SpeechRecognizer | null>(null);
  const keepListening = useRef(false);
  useEffect(
    () => () => {
      keepListening.current = false;
      recognizer.current?.abort();
    },
    [],
  );
  const say = async (text: string) => {
    const clean = text.trim();
    if (clean.length < 2) return;
    try {
      setLastSent(clean);
      setSnapshot(
        await requestJson<Snapshot>(`/api/stories/${id}/say`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: clean.slice(0, 240) }),
        }),
      );
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const startListening = () => {
    const Recognizer = speechRecognizer();
    if (!Recognizer) {
      setError(
        "Talking to the film needs Chrome, Edge, or Safari on this phone.",
      );
      return;
    }
    const recognition = new Recognizer();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) void say(result[0].transcript);
        else interim += result[0].transcript;
      }
      setHeard(interim.trim());
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed") {
        keepListening.current = false;
        setError("Allow the microphone to talk to the film.");
      }
    };
    recognition.onend = () => {
      recognizer.current = null;
      setHeard("");
      if (keepListening.current) {
        try {
          startListening();
          return;
        } catch {}
      }
      setListening(false);
    };
    recognizer.current = recognition;
    keepListening.current = true;
    setListening(true);
    recognition.start();
  };
  const toggleListening = () => {
    if (listening) {
      keepListening.current = false;
      recognizer.current?.stop();
      setListening(false);
    } else startListening();
  };
  useEffect(() => {
    let source: EventSource | null = null;
    let disposed = false;
    void (async () => {
      try {
        await requestJson("/api/bootstrap");
        const initial = await requestJson<Snapshot>(`/api/stories/${id}`);
        if (disposed) return;
        setSnapshot(initial);
        source = new EventSource(`/api/stories/${id}/events`);
        source.onopen = () => setOnline(true);
        source.onmessage = (e) => {
          try {
            const next = JSON.parse(e.data);
            if (!disposed) {
              setSnapshot(next);
              setError(null);
            }
          } catch {}
        };
        source.onerror = () => setOnline(false);
        source.addEventListener("unavailable", () => {
          setOnline(false);
          setError("The room is reconnecting. Your last vote is saved.");
        });
      } catch (e) {
        if (!disposed) setError((e as Error).message);
      }
    })();
    return () => {
      disposed = true;
      source?.close();
    };
  }, [id]);
  const story = snapshot?.story;
  const poll = story?.state.poll;
  const scene = story?.state.scenes.find(
    (x) => x.id === (poll?.sceneId || story.state.currentSceneId),
  );
  const opening = story?.state.phase === "opening";
  const template =
    TEMPLATES.find((x) => x.id === story?.templateId) || TEMPLATES[0];
  const total = Object.values(snapshot?.votes || {}).reduce((a, b) => a + b, 0);
  const winner = scene?.choices.find((x) => x.id === poll?.winnerId);
  async function vote(choiceId: string) {
    if (!poll?.open) return;
    setBusy(true);
    setError(null);
    try {
      setSnapshot(
        await requestJson<Snapshot>(`/api/stories/${id}/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pollId: poll.id, choiceId }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="audience-page">
      <header>
        <Link className="wordmark" href="/">
          <span className="brand-mark">
            <i />
            <i />
            <i />
          </span>
          CUTLINE
        </Link>
        <span className="status-pill">
          <span className={`status-dot ${online ? "" : "dim"}`} />
          {online ? "ROOM CONNECTED" : "CONNECTING"}
        </span>
      </header>
      {!story ? (
        <section className="audience-loading">
          {error ? (
            <>
              <Film size={30} />
              <h1>This room is unavailable.</h1>
              <p role="alert">{error}</p>
              <Link className="button outline" href="/">
                Open Cutline <ArrowUpRight size={14} />
              </Link>
            </>
          ) : (
            <>
              <Loader2 className="spin" />
              <p>Taking you to the theater…</p>
            </>
          )}
        </section>
      ) : (
        <>
          <section
            className="audience-hero"
            style={{
              backgroundImage: `linear-gradient(0deg,#080b12 2%,#080b1288 55%,#080b1230),url('${opening ? "/images/multiverse.png" : template.image}')`,
            }}
          >
            <div className="eyebrow">YOU ARE PART OF THIS STORY</div>
            <h1>{story.title}</h1>
            <p>
              {opening
                ? `The journey is at ${COSMIC_CHAPTERS[story.state.cosmicChapter].name}. The film is almost yours.`
                : "Look at the shared theater screen. Your choice will change what happens next."}
            </p>
            <div className="audience-meta">
              <span>
                <Users size={13} />
                {snapshot?.viewers || 0} in the audience
              </span>
              <span className="mono">ROOM {id}</span>
            </div>
          </section>
          <section className="audience-voting">
            <div className="section-heading">
              <h2>
                {opening
                  ? "From the cosmos. To your choice."
                  : poll?.open
                    ? "What happens next?"
                    : winner
                      ? "The audience has spoken."
                      : "Your moment is coming."}
              </h2>
              {poll?.open && (
                <span className="tag configured">VOTING OPEN</span>
              )}
            </div>
            {opening ? (
              <div className="audience-wait">
                <GlobeJourney chapter={story.state.cosmicChapter} />
                <p>
                  We’re traveling from an imagined multiverse to a San Francisco
                  theater. Voting opens when the film begins.
                </p>
              </div>
            ) : poll?.open ? (
              <>
                <p className="audience-instruction">
                  Choose one. Change your mind until the director closes voting.
                </p>
                {scene?.choices.map((choice, i) => {
                  const count = snapshot?.votes[choice.id] || 0;
                  const percent = total ? Math.round((count / total) * 100) : 0;
                  const selected = snapshot?.myVote === choice.id;
                  return (
                    <button
                      key={choice.id}
                      className={`audience-choice ${selected ? "selected" : ""}`}
                      disabled={busy}
                      onClick={() => void vote(choice.id)}
                      aria-pressed={selected}
                    >
                      <span className="choice-letter">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <div>
                        <strong>{choice.label}</strong>
                        <small>{choice.detail}</small>
                        <div className="vote-bar">
                          <i style={{ width: percent + "%" }} />
                        </div>
                      </div>
                      {selected ? (
                        <Check size={20} />
                      ) : (
                        <span className="vote-percent">{percent}%</span>
                      )}
                    </button>
                  );
                })}
                <div className="vote-confirmation" aria-live="polite">
                  {snapshot?.myVote ? (
                    <>
                      <Check size={15} />
                      Your vote is in. Watch the screen.
                    </>
                  ) : (
                    <>
                      <Radio size={15} />
                      Waiting for your choice.
                    </>
                  )}
                  <span>
                    {total} {total === 1 ? "vote" : "votes"}
                  </span>
                </div>
              </>
            ) : winner ? (
              <div className="winner-card">
                <Check size={24} />
                <span className="eyebrow">THE WINNING CHOICE</span>
                <h3>{winner.label}</h3>
                <p>
                  {poll?.applied
                    ? "The director has applied this choice. Watch the shared screen."
                    : "The director is preparing the next moment."}
                </p>
              </div>
            ) : (
              <div className="audience-wait">
                <Clapperboard size={28} />
                <p>
                  The director will open the next vote soon. Keep watching the
                  shared screen.
                </p>
              </div>
            )}
            {!opening && story.state.openMic !== false && (
              <div className="audience-talk">
                <h3>Talk to the film</h3>
                <p>
                  Say what should happen. The movie changes by itself. No
                  buttons, no waiting.
                </p>
                <button
                  className={
                    listening ? "button lime full" : "button outline full"
                  }
                  onClick={toggleListening}
                  aria-pressed={listening}
                >
                  {listening ? <MicOff size={16} /> : <Mic size={16} />}
                  {listening
                    ? "Listening… tap to stop"
                    : "Tap, then talk to the screen"}
                </button>
                {listening && (
                  <p className="audience-heard" aria-live="polite">
                    {heard ? `“${heard}”` : "Listening to you…"}
                  </p>
                )}
                {lastSent && (
                  <p className="audience-sent">
                    <Check size={12} /> Sent to the film: “{lastSent}”
                  </p>
                )}
                {!!story.state.crowd?.length && (
                  <ul className="crowd-feed">
                    {story.state.crowd.slice(-5).map((s) => (
                      <li key={s.id}>
                        <Mic size={12} /> “{s.text}”
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {error && (
              <div className="inline-error" role="alert">
                {error}
              </div>
            )}
          </section>
          <footer className="audience-footer">
            <span>One screen. A room full of possibilities.</span>
            <p>Powered by Visko Orbis × Reactor × Nebius</p>
            <Link href="/">
              Create your own story <ArrowUpRight size={12} />
            </Link>
          </footer>
        </>
      )}
    </main>
  );
}
function GlobeJourney({ chapter }: { chapter: number }) {
  return (
    <div className="audience-journey">
      {COSMIC_CHAPTERS.map((c, i) => (
        <div className={i <= chapter ? "reached" : ""} key={c.name}>
          <i />
          <span>{c.name}</span>
        </div>
      ))}
    </div>
  );
}
