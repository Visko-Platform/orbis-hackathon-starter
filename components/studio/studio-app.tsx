"use client";

import { ReactorProvider } from "@reactor-team/js-sdk";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArchitecturePanel } from "./architecture-panel";
import { CampaignPanel } from "./campaign-panel";
import { ContinuationStage, type FactOverlay, type PivotResult } from "./continuation-stage";
import { KnowledgePanel } from "./knowledge-panel";
import { SourceClipPanel } from "./source-clip-panel";
import { Icon } from "./icon";
import { useLiveContinuation } from "@/hooks/use-live-continuation";
import { useReleaseOnUnload } from "@/hooks/use-release-on-unload";
import { ORBIS_MODEL_NAME, ORBIS_TRACKS, requestReactorJwt } from "@/lib/orbis";
import { audienceProfiles, campaigns, DEFAULT_CAMPAIGN_ID, filmTitles, selectEligibleCampaign, type Campaign, type PlacementZone } from "@/lib/studio-data";
import { composePlacementFrame, composeProductFrame } from "@/lib/placement-frame";
import { captureVideoFrame } from "@/lib/frame-capture";
import type { SceneContract } from "@/lib/knowledge/contract";
import type { DirectionMode } from "@/lib/live-direction";
import type { Engineered } from "@/lib/knowledge/engineer";
import { requestPivot } from "@/lib/demo/client";

type Section = "studio" | "campaigns" | "library" | "architecture" | "activity";
type PreparedRun = { runId: string; prompt: string; preparedAt: string; campaign: Campaign; assetId: string; contract?: SceneContract | null };
type Activity = { id: string; label: string; detail: string; time: string };
type Upload = { file: File; url: string };
type Composite = Upload & { artworkKey: string };

// How long a product answer stays on the stage before it fades.
const OVERLAY_MS = 9_000;

/** The file extension a library asset is served with, so a .webm clip is not named .mp4. */
function extensionOf(url: string, fallback: string): string {
  return url.split("?")[0].split(".").pop()?.toLowerCase() || fallback;
}

export function StudioApp() {
  const token = useRef<Promise<string> | null>(null);
  const getJwt = useCallback(() => {
    token.current ??= requestReactorJwt().catch((error) => { token.current = null; throw error; });
    return token.current;
  }, []);
  const clearJwt = useCallback(() => { token.current = null; }, []);
  return <ReactorProvider apiUrl="https://api.reactor.inc" modelName={ORBIS_MODEL_NAME} modelTracks={[...ORBIS_TRACKS]} connectOptions={{ autoConnect: false }} jwtToken={getJwt}><StudioWorkspace clearJwt={clearJwt} /></ReactorProvider>;
}

