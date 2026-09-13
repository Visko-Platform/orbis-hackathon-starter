"use client";

import { ReactorProvider, ReactorView } from "@reactor-team/js-sdk";
import { useCallback, useEffect, useRef, useState } from "react";

import { Avatar } from "@/components/avatar";
import { Backdrop } from "@/components/backdrop";
import { Easel } from "@/components/easel";
import { GrownUps } from "@/components/grownups";
import { Onboarding } from "@/components/onboarding";
import { ShelfCover } from "@/components/shelf-cover";
import { ThemeArt } from "@/components/theme-art";
import { Who } from "@/components/who";
import { useOrbisSession } from "@/hooks/use-orbis-session";
import {
  EMPTY_WORLD,
  applyUtterance,
  composePrompt,
  isBlocked,
  type World,
} from "@/lib/dream-grammar";
import { ORBIS_MODEL_NAME, ORBIS_TRACKS, requestReactorJwt } from "@/lib/orbis";
import { THEMES, styled, type ThemeId } from "@/lib/dream-style";
import {
  DEFAULT_SETTINGS,
  getActiveProfileId,
  loadProfiles,
  loadSettings,
  possessive,
  setActiveProfileId,
  type Profile,
  type Settings,
} from "@/lib/profile";
import { deleteBook, listBooks, newBookId, putBook, type ShelfBook } from "@/lib/shelf";

const SCENE_SECONDS = 75;
const END_WORDS = /^(the end|that's the end|next page|turn the page|new page|end of page|next scene|new scene|end scene|end of scene)\b/i;
// Start the next page from the previous page's clean frame so characters carry over.
const CONTINUE_FROM_FRAME = true;
// Ask Gemini to direct each utterance; falls back to the local grammar.
const USE_DIRECTOR = true;
// Paint page 1's first frame as a flat illustration before Orbis starts.
const PAINT_FIRST_FRAME = true;

const SURPRISES = [
  "a tiny fox riding a giant snail through a mushroom forest",
  "two penguins having a tea party on the moon",
  "a friendly dragon baking cupcakes in a castle kitchen",
  "a whale flying through pink clouds with a bunny on its back",
  "a robot and a puppy building a sandcastle on a rainbow beach",
  "a treehouse city where the trees have lanterns and the birds wear hats",
  "an underwater school for baby octopuses",
  "a hot air balloon race over a candy mountain",
];

// What the grammar turns a bare surprise line into (so a pre-painted frame matches).
function styledScene(line: string) {
  return composePrompt(applyUtterance(EMPTY_WORLD, line));
}

// Next-beat ideas for a kid (or a judge) who wants to keep clicking.
const WHAT_IFS = [
  "it starts raining candy",
  "a whale flies by in the sky",
  "everyone becomes tiny",
  "a giant friendly robot walks in",
  "it turns into night with a thousand stars",
  "a rainbow bridge appears",
  "everybody starts dancing",
  "a baby dragon hatches from an egg",
  "the ground turns into a trampoline",
  "a hot air balloon lands",
  "it starts snowing marshmallows",
  "a penguin arrives on a scooter",
  "the trees grow lollipops",
  "a big bubble floats everyone up into the sky",
  "a unicorn gallops through",
  "the sun puts on sunglasses",
  "a pirate ship sails past",
  "everything turns rainbow colored",
  "a cat wearing a crown shows up",
  "fireworks burst in the sky",
  "a river of chocolate flows through",
  "a tiny mouse throws a birthday party",
  "an octopus juggles five balls",
  "the clouds turn into sheep",
  "a rocket ship takes off",
];

export function Storybooks() {
  const jwtPromise = useRef<Promise<string> | null>(null);
  const getJwt = useCallback(() => {
    jwtPromise.current ??= requestReactorJwt();
    return jwtPromise.current;
  }, []);
  const clearJwt = useCallback(() => {
    jwtPromise.current = null;
  }, []);

  return (
    <ReactorProvider
      apiUrl="https://api.reactor.inc"
      modelName={ORBIS_MODEL_NAME}
      modelTracks={[...ORBIS_TRACKS]}
      connectOptions={{ autoConnect: false }}
      jwtToken={getJwt}
    >
      <Stage clearJwt={clearJwt} />
    </ReactorProvider>
  );
}

type Page = { id: number; url: string; blob: Blob; beats: string[] };
type Snap = { id: number; url: string; blob: Blob };

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: any) => void) | null;
};

function getRecognition(): Recognition | null {
  const w = window as any;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

function grabFrame(w = 640, h = 360): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.querySelector<HTMLVideoElement>(".sb-video video");
    if (!video || video.readyState < 2 || video.videoWidth === 0) return resolve(null);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return resolve(null);
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.88);
  });
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices?.() ?? [];
  const prefer = ["Samantha", "Google US English", "Ava", "Allison", "Zoe", "Daniel"];
  for (const name of prefer) {
    const v = voices.find((x) => x.name.includes(name));
    if (v) return v;
  }
  return voices.find((v) => v.lang.startsWith("en")) ?? null;
}

function speak(text: string, onstart?: () => void, onend?: () => void) {
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice();
  if (v) u.voice = v;
  u.rate = 0.88;
  u.pitch = 1.0;
  if (onstart) u.onstart = onstart;
  if (onend) u.onend = onend;
  window.speechSynthesis.speak(u);
}

function shownTitleFor(title: string, profile: Profile | null) {
  return title || `${possessive(profile?.name ?? "")} storybook`;
}

function pageText(p: Page, i: number, total: number, title: string, name?: string) {
  const lines = p.beats.length ? p.beats : ["something magical happened"];
  const body = lines
    .map((b, j) => (i === 0 && j === 0 ? `Once upon a time, ${b}.` : `And then, ${b}.`))
    .join(" ");
  const cover = i === 0 ? `${title}. ${name ? `A story by ${name}. ` : ""}` : "";
  return cover + body + (i === total - 1 ? " The end." : "");
}

