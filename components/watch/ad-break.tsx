"use client";

import { ReactorView } from "@reactor-team/js-sdk";
import { useEffect, useRef, useState } from "react";

import { useFirstFrame } from "@/hooks/use-first-frame";
import { useLiveContinuation } from "@/hooks/use-live-continuation";
import { useReleaseOnUnload } from "@/hooks/use-release-on-unload";
import { useVoiceover } from "@/hooks/use-voiceover";
import { requestDemoBeat, requestPivot } from "@/lib/demo/client";
import { demoChips, demoFlowFor, resolveDemoStep } from "@/lib/demo/flows";
import type { SceneContract } from "@/lib/knowledge/contract";
import { composeProductFrame } from "@/lib/placement-frame";
import { campaigns } from "@/lib/studio-data";
import { type AdPhase, formatClock, SKIP_AFTER_S } from "@/lib/watch/schedule";

// The interactive ad break inside the viewer's player. While the video still
// plays (prewarm) the Orbis take is prepared and started out of sight; when
// the break arrives the live view takes over with the demo path's bubbles.
// Until the live picture paints its first frame, the exact opening frame the
// take starts from stays on screen as a poster, so there is never a black
// stage between the film and the ad.

const CAMPAIGN_ID = "rolex-perpetual-moment";
const PROFILE_ID = "collector";
const TITLE_ID = "sintel-mountain";
const STILL = "/brands/rolex/submariner-campaign.jpg";
/** A nominal ad length for the yellow progress bar; the ad itself ends when the viewer skips. */
const NOMINAL_AD_S = 30;
/** A product question is answered on screen; the pivot route decides, this only mirrors it. */
const QUESTION = /\?\s*$/;
/** How long a narrator caption stays on screen. */
const CAPTION_MS = 9_000;

type Status = "idle" | "preparing" | "live" | "offline" | "failed";
type Props = { phase: AdPhase; live: boolean; onFinished: () => void };

