"use client";

import { ReactorView } from "@reactor-team/js-sdk";
import { useEffect, useRef, useState } from "react";

import { useLiveContinuation } from "@/hooks/use-live-continuation";
import { useReleaseOnUnload } from "@/hooks/use-release-on-unload";
import { requestDemoBeat, requestPivot } from "@/lib/demo/client";
import { demoChips, demoFlowFor, resolveDemoStep, type DemoStep } from "@/lib/demo/flows";
import type { SceneContract } from "@/lib/knowledge/contract";
import { composeProductFrame } from "@/lib/placement-frame";
import { campaigns } from "@/lib/studio-data";
import { type AdPhase, formatClock, SKIP_AFTER_S } from "@/lib/watch/schedule";

// The interactive ad break inside the viewer's player. While the video still
// plays (prewarm) the Orbis take is prepared and started out of sight; when
// the break arrives the live view takes over with the demo path's bubbles.

const CAMPAIGN_ID = "rolex-perpetual-moment";
const PROFILE_ID = "collector";
const TITLE_ID = "sintel-mountain";
const STILL = "/brands/rolex/submariner-campaign.jpg";
/** A nominal ad length for the yellow progress bar; the ad itself ends when the viewer skips. */
const NOMINAL_AD_S = 30;
/** A product question is answered on screen; the pivot route decides, this only mirrors it. */
const QUESTION = /\?\s*$/;

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
  const [assetId, setAssetId] = useState(flow?.steps[0]?.assetId ?? "");
  const [prompt, setPrompt] = useState("");
  const [contract, setContract] = useState<SceneContract | null>(null);
  const [answer, setAnswer] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [shownFor, setShownFor] = useState(0);
  const began = useRef(false);
  const release = useRef<() => Promise<void>>(async () => {});
  const connected = useRef(false);
  release.current = session.disconnectSession;
  connected.current = session.connected;

  // Prewarm once: compose the opening frame, prepare the first beat verbatim, start the take.
  useEffect(() => {
    if (phase === "idle" || began.current || !campaign || !flow) return;
    began.current = true;
    const first = flow.steps[0];
    if (!live) { setStatus("offline"); setStepId(first.id); return; }
    const begin = async () => {
      setStatus("preparing");
      try {
        const artwork = campaign.assets.find((asset) => asset.id === first.assetId);
        if (!artwork) throw new Error("The demo's opening product view is missing.");
        const image = await composeProductFrame(artwork.src);
        const response = await fetch("/api/continuations/prepare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId: PROFILE_ID, titleId: TITLE_ID, campaignId: CAMPAIGN_ID, assetId: first.assetId, selectionMode: "manual", sceneBrief: first.brief, engineer: false }), signal: AbortSignal.timeout(15_000) });
        const prepared = await response.json().catch(() => null);
        if (!response.ok || !prepared?.prompt) throw new Error(prepared?.error || "Could not prepare the ad.");
        setPrompt(prepared.prompt);
        setContract(prepared.contract ?? null);
        await session.startContinuation({ image, prompt: prepared.prompt });
        setStepId(first.id);
        setAssetId(first.assetId);
        setStatus("live");
      } catch (caught) {
        setStatus("failed");
        setError(caught instanceof Error ? caught.message : "The live ad could not start.");
      }
    };
    void begin();
  }, [phase, live, campaign, flow]); // eslint-disable-line react-hooks/exhaustive-deps -- session functions read live state through refs

  // The ad clock runs while the break is on screen.
  useEffect(() => {
    if (phase !== "show") return;
    const timer = setInterval(() => setShownFor((current) => current + 1), 1_000);
    return () => clearInterval(timer);
  }, [phase]);

  // Unmounting the ad (the viewer skipped, or the player left) also asks the SDK to disconnect.
  useEffect(() => () => { if (connected.current) void release.current(); }, []);

  if (!campaign || !flow) return null;
  const chips = demoChips(flow, stepId);
  const current = stepId ? flow.steps.find((step) => step.id === stepId) : null;
  const canSteer = status === "live" && !sending && !session.busy;
  const currentPrompt = () => session.pendingPrompt || session.activePrompt || prompt;

  async function runStep(step: DemoStep, source = "") {
    if (!canSteer) return;
    setSending(true); setAnswer(""); setError("");
    try {
      const result = await requestDemoBeat({ campaignId: CAMPAIGN_ID, stepId: step.id, direction: source, currentPrompt: currentPrompt(), contract });
      await session.steer(result.prompt, result.actionPrompt);
      setStepId(step.id); setAssetId(step.assetId); setContract(result.contract); setPrompt(result.prompt);
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
    } catch (caught) { setError(caught instanceof Error ? caught.message : "That direction did not go through."); }
    finally { setSending(false); }
  }

  async function skip() {
    try { if (session.connected) await session.disconnectSession(); } catch { /* the video resumes either way */ }
    onFinished();
  }

  const showingLive = status === "live" && session.runStarted;
  const skipReady = shownFor >= SKIP_AFTER_S;
  return <div className="yt-ad" hidden={phase !== "show"} aria-live="polite" aria-label="Interactive ad">
    <div className="yt-ad-stage">
      {showingLive
        ? <ReactorView track="main_video" audioTrack="main_audio" muted className="yt-ad-view" videoObjectFit="contain" />
        : <img className="yt-ad-still" src={STILL} alt="" />}
      {(status === "preparing" || (status === "live" && !session.runStarted)) && <div className="yt-ad-loading" role="status"><span className="yt-spinner" /><span>{session.phase || "Connecting…"}</span></div>}
      {status === "failed" && <div className="yt-ad-loading yt-ad-failed" role="alert"><strong>Live ad unavailable</strong><small>{error}</small></div>}
      {answer && <div className="yt-ad-answer" role="status"><span>{campaign.brand}</span><p>{answer}</p></div>}
    </div>
    <div className="yt-ad-top">
      <img src={campaign.logo} alt="" />
      <div><strong>{campaign.brand}</strong><span>Sponsored · Interactive</span></div>
      {showingLive && <span className="yt-ad-live"><i />LIVE</span>}
    </div>
    <div className="yt-ad-bottom">
      <div className="yt-ad-steer">
        <span className="yt-ad-steer-label">{status === "live" ? "You direct this ad" : status === "offline" ? "Preview: the live model is not connected" : status === "failed" ? "Interactive controls unavailable" : "Preparing the live ad…"}</span>
        <div className="yt-ad-chips">{chips.map((step) => <button key={step.id} type="button" disabled={!canSteer} onClick={() => void runStep(step)}>{step.chip}</button>)}</div>
        <form className="yt-ad-say" onSubmit={(event) => { event.preventDefault(); void submitText(); }}>
          <input type="text" aria-label="Direct the ad" value={text} placeholder="Or say it your way: “show the back”, “make it rain”" disabled={!canSteer} maxLength={400} onChange={(event) => setText(event.target.value)} />
          <button type="submit" disabled={!canSteer || !text.trim()}>Send</button>
        </form>
        {status === "live" && (error ? <p className="yt-ad-error">{error}</p> : <p className="yt-ad-phase">{session.phase}{current ? ` · ${current.title}` : ""}</p>)}
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