async function fetchVoice(text: string, ms = 40000): Promise<Blob | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    const res = await fetch("/api/dream-voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    return res.ok ? await res.blob() : null;
  } catch {
    return null;
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function exportBook(pages: Page[], title: string, author?: string) {
  const W = 1600;
  const PAD = 64;
  const IMG_W = 720;
  const IMG_H = 405;
  const ROW_H = IMG_H + 48;
  const H = 260 + pages.length * ROW_H + PAD + 24;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fbf5ea";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#2b2350";
  ctx.font = "800 88px -apple-system, 'SF Pro Rounded', system-ui, sans-serif";
  ctx.fillText(title, PAD, 150);
  ctx.font = "600 28px -apple-system, system-ui, sans-serif";
  ctx.fillStyle = "rgba(43,35,80,0.6)";
  ctx.fillText(
    `${author ? `a story by ${author} · ` : ""}${pages.length} ${pages.length === 1 ? "page" : "pages"} · ${new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}`,
    PAD,
    200,
  );

  const wrap = (text: string, x: number, y: number, maxW: number, lh: number) => {
    const words = text.split(" ");
    let line = "";
    for (const w of words) {
      const t = line ? line + " " + w : w;
      if (ctx.measureText(t).width > maxW && line) {
        ctx.fillText(line, x, y);
        y += lh;
        line = w;
      } else line = t;
    }
    if (line) ctx.fillText(line, x, y);
    return y + lh;
  };

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const y0 = 260 + i * ROW_H;
    const img = await loadImage(p.url);
    // rounded image
    ctx.save();
    const r = 28;
    ctx.beginPath();
    ctx.roundRect(PAD, y0, IMG_W, IMG_H, r);
    ctx.clip();
    ctx.drawImage(img, PAD, y0, IMG_W, IMG_H);
    ctx.restore();

    const tx = PAD + IMG_W + 48;
    ctx.fillStyle = "#ff5d73";
    ctx.beginPath();
    ctx.arc(tx + 22, y0 + 26, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "800 22px -apple-system, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(i + 1), tx + 22, y0 + 34);
    ctx.textAlign = "left";

    ctx.fillStyle = "#2b2350";
    ctx.font = "600 28px -apple-system, system-ui, sans-serif";
    let y = y0 + 90;
    const beats = p.beats.length ? p.beats : ["…"];
    for (let j = 0; j < beats.length; j++) {
      const lead = i === 0 && j === 0 ? "once upon a time, " : "and then ";
      y = wrap(lead + beats[j], tx, y, W - tx - PAD, 40) + 8;
    }
  }

  ctx.fillStyle = "rgba(43,35,80,0.34)";
  ctx.font = "600 22px -apple-system, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("made with Storybooks", W / 2, H - 26);
  ctx.textAlign = "left";

  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/\s+/g, "-")}.png`;
  a.click();
}

// One way to answer "what happens next" without talking.
function TypeBar({
  value,
  onChange,
  onSubmit,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  return (
    <form
      className="sb-type"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <input
        className="sb-type-input"
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        enterKeyHint="send"
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="submit" className="sb-type-send" disabled={!value.trim()} aria-label="send">
        ➜
      </button>
    </form>
  );
}

function Stage({ clearJwt }: { clearJwt: () => void }) {
  const session = useOrbisSession(clearJwt);
  const [world, setWorld] = useState<World>(EMPTY_WORLD);
  const [theme, setTheme] = useState<ThemeId | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [echo, setEcho] = useState<string | null>(null);
  const [nudge, setNudge] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [idle, setIdle] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [toast, setToast] = useState(false);
  const [applying, setApplying] = useState(false);

  const [pages, setPages] = useState<Page[]>([]);
  const [pageBeats, setPageBeats] = useState<string[]>([]);
  const [pageStart, setPageStart] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [turning, setTurning] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [readingPage, setReadingPage] = useState<number | null>(null);
  const [spread, setSpread] = useState(0);
  const [flipDir, setFlipDir] = useState<"next" | "prev">("next");
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [rewinding, setRewinding] = useState(false);

  // who's telling the story, and what they've made before
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [gate, setGate] = useState<"boot" | "onboarding" | "who" | "play">("boot");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [grownUps, setGrownUps] = useState(false);
  const [shelf, setShelf] = useState<ShelfBook[]>([]);
  const [viewing, setViewing] = useState<ShelfBook | null>(null);
  const [viewPages, setViewPages] = useState<Page[]>([]);
  const [bookTitle, setBookTitle] = useState("");
  const [cheer, setCheer] = useState(false);
  const bookId = useRef(newBookId());
  const bookBorn = useRef(Date.now());
  const beatFrame = useRef<Blob | null>(null);
  const beatFrameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPageBlob = useRef<Blob | null>(null);
  // Narration audio per page, generated in the background when the page ends.
  const voices = useRef<Map<number, Promise<Blob | null>>>(new Map());
  // Director's own running description of the world (richer than the grammar's).
  const directorWorld = useRef<string>("");

  const worldRef = useRef(world);
  worldRef.current = world;
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const pageBeatsRef = useRef(pageBeats);
  pageBeatsRef.current = pageBeats;
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const gateRef = useRef(gate);
  gateRef.current = gate;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const titleRef = useRef(bookTitle);
  titleRef.current = bookTitle;
  const listeningRef = useRef(listening);
  listeningRef.current = listening;
  const rewindingRef = useRef(rewinding);
  rewindingRef.current = rewinding;
  const turningRef = useRef(false);
  const recRef = useRef<Recognition | null>(null);
  const finalRef = useRef("");
  const interimRef = useRef("");
  interimRef.current = interim;
  const echoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── who's here ──────────────────────────────────────────
  const refreshShelf = useCallback(async (id?: string | null) => {
    const pid = id ?? profileRef.current?.id;
    if (!pid) return;
    setShelf(await listBooks(pid));
  }, []);

  const loadPeople = useCallback(() => {
    const list = loadProfiles();
    setProfiles(list);
    setSettings(loadSettings());
    return list;
  }, []);

  useEffect(() => {
    const list = loadPeople();
    if (list.length === 0) {
      setGate("onboarding");
      return;
    }
    const active = list.find((p) => p.id === getActiveProfileId());
    if (list.length === 1 || active) {
      const chosen = active ?? list[0];
      setProfile(chosen);
      setActiveProfileId(chosen.id);
      setGate("play");
      void refreshShelf(chosen.id);
    } else {
      setGate("who");
    }
  }, [loadPeople, refreshShelf]);

  const pickProfile = useCallback(
    (p: Profile) => {
      setProfile(p);
      setActiveProfileId(p.id);
      setGate("play");
      loadPeople();
      void refreshShelf(p.id);
    },
    [loadPeople, refreshShelf],
  );

  // ── connection ──────────────────────────────────────────
  const SESSION_KEY = "at:session";
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // A previous load may have left a session alive; ask the server to end it.
      let leftover: string | null = null;
      try {
        leftover = localStorage.getItem(SESSION_KEY);
      } catch {}
      if (leftover) {
        try {
          await fetch("/api/session-kill", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: leftover }),
          });
          localStorage.removeItem(SESSION_KEY);
        } catch {}
      }
      if (!cancelled && sessionRef.current.status === "disconnected" && !sessionRef.current.controlsBusy) {
        void sessionRef.current.connectSession();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      if (session.sessionId) localStorage.setItem(SESSION_KEY, session.sessionId);
    } catch {}
  }, [session.sessionId]);

  // Only surface connection trouble after it has persisted a few seconds.
  useEffect(() => {
    if (session.connected || !session.error) {
      setToast(false);
      return;
    }
    const t = setTimeout(() => setToast(true), 4000);
    return () => clearTimeout(t);
  }, [session.connected, session.error]);

  const reconnectNow = useCallback(() => {
    if (sessionRef.current.controlsBusy) return;
    clearJwt(); // never reuse a token whose session may still be alive
    void sessionRef.current.connectSession();
  }, [clearJwt]);
  useEffect(() => {
    if (session.status !== "disconnected" || !session.error) return;
    const id = setInterval(reconnectNow, 3000);
    return () => clearInterval(id);
  }, [session.status, session.error, reconnectNow]);

  useEffect(() => {
    if (session.availableResolutions.includes("1080p") && !session.resolution) {
      session.setResolution("1080p");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.availableResolutions]);

  useEffect(() => {
    const bye = () => {
      const id = sessionRef.current.sessionId;
      sessionRef.current.disconnectNow();
      if (id) {
        // beacons outlive the page; the disconnect above may not
        try {
          navigator.sendBeacon("/api/session-kill", new Blob([JSON.stringify({ id })], { type: "application/json" }));
          localStorage.removeItem(SESSION_KEY);
        } catch {}
      }
    };
    window.addEventListener("pagehide", bye);
    window.addEventListener("beforeunload", bye);
    return () => {
      window.removeEventListener("pagehide", bye);
      window.removeEventListener("beforeunload", bye);
      bye();
    };
  }, []);

  // The story world is always silent. React's `muted` prop on <video> doesn't
  // reliably stick, so pin it on the element itself and keep pinning it.
  useEffect(() => {
    const hush = () => {
      document
        .querySelectorAll<HTMLMediaElement>(".sb-video video, .sb-video audio")
        .forEach((el) => {
          el.muted = true;
          el.volume = 0;
        });
    };
    hush();
    const t = setInterval(hush, 1000);
    document.addEventListener("play", hush, true);
    return () => {
      clearInterval(t);
      document.removeEventListener("play", hush, true);
    };
  }, []);

  // ── idle / kiosk ────────────────────────────────────────
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const wake = () => {
      setIdle(false);
      clearTimeout(t);
      t = setTimeout(() => setIdle(true), 5000);
    };
    wake();
    window.addEventListener("pointermove", wake);
    window.addEventListener("pointerdown", wake);
    window.addEventListener("keydown", wake);
    return () => {
      clearTimeout(t);
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
    };
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  };

  // ── page clock ──────────────────────────────────────────
  useEffect(() => {
    if (session.runStarted) {
      if (!rewindingRef.current) setPageStart(Date.now());
      setTurning(false);
      turningRef.current = false;
    } else if (!rewindingRef.current) {
      setPageStart(null);
      setProgress(0);
    }
  }, [session.runStarted]);

  const showEcho = (text: string) => {
    setEcho(text);
    if (echoTimer.current) clearTimeout(echoTimer.current);
    echoTimer.current = setTimeout(() => setEcho(null), 2800);
  };

  const scheduleBeatFrame = () => {
    if (beatFrameTimer.current) clearTimeout(beatFrameTimer.current);
    beatFrameTimer.current = setTimeout(async () => {
      const blob = await grabFrame();
      if (blob) beatFrame.current = blob;
    }, 7000);
  };

  // ── rewind frames ───────────────────────────────────────
  useEffect(() => {
    if (!session.runStarted) {
      setSnaps((cur) => {
        cur.forEach((d) => URL.revokeObjectURL(d.url));
        return [];
      });
      return;
    }
    let cancelled = false;
    const tick = async () => {
      const blob = await grabFrame(480, 270);
      if (!blob || cancelled) return;
      setSnaps((cur) => {
        const next = [...cur, { id: Date.now(), url: URL.createObjectURL(blob), blob }];
        next.slice(0, Math.max(0, next.length - 8)).forEach((d) => URL.revokeObjectURL(d.url));
        return next.slice(-8);
      });
    };
    const first = setTimeout(tick, 4000);
    const id = setInterval(tick, 4000);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(id);
    };
  }, [session.runStarted]);

  const rewind = async (snap: Snap) => {
    if (rewinding) return;
    setRewinding(true);
    showEcho("⏪ rewinding");
    setSnaps((cur) => {
      const idx = cur.findIndex((c) => c.id === snap.id);
      cur.slice(idx + 1).forEach((d) => URL.revokeObjectURL(d.url));
      return cur.slice(0, idx + 1);
    });
    const file = new File([snap.blob], "rewind.jpg", { type: "image/jpeg" });
    try {
      await sessionRef.current.rewindTo(file, lastPromptRef.current || composePrompt(worldRef.current));
    } finally {
      setRewinding(false);
    }
  };
  const lastPromptRef = useRef("");

  const oops = async () => {
    const blob = beatFrame.current ?? snaps[0]?.blob;
    if (!blob || rewinding) return;
    setRewinding(true);
    showEcho("⏪ oops, going back");
    const file = new File([blob], "oops.jpg", { type: "image/jpeg" });
    try {
      await sessionRef.current.rewindTo(file, lastPromptRef.current || composePrompt(worldRef.current));
    } finally {
      setRewinding(false);
    }
  };

  // ── pages ───────────────────────────────────────────────
  const endPage = useCallback(async () => {
    const s = sessionRef.current;
    if (!s.runStarted || turningRef.current) return;
    turningRef.current = true;
    setTurning(true);
    if (beatFrameTimer.current) clearTimeout(beatFrameTimer.current);

    const blob = beatFrame.current ?? (await grabFrame());
    beatFrame.current = null;
    const beats = pageBeatsRef.current;
    if (blob) {
      lastPageBlob.current = blob;
      const page: Page = { id: Date.now(), url: URL.createObjectURL(blob), blob, beats };
      setPages((cur) => {
        const next = [...cur, page];
        // narrate this page now, while the kid keeps playing
        voices.current.set(page.id, fetchVoice(pageText(page, next.length - 1, next.length, "my storybook")));
        return next;
      });
    }
    setPageBeats([]);
    await s.reset();
  }, []);

  // Every finished page writes the book to the shelf, so a reload (or a
  // dropped session) never loses the story.
  useEffect(() => {
    const who = profile;
    if (!who || pages.length === 0) return;
    void putBook({
      id: bookId.current,
      profileId: who.id,
      title: bookTitle || `${possessive(who.name)} storybook`,
      theme,
      createdAt: bookBorn.current,
      updatedAt: Date.now(),
      pages: pages.map((p) => ({ beats: p.beats, image: p.blob })),
    }).then(() => refreshShelf(who.id));
  }, [pages, bookTitle, profile, theme, refreshShelf]);

  // …and gets a cover title of its own once there's a story to name.
  useEffect(() => {
    if (pages.length === 0) return;
    const beats = pages.flatMap((p) => p.beats).filter(Boolean);
    if (!beats.length) return;
    let dead = false;
    void (async () => {
      try {
        const res = await fetch("/api/book-title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ beats, name: profileRef.current?.name }),
        });
        if (!res.ok || dead) return;
        const d = (await res.json()) as { title?: string };
        if (d.title && !dead) setBookTitle(d.title);
      } catch {
        /* the fallback title is already fine */
      }
    })();
    return () => {
      dead = true;
    };
  }, [pages.length]);

  // a small moment of pride at three pages
  useEffect(() => {
    if (pages.length !== 3) return;
    setCheer(true);
    const t = setTimeout(() => setCheer(false), 3600);
    return () => clearTimeout(t);
  }, [pages.length]);

  // a book opened off the shelf gets its own object URLs
  useEffect(() => {
    if (!viewing) {
      voices.current.clear();
      setViewPages((cur) => {
        cur.forEach((p) => URL.revokeObjectURL(p.url));
        return [];
      });
      return;
    }
    voices.current.clear();
    const built = viewing.pages.map((sp, i) => ({
      id: i,
      url: URL.createObjectURL(sp.image),
      blob: sp.image,
      beats: sp.beats,
    }));
    setViewPages(built);
    return () => built.forEach((p) => URL.revokeObjectURL(p.url));
  }, [viewing]);

  useEffect(() => {
    if (!pageStart) return;
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - pageStart) / (settingsRef.current.sceneSeconds * 1000));
      setProgress(p);
      if (p >= 1 && !listeningRef.current) void endPage();
    }, 250);
    return () => clearInterval(id);
  }, [pageStart, endPage]);

  // ── the core: a kid says something ──────────────────────
  const say = useCallback(
    async (raw: string, opts?: { trusted?: boolean }) => {
      const text = raw.trim();
      if (!text) return;
      const s = sessionRef.current;

      if (END_WORDS.test(text)) {
        showEcho("✨ the end");
        void endPage();
        return;
      }
      if (!themeRef.current && !s.runStarted) {
        setNudge("first, pick how your story looks!");
        setTimeout(() => setNudge(null), 2200);
        return;
      }
      if (isBlocked(text)) {
        setNudge("hmm, let's dream up something else!");
        setTimeout(() => setNudge(null), 2200);
        return;
      }

      const next = applyUtterance(worldRef.current, text);
      showEcho(text);

      // Ask the director, with a hard time cap; fall back to the grammar.
      let prompt = composePrompt(next);
      if (USE_DIRECTOR && !opts?.trusted) {
        setThinking(true);
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 4500);
          const res = await fetch("/api/dream-prompt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              world: directorWorld.current || prompt,
              said: text,
              name: profileRef.current?.name,
            }),
            signal: ctrl.signal,
          });
          clearTimeout(t);
          if (res.ok) {
            const d = (await res.json()) as { safe: boolean; prompt: string; nudge: string };
            if (!d.safe) {
              setThinking(false);
              setNudge(d.nudge || "hmm, let's dream up something else!");
              setTimeout(() => setNudge(null), 2600);
              return;
            }
            if (d.prompt?.trim()) {
              prompt = d.prompt.trim();
              directorWorld.current = prompt;
            }
          }
        } catch {
          /* fall through to grammar prompt */
        } finally {
          setThinking(false);
        }
      }

      const scene = prompt; // content only, for the painter
      prompt = styled(prompt, themeRef.current);
      setWorld(next);
      setPageBeats((cur) => [...cur, text]);
      lastPromptRef.current = prompt;

      if (!s.connected) {
        // not up yet — fire it the moment we are
        pendingRef.current = { prompt, scene, text };
        return;
      }
      if (s.runStarted) {
        setApplying(true);
        void s.steerWithPrompt(prompt).finally(() => setTimeout(() => setApplying(false), 2600));
      } else if (CONTINUE_FROM_FRAME && lastPageBlob.current) {
        const file = new File([lastPageBlob.current], "page.jpg", { type: "image/jpeg" });
        void s.startWithImage(file, prompt);
      } else {
        void startFresh(prompt, scene);
      }
      scheduleBeatFrame();
    },
    [endPage],
  );

  const [painting, setPainting] = useState(false);
  // Page 1: paint a picture-book first frame, then start Orbis from it.
  const startFresh = async (prompt: string, scene: string) => {
    const s = sessionRef.current;
    const pre = nextSurprise.current;
    if (pre && styledScene(pre.scene) === scene) {
      nextSurprise.current = null;
      setPainting(true);
      const blob = await pre.painting;
      setPainting(false);
      if (blob) {
        await s.startWithImage(new File([blob], "page1.png", { type: blob.type || "image/png" }), prompt);
        return;
      }
    }
    if (PAINT_FIRST_FRAME) {
      setPainting(true);
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 20000);
        const res = await fetch("/api/dream-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scene, theme: themeRef.current }),
          signal: ctrl.signal,
        });
        clearTimeout(t);
        if (res.ok) {
          const blob = await res.blob();
          const file = new File([blob], "page1.png", { type: blob.type || "image/png" });
          setPainting(false);
          await s.startWithImage(file, prompt);
          return;
        }
      } catch {
        /* fall back to text */
      } finally {
        setPainting(false);
      }
    }
    await s.startWithPrompt(prompt);
  };

  const pendingRef = useRef<{ prompt: string; scene: string; text: string } | null>(null);
  useEffect(() => {
    if (!session.connected || !pendingRef.current) return;
    const { prompt, scene } = pendingRef.current;
    pendingRef.current = null;
    void startFresh(prompt, scene);
    scheduleBeatFrame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.connected]);

  const lastIdea = useRef(-1);
  const nextSurprise = useRef<{ scene: string; painting: Promise<Blob | null> } | null>(null);
  const prepaint = useCallback(() => {
    if (!PAINT_FIRST_FRAME || nextSurprise.current) return;
    const scene = SURPRISES[Math.floor(Math.random() * SURPRISES.length)];
    const painting = (async () => {
      try {
        const res = await fetch("/api/dream-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scene: styledScene(scene) }),
        });
        return res.ok ? await res.blob() : null;
      } catch {
        return null;
      }
    })();
    nextSurprise.current = { scene, painting };
  }, []);
  useEffect(() => {
    if (!session.runStarted && pages.length === 0) prepaint();
  }, [session.runStarted, pages.length, prepaint]);

  const surprise = () => {
    if (!sessionRef.current.runStarted && pages.length === 0 && nextSurprise.current) {
      const { scene } = nextSurprise.current;
      void say(scene, { trusted: true });
      return;
    }
    const pool = sessionRef.current.runStarted ? WHAT_IFS : SURPRISES;
    let i = Math.floor(Math.random() * pool.length);
    if (i === lastIdea.current) i = (i + 1) % pool.length;
    lastIdea.current = i;
    void say(pool[i], { trusted: true });
  };

  const submitDraft = () => {
    const t = draft.trim();
    if (!t) return;
    setDraft("");
    void say(t);
  };

  // ── voice in ────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (recRef.current) {
      // pressed again while stuck → treat as release
      stopListening();
      return;
    }
    const rec = getRecognition();
    if (!rec) {
      setNudge("voice needs Chrome — tap a picture instead!");
      setTimeout(() => setNudge(null), 2500);
      return;
    }
    finalRef.current = "";
    setInterim("");
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      let fin = "";
      let tmp = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) fin += r[0].transcript + " ";
        else tmp += r[0].transcript + " ";
      }
      finalRef.current = fin.trim();
      setInterim((fin + tmp).trim());
    };
    rec.onerror = () => {};
    let done = false;
    const finalize = () => {
      if (done) return;
      done = true;
      if (stopTimer.current) clearTimeout(stopTimer.current);
      if (maxTimer.current) clearTimeout(maxTimer.current);
      if (recRef.current === rec) recRef.current = null;
      setListening(false);
      const text = finalRef.current || interimRef.current;
      setInterim("");
      if (text) void say(text);
      else {
        setNudge("I didn't catch that — try again!");
        setTimeout(() => setNudge(null), 1800);
      }
    };
    finalizeRef.current = finalize;
    rec.onend = finalize;
    recRef.current = rec;
    setListening(true);
    // Nobody holds a button for more than 12s on purpose.
    if (maxTimer.current) clearTimeout(maxTimer.current);
    maxTimer.current = setTimeout(() => stopListening(), 12000);
    try {
      rec.start();
    } catch {
      recRef.current = null;
      setListening(false);
    }
  }, [say]);

  const finalizeRef = useRef<() => void>(() => {});
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopListening = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {}
    // If Chrome never fires onend, force it.
    if (stopTimer.current) clearTimeout(stopTimer.current);
    stopTimer.current = setTimeout(() => {
      if (recRef.current === rec) {
        try {
          rec.abort();
        } catch {}
        finalizeRef.current();
      }
    }, 1200);
  }, []);

  // Escape = drop whatever is being said, no matter what.
  const cancelListening = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    finalRef.current = "";
    interimRef.current = "";
    try {
      rec.abort();
    } catch {}
    finalizeRef.current();
  }, []);

  useEffect(() => {
    const inField = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    };
    const down = (e: KeyboardEvent) => {
      // onboarding and the profile picker own the keyboard while they're up
      if (gateRef.current !== "play") return;
      if (inField(e)) {
        if (e.key === "Escape") (e.target as HTMLElement).blur();
        return;
      }
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        startListening();
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      } else if (e.key === "Escape") {
        cancelListening();
        closeBookRef.current();
      } else if (e.key === "ArrowRight" && bookRef.current) {
        goToRef.current(spreadRef.current + 1);
      } else if (e.key === "ArrowLeft" && bookRef.current) {
        goToRef.current(spreadRef.current - 1);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (gateRef.current !== "play" || inField(e)) return;
      if (e.code === "Space") {
        e.preventDefault();
        stopListening();
      }
    };
    const pointerUp = () => stopListening();
    const blur = () => stopListening();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("pointerup", pointerUp);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("pointerup", pointerUp);
      window.removeEventListener("blur", blur);
    };
  }, [startListening, stopListening, cancelListening]);

  // ── storybook: read aloud ───────────────────────────────
  const narrator = useRef<HTMLAudioElement | null>(null);
  const readId = useRef(0);
  const highlightTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stopNarration = () => {
    readId.current++;
    window.speechSynthesis?.cancel();
    narrator.current?.pause();
    narrator.current = null;
    highlightTimers.current.forEach(clearTimeout);
    highlightTimers.current = [];
    setReadingPage(null);
  };

  const readBook = useCallback(async (list: Page[], title: string) => {
    if (list.length === 0 || !settingsRef.current.narrate) return;
    stopNarration();
    const me = ++readId.current;
    const total = list.length;
    const author = profileRef.current?.name;
    for (let i = 0; i < total; i++) {
      const p = list[i];
      const text = pageText(p, i, total, title, author);
      // last page's text changes ("The end.") once more pages exist; regenerate if stale
      let job = voices.current.get(p.id);
      if (!job || i === total - 1) {
        job = fetchVoice(text);
        voices.current.set(p.id, job);
      }
      const blob = await job;
      if (me !== readId.current) return;
      setReadingPage(i);
      if (blob) {
        const audio = new Audio(URL.createObjectURL(blob));
        narrator.current = audio;
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          audio.play().catch(() => resolve());
        });
      } else {
        // the dream narrator is down — read it in the browser's own voice
        await new Promise<void>((resolve) => {
          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            resolve();
          };
          speak(text, undefined, finish);
          setTimeout(finish, Math.max(4000, text.length * 90));
        });
      }
      if (me !== readId.current) return;
      await new Promise((r) => setTimeout(r, 350));
    }
    setReadingPage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeBookRef = useRef<() => void>(() => {});
  const bookRef = useRef(false);
  bookRef.current = bookOpen;
  const spreadRef = useRef(0);
  spreadRef.current = spread;
  const goToRef = useRef<(i: number) => void>(() => {});

  useEffect(() => {
    if (readingPage !== null) {
      setFlipDir("next");
      setSpread(readingPage);
    }
  }, [readingPage]);

  const goTo = (i: number) => {
    if (i < 0 || i >= (viewing ? viewing.pages.length : pages.length)) return;
    setFlipDir(i > spread ? "next" : "prev");
    setSpread(i);
  };
  goToRef.current = goTo;

  const openBook = () => {
    setViewing(null);
    setSpread(0);
    setBookOpen(true);
    setTimeout(() => void readBook(pages, shownTitleFor(bookTitle, profile)), 350);
  };
  const openShelfBook = (b: ShelfBook) => {
    stopNarration();
    setViewing(b);
    setSpread(0);
    setBookOpen(true);
  };
  const closeBook = () => {
    stopNarration();
    setBookOpen(false);
    setViewing(null);
  };
  closeBookRef.current = closeBook;

  // Back to the home screen (theme picker + shelf). Every finished page is
  // already on the shelf, so we clear the current story — otherwise the
  // page-turn screen keeps covering home.
  const goHome = () => {
    stopNarration();
    setBookOpen(false);
    setViewing(null);
    setReadingPage(null);
    setTheme(null);
    setWorld(EMPTY_WORLD);
    setEcho(null);
    setPageBeats([]);
    setPages((cur) => {
      cur.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
    lastPageBlob.current = null;
    directorWorld.current = "";
    lastPromptRef.current = "";
    bookId.current = newBookId();
    bookBorn.current = Date.now();
    setBookTitle("");
    voices.current.clear();
    setTurning(false);
    turningRef.current = false;
    if (session.runStarted) void session.reset();
    void refreshShelf();
  };

  const newStory = () => {
    stopNarration();
    setWorld(EMPTY_WORLD);
    setTheme(null);
    setEcho(null);
    setPageBeats([]);
    setPages((cur) => {
      cur.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
    lastPageBlob.current = null;
    directorWorld.current = "";
    lastPromptRef.current = "";
    bookId.current = newBookId();
    bookBorn.current = Date.now();
    setBookTitle("");
    setViewing(null);
    voices.current.clear();
    setBookOpen(false);
    setReadingPage(null);
    setTurning(false);
    turningRef.current = false;
    if (session.runStarted) void session.reset();
  };

  const ready = session.connected;
  const live = session.runStarted;
  const name = profile?.name ?? "";
  const shownPages = viewing ? viewPages : pages;
  const shownTitle = viewing ? viewing.title : shownTitleFor(bookTitle, profile);
  const lastPage = pages[pages.length - 1];
  const showTurn = !live && (turning || pages.length > 0);
  const nextBusy = session.controlsBusy || thinking || painting;
  const bubble = nudge ?? (listening ? interim || "listening" : echo ?? "");
  const R = 78;
  const C = 2 * Math.PI * R;

  return (
    <div
      className={`sb-stage ${live ? "sb-live" : ""} ${idle && live && !listening ? "sb-idle" : ""} ${listening ? "sb-listening" : ""} ${!listening && (thinking || applying) ? "sb-applying" : ""}`}
    >
      <div className="sb-video">
        {live ? (
          <ReactorView track="main_video" muted videoObjectFit="cover" />
        ) : showTurn ? (
          <div className="sb-turn">
            <div className="sb-turn-spread">
              <div className="sb-leaf sb-leaf-left sb-turn-done">
                {lastPage && <img src={lastPage.url} alt="" draggable={false} />}
                <div className="sb-turn-caption">
                  <div className="sb-turn-num">page {pages.length} · saved</div>
                  {lastPage?.beats.slice(-3).map((b, i) => (
                    <div key={i}>and then {b}</div>
                  ))}
                </div>
              </div>
              <div className="sb-leaf sb-leaf-next">
                {nextBusy ? (
                  <div className="sb-next-busy">
                    <Easel theme={theme} line={pageBeats[pageBeats.length - 1] ?? echo ?? ""} />
                  </div>
                ) : (
                  <>
                    <div className="sb-next-kicker">scene {pages.length + 1}</div>
                    <div className="sb-next-lead">and then…</div>
                    <div className="sb-next-or">
                      <span className="sb-next-hint">hold the mic and say what happens next</span>
                    </div>
                  </>
                )}
                <div className="sb-leaf-num">{pages.length + 1}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className={`sb-empty ${theme ? "sb-empty-ready" : "sb-empty-pick"}`}>
            <Backdrop />
            <div className="sb-empty-inner">
              <div className="sb-title">
                storybooks<span className="sb-dots"><i>.</i><i>.</i><i>.</i></span>
              </div>
              {theme ? (
                painting || session.controlsBusy ? (
                <Easel theme={theme} line={echo ?? ""} first />
              ) : (
                <>
                  <div className="sb-sub">
                    {ready
                      ? `hold the button and say what you want to see${name ? `, ${name}` : ""}`
                      : "waking up the story machine…"}
                  </div>
                  <div className="sb-picked">
                    <span className="sb-picked-chip">
                      <span className="sb-picked-thumb" aria-hidden>
                        <ThemeArt id={theme} />
                      </span>
                      {THEMES.find((t) => t.id === theme)?.label}
                    </span>
                    <button className="sb-picked-change" onClick={() => setTheme(null)}>
                      change
                    </button>
                  </div>
                  <button className="sb-surprise" disabled={thinking} onClick={surprise}>
                    surprise me
                  </button>
                </>
                )
              ) : (
                <>
                  <div className="sb-sub">
                    {name ? `hi ${name}! pick how your story looks` : "pick how your story looks"}
                  </div>
                  <div className="sb-themes">
                    {THEMES.map((t) => (
                      <button key={t.id} className="sb-theme" onClick={() => setTheme(t.id)}>
                        <span className="sb-theme-art" aria-hidden>
                          <ThemeArt id={t.id} />
                        </span>
                        <span className="sb-theme-label">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {shelf.length > 0 && !theme && (
                <div className="sb-shelf">
                  <div className="sb-shelf-label">{possessive(name)} books</div>
                  <div className="sb-shelf-row">
                    {shelf.slice(0, 8).map((b) => (
                      <button key={b.id} className="sb-shelf-book" onClick={() => openShelfBook(b)}>
                        <span className="sb-shelf-cover">
                          <ShelfCover book={b} />
                        </span>
                        <span className="sb-shelf-title">{b.title}</span>
                        <span className="sb-shelf-meta">
                          {b.pages.length} {b.pages.length === 1 ? "page" : "pages"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {profile && (
              <div className="sb-corner">
                <button
                  className="sb-whochip"
                  onClick={() => {
                    newStory();
                    setActiveProfileId(null);
                    setShelf([]);
                    setGate(profiles.length > 1 ? "who" : "onboarding");
                  }}
                >
                  <span className="sb-whochip-face">
                    <Avatar id={profile.avatar} />
                  </span>
                  {profile.name}
                </button>
                <button className="sb-gear" onClick={() => setGrownUps(true)} aria-label="grown-ups">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="sb-vignette" />

      <div className="sb-top">
        <div className="sb-beats">
          {live && (
            <span className="sb-page-num">
              <i className="sb-live-dot" /> scene {pages.length + 1}
            </span>
          )}
          {pageBeats.slice(-4).map((b, i) => (
            <span key={i} className="sb-beat">
              and then {b}
            </span>
          ))}
        </div>
        <div className="sb-top-right">
          {pages.length > 0 && (
            <button className="sb-mini sb-mini-text" onClick={openBook}>
              📖 {pages.length}
            </button>
          )}
          {theme && !live && (
            <button className="sb-mini sb-mini-text" onClick={goHome} aria-label="home">
              🏠 home
            </button>
          )}
        </div>
      </div>

      {bubble.trim() && (theme || live) && (
        <div className={`sb-echo ${listening ? "sb-echo-live" : ""}`}>
          {listening && (
            <span className="sb-bars" aria-hidden>
              <i /><i /><i /><i /><i />
            </span>
          )}
          <span>{bubble}</span>
        </div>
      )}

      {live && (
        <button
          className={`sb-oops ${rewinding ? "sb-oops-busy" : ""}`}
          disabled={rewinding || (!beatFrame.current && snaps.length === 0)}
          onClick={() => void oops()}
        >
          <span>⏪</span> oops
        </button>
      )}

      <div className={`sb-bottom ${theme || live || showTurn ? "" : "sb-bottom-away"}`}>
        <div className="sb-talk-wrap">
          {live && (
            <button
              className="sb-toybtn sb-endbtn"
              onClick={() => void endPage()}
              aria-label="finish this page"
            >
              <span className="sb-toybtn-emoji" aria-hidden>📕</span>
              <span className="sb-toybtn-label">the end</span>
            </button>
          )}
          {(live || showTurn) && (
            <button
              className="sb-toybtn sb-wonder"
              disabled={thinking}
              onClick={surprise}
              aria-label="give me an idea"
            >
              <span className="sb-toybtn-emoji" aria-hidden>💡</span>
              <span className="sb-toybtn-label">what if…</span>
            </button>
          )}
          <svg className="sb-ring" viewBox="0 0 170 170" aria-hidden>
            <circle cx="85" cy="85" r={R} className="sb-ring-track" />
            <circle
              cx="85"
              cy="85"
              r={R}
              className="sb-ring-fill"
              style={{ strokeDasharray: C, strokeDashoffset: C * (1 - progress), opacity: live ? 1 : 0 }}
            />
          </svg>
          <button
            className={`sb-talk ${listening ? "sb-talk-on" : ""} ${thinking ? "sb-talk-thinking" : ""}`}
            onPointerDown={(e) => {
              e.preventDefault();
              startListening();
            }}
            onPointerCancel={stopListening}
            onContextMenu={(e) => e.preventDefault()}
          >
            <span className="sb-talk-ring" aria-hidden />
            <span className="sb-talk-icon">
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0" />
                <path d="M12 18v3" />
              </svg>
            </span>
            <span className="sb-talk-label">
              {listening ? "listening" : painting ? "painting…" : thinking ? "dreaming…" : !ready ? "waking up…" : session.controlsBusy && !live ? "waking up…" : "hold to talk"}
            </span>
          </button>
        </div>
      </div>

      {bookOpen && (
        <div className="sb-book" onClick={closeBook}>
          <div className="sb-book-inner" onClick={(e) => e.stopPropagation()}>
            <div className="sb-book-head">
              <div className="sb-book-title">{shownTitle}</div>
              <div className="sb-book-sub">
                {name ? `a story by ${name} · ` : ""}
                {shownPages.length} {shownPages.length === 1 ? "page" : "pages"} ·{" "}
                {new Date(viewing?.createdAt ?? bookBorn.current).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <div className="sb-book-actions">
                <button
                  className="sb-mini sb-mini-text sb-mini-primary"
                  onClick={() => void readBook(shownPages, shownTitle)}
                >
                  🔊 read to me
                </button>
                <button
                  className="sb-mini sb-mini-text"
                  onClick={() => void exportBook(shownPages, shownTitle, name)}
                >
                  ⬇ save
                </button>
                {viewing ? (
                  <button
                    className="sb-mini sb-mini-text sb-mini-quiet"
                    onClick={() => {
                      const id = viewing.id;
                      closeBook();
                      void deleteBook(id).then(() => refreshShelf());
                    }}
                  >
                    🗑 delete
                  </button>
                ) : (
                  <button className="sb-mini sb-mini-text" onClick={newStory}>✨ new story</button>
                )}
                <button className="sb-mini sb-mini-text sb-mini-quiet" onClick={goHome}>🏠 home</button>
              </div>
            </div>
            <button className="sb-book-x" onClick={closeBook} aria-label="close">×</button>
            {shownPages[spread] && (
              <div className="sb-spread-wrap">
                <button className="sb-flip-btn" onClick={() => goTo(spread - 1)} disabled={spread === 0} aria-label="previous page">‹</button>
                <div key={shownPages[spread].id} className={`sb-spread sb-spread-${flipDir} ${readingPage === spread ? "sb-spread-reading" : ""}`}>
                  <div className="sb-leaf sb-leaf-left">
                    <img src={shownPages[spread].url} alt="" draggable={false} />
                  </div>
                  <div className="sb-leaf sb-leaf-right">
                    <div className="sb-leaf-text">
                      {(shownPages[spread].beats.length ? shownPages[spread].beats : ["…"]).map((b, j) => (
                        <p key={j}>
                          {j === 0 && spread === 0 ? "Once upon a time, " : "And then "}
                          {b}
                          {j === shownPages[spread].beats.length - 1 && spread === shownPages.length - 1 ? " The end." : "."}
                        </p>
                      ))}
                    </div>
                    <div className="sb-leaf-num">{spread + 1}</div>
                  </div>
                </div>
                <button className="sb-flip-btn" onClick={() => goTo(spread + 1)} disabled={spread >= shownPages.length - 1} aria-label="next page">›</button>
              </div>
            )}
            <div className="sb-dots-nav">
              {shownPages.map((p, i) => (
                <button key={p.id} className={`sb-dot-nav ${i === spread ? "on" : ""}`} onClick={() => goTo(i)} aria-label={`page ${i + 1}`} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={`sb-toast ${toast && !ready ? "sb-toast-in" : ""}`} aria-live="polite">
        <span>
          {/429|403|quota|session limit/i.test(session.error)
            ? "finishing the last story… reconnecting"
            : "the story machine hiccuped… reconnecting"}
        </span>
        <button className="sb-error-retry" onClick={reconnectNow} tabIndex={toast ? 0 : -1}>try now</button>
      </div>

      {cheer && <Cheer count={pages.length} name={name} />}

      {gate === "onboarding" && (
        <Onboarding
          onDone={(p) => {
            loadPeople();
            pickProfile(p);
          }}
        />
      )}
      {gate === "who" && (
        <Who
          profiles={profiles}
          onPick={pickProfile}
          onAdd={() => setGate("onboarding")}
        />
      )}
      {grownUps && (
        <GrownUps
          profiles={profiles}
          activeId={profile?.id ?? null}
          onClose={() => setGrownUps(false)}
          onChanged={() => {
            const list = loadPeople();
            const still = list.find((p) => p.id === profile?.id);
            setProfile(still ?? null);
            if (!still) setGate(list.length ? "who" : "onboarding");
            void refreshShelf(still?.id);
          }}
        />
      )}
    </div>
  );
}

// Three pages in: a quiet bit of confetti and a well done.
function Cheer({ count, name }: { count: number; name: string }) {
  const bits = Array.from({ length: 34 }, (_, i) => ({
    left: `${(i * 37) % 100}%`,
    delay: `${(i % 11) * 0.09}s`,
    color: ["#FF5D73", "#FFD166", "#3FB6A8", "#7FA7FF", "#B08BE8"][i % 5],
    rot: `${(i * 53) % 360}deg`,
  }));
  return (
    <div className="sb-cheer" aria-hidden>
      {bits.map((b, i) => (
        <i
          key={i}
          style={{ left: b.left, animationDelay: b.delay, background: b.color, "--rot": b.rot } as any}
        />
      ))}
      <div className="sb-cheer-card">
        <div className="sb-cheer-big">{count} pages!</div>
        <div className="sb-cheer-sub">nice work{name ? `, ${name}` : ""} — that’s a whole book</div>
      </div>
    </div>
  );
}