export function AdBreak({ phase, live, onFinished }: Props) {
  const campaign = campaigns.find((item) => item.id === CAMPAIGN_ID);
  const flow = demoFlowFor(CAMPAIGN_ID);
  const session = useLiveContinuation(() => {});
  // Closing or refreshing the page ends the session server-side (a beacon outlives the page).
  useReleaseOnUnload();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [stepId, setStepId] = useState<string | null>(null);
  const [chips, setChips] = useState<{ id: string; chip: string }[]>([]);
  const [playing, setPlaying] = useState("");
  const [assetId, setAssetId] = useState(flow?.steps[0]?.assetId ?? "");
  const [prompt, setPrompt] = useState("");
  /** Object URL of the composed opening frame, shown until the live video has a frame of its own. */
  const [poster, setPoster] = useState("");
  const [contract, setContract] = useState<SceneContract | null>(null);
  const [answer, setAnswer] = useState("");
  const [caption, setCaption] = useState<{ text: string; at: number } | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [shownFor, setShownFor] = useState(0);
  const { speak, stop: stopNarrator } = useVoiceover(true);
  const showCaption = (lines: string[]) => setCaption({ text: lines.join(" "), at: Date.now() });
  const contractLines = (value: SceneContract | null) => value?.lines.map((line) => line.text) ?? [];
  const began = useRef(false);
  const stage = useRef<HTMLDivElement>(null);
  const release = useRef<() => Promise<void>>(async () => {});
  const connected = useRef(false);
  release.current = session.disconnectSession;
  connected.current = session.connected;
  const showingLive = status === "live" && session.runStarted;
  const firstFrame = useFirstFrame(stage, showingLive);

  // Prewarm once: compose the opening frame, prepare the first beat verbatim, start the take.
  useEffect(() => {
    if (phase === "idle" || began.current || !campaign || !flow) return;
    began.current = true;
    const first = flow.steps[0];
    const offer = (id: string) => setChips(demoChips(flow, id).map((item) => ({ id: item.id, chip: item.chip })));
    const artwork = campaign.assets.find((asset) => asset.id === first.assetId);
    // The frame Orbis starts from doubles as the poster, so the first live frame continues it exactly.
    const frame = async () => { const image = await composeProductFrame(artwork?.src ?? STILL); setPoster(URL.createObjectURL(image)); return image; };
    if (!live) { setStatus("offline"); setStepId(first.id); offer(first.id); void frame().catch(() => {}); return; }
    const begin = async () => {
      setStatus("preparing");
      try {
        if (!artwork) throw new Error("The demo's opening product view is missing.");
        const image = await frame();
        const response = await fetch("/api/continuations/prepare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId: PROFILE_ID, titleId: TITLE_ID, campaignId: CAMPAIGN_ID, assetId: first.assetId, selectionMode: "manual", sceneBrief: first.brief, engineer: false }), signal: AbortSignal.timeout(15_000) });
        const prepared = await response.json().catch(() => null);
        if (!response.ok || !prepared?.prompt) throw new Error(prepared?.error || "Could not prepare the ad.");
        setPrompt(prepared.prompt);
        setContract(prepared.contract ?? null);
        await session.startContinuation({ image, prompt: prepared.prompt });
        setStepId(first.id);
        offer(first.id);
        setAssetId(first.assetId);
        setStatus("live");
        void speak({ campaignId: CAMPAIGN_ID, scene: first.brief, role: "opening", contractLines: contractLines(prepared.contract ?? null), onLines: showCaption });
      } catch (caught) {
        setStatus("failed");
        setError(caught instanceof Error ? caught.message : "The live ad could not start.");
      }
    };
    void begin();
  }, [phase, live, campaign, flow]); // eslint-disable-line react-hooks/exhaustive-deps -- session functions read live state through refs

  useEffect(() => {
    if (!caption) return;
    const timer = setTimeout(() => setCaption(null), CAPTION_MS);
    return () => clearTimeout(timer);
  }, [caption]);

  // The ad clock runs while the break is on screen.
  useEffect(() => {
    if (phase !== "show") return;
    const timer = setInterval(() => setShownFor((current) => current + 1), 1_000);
    return () => clearInterval(timer);
  }, [phase]);

  // Unmounting the ad (the viewer skipped, or the player left) also asks the SDK to disconnect.
  useEffect(() => () => { if (connected.current) void release.current(); }, []);
  // The poster's object URL lives as long as the ad.
  useEffect(() => () => { if (poster) URL.revokeObjectURL(poster); }, [poster]);

  if (!campaign || !flow) return null;
  const current = stepId ? flow.steps.find((step) => step.id === stepId) : null;
  const canSteer = status === "live" && !sending && !session.busy;
  const currentPrompt = () => session.pendingPrompt || session.activePrompt || prompt;

  async function runStep(step: { id: string }, source = "") {
    if (!canSteer) return;
    setSending(true); setAnswer(""); setError("");
    try {
      const result = await requestDemoBeat({ campaignId: CAMPAIGN_ID, stepId: step.id, fromStepId: stepId ?? undefined, assetId, direction: source, currentPrompt: currentPrompt(), contract });
      await session.steer(result.prompt, result.actionPrompt);
      // A moment keeps the take on its beat; the route says which, and what to offer next.
      setStepId(result.step.beatId); setAssetId(result.step.assetId); setChips(result.nextChips); setPlaying(result.step.title); setContract(result.contract); setPrompt(result.prompt);
      // The narrator speaks to the brief that ran (a beat's, or a moment's), which the route returns as engineered text.
      void speak({ campaignId: CAMPAIGN_ID, scene: result.engineered.text, role: result.step.kind === "moment" ? "refine" : "pivot", direction: source || undefined, contractLines: contractLines(result.contract), onLines: showCaption });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "That direction did not go through."); }
    finally { setSending(false); }
  }

  async function submitText() {
    const source = text.trim();
    if (!source || !canSteer || !flow) return;
    const step = QUESTION.test(source) ? null : resolveDemoStep(flow, source);
    setText("");
    if (step) return runStep(step, source);
    setSending(true); setAnswer(""); setError("");
    try {
      const result = await requestPivot({ direction: source, mode: "pivot", preserveBrand: true, campaignId: CAMPAIGN_ID, assetId, currentPrompt: currentPrompt(), contract });
      if (result.outcome === "overlay") { setAnswer(result.answer); return; }
      await session.steer(result.prompt, result.actionPrompt);
      setContract(result.contract); setPrompt(result.prompt);
      void speak({ campaignId: CAMPAIGN_ID, scene: source, role: "pivot", direction: source, contractLines: contractLines(result.contract), onLines: showCaption });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "That direction did not go through."); }
    finally { setSending(false); }
  }

  async function skip() {
    stopNarrator();
    setCaption(null);
    try { if (session.connected) await session.disconnectSession(); } catch { /* the video resumes either way */ }
    onFinished();
  }

  const skipReady = shownFor >= SKIP_AFTER_S;
  const pictureUp = showingLive && firstFrame;
  return <div className="yt-ad" hidden={phase !== "show"} aria-live="polite" aria-label="Interactive ad">
    <div className="yt-ad-stage" ref={stage}>
      {showingLive && <ReactorView track="main_video" audioTrack="main_audio" muted className="yt-ad-view" videoObjectFit="contain" />}
      {!pictureUp && (poster ? <img className="yt-ad-poster" src={poster} alt="" /> : <img className="yt-ad-still" src={STILL} alt="" />)}
      {(status === "preparing" || (status === "live" && !pictureUp)) && <div className="yt-ad-loading" role="status"><span className="yt-spinner" /><span>{session.runStarted ? "Starting the live picture…" : session.phase || "Connecting…"}</span></div>}
      {status === "failed" && <div className="yt-ad-loading yt-ad-failed" role="alert"><strong>Live ad unavailable</strong><small>{error}</small></div>}
      {answer && <div className="yt-ad-answer" role="status"><span>{campaign.brand}</span><p>{answer}</p></div>}
    </div>
    <div className="yt-ad-top">
      <img src={campaign.logo} alt="" />
      <div><strong>{campaign.brand}</strong><span>Sponsored · Interactive</span></div>
      {pictureUp && <span className="yt-ad-live"><i />LIVE</span>}
    </div>
    <div className="yt-ad-bottom">
      {caption && <p className="yt-ad-caption" key={caption.at}>{caption.text}</p>}
      <div className="yt-ad-steer">
        <span className="yt-ad-steer-label">{status === "live" ? (chips.length ? "You direct this ad" : "The walk is over. Say anything, or skip") : status === "offline" ? "Preview: the live model is not connected" : status === "failed" ? "Interactive controls unavailable" : "Preparing the live ad…"}</span>
        <div className="yt-ad-chips">{chips.map((step) => <button key={step.id} type="button" disabled={!canSteer} onClick={() => void runStep(step)}>{step.chip}</button>)}</div>
        <form className="yt-ad-say" onSubmit={(event) => { event.preventDefault(); void submitText(); }}>
          <input type="text" aria-label="Direct the ad" value={text} placeholder="Or say it your way: “show the back”, “make it rain”" disabled={!canSteer} maxLength={400} onChange={(event) => setText(event.target.value)} />
          <button type="submit" disabled={!canSteer || !text.trim()}>Send</button>
        </form>
        {status === "live" && (error ? <p className="yt-ad-error">{error}</p> : <p className="yt-ad-phase">{session.phase}{playing || current ? ` · ${playing || current?.title}` : ""}</p>)}
      </div>
      <div className="yt-ad-bar">
        <span className="yt-ad-badge">Ad</span>
        <span className="yt-ad-time">{formatClock(shownFor)}</span>
        {skipReady
          ? <button className="yt-ad-skip" type="button" onClick={() => void skip()}>Skip Ad <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M5 4l10 8-10 8V4zm12 0h2v16h-2V4z" /></svg></button>
          : <span className="yt-ad-skip waiting">Skip in {SKIP_AFTER_S - shownFor}</span>}
      </div>
    </div>
    <div className="yt-ad-progress" aria-hidden="true"><i style={{ width: `${Math.min(100, (shownFor / NOMINAL_AD_S) * 100)}%` }} /></div>
  </div>;
}
