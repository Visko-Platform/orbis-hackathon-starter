"use client";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  CloudRain,
  Copy,
  Expand,
  Film,
  GitBranch,
  Globe2,
  Info,
  Lightbulb,
  Loader2,
  Pause,
  Play,
  Plus,
  Radio,
  RotateCcw,
  Settings2,
  ShieldCheck,
  SkipForward,
  Mic,
  MicOff,
  Music,
  Music2,
  Sparkles,
  Square,
  Sun,
  Trash2,
  Users,
  Volume2,
  VolumeX,
  WandSparkles,
  X,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { COSMIC_CHAPTERS, QUICK_CUES, TEMPLATES } from "@/lib/cutline/content";
import type { Beat, Keys } from "@/lib/cutline/types";
import { activePath } from "@/lib/cutline/story";
import { CHAPTER_REFERENCES } from "@/lib/cutline/references";
import { useStory } from "./use-story";
import { useLiveVideo } from "./use-live-video";

import { speechRecognizer, type SpeechRecognizer } from "./speech";
import { useScore } from "./score";
// Score preference, read after hydration so server and client render the same.
const musicListeners = new Set<() => void>();
const musicStore = {
  subscribe(listener: () => void) {
    musicListeners.add(listener);
    return () => {
      musicListeners.delete(listener);
    };
  },
  get() {
    try {
      return window.localStorage.getItem("cutline_music") !== "off";
    } catch {
      return true;
    }
  },
  set(on: boolean) {
    try {
      window.localStorage.setItem("cutline_music", on ? "on" : "off");
    } catch {}
    musicListeners.forEach((listener) => listener());
  },
};
const CosmicFlight = lazy(() =>
  import("./cosmic-flight").then((module) => ({
    default: module.CosmicFlight,
  })),
);

type Modal =
  | "connections"
  | "invite"
  | "export"
  | "new"
  | "scene"
  | "memory"
  | "delete"
  | "sources"
  | "example"
  | null;
