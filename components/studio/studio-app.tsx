"use client";

import { ReactorProvider } from "@reactor-team/js-sdk";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { CampaignPanel } from "@/components/studio/campaign-panel";
import { ContinuationStage } from "@/components/studio/continuation-stage";
import { SourceClipPanel } from "@/components/studio/source-clip-panel";
import { useLiveContinuation } from "@/hooks/use-live-continuation";
import { ORBIS_MODEL_NAME, ORBIS_TRACKS, requestReactorJwt } from "@/lib/orbis";
import {
  audienceProfiles,
  campaigns,
  filmTitles,
  storyBeats,
  type Campaign,
  type StoryBeat,
} from "@/lib/studio-data";

type WorkspaceSection = "studio" | "library" | "campaigns" | "audit";

type PreparedRun = {
  runId: string;
  prompt: string;
  preparedAt: string;
};

export function StudioApp() {
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
      <StudioWorkspace clearJwt={clearJwt} />
    </ReactorProvider>
  );
}

function StudioWorkspace({ clearJwt }: { clearJwt: () => void }) {
  const session = useLiveContinuation(clearJwt);
  const [section, setSection] = useState<WorkspaceSection>("studio");
  const [titleId, setTitleId] = useState(filmTitles[0].id);
  const [profileId, setProfileId] = useState(audienceProfiles[0].id);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [rationale, setRationale] = useState("");
  const [clipFile, setClipFile] = useState<File | null>(null);
  const [clipUrl, setClipUrl] = useState("");
  const [frameFile, setFrameFile] = useState<File | null>(null);
  const [framePreview, setFramePreview] = useState("");
  const [handoffTime, setHandoffTime] = useState(0);
  const [brandAsset, setBrandAsset] = useState<File | null>(null);
  const [preparedRun, setPreparedRun] = useState<PreparedRun | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");
  const [activity, setActivity] = useState<
    { id: string; label: string; detail: string; time: string }[]
  >([]);

  const title = useMemo(
    () => filmTitles.find((item) => item.id === titleId) ?? filmTitles[0],
    [titleId],
  );

  useEffect(() => {
    const controller = new AbortController();
    setCampaign(null);
    setRationale("");
    setWorkspaceError("");
    fetch(
      `/api/continuations/eligible?profileId=${encodeURIComponent(profileId)}&titleId=${encodeURIComponent(titleId)}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        const result = (await response.json()) as {
          campaign?: Campaign | null;
          rationale?: string;
          error?: string;
        };
        if (!response.ok) throw new Error(result.error ?? "Eligibility check failed.");
        setCampaign(result.campaign ?? null);
        setRationale(result.rationale ?? "");
      })
      .catch((caught) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setWorkspaceError(caught instanceof Error ? caught.message : String(caught));
      });
    return () => controller.abort();
  }, [profileId, titleId]);

  useEffect(() => {
    setBrandAsset(null);
    setPreparedRun(null);
  }, [campaign?.id]);

  useEffect(() => {
    return () => {
      if (clipUrl) URL.revokeObjectURL(clipUrl);
    };
  }, [clipUrl]);

  useEffect(() => {
    return () => {
      if (framePreview) URL.revokeObjectURL(framePreview);
    };
  }, [framePreview]);

  function addActivity(label: string, detail: string) {
    setActivity((current) => [
      {
        id: crypto.randomUUID(),
        label,
        detail,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      },
      ...current,
    ]);
  }

  function selectClip(file: File) {
    if (clipUrl) URL.revokeObjectURL(clipUrl);
    const nextUrl = URL.createObjectURL(file);
    setClipFile(file);
    setClipUrl(nextUrl);
    setFrameFile(null);
    setFramePreview("");
    setHandoffTime(0);
    setPreparedRun(null);
    addActivity("Clip loaded", file.name);
  }

  function selectTitle(nextTitleId: string) {
    if (nextTitleId === titleId) return;
    if (clipUrl) URL.revokeObjectURL(clipUrl);
    if (framePreview) URL.revokeObjectURL(framePreview);
    setTitleId(nextTitleId);
    setClipFile(null);
    setClipUrl("");
    setFrameFile(null);
    setFramePreview("");
    setHandoffTime(0);
    setPreparedRun(null);
  }

  function selectFrame(frame: { file: File; previewUrl: string; time: number }) {
    if (framePreview) URL.revokeObjectURL(framePreview);
    setFrameFile(frame.file);
    setFramePreview(frame.previewUrl);
    setHandoffTime(frame.time);
    setPreparedRun(null);
    addActivity("Handoff captured", `${title.title} at ${frame.time.toFixed(2)}s`);
  }

  async function startContinuation() {
    if (!campaign || !frameFile) {
      setWorkspaceError("Select a handoff frame and eligible campaign first.");
      return;
    }

    setPreparing(true);
    setWorkspaceError("");
    try {
      const response = await fetch("/api/continuations/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, titleId, campaignId: campaign.id }),
      });
      const result = (await response.json()) as PreparedRun & { error?: string };
      if (!response.ok || !result.prompt || !result.runId) {
        throw new Error(result.error ?? "Could not prepare the continuation.");
      }

      const conditionedFrame = await composePlacementFrame(
        frameFile,
        brandAsset,
        campaign,
      );
      setPreparedRun(result);
      addActivity("Run approved", `${campaign.brand} · ${campaign.placement.label}`);
      await session.startContinuation({ image: conditionedFrame, prompt: result.prompt });
      addActivity("Live continuation started", result.runId.slice(0, 8));
    } catch (caught) {
      setWorkspaceError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setPreparing(false);
    }
  }

  async function steer(beat: StoryBeat) {
    if (!preparedRun) return;
    try {
      await session.steer(`${preparedRun.prompt} ${beat.instruction}`);
      addActivity("Story beat accepted", beat.label);
    } catch {
      // The session hook exposes the correlated Reactor error in the stage.
    }
  }

  const auditEvents = [
    ...session.events.map((event, index) => ({
      id: `reactor-${index}-${event}`,
      label: event.replaceAll("_", " "),
      detail: "Reactor model event",
      time: "live",
    })),
    ...activity,
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand-mark" type="button" onClick={() => setSection("studio")}>
          <span className="brand-glyph" aria-hidden="true">O</span>
          <span>
            <strong>Orbis Ad</strong>
            <small>Continuity Studio</small>
          </span>
        </button>

        <nav aria-label="Primary navigation">
          <NavButton active={section === "studio"} label="Studio" marker="01" onClick={() => setSection("studio")} />
          <NavButton active={section === "library"} label="Title library" marker="02" onClick={() => setSection("library")} />
          <NavButton active={section === "campaigns"} label="Campaigns" marker="03" onClick={() => setSection("campaigns")} />
          <NavButton active={section === "audit"} label="Audit ledger" marker="04" onClick={() => setSection("audit")} />
        </nav>

        <div className="sidebar-foot">
          <div className="system-state">
            <span className={`connection-light ${session.connected ? "online" : ""}`} />
            <span>
              <strong>{session.connected ? "Reactor connected" : "Reactor standing by"}</strong>
              <small>Visko Orbis Stable</small>
            </span>
          </div>
          <p>Internal preview · authorized media only</p>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <span className="breadcrumb">HACKATHON / ORBIS-AD / {section.toUpperCase()}</span>
            <h1>{sectionTitle(section)}</h1>
          </div>
          <div className="topbar-actions">
            <span className="autosave">Local demo workspace</span>
            {session.connected && (
              <button className="button quiet" type="button" onClick={session.disconnectSession}>
                Disconnect
              </button>
            )}
            <div className="operator-avatar" aria-label="Operator Mian Abdullah">MA</div>
          </div>
        </header>

        {section === "studio" && (
          <>
            <section className="title-strip" aria-label="Selected title">
              <label>
                Licensed title
                <select value={titleId} onChange={(event) => selectTitle(event.target.value)}>
                  {filmTitles.map((item) => (
                    <option key={item.id} value={item.id}>{item.title} — {item.moment}</option>
                  ))}
                </select>
              </label>
              <div className="title-stat"><span>Handoff</span><strong>{title.timecode}</strong></div>
              <div className="title-stat"><span>Continuity</span><strong>{title.genre}</strong></div>
              <div className="title-stat"><span>Protected</span><strong>{title.continuity.protected.length} elements</strong></div>
              <span className="rights-badge">Rights cleared</span>
            </section>

            {(workspaceError || session.error) && (
              <p className="global-error" role="alert">{workspaceError || session.error}</p>
            )}

            <div className="studio-grid">
              <div className="setup-column">
                <SourceClipPanel
                  title={title}
                  clipUrl={clipUrl}
                  clipName={clipFile?.name ?? ""}
                  framePreview={framePreview}
                  handoffTime={handoffTime}
                  onClipSelected={selectClip}
                  onFrameCaptured={selectFrame}
                />
                <CampaignPanel
                  profiles={audienceProfiles}
                  selectedProfileId={profileId}
                  campaign={campaign}
                  rationale={rationale}
                  assetName={brandAsset?.name ?? ""}
                  onProfileChange={setProfileId}
                  onAssetSelected={(file) => {
                    setBrandAsset(file);
                    addActivity("Brand asset loaded", file.name);
                  }}
                />
              </div>
              <ContinuationStage
                session={session}
                campaign={campaign}
                framePreview={framePreview}
                preparing={preparing}
                runId={preparedRun?.runId ?? ""}
                prompt={preparedRun?.prompt ?? ""}
                storyBeats={storyBeats}
                onStart={startContinuation}
                onSteer={steer}
              />
            </div>
          </>
        )}

        {section === "library" && (
          <LibraryView selectedId={titleId} onSelect={(id) => { selectTitle(id); setSection("studio"); }} />
        )}
        {section === "campaigns" && <CampaignsView />}
        {section === "audit" && <AuditView events={auditEvents} />}
      </main>
    </div>
  );
}

function NavButton({
  active,
  label,
  marker,
  onClick,
}: {
  active: boolean;
  label: string;
  marker: string;
  onClick: () => void;
}) {
  return (
    <button className={`nav-button ${active ? "active" : ""}`} type="button" onClick={onClick}>
      <span>{marker}</span>
      {label}
    </button>
  );
}

function LibraryView({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  return (
    <section className="index-view">
      <div className="index-heading">
        <div><span className="eyebrow">Licensed catalog</span><h2>Continuation-ready moments</h2></div>
        <span>{filmTitles.length} approved clips</span>
      </div>
      <div className="library-grid">
        {filmTitles.map((title) => (
          <button key={title.id} className={`library-card ${selectedId === title.id ? "selected" : ""}`} type="button" onClick={() => onSelect(title.id)}>
            <span className="library-art" style={{ "--scene-accent": title.palette } as React.CSSProperties}><span>{title.title.slice(0, 1)}</span></span>
            <span className="library-copy"><small>{title.genre}</small><strong>{title.title}</strong><span>{title.moment} · {title.timecode}</span></span>
            <span className="library-state">Ready</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function CampaignsView() {
  return (
    <section className="index-view">
      <div className="index-heading">
        <div><span className="eyebrow">Brand inventory</span><h2>Approved campaigns</h2></div>
        <span>{campaigns.length} active</span>
      </div>
      <div className="campaign-table-wrap">
        <table className="campaign-table">
          <thead><tr><th>Brand</th><th>Campaign</th><th>Placement</th><th>Priority</th><th>Status</th></tr></thead>
          <tbody>
            {campaigns.map((campaign) => (
              <tr key={campaign.id}>
                <td><span className="table-brand" style={{ background: campaign.accent, color: campaign.ink }}>{campaign.brand.slice(0, 1)}</span><strong>{campaign.brand}</strong></td>
                <td>{campaign.campaign}</td><td>{campaign.placement.label}</td><td>{campaign.priority}</td><td><span className="table-status">Approved</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AuditView({ events }: { events: { id: string; label: string; detail: string; time: string }[] }) {
  return (
    <section className="index-view">
      <div className="index-heading">
        <div><span className="eyebrow">Immutable run history</span><h2>Audit ledger</h2></div>
        <span>{events.length} events this session</span>
      </div>
      <div className="audit-list">
        {events.length ? events.map((event) => (
          <div className="audit-row" key={event.id}><span className="audit-node" /><div><strong>{event.label}</strong><small>{event.detail}</small></div><time>{event.time}</time></div>
        )) : <div className="empty-ledger">No run events yet. Prepare a continuation in Studio.</div>}
      </div>
    </section>
  );
}

function sectionTitle(section: WorkspaceSection) {
  if (section === "library") return "Title library";
  if (section === "campaigns") return "Campaign inventory";
  if (section === "audit") return "Audit ledger";
  return "Activation studio";
}

async function composePlacementFrame(
  frame: File,
  asset: File | null,
  campaign: Campaign,
) {
  const source = await createImageBitmap(frame);
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare the placement frame.");

  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close();

  const zone = campaign.placement.zone;
  const x = zone.x * canvas.width;
  const y = zone.y * canvas.height;
  const width = zone.width * canvas.width;
  const height = zone.height * canvas.height;
  context.save();
  context.fillStyle = campaign.accent;
  context.globalAlpha = 0.9;
  context.fillRect(x, y, width, height);
  context.globalAlpha = 1;

  if (asset) {
    const artwork = await createImageBitmap(asset);
    const scale = Math.min(width / artwork.width, height / artwork.height) * 0.78;
    const drawWidth = artwork.width * scale;
    const drawHeight = artwork.height * scale;
    context.drawImage(
      artwork,
      x + (width - drawWidth) / 2,
      y + (height - drawHeight) / 2,
      drawWidth,
      drawHeight,
    );
    artwork.close();
  } else {
    context.fillStyle = campaign.ink;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `600 ${Math.max(22, Math.floor(width / 7))}px Arial`;
    context.fillText(campaign.brand, x + width / 2, y + height / 2, width * 0.84);
  }
  context.restore();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => value ? resolve(value) : reject(new Error("Could not encode the placement frame.")),
      "image/jpeg",
      0.94,
    );
  });
  return new File([blob], `${campaign.id}-conditioned-handoff.jpg`, { type: "image/jpeg" });
}