function StudioWorkspace({ clearJwt }: { clearJwt: () => void }) {
  const session = useLiveContinuation(clearJwt);
  // A refresh or closed tab ends the session server-side, so the next take does not wait for the old one.
  useReleaseOnUnload();
  const [section, setSection] = useState<Section>("studio");
  const [titleId, setTitleId] = useState(filmTitles[1].id);
  const [profileId, setProfileId] = useState(audienceProfiles[0].id);
  const [automatic, setAutomatic] = useState(false);
  const [campaignId, setCampaignId] = useState(DEFAULT_CAMPAIGN_ID);
  const campaign = campaigns.find((item) => item.id === campaignId) ?? campaigns.find((item) => item.id === DEFAULT_CAMPAIGN_ID) ?? campaigns[0];
  const title = filmTitles.find((item) => item.id === titleId) ?? filmTitles[1];
  const [sceneBrief, setSceneBrief] = useState("Continue from this frame. A slow tracking shot around the product, natural movement, realistic lighting. The product belongs naturally in the scene.");
  const [clip, setClip] = useState<Upload | null>(null);
  const [frame, setFrame] = useState<Upload | null>(null);
  const [handoffTime, setHandoffTime] = useState(0);
  const [uploads, setUploads] = useState<Record<string, Upload>>({});
  const [assetSelections, setAssetSelections] = useState<Record<string, string>>({});
  const [zone, setZone] = useState<PlacementZone>(campaign.placement.zone);
  const [composite, setComposite] = useState<Composite | null>(null);
  const [compositing, setCompositing] = useState(false);
  const [preparedRun, setPreparedRun] = useState<PreparedRun | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [brandRetained, setBrandRetained] = useState(true);
  const [error, setError] = useState("");
  const [activity, setActivity] = useState<Activity[]>([]);
  const [knowledgeVersion, setKnowledgeVersion] = useState(0);
  const [overlay, setOverlay] = useState<FactOverlay | null>(null);
  const [voiceover, setVoiceover] = useState(true);
  const narrator = useRef<HTMLAudioElement | null>(null);
  const voiceoverTake = useRef(0);

  // Narrator lines for the scene now on screen: written from the knowledge base,
  // spoken by Gemini, shown as a caption. Never blocks the take; failures are logged.
  async function speakScene(campaignId: string, scene: string, role: "opening" | "pivot" | "refine", direction?: string) {
    if (!voiceover) return;
    const ticket = ++voiceoverTake.current;
    try {
      const response = await fetch("/api/continuations/voiceover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId, scene, role, direction, contractLines: contract?.lines.map((line) => line.text) ?? [] }), signal: AbortSignal.timeout(30_000) });
      const result = await response.json();
      if (!response.ok || ticket !== voiceoverTake.current) return;
      const lines: string[] = Array.isArray(result.lines) ? result.lines : [];
      if (!lines.length) return;
      narrator.current?.pause();
      if (result.audio) {
        const audio = new Audio(`data:${result.mimeType || "audio/wav"};base64,${result.audio}`);
        narrator.current = audio;
        audio.play().catch((caught) => console.warn("voiceover playback blocked", caught));
      }
      setOverlay({ text: lines.join(" "), at: Date.now(), label: "Voiceover" });
      addActivity("Voiceover", lines.join(" "));
    } catch (caught) {
      console.warn("voiceover unavailable", caught);
    }
  }
  // What must stay true for the take; restated in every direction. Set by prepare, advanced by each pivot.
  const [contract, setContract] = useState<SceneContract | null>(null);
  // The product view the live take is running with; directions name it so views of the same product are preferred.
  const [liveAssetId, setLiveAssetId] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [loadingSceneId, setLoadingSceneId] = useState("");
  const sourceDetails = useRef<HTMLDetailsElement>(null);
  const productUpload = useRef<HTMLInputElement>(null);
  const urls = useRef(new Set<string>());
  const locked = session.runStarted || session.busy || preparing || Boolean(loadingSceneId);
  // The product photo is the default image to place; a logo is a weaker starting frame.
  const assetId = assetSelections[campaignId] ?? campaign.assets.find((item) => item.kind === "product")?.id ?? campaign.assets[0]?.id;
  const upload = uploads[campaignId];
  const asset = campaign.assets.find((item) => item.id === assetId) ?? campaign.assets[0];
  const artwork = assetId === "upload" && upload ? upload.file : asset.src;
  const artworkKey = typeof artwork === "string" ? artwork : "upload";

  const addActivity = useCallback((label: string, detail: string) => {
    setActivity((current) => [{ id: crypto.randomUUID(), label, detail, time: new Date().toISOString() }, ...current].slice(0, 150));
  }, []);
  function objectUrl(file: File) { const url = URL.createObjectURL(file); urls.current.add(url); return url; }
  function release(url?: string) { if (url) { URL.revokeObjectURL(url); urls.current.delete(url); } }

  useEffect(() => {
    const allUrls = urls.current;
    try {
      const saved: unknown = JSON.parse(localStorage.getItem("orbis-ad-activity-v2") || "[]");
      if (Array.isArray(saved)) setActivity(saved.filter((item) => item && typeof item.id === "string" && typeof item.label === "string" && typeof item.detail === "string" && typeof item.time === "string").slice(0, 150));
    } catch { /* Local history is optional when storage is unavailable. */ }
    setStorageReady(true);
    return () => allUrls.forEach((url) => URL.revokeObjectURL(url));
  }, []);
  useEffect(() => { if (storageReady) { try { localStorage.setItem("orbis-ad-activity-v2", JSON.stringify(activity)); } catch { /* Keep session history in memory. */ } } }, [activity, storageReady]);
  useEffect(() => { if (!overlay) return; const timer = setTimeout(() => setOverlay(null), OVERLAY_MS); return () => clearTimeout(timer); }, [overlay]);

  useEffect(() => {
    let cancelled = false;
    let resultUrl = "";
    setCompositing(true);
    setComposite(null);
    // With a reference frame the product is placed into it; without one the product image is the frame.
    (frame ? composePlacementFrame(frame.file, artwork, zone) : composeProductFrame(artwork)).then((file) => {
      if (cancelled) return;
      resultUrl = objectUrl(file);
      setComposite({ file, url: resultUrl, artworkKey });
      setError("");
    }).catch((caught) => { if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not prepare the placement preview."); })
      .finally(() => { if (!cancelled) setCompositing(false); });
    return () => { cancelled = true; release(resultUrl); };
  }, [frame, artwork, zone]); // eslint-disable-line react-hooks/exhaustive-deps -- artworkKey derives from artwork

  useEffect(() => { if (!session.runStarted) setLiveAssetId(""); }, [session.runStarted]);

  function chooseCampaign(id: string) {
    if (locked) return;
    const next = campaigns.find((item) => item.id === id);
    if (!next) return;
    setCampaignId(id); setZone(next.placement.zone); setPreparedRun(null); setError("");
  }
  function chooseProfile(id: string) {
    if (locked) return;
    setProfileId(id);
    if (automatic) { const selected = selectEligibleCampaign(id, titleId); if (selected) chooseCampaign(selected.id); }
  }
  function toggleAutomatic(value: boolean) {
    if (locked) return;
    setAutomatic(value);
    if (value) { const selected = selectEligibleCampaign(profileId, titleId); if (selected) chooseCampaign(selected.id); }
  }
  function addProductImage() {
    setSection("studio");
    requestAnimationFrame(() => productUpload.current?.click());
  }
  async function chooseTitle(id: string) {
    if (locked) return;
    const next = filmTitles.find((item) => item.id === id);
    if (!next) return;
    setLoadingSceneId(id);
    setError("");
    try {
      const [videoResponse, posterResponse] = await Promise.all([
        fetch(next.media.video),
        fetch(next.media.poster),
      ]);
      if (!videoResponse.ok || !posterResponse.ok) throw new Error("This library scene could not be loaded.");
      const [videoBlob, posterBlob] = await Promise.all([videoResponse.blob(), posterResponse.blob()]);
      // Library scenes are not all .mp4/.png, so the file keeps the extension it was served with.
      const videoFile = new File([videoBlob], `${next.id}.${extensionOf(next.media.video, "mp4")}`, { type: videoBlob.type || "video/mp4" });
      const posterFile = new File([posterBlob], `${next.id}-frame.${extensionOf(next.media.poster, "png")}`, { type: posterBlob.type || "image/png" });
      release(clip?.url);
      release(frame?.url);
      setClip({ file: videoFile, url: objectUrl(videoFile) });
      setFrame({ file: posterFile, url: objectUrl(posterFile) });
      setHandoffTime(0);
      setTitleId(id);
      setSceneBrief(`${next.continuity.setting}. ${next.continuity.camera}. ${next.continuity.lighting}. ${next.continuity.objective}.`);
      setPreparedRun(null);
      setSection("studio");
      if (automatic) {
        const selected = selectEligibleCampaign(profileId, id);
        if (selected) { setCampaignId(selected.id); setZone(selected.placement.zone); }
      }
      addActivity("Library scene loaded", `${next.title} · ${next.moment} · ${next.media.license}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "This library scene could not be loaded.");
    } finally {
      setLoadingSceneId("");
    }
  }
  function selectClip(file: File) {
    if (locked) return;
    release(clip?.url); release(frame?.url);
    setClip({ file, url: objectUrl(file) }); setFrame(null); setHandoffTime(0); setPreparedRun(null);
    addActivity("Clip imported", file.name);
  }
  function selectFrame(next: { file: File; previewUrl: string; time: number; sourceKind?: "image" | "video" }) {
    if (locked) { URL.revokeObjectURL(next.previewUrl); return; }
    release(frame?.url);
    urls.current.add(next.previewUrl);
    if (next.sourceKind === "image") { release(clip?.url); setClip(null); }
    setFrame({ file: next.file, url: next.previewUrl }); setHandoffTime(next.time); setPreparedRun(null);
    addActivity("Reference frame ready", next.sourceKind === "image" ? next.file.name : `Captured at ${next.time.toFixed(2)}s`);
  }
  function selectArtwork(file: File) {
    if (locked) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) { setError("Choose a PNG, JPEG, or WebP image under 10 MB."); return; }
    release(uploads[campaignId]?.url);
    setUploads((current) => ({ ...current, [campaignId]: { file, url: objectUrl(file) } }));
    setAssetSelections((current) => ({ ...current, [campaignId]: "upload" }));
    addActivity("Product image added", `${campaign.brand} · ${file.name}`);
  }

  async function startContinuation(): Promise<boolean> {
    const brief = sceneBrief.trim();
    if (!composite || locked) return false;
    if (!brief) { setError("Add a scene brief before generating."); return false; }
    setPreparing(true); setError("");
    try {
      const response = await fetch("/api/continuations/prepare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId, titleId, campaignId, assetId, selectionMode: automatic ? "auto" : "manual", sceneBrief: brief }), signal: AbortSignal.timeout(15_000) });
      const result = await response.json();
      if (!response.ok || !result.prompt || !result.runId) throw new Error(result.error || "Could not prepare this scene.");
      setPreparedRun(result); setBrandRetained(true);
      setContract(result.contract ?? null);
      if (result.engineered?.model === "gemini") addActivity("Scene brief engineered", result.engineered.text);
      if (result.contract?.lines?.length) addActivity("Scene contract set", result.contract.lines.map((line: { text: string }) => line.text).join(" · "));
      await session.startContinuation({ image: composite.file, prompt: result.prompt, audioPrompt: result.audioPrompt ?? null });
      void speakScene(campaign.id, result.engineered?.text ?? sceneBrief, "opening");
      setLiveAssetId(assetId);
      addActivity("Live take started", `${campaign.brand} · ${assetId === "upload" ? upload?.file.name : asset.label} · ${result.runId.slice(0, 8)}`);
      return true;
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Generation failed."); addActivity("Take could not start", caught instanceof Error ? caught.message : "Unknown error"); return false; }
    finally { setPreparing(false); }
  }
  async function pivot(direction: string, mode: DirectionMode, preserveBrand: boolean): Promise<PivotResult> {
    // A live take keeps its prepared campaign; a product question can be asked against the workspace campaign without one.
    const target = session.runStarted && preparedRun ? preparedRun.campaign : campaign;
    setError("");
    try {
      const result = await requestPivot({ direction, mode, preserveBrand, campaignId: target.id, assetId: session.runStarted && preparedRun ? liveAssetId || preparedRun.assetId : assetId, currentPrompt: session.pendingPrompt || session.activePrompt || preparedRun?.prompt || "", contract: session.runStarted ? contract : null });
      if (result.outcome === "overlay") {
        const answer = String(result.answer ?? "");
        setOverlay({ text: answer, at: Date.now() });
        addActivity("Question answered on screen", answer);
        return { ok: true, answer };
      }
      if (!session.runStarted) throw new Error("Start a live take before sending a direction.");
      await session.steer(result.prompt, result.actionPrompt ?? null, result.audioPrompt ?? null);
      setBrandRetained(preserveBrand);
      void speakScene(target.id, (result.engineered as Engineered | undefined)?.text ?? direction, mode, direction);
      if (result.contract !== undefined) setContract(result.contract);
      const engineered = result.engineered as Engineered | undefined;
      addActivity(mode === "pivot" ? "New direction accepted" : "Scene refinement accepted", engineered?.model === "gemini" ? `${direction} → ${engineered.text}` : direction);
      return { ok: true, engineered, actionPrompt: result.actionPrompt ?? null };
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not send this direction. Your prompt is saved below."); return { ok: false }; }
  }
  // Re-reads person and setting lines from what is actually on screen: the live video when a take runs, otherwise the preview frame.
  async function readContractFromFrame(video: HTMLVideoElement | null) {
    setError("");
    try {
      const image = session.runStarted && video ? await captureVideoFrame(video) : composite?.file;
      if (!image) throw new Error("Add a product or reference frame first.");
      const target = session.runStarted && preparedRun ? preparedRun.campaign : campaign;
      const form = new FormData();
      form.set("campaignId", target.id);
      form.set("brief", sceneBrief.trim() || "The product in the scene.");
      form.set("keepProduct", String(brandRetained));
      form.set("contract", JSON.stringify(contract ?? { lines: [] }));
      form.set("image", image);
      const response = await fetch("/api/continuations/contract", { method: "POST", body: form, signal: AbortSignal.timeout(30_000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not read the scene.");
      setContract(result.contract);
      addActivity("Scene contract read from frame", result.contract.lines.map((line: { text: string }) => line.text).join(" · "));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not read the scene."); }
  }
  // The viewer's side of the demo opens in a new tab. One key gets one live
  // session, so the studio's own session is released first.
  function openUserDemo() {
    window.open("/watch", "_blank", "noopener");
    if (session.connected) void runAction(session.disconnectSession, "Session released for the user demo");
  }
  async function runAction(action: () => Promise<void>, label: string) {
    setError("");
    try { await action(); addActivity(label, preparedRun ? `Take ${preparedRun.runId.slice(0, 8)}` : "Studio session"); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "The action could not be completed."); }
  }
  function exportActivity() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(activity, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "orbis-session-history.json"; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <div className="app-shell">
    <header className="app-header">
      <button className="wordmark" type="button" onClick={() => setSection("studio")} aria-label="Adtractive Studio"><span className="orbit-mark" aria-hidden="true" /><strong>adtractive</strong><span className="beta-mark">STUDIO</span></button>
      <nav aria-label="Main navigation">{([{ id: "studio", label: "Studio", icon: "film" }, { id: "campaigns", label: "Campaigns", icon: "layers" }, { id: "library", label: "Scene library", icon: "image" }, { id: "architecture", label: "Architecture", icon: "spark" }, { id: "activity", label: "Activity", icon: "clock" }] as const).map((item) => <button key={item.id} type="button" className={section === item.id ? "active" : ""} aria-current={section === item.id ? "page" : undefined} onClick={() => setSection(item.id)}><Icon name={item.icon} size={16} />{item.label}</button>)}</nav>
      <div className="header-status"><span className={`state-dot ${session.connected ? "connected" : ""}`} /><span>{session.runStarted ? "Live session" : session.connected ? "Connected" : "Workspace"}</span><span className="avatar">MA</span></div>
    </header>
    <main className="workspace">
      <div className="page-heading"><div><div className="eyebrow">ADTRACTIVE / {section === "studio" ? "PRODUCT WORKSPACE" : section.toUpperCase()}</div><h1>{section === "studio" ? "Your product, placed live." : section === "campaigns" ? "Brands, ready for their close-up." : section === "library" ? "Set the scene." : section === "architecture" ? "How it works." : "Every direction, in one place."}</h1><p>{section === "studio" ? "Add the product and what is true about it. Then direct the scene as it unfolds." : section === "campaigns" ? "Real artwork from each brand, ready to use in your next placement." : section === "library" ? "Choose a real film clip, then direct what happens next." : section === "architecture" ? "Every model and service in the live path, and what each one does." : "Review and export the creative decisions in this browser."}</p></div><div className="heading-actions">{section !== "architecture" && session.connected && <button className="button subtle" type="button" onClick={() => runAction(session.disconnectSession, "Session disconnected")} disabled={session.busy && !session.runStarted}>Disconnect</button>}{section === "architecture" ? null : section === "activity" ? <button className="button secondary" type="button" disabled={!activity.length} onClick={exportActivity}><Icon name="download" size={16} />Export history</button> : <button className="button secondary" type="button" disabled={locked} onClick={addProductImage}><Icon name="upload" size={16} />Add product image</button>}</div></div>
      {(error || session.error) && <div className="global-error" role="alert"><span>{error || session.error}</span><button className="icon-button" aria-label="Dismiss error" type="button" onClick={() => { setError(""); session.clearError?.(); }}><Icon name="close" size={15} /></button></div>}

      <div hidden={section !== "studio"} className="studio-screen">
        <div className="studio-grid">
          <ContinuationStage session={session} campaign={session.runStarted && preparedRun ? preparedRun.campaign : campaign} framePreview={composite?.url || ""} originalPreview={frame?.url || ""} preparing={preparing || compositing} runId={preparedRun?.runId || ""} brandRetained={brandRetained} overlay={overlay} voiceover={voiceover} onVoiceoverChange={setVoiceover} knowledgeVersion={knowledgeVersion} contract={contract} onContractChange={setContract} onReadContract={readContractFromFrame} canReadContract={Boolean(composite)} onStart={() => void startContinuation()} onUserDemo={openUserDemo} onPivot={pivot} onAction={runAction} onAddProduct={addProductImage} />
          <aside className="inspector" aria-label="Product setup">
            {locked && <div className="locked-notice"><Icon name="check" size={14} />Product and frame are held for this take. Use the director to steer live.</div>}
            <CampaignPanel profiles={audienceProfiles} campaigns={campaigns} selectedProfileId={profileId} campaign={campaign} automatic={automatic} assetId={assetId} assetName={upload?.file.name || ""} uploadedPreview={upload?.url || ""} disabled={locked} uploadInputRef={productUpload} onProfileChange={chooseProfile} onCampaignChange={(id) => { setAutomatic(false); chooseCampaign(id); }} onAutomaticChange={toggleAutomatic} onAssetSelected={selectArtwork} onAssetIdChange={(id) => setAssetSelections((current) => ({ ...current, [campaignId]: id }))} />
            <KnowledgePanel campaignId={campaignId} disabled={locked} productImage={artwork} onSaved={(knowledge) => { setKnowledgeVersion((version) => version + 1); addActivity("Product info saved", `${knowledge.product.name} · ${knowledge.visualNotes.length} notes · ${knowledge.facts.length} facts`); }} onError={setError} />
            <details className="inspector-section source-details" ref={sourceDetails}><summary><span><span className="panel-eyebrow">03 / REFERENCE FRAME</span>Reference frame <small className="optional-tag">optional</small></span><span className={frame ? "ready-label" : "subtle-label"}>{frame ? "Ready" : "Product image"}</span></summary><SourceClipPanel title={title} clipUrl={clip?.url || ""} clipName={clip?.file.name || ""} framePreview={frame?.url || ""} handoffTime={handoffTime} onClipSelected={selectClip} onFrameCaptured={selectFrame} disabled={locked} onError={setError} /></details>
            <details className="inspector-section"><summary><span><span className="panel-eyebrow">04 / SCENE BRIEF</span>Scene brief & placement</span><Icon name="chevron" size={15} /></summary><div className="placement-controls"><label className="field-label">What happens in the scene?<textarea value={sceneBrief} maxLength={4000} disabled={locked} onChange={(event) => setSceneBrief(event.target.value)} rows={5} /></label><p>Rewritten with the product info before it reaches the model.</p>{frame && <><h3>Position the product</h3><p>Only used with a reference frame. Review the placement tab in the preview.</p></>}{frame && ([{ key: "x", label: "Horizontal", max: 1 - zone.width }, { key: "y", label: "Vertical", max: 1 - zone.height }, { key: "width", label: "Size", max: .5 }] as const).map((control) => <label className="range-field" key={control.key}><span>{control.label}<output>{Math.round(zone[control.key] * 100)}%</output></span><input type="range" min={control.key === "width" ? .06 : 0} max={control.max} step={.01} value={zone[control.key]} disabled={locked} onChange={(event) => { const value = Number(event.target.value); setZone((previous) => control.key === "width" ? { ...previous, width: value, height: Math.min(value * 1.1, .55), x: Math.min(previous.x, 1-value), y: Math.min(previous.y, 1 - Math.min(value * 1.1, .55)) } : { ...previous, [control.key]: value }); }} /></label>)}</div></details>
          </aside>
        </div>
        <footer className="workspace-footer"><span><span className="state-dot" />Powered by Visko Orbis</span><span>Live generative video · starts from your product image or a reference frame</span></footer>
      </div>

      {section === "campaigns" && <section className="campaign-library" aria-label="Campaign library">{campaigns.map((item) => <article className="campaign-card" key={item.id}><div className={`campaign-hero ${item.category}`}><img src={(item.assets.find((asset) => asset.kind !== "logo") || item.assets[0]).src} alt={`${item.brand} campaign artwork`} /><span className="hero-brand"><img src={item.logo} alt={item.brand} /></span></div><div className="campaign-card-body"><span className="eyebrow">{item.category} / {item.assets.length} ASSETS</span><h2>{item.campaign}</h2><p>{item.placement.label} · {item.brand}</p><div className="library-assets">{item.assets.map((asset) => <a href={asset.src} key={asset.id} target="_blank" rel="noreferrer" aria-label={`View ${asset.label}`}><img src={asset.src} alt={asset.label} /><span>{asset.label}</span></a>)}</div><button className="button secondary full-width" type="button" disabled={locked} onClick={() => { setAutomatic(false); chooseCampaign(item.id); setSection("studio"); }}>Use {item.brand}<Icon name="arrow" size={16} /></button><details className="asset-sources"><summary>Asset sources</summary>{item.assets.map((asset) => <a key={asset.id} href={asset.sourceUrl} target="_blank" rel="noreferrer">{asset.label} ↗</a>)}</details></div></article>)}</section>}

      {section === "library" && <><div className="library-note"><span className="library-note-icon"><Icon name="film" size={18} /></span><div><strong>Real footage, ready to direct.</strong><p>These open-film clips include a starting frame and load directly into Studio as a reference frame, alongside your product image. Hover a card to preview the shot.</p></div></div><div className="scene-library">{filmTitles.map((item, index) => <article className="scene-card" key={item.id}><div className={`scene-card-art scene-${index}`}><video src={item.media.video} poster={item.media.poster} muted loop playsInline autoPlay preload="metadata" aria-label={`${item.title}: ${item.moment} preview`} /><span className="scene-media-scrim" /><div className="scene-topline"><span className="scene-index">0{index + 1}</span><span className="scene-license">{item.media.license}</span></div><span className="scene-play"><Icon name="play" size={15} /> LIVE PREVIEW</span></div><div className="scene-card-body"><span className="eyebrow">{item.genre}</span><h2>{item.title}</h2><h3>{item.moment}</h3><p>{item.continuity.setting}.</p><div className="scene-card-actions"><button className="button secondary" type="button" disabled={locked} onClick={() => void chooseTitle(item.id)}>{loadingSceneId === item.id ? "Loading scene…" : "Use scene"}<Icon name="arrow" size={16} /></button><a href={item.media.sourceUrl} target="_blank" rel="noreferrer" aria-label={`View source for ${item.title}`}>Source ↗</a></div><span className="scene-attribution">{item.media.sourceLabel}</span></div></article>)}</div></>}

      {section === "architecture" && <ArchitecturePanel />}

      {section === "activity" && <section className="activity-panel"><div className="activity-heading"><h2>Creative history</h2><span>{activity.length} events · stored in this browser</span></div>{activity.length ? activity.map((event) => <div className="activity-row" key={event.id}><span className="activity-icon"><Icon name={event.label.includes("direction") || event.label.includes("refinement") ? "spark" : "check"} size={16} /></span><div><strong>{event.label}</strong><p>{event.detail}</p></div><time dateTime={event.time}>{new Date(event.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div>) : <div className="activity-empty"><Icon name="clock" size={36} /><h3>Your creative trail starts here.</h3><p>Add a product or start a take to see your decisions appear.</p><button className="button secondary" type="button" onClick={() => setSection("studio")}>Open Studio<Icon name="arrow" size={16} /></button></div>}<details className="technical-events"><summary>Latest model events</summary>{session.events.length ? session.events.map((event, index) => <code key={`${index}-${event}`}>{event}</code>) : <p>No connected session.</p>}<pre className="model-snapshot">{session.modelSnapshot}</pre></details></section>}
    </main>
  </div>;
}