export default function Studio() {
  // Local demo: on localhost the server unlocks the shared .env.local keys
  // without a presenter code, so the studio starts already connected.
  const [keys, setKeys] = useState<Keys>(() => ({
    reactor: "",
    nebius: "",
    accessCode:
      typeof window !== "undefined" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname)
        ? "local-demo"
        : "",
  }));
  const [draftKeys, setDraftKeys] = useState(keys);
  const [modal, setModal] = useState<Modal>(null);
  const [tab, setTab] = useState("studio");
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState(
    "The train slows. Every light goes out except the one above the last door.",
  );
  const [duration, setDuration] = useState(2);
  const [autoZoom, setAutoZoom] = useState(false);
  const [cinemaMode, setCinemaMode] = useState(false);
  const [selectedScene, setSelectedScene] = useState<Beat | null>(null);
  const [qr, setQr] = useState("");
  const [newTemplate, setNewTemplate] = useState("cosmic-premiere");
  const [newTitle, setNewTitle] = useState("");
  const [newOpening, setNewOpening] = useState("");
  const [newMemory, setNewMemory] = useState("");
  const [memoryDraft, setMemoryDraft] = useState("");
  const [stageNotice, setStageNotice] = useState("");
  useEffect(() => {
    if (!stageNotice) return;
    const timer = setTimeout(() => setStageNotice(""), 7000);
    return () => clearTimeout(timer);
  }, [stageNotice]);
  const [cosmicMap, setCosmicMap] = useState(true);
  const [keyboardHint, setKeyboardHint] = useState(false);
  const data = useStory(keys);
  const { videoRef, ...live } = useLiveVideo(keys);
  const story = data.story;
  const latest = useRef({ story, live, data, busy });
  useEffect(() => {
    latest.current = { story, live, data, busy };
  }, [story, live, data, busy]);
  const stageRef = useRef<HTMLDivElement>(null);
  const cosmicBusy = useRef(false);
  const runId = useRef(0);
  const shownError = useRef("");
  const template =
    TEMPLATES.find((x) => x.id === (story?.templateId || "cosmic-premiere")) ||
    TEMPLATES[0];
  const scene =
    story?.state.scenes.find((x) => x.id === story.state.currentSceneId) ||
    null;
  const chapter = story?.state.cosmicChapter || 0;
  const isOpening = story ? story.state.phase === "opening" : true;
  const poll = story?.state.poll;
  const pollScene =
    story?.state.scenes.find((s) => s.id === poll?.sceneId) || scene;
  const choices = poll?.open
    ? pollScene?.choices || template.choices
    : scene?.choices || template.choices;
  const votes = data.snapshot?.votes || {};
  const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);
  const hasReactor = !!(
    keys.reactor ||
    (data.config?.reactorConfigured && keys.accessCode)
  );
  const hasNebius = !!(
    keys.nebius ||
    (data.config?.nebiusConfigured && keys.accessCode)
  );
  const reference = CHAPTER_REFERENCES[isOpening ? chapter : 8];
  const path = story
    ? activePath(story.state.scenes, story.state.currentSceneId)
    : [];
  const canSend = live.status === "live";
  // Adaptive ambient score across the opening and the film; ducks under Orbis audio.
  const music = useSyncExternalStore(
    musicStore.subscribe,
    musicStore.get,
    () => true,
  );
  useScore({
    chapter,
    opening: isOpening,
    liveAudio: live.status === "live" && !live.muted,
    enabled: music,
  });
  const toggleMusic = () => musicStore.set(!music);
  const shareUrl =
    typeof window === "undefined" || !story
      ? ""
      : `${window.location.origin}/watch/${story.id}`;
  const run = useCallback(async (work: () => Promise<unknown>) => {
    setBusy(true);
    try {
      return await work();
    } catch (e) {
      toast.error((e as Error).message);
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);
  const stopZoom = useCallback(() => {
    runId.current++;
    setAutoZoom(false);
  }, []);
  const ensureStory = useCallback(
    async () => story || data.create("cosmic-premiere"),
    [story, data],
  );
  const startLive = async () => {
    if (!hasReactor) {
      setDraftKeys(keys);
      setModal("connections");
      return;
    }
    stopZoom();
    await run(async () => {
      let current = await ensureStory();
      if (current.state.phase === "opening")
        current = (
          await data.act(
            { type: "cosmic", chapter: 8, running: false },
            current,
          )
        ).story;
      const beat = current.state.scenes.find(
        (x) => x.id === current.state.currentSceneId,
      )!;
      const image =
        current.templateId === "custom"
          ? undefined
          : "/images/the-last-train.png";
      if (live.isConnected) await live.restart(beat.prompt, image);
      else await live.connect(current, beat.prompt, image);
      await data.act({ type: "session", live: true }, current);
      toast.success("Orbis connected. Waiting for the first movie frames.");
    });
  };
  const endLive = async () => {
    stopZoom();
    await run(async () => {
      await live.disconnect();
      if (story) await data.act({ type: "session", live: false });
      toast.success("Live session ended. Your story is saved.");
    });
  };
  const advance = useCallback(async (index: number, running = false) => {
    if (cosmicBusy.current) return;
    cosmicBusy.current = true;
    try {
      const current =
        latest.current.story ||
        (await latest.current.data.create("cosmic-premiere"));
      const engine = latest.current.live;
      if (engine.isConnected) {
        if (index < 8 && engine.status === "live") await engine.pause();
        if (index === 8) {
          const beat = current.state.scenes.find(
            (x) => x.id === current.state.currentSceneId,
          )!;
          await engine.restart(
            current.templateId === "cosmic-premiere" &&
              beat.prompt === TEMPLATES[1].opening
              ? TEMPLATES[0].opening
              : beat.prompt,
            current.templateId === "custom"
              ? undefined
              : "/images/the-last-train.png",
          );
        }
      }
      await latest.current.data.act(
        { type: "cosmic", chapter: index, running },
        current,
      );
      setStageNotice(COSMIC_CHAPTERS[index].scale);
      if (index === 8) {
        setAutoZoom(false);
        runId.current++;
        toast.success(
          "Welcome to the film. Open voting to hand the story to the audience.",
        );
      }
    } finally {
      cosmicBusy.current = false;
    }
  }, []);
  useEffect(() => {
    if (
      !autoZoom ||
      busy ||
      live.sending ||
      (!isOpening &&
        ["paused", "connecting", "priming", "error"].includes(live.status))
    )
      return;
    const id = runId.current;
    const timer = setTimeout(() => {
      if (id !== runId.current) return;
      void advance(Math.min(chapter + 1, 8), true).catch((e) => {
        stopZoom();
        toast.error(e.message);
      });
    }, duration * 1000);
    return () => clearTimeout(timer);
  }, [
    autoZoom,
    chapter,
    duration,
    busy,
    live.sending,
    live.status,
    isOpening,
    advance,
    stopZoom,
  ]);
  const toggleJourney = async () => {
    if (autoZoom) {
      stopZoom();
      if (story)
        await run(() => data.act({ type: "cosmic", chapter, running: false }));
      return;
    }
    await run(async () => {
      const current = await ensureStory();
      if (!isOpening || chapter === 8) await advance(0, true);
      else await data.act({ type: "cosmic", chapter, running: true }, current);
      runId.current++;
      setAutoZoom(true);
    });
  };
  const direct = async (action = prompt) => {
    if (poll?.open) {
      toast.info("Close audience voting before sending another direction.");
      return;
    }
    if (isOpening) {
      toast.info("Enter the film to direct the next scene.");
      return;
    }
    if (
      busy ||
      live.sending ||
      data.loading ||
      data.error ||
      ["connecting", "priming", "paused"].includes(live.status)
    )
      return;
    if (action.trim().length < 3) return;
    stopZoom();
    await run(async () => {
      const current = await ensureStory();
      const result = await data.act(
        { type: "direct", prompt: action },
        current,
      );
      const next = result.story.state.scenes.find(
        (x) => x.id === result.story.state.currentSceneId,
      )!;
      setStageNotice(next.title);
      if (canSend) {
        try {
          await live.sendPrompt(next.prompt, next.title);
          await data.act(
            { type: "visual", sceneId: next.id, status: "acknowledged" },
            result.story,
          );
          toast.success("Direction accepted by Orbis. Watch the next chunks.");
        } catch (e) {
          await data.act(
            { type: "visual", sceneId: next.id, status: "failed" },
            result.story,
          );
          throw e;
        }
      } else
        toast.success(
          next.source === "nebius"
            ? "Nebius planned the next scene. Start live video to render it."
            : "Scene saved to the rehearsal storyboard.",
        );
      setPrompt("");
    });
  };
  // Voice direction: speak the next moment; the final transcript is sent as a direction.
  const [listening, setListening] = useState(false);
  const recognizer = useRef<SpeechRecognizer | null>(null);
  useEffect(() => () => recognizer.current?.abort(), []);
  const toggleVoice = () => {
    if (listening) {
      recognizer.current?.stop();
      return;
    }
    const Recognizer = speechRecognizer();
    if (!Recognizer) {
      toast.info(
        "Voice direction needs speech recognition. Use Chrome, Edge, or Safari.",
      );
      return;
    }
    if (isOpening) {
      toast.info("Enter the film to direct by voice.");
      return;
    }
    if (poll?.open) {
      toast.info("Close audience voting before directing by voice.");
      return;
    }
    const recognition = new Recognizer();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    let finalText = "";
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interim += result[0].transcript;
      }
      setPrompt((finalText + interim).trim().slice(0, 1200));
    };
    recognition.onerror = (event) => {
      if (event.error === "no-speech")
        toast.info("No speech heard. Try again closer to the microphone.");
      else if (event.error === "not-allowed")
        toast.error(
          "Microphone access was blocked. Allow it to direct by voice.",
        );
      else if (event.error !== "aborted")
        toast.error("Voice direction failed: " + event.error);
    };
    recognition.onend = () => {
      recognizer.current = null;
      setListening(false);
      const text = finalText.trim().slice(0, 1200);
      if (text.length >= 3) {
        setPrompt(text);
        setStageNotice(
          "Voice: " + (text.length > 48 ? text.slice(0, 45) + "…" : text),
        );
        void direct(text);
      }
    };
    recognizer.current = recognition;
    setListening(true);
    try {
      recognition.start();
    } catch {
      recognizer.current = null;
      setListening(false);
      toast.error("Could not start listening. Try again.");
    }
  };
  const cue = useCallback(
    async (cueId: string) => {
      const item = QUICK_CUES.find((x) => x.id === cueId);
      if (!item) return;
      const context = latest.current;
      if (
        context.busy ||
        context.live.sending ||
        context.data.loading ||
        context.data.error ||
        ["connecting", "priming", "paused"].includes(context.live.status)
      )
        return;
      if (latest.current.story?.state.phase === "opening") {
        toast.info("Enter the film to send live movie cues.");
        return;
      }
      return await run(async () => {
        const current =
          latest.current.story ||
          (await latest.current.data.create("last-train"));
        const engine = latest.current.live;
        const base = current.state.scenes.find(
          (x) => x.id === current.state.currentSceneId,
        )!;
        let latency: null | number = null;
        if (engine.status === "live")
          latency = await engine.sendPrompt(
            current.state.phase === "opening"
              ? `${COSMIC_CHAPTERS[current.state.cosmicChapter].prompt} ${cueId === "closer" ? "The camera pushes smoothly toward the centered destination, keeping the same forward direction." : "Preserve the same cosmic structures. Adjust the lighting subtly, with restrained scientific-film color."}`
              : `${current.state.memory} Current scene: ${base.prompt} ${item.prompt}`,
            item.label,
          );
        await latest.current.data.act({ type: "cue", cueId, latency }, current);
        setStageNotice(item.label);
        if (!engine.isConnected)
          toast.info(
            "Cue saved in rehearsal. Connect Orbis to change live video.",
          );
        return true;
      });
    },
    [run],
  );
  const closePoll = async () => {
    await run(async () => {
      const result = await data.act({ type: "poll.close" });
      if (!result.winner) {
        toast.info(
          "No votes yet. Open a new round when the audience is ready.",
        );
        return;
      }
      if (live.isConnected && !canSend) {
        toast.info(
          "Voting is closed. Resume the film, then apply the winning choice.",
        );
        return;
      }
      toast.success("Audience choice locked. Directing the winning moment…");
      const next = await data.act({ type: "poll.apply" }, result.story);
      const beat = next.story.state.scenes.find(
        (s) => s.id === next.story.state.currentSceneId,
      )!;
      setStageNotice("Audience chose · " + beat.title);
      if (canSend) {
        try {
          await live.sendPrompt(beat.prompt, "Audience · " + beat.title);
          await data.act(
            { type: "visual", sceneId: beat.id, status: "acknowledged" },
            next.story,
          );
        } catch (e) {
          await data.act(
            { type: "visual", sceneId: beat.id, status: "failed" },
            next.story,
          );
          throw e;
        }
      }
    });
  };
  const applyWinner = async () => {
    if (live.isConnected && !canSend) {
      toast.info("Resume the film before applying the winning choice.");
      return;
    }
    await run(async () => {
      const next = await data.act({ type: "poll.apply" });
      const beat = next.story.state.scenes.find(
        (s) => s.id === next.story.state.currentSceneId,
      )!;
      if (canSend) {
        try {
          await live.sendPrompt(beat.prompt, "Audience · " + beat.title);
          await data.act(
            { type: "visual", sceneId: beat.id, status: "acknowledged" },
            next.story,
          );
        } catch (error) {
          await data.act(
            { type: "visual", sceneId: beat.id, status: "failed" },
            next.story,
          );
          throw error;
        }
      }
    });
  };
  // Crowd voice autopilot: the audience talks to the screen; pending shouts are
  // merged into ONE scene direction and sent to the film without the director.
  const crowd = story?.state.crowd;
  const openMic = story?.state.openMic !== false;
  const crowdApplied = useRef(0);
  const [crowdAppliedAt, setCrowdAppliedAt] = useState(0);
  const [directingCrowd, setDirectingCrowd] = useState(false);
  const pendingCrowd = (crowd || []).filter((s) => s.at > crowdAppliedAt);
  const crowdStatus = directingCrowd
    ? "directing"
    : pendingCrowd.length
      ? "waiting"
      : "idle";
  useEffect(() => {
    const pending = (crowd || []).filter((s) => s.at > crowdApplied.current);
    if (!openMic || isOpening || !story || poll?.open || !pending.length)
      return;
    if (
      busy ||
      live.sending ||
      data.loading ||
      ["connecting", "priming", "paused"].includes(live.status)
    )
      return;
    const last = pending[pending.length - 1];
    const quiet = Math.max(400, 2600 - (Date.now() - last.at));
    const timer = window.setTimeout(() => {
      crowdApplied.current = last.at;
      setCrowdAppliedAt(last.at);
      setDirectingCrowd(true);
      const lines = pending.map((s) => s.text.trim()).filter(Boolean);
      const action = hasNebius
        ? `The audience is talking to the screen. Their voices: ${lines.map((l) => `"${l}"`).join(" · ")}. Turn what the crowd wants into one immediately visible change that keeps the same story, character and setting.`
        : lines.join(". ");
      void run(async () => {
        const current = await ensureStory();
        const result = await data.act(
          {
            type: "direct",
            prompt: action.slice(0, 1200),
            crowdUntil: last.at,
          },
          current,
        );
        const next = result.story.state.scenes.find(
          (x) => x.id === result.story.state.currentSceneId,
        )!;
        setStageNotice("Audience · " + next.title);
        if (canSend) {
          try {
            await live.sendPrompt(next.prompt, "Audience · " + next.title);
            await data.act(
              { type: "visual", sceneId: next.id, status: "acknowledged" },
              result.story,
            );
          } catch (e) {
            await data.act(
              { type: "visual", sceneId: next.id, status: "failed" },
              result.story,
            );
            throw e;
          }
        }
      }).finally(() => setDirectingCrowd(false));
    }, quiet);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    crowd,
    openMic,
    isOpening,
    busy,
    live.sending,
    live.status,
    data.loading,
    poll?.open,
  ]);
  const toggleOpenMic = async () => {
    await run(async () => {
      const current = await ensureStory();
      await data.act({ type: "openmic", on: !openMic }, current);
    });
  };
  const invite = async () => {
    await run(async () => {
      await ensureStory();
      setModal("invite");
    });
  };
  useEffect(() => {
    if (modal !== "invite" || !shareUrl) return;
    let ignore = false;
    import("qrcode")
      .then((q) =>
        q.toDataURL(shareUrl, {
          width: 300,
          margin: 2,
          color: { dark: "#10150c", light: "#f0d7b5" },
        }),
      )
      .then((url) => {
        if (!ignore) setQr(url);
      })
      .catch(() =>
        toast.error("Could not draw the QR code. Use the join link instead."),
      );
    return () => {
      ignore = true;
    };
  }, [modal, shareUrl]);
  useEffect(() => {
    if (live.error && live.error !== shownError.current) {
      shownError.current = live.error;
      toast.error(live.error);
    }
  }, [live.error]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        modal ||
        (e.target instanceof HTMLElement &&
          (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) ||
            e.target.isContentEditable))
      )
        return;
      if (e.key === "Escape") {
        setCinemaMode(false);
        return;
      }
      if (e.key === "?") {
        setKeyboardHint((x) => !x);
        return;
      }
      if (e.key >= "1" && e.key <= "4" && !busy) {
        e.preventDefault();
        void cue(QUICK_CUES[Number(e.key) - 1].id);
      }
      if (
        (e.key === "ArrowRight" || e.key === "ArrowLeft") &&
        isOpening &&
        !busy
      ) {
        e.preventDefault();
        stopZoom();
        void run(() =>
          advance(
            Math.max(
              0,
              Math.min(8, chapter + (e.key === "ArrowRight" ? 1 : -1)),
            ),
          ),
        );
      }
      if (
        e.code === "Space" &&
        !isOpening &&
        live.isConnected &&
        !busy &&
        !live.sending
      ) {
        e.preventDefault();
        void run(async () => {
          await live.pause();
          if (story)
            await data.act({
              type: "session",
              live: true,
              paused: live.status !== "paused",
            });
        });
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [
    modal,
    busy,
    cue,
    isOpening,
    chapter,
    live,
    story,
    data,
    advance,
    run,
    stopZoom,
  ]);
  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (latest.current.live.isConnected) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, []);
  useEffect(() => {
    const context = (
      document as unknown as {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => unknown;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: unknown) =>
      Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    void register({
      name: "cutline_read_story",
      description: "Read the current story, chapter and voting status.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: () => {
        const s = latest.current.story;
        return s
          ? {
              id: s.id,
              title: s.title,
              chapter: s.state.cosmicChapter,
              poll: s.state.poll,
              sceneId: s.state.currentSceneId,
            }
          : { status: "no story selected" };
      },
    });
    void register({
      name: "cutline_send_live_cue",
      description:
        "Send one of the four visible live cues. Changes running Orbis video when connected; otherwise saves a rehearsal cue.",
      inputSchema: {
        type: "object",
        properties: {
          cueId: { type: "string", enum: QUICK_CUES.map((x) => x.id) },
        },
        required: ["cueId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: async (input: unknown) => {
        const id = (input as { cueId?: string })?.cueId;
        if (!QUICK_CUES.some((x) => x.id === id))
          throw new Error("Invalid cueId");
        const succeeded = await cue(id!);
        if (!succeeded)
          throw new Error(
            "The cue failed. Inspect the visible connection or story error.",
          );
        return {
          cueId: id,
          mode: latest.current.live.isConnected ? "live" : "rehearsal",
        };
      },
    });
    return () => lifecycle.abort();
  }, [cue]);
  const createStory = async () => {
    await run(async () => {
      stopZoom();
      if (live.isConnected) {
        await live.disconnect();
        if (story) await data.act({ type: "session", live: false });
      }
      await data.create(
        newTemplate,
        newTitle || undefined,
        newTemplate === "custom" && newOpening ? newOpening : undefined,
        newTemplate === "custom" && newMemory ? newMemory : undefined,
      );
      setModal(null);
      setTab("studio");
      setPrompt("");
      setStageNotice("");
      toast.success("Your new story is ready.");
    });
  };
  const branch = async () => {
    if (!selectedScene) return;
    await run(async () => {
      stopZoom();
      await data.act({ type: "branch", sceneId: selectedScene.id });
      if (live.isConnected) await live.restart(selectedScene.prompt);
      setModal(null);
      toast.success(
        "Continuing from this story moment. Live video regenerates from its prompt.",
      );
    });
  };
  return (
    <div className={`studio-shell ${cinemaMode ? "presentation-mode" : ""}`}>
      <Toaster theme="dark" richColors />
      <header className="topbar">
        <Link className="wordmark" href="/" aria-label="Cutline home">
          <span className="brand-mark">
            <i />
            <i />
            <i />
          </span>
          CUTLINE<span className="beta">BETA</span>
        </Link>
        <span className="header-caption">The audience changes everything.</span>
        <button
          className="connection-badge"
          onClick={() => {
            setDraftKeys(keys);
            setModal("connections");
          }}
        >
          <span className={`status-dot ${live.isConnected ? "" : "dim"}`} />
          {live.isConnected ? "Orbis connected" : "Connect your live models"}
        </button>
        <button
          className="icon-button"
          onClick={() => {
            setDraftKeys(keys);
            setModal("connections");
          }}
          aria-label="Connection settings"
        >
          <Settings2 size={18} />
        </button>
        <span className="avatar" title="Your private browser workspace">
          YOU
        </span>
      </header>
      <Tabs value={tab} onValueChange={setTab} className="workspace-tabs">
        <div className="workspace-bar">
          <TabsList variant="line">
            <TabsTrigger value="studio">
              <Clapperboard />
              Studio
            </TabsTrigger>
            <TabsTrigger value="library">
              <Film />
              Story library{" "}
              <span className="count-pill">{data.stories.length}</span>
            </TabsTrigger>
          </TabsList>
          <button
            className="text-button mono"
            onClick={() => setKeyboardHint((x) => !x)}
          >
            MADE TO BE PLAYED <span className="keycap">?</span>
          </button>
        </div>
        <TabsContent
          forceMount
          value="studio"
          className="data-[state=inactive]:hidden"
        >
          {data.error && (
            <div className="error-banner" role="alert">
              {data.error}
              <button
                className="text-button"
                onClick={() => void data.reload()}
              >
                Try again <RotateCcw size={13} />
              </button>
            </div>
          )}
          <div className="project-heading">
            <div>
              <div className="eyebrow">
                YOUR DIRECTOR’S CHAIR{" "}
                {story && (
                  <span className="saved-label">
                    <Check size={9} />
                    SAVED
                  </span>
                )}
              </div>
              <h1>
                {story?.title || template.title}
                <span className="tag">{story?.genre || template.genre}</span>
              </h1>
              <p>{template.description}</p>
            </div>
            <div className="heading-actions">
              <button
                className="icon-button"
                onClick={() => setModal("export")}
                disabled={!story}
                aria-label="Export story"
              >
                <ArrowDownToLine size={16} />
              </button>
              <button
                className="button outline"
                disabled={busy || data.loading || !!data.error}
                onClick={() => void invite()}
              >
                <Users size={16} />
                Invite audience <ArrowUpRight size={15} />
              </button>
            </div>
          </div>
          {keyboardHint && (
            <div className="shortcut-banner">
              <span>
                <b>1–4</b> Live cues
              </span>
              <span>
                <b>← →</b> Cosmic chapters
              </span>
              <span>
                <b>Space</b> Pause / resume video
              </span>
              <span>
                <b>Esc</b> Exit theater mode
              </span>
              <button
                aria-label="Hide keyboard shortcuts"
                onClick={() => setKeyboardHint(false)}
              >
                <X size={14} />
              </button>
            </div>
          )}
          <div className="studio-grid">
            <section className="screen-column">
              <div
                ref={stageRef}
                className={`cinema ${live.hasFrames && !isOpening ? "has-video" : ""} ${isOpening ? "cosmic-stage interactive-flight" : ""}`}
              >
                <div
                  key={`${isOpening}-${chapter}`}
                  className={`stage-art ${isOpening && chapter > 0 && chapter < 8 ? "source-reference" : ""}`}
                  style={{
                    backgroundImage: `url('${isOpening ? reference.image || "/images/nasa/san-francisco.jpg" : template.id === "custom" ? template.image : "/images/the-last-train.png"}')`,
                  }}
                />
                {isOpening && (
                  <Suspense
                    fallback={
                      <div className="flight-loading">
                        Preparing your journey…
                      </div>
                    }
                  >
                    <CosmicFlight
                      chapter={chapter}
                      travelMs={Math.min(4000, Math.max(1200, duration * 850))}
                      disabled={
                        busy || live.sending || data.loading || !!data.error
                      }
                      onNavigate={(next) => {
                        stopZoom();
                        if (next === 8 && hasReactor) void startLive();
                        else void run(() => advance(next));
                      }}
                    />
                  </Suspense>
                )}
                <video
                  ref={videoRef}
                  className="live-video"
                  style={{ visibility: isOpening ? "hidden" : "visible" }}
                  autoPlay
                  playsInline
                  muted={live.muted}
                  onPlaying={live.onPlaying}
                  aria-label="Live Orbis cinema"
                />
                <div className="cinema-top">
                  <span
                    className={`status-pill ${live.isConnected ? "on-air" : ""}`}
                  >
                    <span className="status-dot" />
                    {isOpening
                      ? "INTERACTIVE COSMIC FLIGHT"
                      : live.status === "connecting"
                        ? "CONNECTING"
                        : live.status === "priming"
                          ? "PRIMING"
                          : live.status === "paused"
                            ? "PAUSED"
                            : live.status === "live"
                              ? "LIVE · ORBIS"
                              : "STORYBOARD REHEARSAL"}
                  </span>
                  <span className="mono">
                    {isOpening
                      ? `${String(chapter + 1).padStart(2, "0")} / 09 · ${COSMIC_CHAPTERS[chapter].name.toUpperCase()}`
                      : `SCENE ${String(path.length || 1).padStart(2, "0")} · ${(scene?.title || "THE DEPARTURE").slice(0, 28).toUpperCase()}`}
                  </span>
                </div>
                {!live.hasFrames && !isOpening && (
                  <div className="cinema-title">
                    <span className="eyebrow">
                      {isOpening
                        ? COSMIC_CHAPTERS[chapter].scale
                        : "A CUTLINE ORIGINAL"}
                    </span>
                    <h2>
                      {isOpening ? (
                        chapter === 0 ? (
                          <>
                            From everything.
                            <br />
                            To this moment.
                          </>
                        ) : (
                          COSMIC_CHAPTERS[chapter].name
                        )
                      ) : (
                        scene?.title || (
                          <>
                            Every ending
                            <br />
                            starts with a choice.
                          </>
                        )
                      )}
                    </h2>
                    {!isOpening &&
                    (live.status === "connecting" ||
                      live.status === "priming") ? (
                      <div className="connecting-state">
                        <Loader2 className="spin" size={16} />
                        {live.status === "connecting"
                          ? "Finding your live world…"
                          : template.id === "custom"
                            ? "Preparing your original world…"
                            : "Preparing the reference-anchored take…"}
                      </div>
                    ) : (
                      <div className="stage-actions">
                        <button
                          className="button lime"
                          disabled={busy || data.loading || !!data.error}
                          onClick={() =>
                            void (isOpening ? toggleJourney() : startLive())
                          }
                        >
                          <Play size={14} fill="currentColor" />
                          {isOpening
                            ? autoZoom
                              ? "Pause opening"
                              : "Play cinematic opening"
                            : live.status === "error"
                              ? "Reconnect Orbis"
                              : "Start live cinema"}
                        </button>
                        {isOpening && (
                          <button
                            className="button glass"
                            disabled={busy || data.loading || !!data.error}
                            onClick={() => void startLive()}
                          >
                            Enter live film <ArrowRight size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {live.hasFrames && !isOpening && (
                  <div
                    className="film-decisions"
                    aria-label="Choose what happens in the movie"
                  >
                    <div className="film-decision-label">
                      <span className="status-dot" />
                      {poll?.open
                        ? "VOTE ON THE FILM"
                        : "DIRECTLY CHANGE THE FILM"}
                      <span>
                        {busy || live.sending
                          ? "Directing…"
                          : "CHOOSE THE NEXT MOMENT"}
                      </span>
                    </div>
                    <div className="film-decision-options">
                      {choices.map((choice, index) => (
                        <button
                          key={choice.id}
                          aria-label={`${poll?.open ? "Vote on film" : "Direct film"}: ${choice.label}`}
                          disabled={
                            busy || live.sending || live.status !== "live"
                          }
                          className={
                            data.snapshot?.myVote === choice.id && poll?.open
                              ? "selected"
                              : ""
                          }
                          onClick={() => {
                            if (poll?.open)
                              void run(() => data.vote(choice.id));
                            else void direct(choice.action);
                          }}
                        >
                          <span>{String.fromCharCode(65 + index)}</span>
                          <strong>{choice.label}</strong>
                          {poll?.open ? (
                            <b>{votes[choice.id] || 0}</b>
                          ) : (
                            <ArrowUpRight size={13} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {live.hasFrames && !isOpening && stageNotice && (
                  <div className="live-caption" aria-live="polite">
                    {stageNotice}
                  </div>
                )}
                <div className="cinema-bottom">
                  <span>
                    <Radio size={14} />
                    {live.hasFrames && !isOpening
                      ? `Orbis live video${live.imageConfirmed ? " · reference confirmed" : ""}`
                      : isOpening
                        ? "Cinematic 3D journey · NASA source imagery"
                        : !isOpening && template.id === "custom"
                          ? "Your original world · prompt-only generation"
                          : `${reference.kind} · ${reference.credit}`}
                  </span>
                  <div className="stage-tools">
                    <button
                      aria-label="Image sources and accuracy"
                      title="Image sources and accuracy"
                      onClick={() => setModal("sources")}
                    >
                      <Info size={15} />
                    </button>
                    <button
                      aria-label={music ? "Turn score off" : "Turn score on"}
                      title={
                        music
                          ? "Score on · click to silence"
                          : "Score off · click to play"
                      }
                      aria-pressed={music}
                      onClick={toggleMusic}
                    >
                      {music ? <Music2 size={15} /> : <Music size={15} />}
                    </button>
                    <button
                      aria-label={
                        live.muted ? "Unmute live video" : "Mute live video"
                      }
                      title={live.muted ? "Unmute" : "Mute"}
                      onClick={() => live.setMuted(!live.muted)}
                      disabled={!live.isConnected}
                    >
                      {live.muted ? (
                        <VolumeX size={15} />
                      ) : (
                        <Volume2 size={15} />
                      )}
                    </button>
                    <button
                      aria-label={
                        cinemaMode ? "Exit theater mode" : "Enter theater mode"
                      }
                      title="Theater mode"
                      onClick={() => setCinemaMode(!cinemaMode)}
                    >
                      <Expand size={15} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="screen-toolbar">
                <span>
                  <span
                    className={`status-dot ${live.isConnected ? "" : "dim"}`}
                  />
                  {isOpening
                    ? autoZoom
                      ? "The cinematic opening is playing"
                      : "Click a destination to fly closer"
                    : live.status === "live"
                      ? "The world is running"
                      : live.status === "paused"
                        ? "World paused"
                        : autoZoom
                          ? "Rehearsing the cosmic opening"
                          : "Ready when you are"}
                </span>
                <div className="playback-tools">
                  {live.resolutions.length > 0 && (
                    <select
                      aria-label="Live video resolution"
                      className="resolution-select"
                      value={live.resolution}
                      disabled={
                        busy ||
                        live.sending ||
                        (!live.liveResolutionSwitching && live.isConnected)
                      }
                      onChange={(e) =>
                        void run(() => live.changeResolution(e.target.value))
                      }
                    >
                      <option value="" disabled>
                        Quality
                      </option>
                      {live.resolutions.map((r) => (
                        <option key={r} value={r}>
                          {r.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  )}
                  {live.stats?.framesPerSecond !== undefined && (
                    <span className="mono">
                      {Math.round(live.stats.framesPerSecond)} FPS
                    </span>
                  )}
                  {live.isConnected && (
                    <>
                      <button
                        className="text-button"
                        disabled={isOpening || busy || live.sending}
                        onClick={() =>
                          void run(async () => {
                            await live.pause();
                            await data.act({
                              type: "session",
                              live: true,
                              paused: live.status !== "paused",
                            });
                          })
                        }
                      >
                        {live.status === "paused" ? (
                          <Play size={13} />
                        ) : (
                          <Pause size={13} />
                        )}{" "}
                        {live.status === "paused" ? "Resume" : "Pause"}
                      </button>
                      <button
                        className="text-button"
                        onClick={() => void endLive()}
                      >
                        <Square size={11} />
                        End session
                      </button>
                    </>
                  )}
                  <span className="mono">
                    {live.stats?.rtt !== undefined
                      ? `${Math.round(live.stats.rtt)} MS NETWORK RTT`
                      : `16:9 · ${(keys.model || data.config?.reactorModel || "").endsWith("stable") ? "ORBIS STABLE" : "ORBIS DYNAMIC"}`}
                  </span>
                </div>
              </div>
              {live.error && (
                <div className="inline-error" role="alert">
                  <Info size={14} />
                  <span>{live.error}</span>
                  {live.isConnected && (
                    <button
                      className="text-button"
                      onClick={() => void run(() => live.play())}
                    >
                      Start playback
                    </button>
                  )}
                  <button
                    onClick={() => live.setError(null)}
                    aria-label="Dismiss connection error"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              <section className="cosmic-console">
                <div className="section-heading">
                  <h3>
                    <Globe2 size={16} />
                    The cosmic opening{" "}
                    <span className="tiny-tag">EVERYTHING → EVERYONE</span>
                  </h3>
                  <button
                    className="text-button"
                    onClick={() => setCosmicMap(!cosmicMap)}
                  >
                    {cosmicMap ? "Hide" : "Show"} journey{" "}
                    {cosmicMap ? (
                      <ChevronLeft size={13} />
                    ) : (
                      <ChevronRight size={13} />
                    )}
                  </button>
                </div>
                {cosmicMap && (
                  <>
                    <div
                      className="cosmic-track"
                      aria-label="Cosmic zoom chapters"
                    >
                      {COSMIC_CHAPTERS.map((c, i) => (
                        <button
                          key={c.name}
                          className={`cosmic-node ${i === chapter && isOpening ? "active" : ""} ${i < chapter || !isOpening ? "visited" : ""}`}
                          aria-label={`Zoom to ${c.name}`}
                          aria-pressed={i === chapter && isOpening}
                          onClick={() => {
                            stopZoom();
                            void run(() => advance(i));
                          }}
                          disabled={busy || live.sending}
                        >
                          <span
                            className="cosmic-orbit"
                            style={
                              {
                                "--orbit": `${Math.max(8, 30 - i * 2.5)}px`,
                              } as React.CSSProperties
                            }
                          />
                          <span>{c.name}</span>
                        </button>
                      ))}
                    </div>
                    <div className="cosmic-controls">
                      <button
                        className="button outline compact"
                        onClick={() => void toggleJourney()}
                        disabled={
                          busy || live.sending || !!data.error || data.loading
                        }
                      >
                        {autoZoom ? <Pause size={13} /> : <Play size={13} />}{" "}
                        {autoZoom
                          ? "Pause journey"
                          : chapter === 8 || !isOpening
                            ? "Replay journey"
                            : "Play journey"}
                      </button>
                      <div className="pace-control">
                        <span className="mono muted">PACE</span>
                        <Slider
                          aria-label="Seconds per cosmic chapter"
                          min={2}
                          max={15}
                          step={1}
                          value={[duration]}
                          onValueChange={(v) => setDuration(v[0])}
                        />
                        <span className="mono">{duration}s / stop</span>
                      </div>
                      <button
                        className="text-button"
                        disabled={busy || !isOpening}
                        onClick={() => {
                          stopZoom();
                          void run(() => advance(8));
                        }}
                      >
                        Enter the film <SkipForward size={13} />
                      </button>
                    </div>
                    <p className="cosmic-note">
                      {live.isConnected
                        ? "Select the glowing destination on screen. The camera carries you into the next world."
                        : "A continuous 3D camera journey built from credited NASA imagery: Webb deep field, cosmic-web simulation, Milky Way concept, SDO Sun, equirectangular Earth, and ISS San Francisco. Distances are compressed for the story."}
                    </p>
                  </>
                )}
              </section>
              <section className="timeline">
                <div className="section-heading">
                  <h3>
                    <GitBranch size={16} />
                    The story so far
                  </h3>
                  <div className="timeline-heading-right">
                    <span className="mono muted">
                      {String(story?.state.scenes.length || 0).padStart(2, "0")}{" "}
                      SCENES
                      {story && story.state.scenes.length > path.length
                        ? ` · ${story.state.scenes.length - path.length} ALTERNATE`
                        : ""}
                    </span>
                    <button
                      className="text-button"
                      onClick={() => setModal("export")}
                      disabled={!story}
                    >
                      <ArrowDownToLine size={12} />
                      Export
                    </button>
                  </div>
                </div>
                <div className="timeline-track">
                  {story ? (
                    story.state.scenes.map((s, i) => (
                      <div className="timeline-item" key={s.id}>
                        {i > 0 && <div className="timeline-connector" />}
                        <button
                          className={`scene-card ${s.id === story.state.currentSceneId ? "selected" : ""} ${!path.some((x) => x.id === s.id) ? "alternate" : ""}`}
                          onClick={() => {
                            setSelectedScene(s);
                            setModal("scene");
                          }}
                        >
                          <div
                            className="scene-mini"
                            style={{
                              backgroundImage: `url('${s.prompt === TEMPLATES[1].opening && story.templateId === "cosmic-premiere" ? "/images/multiverse.png" : story.templateId === "custom" ? "" : "/images/the-last-train.png"}')`,
                            }}
                          />
                          <span className="mono">
                            {String(i + 1).padStart(2, "0")}{" "}
                            <span>
                              {s.source === "opening"
                                ? "OPENING"
                                : s.source === "nebius"
                                  ? "NEBIUS"
                                  : s.source.toUpperCase()}
                            </span>
                          </span>
                          <strong>{s.title}</strong>
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="timeline-empty">
                      <Film size={19} />
                      <span>
                        Your first scene is waiting.
                        <br />
                        <small>
                          Start live cinema or rehearse the journey.
                        </small>
                      </span>
                    </div>
                  )}
                  <button
                    className="next-scene"
                    disabled={busy}
                    onClick={() => {
                      setNewTemplate("cosmic-premiere");
                      setNewTitle("");
                      setModal("new");
                    }}
                  >
                    <Plus size={20} />
                    <span>
                      Start another
                      <br />
                      story.
                    </span>
                  </button>
                </div>
              </section>
            </section>
            <aside className="director-panel">
              <div className="section-heading">
                <h3>
                  <WandSparkles size={16} />
                  Director’s desk
                </h3>
                <span className="tiny-tag">YOU’RE IN CONTROL</span>
              </div>
              <div className="director-content">
                <div className="live-cue-heading">
                  <label className="eyebrow">CHANGE THE LIVE SCENE</label>
                  <span className="mono muted">1—4</span>
                </div>
                <div className="quick-cues">
                  {QUICK_CUES.map((c, i) => (
                    <button
                      key={c.id}
                      disabled={
                        isOpening ||
                        busy ||
                        live.sending ||
                        live.status === "paused" ||
                        data.loading ||
                        !!data.error
                      }
                      onClick={() => void cue(c.id)}
                    >
                      {i === 0 ? (
                        <CloudRain size={14} />
                      ) : i === 1 ? (
                        <Lightbulb size={14} />
                      ) : i === 2 ? (
                        <Sun size={14} />
                      ) : (
                        <Expand size={14} />
                      )}
                      <span>{c.label}</span>
                      <kbd>{i + 1}</kbd>
                    </button>
                  ))}
                </div>
                {live.trace && (
                  <div className="cue-trace" aria-live="polite">
                    <span
                      className={`status-dot ${live.trace.status === "failed" ? "bad" : ""}`}
                    />
                    <div>
                      <strong>{live.trace.label}</strong>
                      <span>
                        {live.trace.status === "sending"
                          ? "Sending to Orbis…"
                          : live.trace.status === "failed"
                            ? "Cue failed — try again"
                            : `${live.trace.ackMs} ms · command accepted`}
                        {live.trace.chunkMs !== null
                          ? ` · next chunk ${live.trace.chunkMs} ms`
                          : ""}
                      </span>
                    </div>
                  </div>
                )}
                <div className="divider tight" />
                <label className="eyebrow" htmlFor="direction">
                  WHAT HAPPENS NEXT?
                </label>
                <div className="prompt-box">
                  <textarea
                    id="direction"
                    placeholder="Give your world a new direction…"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    maxLength={1200}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault();
                        void direct();
                      }
                    }}
                  />
                  <div>
                    <span className="mono muted">{prompt.length} / 1200</span>
                    <span className="mono muted">⌘ ↵</span>
                  </div>
                </div>
                <button
                  type="button"
                  className={
                    listening ? "button lime full" : "button outline full"
                  }
                  onClick={toggleVoice}
                  aria-pressed={listening}
                  disabled={
                    busy || live.sending || data.loading || !!data.error
                  }
                  title="Say what happens next. When you stop talking, the direction is sent."
                >
                  {listening ? <MicOff size={16} /> : <Mic size={16} />}
                  {listening
                    ? "Listening… tap when you finish"
                    : "Talk to direct the film"}
                </button>
                <button
                  className="button lime full"
                  disabled={
                    isOpening ||
                    busy ||
                    live.sending ||
                    !!poll?.open ||
                    prompt.trim().length < 3 ||
                    data.loading ||
                    !!data.error ||
                    live.status === "paused"
                  }
                  onClick={() => void direct()}
                >
                  {busy ? (
                    <Loader2 className="spin" size={16} />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  Direct the next moment
                  <ChevronRight size={16} />
                </button>
                <p className="helper">
                  {isOpening
                    ? "Enter the film to unlock live direction."
                    : hasNebius
                      ? "Nebius keeps your character and story consistent."
                      : "Rehearsal director · connect Nebius for AI story planning."}
                </p>
                <div className="divider" />
                <div className="section-heading">
                  <h3>The audience talks to the screen</h3>
                  <span className={`tag ${openMic ? "configured" : ""}`}>
                    {openMic ? "OPEN MIC" : "MIC CLOSED"}
                  </span>
                </div>
                <p className="helper">
                  {isOpening
                    ? "Once the film starts, anyone in the room can talk to it from their phone. What they say becomes the next moment, automatically."
                    : crowdStatus === "directing"
                      ? "Directing the film from the crowd's voices…"
                      : crowdStatus === "waiting"
                        ? "Listening… the crowd is speaking."
                        : openMic
                          ? "Live. Audience voices are merged into one visible change and sent to the film by themselves."
                          : "Closed. The audience can vote, but their voices are not applied."}
                </p>
                {!!crowd?.length && (
                  <ul className="crowd-feed" aria-live="polite">
                    {crowd.slice(-4).map((s) => (
                      <li key={s.id}>
                        <Mic size={12} /> “{s.text}”
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  className={
                    openMic ? "button outline full" : "button lime full"
                  }
                  onClick={() => void toggleOpenMic()}
                  disabled={busy || data.loading || !!data.error}
                >
                  {openMic ? <MicOff size={16} /> : <Mic size={16} />}
                  {openMic
                    ? "Close the room microphone"
                    : "Open the room microphone"}
                </button>
                <div className="divider" />
                <div className="section-heading">
                  <h3>
                    {poll?.open
                      ? "The audience is deciding"
                      : "Let the audience decide"}
                  </h3>
                  <span className="viewer-count">
                    <Users size={13} />
                    {data.snapshot?.viewers || 0}
                  </span>
                </div>
                {choices.map((c, i) => {
                  const count = votes[c.id] || 0;
                  const percent = totalVotes
                    ? Math.round((count / totalVotes) * 100)
                    : 0;
                  return (
                    <button
                      key={c.id}
                      className={`choice ${data.snapshot?.myVote === c.id ? "voted" : ""}`}
                      disabled={busy || !poll?.open}
                      onClick={() => void run(() => data.vote(c.id))}
                      aria-label={`Vote for ${c.label}`}
                    >
                      <span>{String.fromCharCode(65 + i)}</span>
                      <div>
                        <strong>{c.label}</strong>
                        <small>{c.detail}</small>
                        {poll?.open && (
                          <div className="vote-bar">
                            <i style={{ width: percent + "%" }} />
                          </div>
                        )}
                      </div>
                      {poll?.open ? (
                        <b className="vote-number">{count}</b>
                      ) : (
                        <ArrowUpRight size={14} />
                      )}
                    </button>
                  );
                })}
                <div className="poll-actions">
                  {poll?.open ? (
                    <button
                      className="button lime full"
                      disabled={busy}
                      onClick={() => void closePoll()}
                    >
                      <Check size={14} />
                      {live.isConnected && !canSend
                        ? "Close voting"
                        : "Close voting & direct winner"}
                      <span className="count-pill dark">{totalVotes}</span>
                    </button>
                  ) : (
                    <button
                      className="button outline full"
                      disabled={
                        busy || isOpening || data.loading || !!data.error
                      }
                      onClick={() =>
                        void run(async () => {
                          await ensureStory();
                          await data.act({ type: "poll.open" });
                          toast.success(
                            "Voting is open. Invite the audience with your room link.",
                          );
                        })
                      }
                    >
                      <Users size={14} />
                      Open audience voting
                      <ArrowRight size={14} />
                    </button>
                  )}
                  {poll && !poll.open && poll.winnerId && !poll.applied && (
                    <button
                      className="text-button recovery-action"
                      onClick={() => void applyWinner()}
                      disabled={busy || (live.isConnected && !canSend)}
                    >
                      Apply winning choice <ArrowRight size={12} />
                    </button>
                  )}
                </div>
                <p className="helper">
                  {isOpening
                    ? "Enter the film to unlock audience voting."
                    : poll?.open
                      ? "One vote per browser. You can change it until voting closes."
                      : poll?.applied
                        ? "The audience’s choice is now part of your story."
                        : "Invite the room. Open a vote. Watch the scene respond."}
                </p>
              </div>
              <button
                className="continuity"
                onClick={() => {
                  setMemoryDraft(story?.state.memory || template.memory);
                  setModal("memory");
                }}
                disabled={!story}
              >
                <span>
                  <ShieldCheck size={13} />
                  Story memory <ChevronRight size={12} />
                </span>
                <p>
                  {(story?.state.memory || template.memory).slice(0, 140)}
                  {(story?.state.memory || template.memory).length > 140
                    ? "…"
                    : ""}
                </p>
              </button>
            </aside>
          </div>
        </TabsContent>
        <TabsContent value="library">
          <div className="project-heading">
            <div>
              <div className="eyebrow">START SOMEWHERE UNEXPECTED</div>
              <h1>Your story library</h1>
              <p>
                Every world is a starting point. The audience writes the rest.
              </p>
            </div>
            <button
              className="button lime"
              onClick={() => {
                setNewTitle("");
                setModal("new");
              }}
            >
              <Plus size={15} />
              New story
            </button>
          </div>
          <div className="template-grid">
            {TEMPLATES.map((t) => (
              <button
                className="template-card"
                key={t.id}
                onClick={() => {
                  setNewTemplate(t.id);
                  setNewTitle("");
                  setModal("new");
                }}
              >
                <div style={{ backgroundImage: `url('${t.image}')` }}>
                  <span className="tag">{t.genre}</span>
                </div>
                <section>
                  <h2>
                    {t.title}
                    <ArrowUpRight size={16} />
                  </h2>
                  <p>{t.description}</p>
                </section>
              </button>
            ))}
          </div>
          <div className="section-heading saved-heading">
            <h3>Your saved stories</h3>
            <span className="mono muted">
              PRIVATE TO THIS BROWSER · SHARED BY ROOM LINK
            </span>
          </div>
          {data.stories.length === 0 ? (
            <div className="empty-state">
              <Film size={25} />
              <h3>Your next great story starts here.</h3>
              <p>Choose a world above to create your first saved story.</p>
            </div>
          ) : (
            <div className="saved-stories">
              {data.stories.map((s) => (
                <button
                  disabled={busy}
                  key={s.id}
                  onClick={() =>
                    void run(async () => {
                      stopZoom();
                      if (live.isConnected) {
                        await live.disconnect();
                        if (story)
                          await data.act({ type: "session", live: false });
                      }
                      data.select(s);
                      setTab("studio");
                      setStageNotice("");
                    })
                  }
                >
                  <Film size={22} />
                  <div>
                    <strong>{s.title}</strong>
                    <small>
                      {s.state.scenes.length} scenes ·{" "}
                      {new Date(s.updatedAt).toLocaleDateString()} · {s.id}
                    </small>
                  </div>
                  <ArrowUpRight size={17} />
                </button>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      <footer className="footer">
        <button className="text-button" onClick={() => setModal("example")}>
          <Play size={12} />
          Watch recorded demo
        </button>
        <div>
          <a href="https://www.visko.ai/" target="_blank" rel="noreferrer">
            VISKO <b>Orbis</b>
          </a>
          <span className="sponsor-dot" />
          <a
            href="https://www.reactor.inc/models/visko-orbis-dynamic/api"
            target="_blank"
            rel="noreferrer"
          >
            reactor
          </a>
          <span className="sponsor-dot" />
          <a
            href="https://docs.tokenfactory.nebius.com/quickstart"
            target="_blank"
            rel="noreferrer"
          >
            nebius
          </a>
        </div>
        <span>
          <span className={`status-dot ${data.online ? "" : "bad"}`} />{" "}
          {data.online ? "ROOM SYNC CONNECTED" : "ROOM SYNC RECONNECTING"}
        </span>
      </footer>
      <Dialog
        open={modal !== null}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
      >
        <DialogContent
          className={`cutline-modal ${modal === "invite" ? "invite-modal" : ""}`}
        >
          {modal === "example" && (
            <>
              <DialogTitle>A real take from Cutline.</DialogTitle>
              <DialogDescription>
                This is a recorded Orbis Stable session from September 12, 2026.
                It is an example, not a live feed.
              </DialogDescription>
              <video
                controls
                playsInline
                preload="metadata"
                poster="/demo/cutline-live-poster.jpg"
                src="/demo/cutline-live.mp4"
                className="example-video"
                aria-label="Recorded Cutline demo"
              />
              <p className="privacy-note">
                Actual generated video captured from the player at 2560 × 1440,
                18 fps. Audience direction: follow the amber light.
              </p>
            </>
          )}
          {modal === "sources" && (
            <>
              <DialogTitle>The images behind the journey.</DialogTitle>
              <DialogDescription>
                The opening preserves the original photographs, composites and
                illustrations, with gentle camera motion. The scale changes are
                editorial transitions, not a measured scientific flight. Orbis
                generates the fictional film that follows.
              </DialogDescription>
              <div className="source-list">
                {CHAPTER_REFERENCES.map((r, i) => (
                  <article key={i}>
                    <span className="eyebrow">
                      {COSMIC_CHAPTERS[i].name} · {r.kind}
                    </span>
                    <p>{r.note}</p>
                    {r.source ? (
                      <a href={r.source} target="_blank" rel="noreferrer">
                        {r.credit} ↗
                      </a>
                    ) : (
                      <small>{r.credit}</small>
                    )}
                  </article>
                ))}
              </div>
            </>
          )}
          {modal === "connections" && (
            <>
              <DialogTitle>Your live cinema connections</DialogTitle>
              <DialogDescription>
                Orbis makes the video. Reactor carries the live commands. Nebius
                writes the next beat.
              </DialogDescription>
              <div className="provider-row">
                <div className="provider-symbol">V / R</div>
                <div>
                  <strong>Visko Orbis via Reactor</strong>
                  <small>
                    {data.config?.reactorConfigured
                      ? "Shared Reactor key configured on the server."
                      : "Use your Reactor hackathon key with Orbis model access."}
                  </small>
                </div>
                <span className={`tag ${hasReactor ? "configured" : ""}`}>
                  {hasReactor ? "KEY READY" : "NEEDS KEY"}
                </span>
              </div>
              <label className="field-label" htmlFor="orbis-model">
                Orbis model
              </label>
              <select
                id="orbis-model"
                className="field-input"
                disabled={live.isConnected}
                value={
                  draftKeys.model ||
                  data.config?.reactorModel ||
                  "reactor/visko-orbis-dynamic"
                }
                onChange={(e) =>
                  setDraftKeys({ ...draftKeys, model: e.target.value })
                }
              >
                <option value="reactor/visko-orbis-dynamic">
                  Orbis Dynamic · live resolution switching
                </option>
                <option value="reactor/visko-orbis-stable">
                  Orbis Stable · official starter model
                </option>
              </select>
              <label className="field-label" htmlFor="reactor-key">
                Personal Reactor API key
              </label>
              <input
                id="reactor-key"
                className="field-input"
                type="password"
                autoComplete="off"
                value={draftKeys.reactor}
                onChange={(e) =>
                  setDraftKeys({ ...draftKeys, reactor: e.target.value })
                }
                placeholder="rk_…"
              />
              <div className="provider-row">
                <div className="provider-symbol">N</div>
                <div>
                  <strong>Nebius Token Factory</strong>
                  <small>
                    Continuity-aware direction and three next choices.
                  </small>
                </div>
                <span className="tag">
                  {keys.nebius || data.config?.nebiusConfigured
                    ? "KEY READY"
                    : "OPTIONAL"}
                </span>
              </div>
              <label className="field-label" htmlFor="nebius-key">
                Personal Nebius API key
              </label>
              <input
                id="nebius-key"
                className="field-input"
                type="password"
                autoComplete="off"
                value={draftKeys.nebius}
                onChange={(e) =>
                  setDraftKeys({ ...draftKeys, nebius: e.target.value })
                }
                placeholder="Nebius Token Factory key"
              />
              {(data.config?.reactorConfigured ||
                data.config?.nebiusConfigured) && (
                <>
                  <label className="field-label" htmlFor="access-code">
                    Presenter access code for shared server keys
                  </label>
                  <input
                    id="access-code"
                    className="field-input"
                    type="password"
                    autoComplete="off"
                    value={draftKeys.accessCode}
                    onChange={(e) =>
                      setDraftKeys({ ...draftKeys, accessCode: e.target.value })
                    }
                    placeholder="Your LIVE_ACCESS_CODE"
                  />
                </>
              )}
              <p className="privacy-note">
                <ShieldCheck size={14} />
                Personal keys stay in this tab’s memory and go only through the
                server to the named provider. They are not saved with stories.
                Live sessions can use sponsor credits and stop after 15 minutes.
              </p>
              <div className="modal-actions">
                <button
                  className="text-button"
                  onClick={() => {
                    const empty = { reactor: "", nebius: "", accessCode: "" };
                    setKeys(empty);
                    setDraftKeys(empty);
                    toast.success("Personal keys cleared from this tab.");
                  }}
                >
                  Clear keys
                </button>
                <button
                  className="button lime"
                  onClick={() => {
                    setKeys(draftKeys);
                    setModal(null);
                    void data.reload();
                    toast.success(
                      "Connections saved for this tab. Start live cinema when ready.",
                    );
                  }}
                >
                  Use these connections <ArrowRight size={14} />
                </button>
              </div>
              <div className="provider-docs">
                <a
                  href="https://www.reactor.inc/models/visko-orbis-dynamic/api"
                  target="_blank"
                  rel="noreferrer"
                >
                  Reactor / Orbis docs ↗
                </a>
                <a
                  href="https://docs.tokenfactory.nebius.com/quickstart"
                  target="_blank"
                  rel="noreferrer"
                >
                  Nebius key setup ↗
                </a>
              </div>
            </>
          )}
          {modal === "invite" && (
            <>
              <DialogTitle>This story needs its audience.</DialogTitle>
              <DialogDescription>
                Scan to join from your phone. Watch the shared theater screen,
                then vote on what happens next.
              </DialogDescription>
              <div className="qr-card">
                {qr ? (
                  <>
                    {/* Generated QR data URL; native image preserves direct scanning. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qr}
                      alt={`QR code to join room ${story?.id}`}
                      width={220}
                      height={220}
                    />
                  </>
                ) : (
                  <Loader2 className="spin" />
                )}
                <span className="eyebrow">YOUR ROOM CODE</span>
                <strong>{story?.id}</strong>
              </div>
              <div className="share-link">
                <input
                  aria-label="Audience join link"
                  value={shareUrl}
                  readOnly
                  onFocus={(e) => e.target.select()}
                />
                <button
                  aria-label="Copy audience link"
                  onClick={() =>
                    void run(async () => {
                      await navigator.clipboard.writeText(shareUrl);
                      toast.success("Audience link copied.");
                    })
                  }
                >
                  <Copy size={17} />
                </button>
              </div>
              <div className="modal-actions">
                <span className="muted small">
                  <Users size={13} /> {data.snapshot?.viewers || 0} audience
                  members connected
                </span>
                <a
                  className="button lime"
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open audience view <ArrowUpRight size={14} />
                </a>
              </div>
              <p className="privacy-note">
                Anyone with this link can view the story and vote. Only you can
                direct or end the session.
              </p>
            </>
          )}
          {modal === "export" && (
            <>
              <DialogTitle>Keep the story you made.</DialogTitle>
              <DialogDescription>
                Download your full decision history, or save an actual clip from
                the current live session.
              </DialogDescription>
              <a
                className="export-option"
                href={story ? `/api/stories/${story.id}/export?format=md` : "#"}
                download
              >
                <Film size={23} />
                <div>
                  <strong>Story treatment</strong>
                  <small>
                    Readable Markdown with scenes, choices and prompts.
                  </small>
                </div>
                <ArrowDownToLine size={18} />
              </a>
              <a
                className="export-option"
                href={story ? `/api/stories/${story.id}/export` : "#"}
                download
              >
                <GitBranch size={23} />
                <div>
                  <strong>Complete story graph</strong>
                  <small>
                    JSON with branches, continuity memory and voting results.
                  </small>
                </div>
                <ArrowDownToLine size={18} />
              </a>
              <button
                className="export-option"
                disabled={
                  live.status !== "live" || !live.hasFrames || live.exporting
                }
                onClick={() =>
                  void run(async () => {
                    await live.download();
                    toast.success("Your live video take is ready.");
                  })
                }
              >
                {live.exporting ? (
                  <Loader2 className="spin" size={23} />
                ) : (
                  <Play size={23} />
                )}
                <div>
                  <strong>Record the next 10 seconds</strong>
                  <small>
                    {live.isConnected
                      ? live.exporting
                        ? `Recording · ${live.recordRemaining} seconds remaining…`
                        : "Capture actual Orbis video directly from the player."
                      : "Start a live session to enable video export."}
                  </small>
                </div>
                <ArrowDownToLine size={18} />
              </button>
              {live.exporting && (
                <button
                  className="button outline"
                  onClick={live.cancelRecording}
                >
                  Cancel recording
                </button>
              )}
              <p className="privacy-note">
                The storyboard export includes prompts and decisions. Video
                export records actual generated frames for 10 seconds. It
                requires an active, playing Reactor session.
              </p>
            </>
          )}
          {modal === "new" && (
            <>
              <DialogTitle>Every world starts with a premise.</DialogTitle>
              <DialogDescription>
                Choose the setting. Your audience will decide where it goes.
              </DialogDescription>
              <div className="template-picker">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    aria-pressed={newTemplate === t.id}
                    className={newTemplate === t.id ? "selected" : ""}
                    onClick={() => setNewTemplate(t.id)}
                  >
                    <span>{t.title}</span>
                    <small>{t.genre}</small>
                    {newTemplate === t.id && <Check size={14} />}
                  </button>
                ))}
              </div>
              <label className="field-label" htmlFor="story-title">
                Story title
              </label>
              <input
                id="story-title"
                className="field-input"
                maxLength={80}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={TEMPLATES.find((t) => t.id === newTemplate)?.title}
              />
              {newTemplate === "custom" && (
                <>
                  <label className="field-label" htmlFor="custom-opening">
                    Opening scene
                  </label>
                  <textarea
                    id="custom-opening"
                    className="field-input textarea"
                    maxLength={1200}
                    value={newOpening}
                    onChange={(e) => setNewOpening(e.target.value)}
                    placeholder="One character, a visible action, a place, and a camera movement. Leave empty for the crystal cavern."
                  />
                  <label className="field-label" htmlFor="custom-memory">
                    What should stay consistent?
                  </label>
                  <textarea
                    id="custom-memory"
                    className="field-input textarea"
                    maxLength={1200}
                    value={newMemory}
                    onChange={(e) => setNewMemory(e.target.value)}
                    placeholder="Character, clothing, setting, and visual style."
                  />
                </>
              )}
              <button
                className="button lime full"
                disabled={
                  busy ||
                  data.loading ||
                  !!data.error ||
                  (newOpening.length > 0 && newOpening.trim().length < 10) ||
                  (newMemory.length > 0 && newMemory.trim().length < 10)
                }
                onClick={() => void createStory()}
              >
                {busy ? (
                  <Loader2 className="spin" size={15} />
                ) : (
                  <Plus size={15} />
                )}
                Create story
                <ArrowRight size={15} />
              </button>
            </>
          )}
          {modal === "scene" && selectedScene && (
            <>
              <DialogTitle>{selectedScene.title}</DialogTitle>
              <DialogDescription>{selectedScene.narration}</DialogDescription>
              <div className="scene-detail">
                <span className="eyebrow">VIDEO DIRECTION</span>
                <p>{selectedScene.prompt}</p>
                <div className="detail-tags">
                  <span className="tag">
                    {selectedScene.source.toUpperCase()}
                  </span>
                  <span className="tag">
                    VIDEO: {selectedScene.visualStatus || "draft"}
                  </span>
                </div>
              </div>
              <h3 className="field-label">Possible next choices</h3>
              {selectedScene.choices.map((c) => (
                <p key={c.id} className="scene-choice">
                  <b>{c.label}</b>
                  <span>{c.detail}</span>
                </p>
              ))}
              <button
                className="button lime"
                disabled={busy}
                onClick={() => void branch()}
              >
                <GitBranch size={15} />
                Continue from this scene
                <ArrowRight size={15} />
              </button>
              <p className="privacy-note">
                Creates a new story branch from this point. Live video
                regenerates from the saved prompt; this is not an exact video
                rewind.
              </p>
            </>
          )}
          {modal === "memory" && (
            <>
              <DialogTitle>Keep the character. Change the story.</DialogTitle>
              <DialogDescription>
                The director carries these details into every new scene. Be
                specific about appearance, setting and style.
              </DialogDescription>
              <textarea
                className="field-input memory-input"
                aria-label="Story continuity memory"
                value={memoryDraft}
                onChange={(e) => setMemoryDraft(e.target.value)}
                maxLength={1200}
              />
              <button
                className="button lime"
                disabled={busy || memoryDraft.trim().length < 10}
                onClick={() =>
                  void run(async () => {
                    await data.act({ type: "memory", memory: memoryDraft });
                    setModal(null);
                    toast.success("Story memory updated.");
                  })
                }
              >
                <ShieldCheck size={15} />
                Save story memory
              </button>
              <button
                className="text-button danger"
                onClick={() => setModal("delete")}
              >
                <Trash2 size={13} />
                Delete this story
              </button>
            </>
          )}
          {modal === "delete" && (
            <>
              <DialogTitle>Delete this story?</DialogTitle>
              <DialogDescription>
                This removes its scenes, decisions and votes. Download a story
                export first if you want to keep them.
              </DialogDescription>
              <div className="modal-actions">
                <button
                  className="button outline"
                  onClick={() => setModal(null)}
                >
                  Keep story
                </button>
                <button
                  className="button danger-button"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      if (!story) return;
                      stopZoom();
                      await live.disconnect();
                      await data.remove(story.id);
                      setModal(null);
                      toast.success("Story deleted.");
                    })
                  }
                >
                  <Trash2 size={14} />
                  Delete story
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {cinemaMode && (
        <button
          className="exit-theater button outline"
          onClick={() => setCinemaMode(false)}
        >
          <X size={14} />
          Exit theater mode
        </button>
      )}
    </div>
  );
}
