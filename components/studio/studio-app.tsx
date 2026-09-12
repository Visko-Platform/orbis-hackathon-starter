"use client";

import { ReactorProvider } from "@reactor-team/js-sdk";
import { useCallback, useEffect, useRef, useState } from "react";
import { CampaignPanel } from "./campaign-panel";
import { ContinuationStage } from "./continuation-stage";
import { SourceClipPanel } from "./source-clip-panel";
import { Icon } from "./icon";
import { useLiveContinuation } from "@/hooks/use-live-continuation";
import { ORBIS_MODEL_NAME, ORBIS_TRACKS, requestReactorJwt } from "@/lib/orbis";
import { audienceProfiles, campaigns, filmTitles, selectEligibleCampaign, type Campaign, type PlacementZone } from "@/lib/studio-data";
import { composePlacementFrame } from "@/lib/placement-frame";
import type { DirectionMode } from "@/lib/live-direction";

type Section = "studio" | "campaigns" | "library" | "activity";
type PreparedRun = { runId: string; prompt: string; preparedAt: string; campaign: Campaign };
type Activity = { id: string; label: string; detail: string; time: string };
type Upload = { file: File; url: string };

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
  const [section, setSection] = useState<Section>("studio");
  const [titleId, setTitleId] = useState(filmTitles[1].id);
  const [profileId, setProfileId] = useState(audienceProfiles[0].id);
  const [automatic, setAutomatic] = useState(false);
  const [campaignId, setCampaignId] = useState(campaigns[0].id);
  const campaign = campaigns.find((item) => item.id === campaignId) ?? campaigns[0];
  const title = filmTitles.find((item) => item.id === titleId) ?? filmTitles[1];
  const [sceneBrief, setSceneBrief] = useState("Continue the action from this frame. A slow cinematic tracking shot through the location, natural movement, realistic lighting. The product belongs naturally in the scene.");
  const [clip, setClip] = useState<Upload | null>(null);
  const [frame, setFrame] = useState<Upload | null>(null);
  const [handoffTime, setHandoffTime] = useState(0);
  const [uploads, setUploads] = useState<Record<string, Upload>>({});
  const [assetSelections, setAssetSelections] = useState<Record<string, string>>({});
  const [zone, setZone] = useState<PlacementZone>(campaign.placement.zone);
  const [composite, setComposite] = useState<Upload | null>(null);
  const [compositing, setCompositing] = useState(false);
  const [preparedRun, setPreparedRun] = useState<PreparedRun | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [brandRetained, setBrandRetained] = useState(true);
  const [error, setError] = useState("");
  const [activity, setActivity] = useState<Activity[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [loadingSceneId, setLoadingSceneId] = useState("");
  const sourceDetails = useRef<HTMLDetailsElement>(null);
  const urls = useRef(new Set<string>());
  const locked = session.runStarted || session.busy || preparing || Boolean(loadingSceneId);
  const assetId = assetSelections[campaignId] ?? campaign.assets[0]?.id;
  const upload = uploads[campaignId];
  const asset = campaign.assets.find((item) => item.id === assetId) ?? campaign.assets[0];
  const artwork = assetId === "upload" && upload ? upload.file : asset.src;

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

  useEffect(() => {
    if (!frame) { setComposite(null); return; }
    let cancelled = false;
    let resultUrl = "";
    setCompositing(true);
    setComposite(null);
    composePlacementFrame(frame.file, artwork, zone).then((file) => {
      if (cancelled) return;
      resultUrl = objectUrl(file);
      setComposite({ file, url: resultUrl });
      setError("");
    }).catch((caught) => { if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not prepare the placement preview."); })
      .finally(() => { if (!cancelled) setCompositing(false); });
    return () => { cancelled = true; release(resultUrl); };
  }, [frame, artwork, zone]);

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
  function importScene() {
    setSection("studio");
    requestAnimationFrame(() => { if (sourceDetails.current) { sourceDetails.current.open = true; sourceDetails.current.scrollIntoView({ behavior: "smooth", block: "center" }); sourceDetails.current.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true }); } });
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
      const videoFile = new File([videoBlob], `${next.id}.mp4`, { type: videoBlob.type || "video/mp4" });
      const posterFile = new File([posterBlob], `${next.id}-frame.png`, { type: posterBlob.type || "image/png" });
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
    addActivity("Campaign artwork added", `${campaign.brand} · ${file.name}`);
  }

  async function startContinuation() {
    if (!composite || locked) return;
    if (!sceneBrief.trim()) { setError("Add a scene brief before generating."); return; }
    setPreparing(true); setError("");
    try {
      const response = await fetch("/api/continuations/prepare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId, titleId, campaignId, assetId, selectionMode: automatic ? "auto" : "manual", sceneBrief }), signal: AbortSignal.timeout(15_000) });
      const result = await response.json();
      if (!response.ok || !result.prompt || !result.runId) throw new Error(result.error || "Could not prepare this scene.");
      setPreparedRun(result); setBrandRetained(true);
      await session.startContinuation({ image: composite.file, prompt: result.prompt });
      addActivity("Live take started", `${campaign.brand} · ${assetId === "upload" ? upload?.file.name : asset.label} · ${result.runId.slice(0, 8)}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Generation failed."); addActivity("Take could not start", caught instanceof Error ? caught.message : "Unknown error"); }
    finally { setPreparing(false); }
  }
  async function pivot(direction: string, mode: DirectionMode, preserveBrand: boolean) {
    if (!preparedRun || !session.runStarted) return false;
    setError("");
    try {
      const response = await fetch("/api/continuations/pivot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ direction, mode, preserveBrand, campaignId: preparedRun.campaign.id, currentPrompt: session.pendingPrompt || session.activePrompt || preparedRun.prompt }), signal: AbortSignal.timeout(15_000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not prepare this direction.");
      await session.steer(result.prompt);
      setBrandRetained(preserveBrand);
      addActivity(mode === "pivot" ? "New direction accepted" : "Scene refinement accepted", direction);
      return true;
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not send this direction. Your prompt is saved below."); return false; }
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
      <button className="wordmark" type="button" onClick={() => setSection("studio")} aria-label="Orbis Ad Studio"><span className="orbit-mark" aria-hidden="true" /><strong>orbis<span>ad</span></strong><span className="beta-mark">STUDIO</span></button>
      <nav aria-label="Main navigation">{([{ id: "studio", label: "Studio", icon: "film" }, { id: "campaigns", label: "Campaigns", icon: "layers" }, { id: "library", label: "Scene library", icon: "image" }, { id: "activity", label: "Activity", icon: "clock" }] as const).map((item) => <button key={item.id} type="button" className={section === item.id ? "active" : ""} aria-current={section === item.id ? "page" : undefined} onClick={() => setSection(item.id)}><Icon name={item.icon} size={16} />{item.label}</button>)}</nav>
      <div className="header-status"><span className={`state-dot ${session.connected ? "connected" : ""}`} /><span>{session.runStarted ? "Live session" : session.connected ? "Connected" : "Workspace"}</span><span className="avatar">MA</span></div>
    </header>
    <main className="workspace">
      <div className="page-heading"><div><div className="eyebrow">ORBIS AD / {section === "studio" ? "CREATIVE WORKSPACE" : section.toUpperCase()}</div><h1>{section === "studio" ? "A place in the story." : section === "campaigns" ? "Brands, ready for their close-up." : section === "library" ? "Set the scene." : "Every direction, in one place."}</h1><p>{section === "studio" ? "Real brands. Your footage. A scene you can direct as it unfolds." : section === "campaigns" ? "Real artwork from each brand, ready to use in your next placement." : section === "library" ? "Choose a real film clip, then direct what happens next." : "Review and export the creative decisions in this browser."}</p></div><div className="heading-actions">{session.connected && <button className="button subtle" type="button" onClick={() => runAction(session.disconnectSession, "Session disconnected")} disabled={session.busy && !session.runStarted}>Disconnect</button>}{section === "activity" ? <button className="button secondary" type="button" disabled={!activity.length} onClick={exportActivity}><Icon name="download" size={16} />Export history</button> : <button className="button secondary" type="button" disabled={locked} onClick={importScene}><Icon name="upload" size={16} />Import scene</button>}</div></div>
      {(error || session.error) && <div className="global-error" role="alert"><span>{error || session.error}</span><button className="icon-button" aria-label="Dismiss error" type="button" onClick={() => { setError(""); session.clearError?.(); }}><Icon name="close" size={15} /></button></div>}

      <div hidden={section !== "studio"} className="studio-screen">
        <div className="studio-grid">
          <ContinuationStage session={session} campaign={session.runStarted && preparedRun ? preparedRun.campaign : campaign} framePreview={composite?.url || ""} originalPreview={frame?.url || ""} preparing={preparing || compositing} runId={preparedRun?.runId || ""} brandRetained={brandRetained} onStart={startContinuation} onPivot={pivot} onAction={runAction} onImport={importScene} />
          <aside className="inspector" aria-label="Scene setup">
            {locked && <div className="locked-notice"><Icon name="check" size={14} />Campaign and source are held for this take. Use the director to pivot live.</div>}
            <CampaignPanel profiles={audienceProfiles} campaigns={campaigns} selectedProfileId={profileId} campaign={campaign} automatic={automatic} assetId={assetId} assetName={upload?.file.name || ""} uploadedPreview={upload?.url || ""} disabled={locked} onProfileChange={chooseProfile} onCampaignChange={(id) => { setAutomatic(false); chooseCampaign(id); }} onAutomaticChange={toggleAutomatic} onAssetSelected={selectArtwork} onAssetIdChange={(id) => setAssetSelections((current) => ({ ...current, [campaignId]: id }))} />
            <details className="inspector-section source-details" ref={sourceDetails} open><summary><span><span className="panel-eyebrow">02 / SOURCE</span>Source & reference frame</span><span className={frame ? "ready-label" : "subtle-label"}>{frame ? "Ready" : "Import"}</span></summary><SourceClipPanel title={title} clipUrl={clip?.url || ""} clipName={clip?.file.name || ""} framePreview={frame?.url || ""} handoffTime={handoffTime} onClipSelected={selectClip} onFrameCaptured={selectFrame} disabled={locked} onError={setError} /></details>
            <details className="inspector-section"><summary><span><span className="panel-eyebrow">03 / DIRECTION</span>Scene brief & placement</span><Icon name="chevron" size={15} /></summary><div className="placement-controls"><label className="field-label">What happens next?<textarea value={sceneBrief} maxLength={1200} disabled={locked} onChange={(event) => setSceneBrief(event.target.value)} rows={5} /></label><p>Describe the scene to generate. Your uploaded frame sets the visual starting point.</p><h3>Position the artwork</h3><p>Review the placement tab in the preview before generating.</p>{([{ key: "x", label: "Horizontal", max: 1 - zone.width }, { key: "y", label: "Vertical", max: 1 - zone.height }, { key: "width", label: "Size", max: .5 }] as const).map((control) => <label className="range-field" key={control.key}><span>{control.label}<output>{Math.round(zone[control.key] * 100)}%</output></span><input type="range" min={control.key === "width" ? .06 : 0} max={control.max} step={.01} value={zone[control.key]} disabled={locked} onChange={(event) => { const value = Number(event.target.value); setZone((previous) => control.key === "width" ? { ...previous, width: value, height: Math.min(value * 1.1, .55), x: Math.min(previous.x, 1-value), y: Math.min(previous.y, 1 - Math.min(value * 1.1, .55)) } : { ...previous, [control.key]: value }); }} /></label>)}</div></details>
          </aside>
        </div>
        <footer className="workspace-footer"><span><span className="state-dot" />Powered by Visko Orbis</span><span>Live generative video · placements begin from your reference frame</span></footer>
      </div>

      {section === "campaigns" && <section className="campaign-library" aria-label="Campaign library">{campaigns.map((item) => <article className="campaign-card" key={item.id}><div className={`campaign-hero ${item.category}`}><img src={(item.assets.find((asset) => asset.kind !== "logo") || item.assets[0]).src} alt={`${item.brand} campaign artwork`} /><span className="hero-brand"><img src={item.logo} alt={item.brand} /></span></div><div className="campaign-card-body"><span className="eyebrow">{item.category} / {item.assets.length} ASSETS</span><h2>{item.campaign}</h2><p>{item.placement.label} · {item.brand}</p><div className="library-assets">{item.assets.map((asset) => <a href={asset.src} key={asset.id} target="_blank" rel="noreferrer" aria-label={`View ${asset.label}`}><img src={asset.src} alt={asset.label} /><span>{asset.label}</span></a>)}</div><button className="button secondary full-width" type="button" disabled={locked} onClick={() => { setAutomatic(false); chooseCampaign(item.id); setSection("studio"); }}>Use {item.brand}<Icon name="arrow" size={16} /></button><details className="asset-sources"><summary>Asset sources</summary>{item.assets.map((asset) => <a key={asset.id} href={asset.sourceUrl} target="_blank" rel="noreferrer">{asset.label} ↗</a>)}</details></div></article>)}</section>}

      {section === "library" && <><div className="library-note"><span className="library-note-icon"><Icon name="film" size={18} /></span><div><strong>Real footage, ready to direct.</strong><p>These open-film clips include a starting frame and load directly into Studio. Hover a card to preview the shot.</p></div></div><div className="scene-library">{filmTitles.map((item, index) => <article className="scene-card" key={item.id}><div className={`scene-card-art scene-${index}`}><video src={item.media.video} poster={item.media.poster} muted loop playsInline autoPlay preload="metadata" aria-label={`${item.title}: ${item.moment} preview`} /><span className="scene-media-scrim" /><div className="scene-topline"><span className="scene-index">0{index + 1}</span><span className="scene-license">{item.media.license}</span></div><span className="scene-play"><Icon name="play" size={15} /> LIVE PREVIEW</span></div><div className="scene-card-body"><span className="eyebrow">{item.genre}</span><h2>{item.title}</h2><h3>{item.moment}</h3><p>{item.continuity.setting}.</p><div className="scene-card-actions"><button className="button secondary" type="button" disabled={locked} onClick={() => void chooseTitle(item.id)}>{loadingSceneId === item.id ? "Loading scene…" : "Use scene"}<Icon name="arrow" size={16} /></button><a href={item.media.sourceUrl} target="_blank" rel="noreferrer" aria-label={`View source for ${item.title}`}>Source ↗</a></div><span className="scene-attribution">{item.media.sourceLabel}</span></div></article>)}</div></>}

      {section === "activity" && <section className="activity-panel"><div className="activity-heading"><h2>Creative history</h2><span>{activity.length} events · stored in this browser</span></div>{activity.length ? activity.map((event) => <div className="activity-row" key={event.id}><span className="activity-icon"><Icon name={event.label.includes("direction") || event.label.includes("refinement") ? "spark" : "check"} size={16} /></span><div><strong>{event.label}</strong><p>{event.detail}</p></div><time dateTime={event.time}>{new Date(event.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div>) : <div className="activity-empty"><Icon name="clock" size={36} /><h3>Your creative trail starts here.</h3><p>Import a scene or start a take to see your decisions appear.</p><button className="button secondary" type="button" onClick={() => setSection("studio")}>Open Studio<Icon name="arrow" size={16} /></button></div>}<details className="technical-events"><summary>Latest model events</summary>{session.events.length ? session.events.map((event, index) => <code key={`${index}-${event}`}>{event}</code>) : <p>No connected session.</p>}<pre className="model-snapshot">{session.modelSnapshot}</pre></details></section>}
    </main>
  </div>;
}
