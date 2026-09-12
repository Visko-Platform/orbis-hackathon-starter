"use client";

import { ReactorProvider } from "@reactor-team/js-sdk";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

import { OrbisPlayer } from "@/components/orbis-player";
import { useOrbisSession } from "@/hooks/use-orbis-session";
import { defeatPrompt, resolveHitPoints, STARTING_HP, type HitPoints } from "@/lib/battle-rules";
import { ORBIS_MODEL_NAME, ORBIS_TRACKS, requestReactorJwt } from "@/lib/orbis";

type Team = "crimson" | "azure";
type ChatMessage = { id: string; team: Team; text: string; round: number; name: string };
type Moves = { crimson: string; azure: string };
type Phase = "setup" | "planning" | "resolving" | "reveal" | "finished";

const ROUND_SECONDS = 30;
const REVEAL_SECONDS = 10;
const OPENING_PROMPT =
  "Animate this exact battle scene as one continuous cinematic shot. Keep the same two focal fighters, their positions, costumes, and battlefield. The left-side Crimson fighter and right-side Azure fighter face off, ready for the next move. Subtle motion, dramatic atmosphere, no cuts, no text, no new characters.";

export function OrbisDemo() {
  const jwtPromise = useRef<Promise<string> | null>(null);
  const getJwt = useCallback(() => {
    jwtPromise.current ??= requestReactorJwt().catch((error) => {
      jwtPromise.current = null;
      throw error;
    });
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
      <BattleArena clearJwt={clearJwt} />
    </ReactorProvider>
  );
}

function BattleArena({ clearJwt }: { clearJwt: () => void }) {
  const session = useOrbisSession(clearJwt);
  const [image, setImage] = useState<File | null>(null);
  const [posterUrl, setPosterUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("setup");
  const [round, setRound] = useState(1);
  const [remaining, setRemaining] = useState(ROUND_SECONDS);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [drafts, setDrafts] = useState<Moves>({ crimson: "", azure: "" });
  const [moves, setMoves] = useState<Moves>({ crimson: "Awaiting orders", azure: "Awaiting orders" });
  const [hp, setHp] = useState<HitPoints>({ crimson: STARTING_HP, azure: STARTING_HP });
  const [turnError, setTurnError] = useState("");
  const [imageBusy, setImageBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [battleContext, setBattleContext] = useState("");
  const resolvingRound = useRef<number | null>(null);

  useEffect(() => {
    if (!image) { setPosterUrl(""); return; }
    const url = URL.createObjectURL(image);
    setPosterUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  useEffect(() => {
    if (phase !== "setup" || !session.runStarted) return;
    setRemaining(ROUND_SECONDS);
    setPhase("planning");
  }, [phase, session.runStarted]);

  useEffect(() => {
    if (phase !== "planning") return;
    const timer = window.setInterval(() => setRemaining((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "reveal") return;
    const timer = window.setTimeout(() => {
      setRound((current) => current + 1);
      setRemaining(ROUND_SECONDS);
      setPhase("planning");
      resolvingRound.current = null;
    }, REVEAL_SECONDS * 1000);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "finished") return;
    const timer = window.setTimeout(() => void session.pause(), REVEAL_SECONDS * 1000);
    return () => window.clearTimeout(timer);
    // The final prompt plays before pausing the generation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const resolveTurn = useCallback(async () => {
    if (phase !== "planning" || resolvingRound.current === round) return;
    resolvingRound.current = round;
    setPhase("resolving");
    setTurnError("");
    try {
      const submissions = messages.filter((message) => message.round === round).map(({ team, text }) => ({ team, text }));
      if (!submissions.length) {
        const held = { crimson: "Hold position", azure: "Hold position" };
        setMoves(held);
        setPhase("reveal");
        return;
      }
      const response = await fetch("/api/battle-turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ round, submissions }),
      });
      const result = (await response.json()) as { moves?: Moves; scenePrompt?: string; error?: string };
      if (!response.ok || !result.moves || !result.scenePrompt) throw new Error(result.error || "Could not resolve the turn");
      const outcome = resolveHitPoints(hp, result.moves);
      const finalPrompt = `${result.scenePrompt} ${battleContext} Before this exchange, Crimson had ${hp.crimson} HP and Azure had ${hp.azure} HP. After the exchange, Crimson has ${outcome.hp.crimson} HP and Azure has ${outcome.hp.azure} HP. ${defeatPrompt(outcome.hp)} Keep the same two characters and one continuous shot.`;
      setMoves(result.moves);
      setHp(outcome.hp);
      setPhase(outcome.hp.crimson === 0 || outcome.hp.azure === 0 ? "finished" : "reveal");
      void session.steerPrompt(finalPrompt).catch((caught) => {
        const message = caught instanceof Error ? caught.message : String(caught);
        setTurnError(`Turn resolved, but Orbis did not update the video: ${message}`);
      });
    } catch (error) {
      setTurnError(error instanceof Error ? error.message : String(error));
      setRemaining(10);
      setPhase("planning");
      resolvingRound.current = null;
    }
  }, [phase, round, session, hp, messages, battleContext]);

  useEffect(() => {
    if (phase === "planning" && remaining === 0) void resolveTurn();
  }, [phase, remaining, resolveTurn]);

  const submit = (team: Team, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = drafts[team].trim();
    if (!text || (phase !== "setup" && phase !== "planning")) return;
    setDrafts((current) => ({ ...current, [team]: "" }));
    setMessages((current) => [...current, { id: crypto.randomUUID(), team, text, round: phase === "setup" ? 0 : round, name: "Host" }]);
  };

  const startBattle = () => {
    if (image) session.beginBattle(image, `${OPENING_PROMPT} ${battleContext}`);
  };

  const generateBattlefield = async () => {
    setImageBusy(true);
    setTurnError("");
    try {
      const response = await fetch("/api/battle-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crimsonIdeas: messages.filter((message) => message.round === 0 && message.team === "crimson").slice(-12).map((message) => message.text),
          azureIdeas: messages.filter((message) => message.round === 0 && message.team === "azure").slice(-12).map((message) => message.text),
        }),
      });
      const result = await response.json() as {
        image?: string;
        stage?: string;
        characters?: Moves;
        error?: string;
      };
      if (!response.ok || !result.image || !result.stage || !result.characters) {
        throw new Error(result.error || "Could not generate the battlefield image");
      }
      const blob = await (await fetch(result.image)).blob();
      const extension = blob.type === "image/jpeg" ? "jpg" : "png";
      setImage(new File([blob], `arena-opening.${extension}`, { type: blob.type || "image/png" }));
      setStage(result.stage);
      setBattleContext(`The same stage is ${result.stage}. The Crimson fighter is ${result.characters.crimson}. The Azure fighter is ${result.characters.azure}.`);
    } catch (caught) {
      setTurnError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setImageBusy(false);
    }
  };

  const disconnectBattle = () => {
    setPhase("setup");
    setRound(1);
    setRemaining(ROUND_SECONDS);
    setMessages([]);
    setMoves({ crimson: "Awaiting orders", azure: "Awaiting orders" });
    setHp({ crimson: STARTING_HP, azure: STARTING_HP });
    resolvingRound.current = null;
    setStage("");
    setBattleContext("");
    setImage(null);
    void session.disconnectSession();
  };

  const hasCrimsonIdea = messages.some((message) => message.round === 0 && message.team === "crimson");
  const hasAzureIdea = messages.some((message) => message.round === 0 && message.team === "azure");
  const characterIdea = (team: Team) => messages.filter((message) => message.round === 0 && message.team === team).slice(-2).map((message) => message.text).join(" · ") || "Awaiting fighter ideas";

  return (
    <section className="arena">
      <div className="arena-topline">
        <div className="brand"><span className="brand-mark">✦</span> ARENA <span className="brand-sub">/ LIVE BATTLE</span></div>
        <div className="topline-actions"><span className="live-dot" /> {session.runStarted ? "LIVE SESSION" : session.controlsBusy ? "CONNECTING ORBIS" : phase === "setup" ? "CHARACTER CREATION" : "VIDEO SESSION ENDED"} {session.connected && <button className="text-button" onClick={disconnectBattle}>Disconnect</button>}</div>
      </div>

      <div className="battle-grid">
        <TeamPanel team="crimson" title="The Crimson Order" hp={hp.crimson} move={phase === "setup" ? characterIdea("crimson") : moves.crimson} messages={messages.filter((message) => message.team === "crimson")} draft={drafts.crimson} onDraft={(value) => setDrafts((current) => ({ ...current, crimson: value }))} onSubmit={(event) => submit("crimson", event)} disabled={phase !== "setup" && phase !== "planning"} setup={phase === "setup"} />
        <div className="battle-center">
          <div className="battle-video"><OrbisPlayer connected={session.connected} muted={session.muted} runStarted={session.runStarted} status={session.status} statusLabel={phase === "setup" && image && session.status === "disconnected" && !session.error ? "IMAGE READY" : undefined} posterUrl={posterUrl} placeholder={phase === "setup" ? "Waiting for character ideas and battlefield image" : undefined} /><div className="video-caption"><span className="caption-sigil">✧</span> THE BATTLEFIELD <span className="caption-right">{stage ? stage.toUpperCase() : "ONE CONTINUOUS SCENE"}</span></div></div>
          {phase === "setup" ? (
            <div className="setup-bar">
              <button className="primary-button" disabled={!hasCrimsonIdea || !hasAzureIdea || imageBusy} onClick={() => void generateBattlefield()}>{imageBusy ? "Generating battlefield…" : image ? "Regenerate battlefield" : "Generate battlefield"}</button>
              <button className="primary-button" disabled={!image || session.controlsBusy || imageBusy} onClick={startBattle}>{session.controlsBusy ? "Connecting Orbis…" : "Begin battle →"}</button>
              <span>{stage ? `Random stage: ${stage}. ` : ""}Each team must submit a fighter idea before image generation. The opening image keeps both fighters in a 16:9 frame.</span>
            </div>
          ) : <div className="battle-toolbar"><span>{phase === "planning" ? "Teams are choosing their next moves" : phase === "resolving" ? "Combining team chat into moves…" : phase === "finished" ? "Match over — a fighter has fallen" : "The battlefield is changing"}</span><button className="small-button" onClick={session.toggleMuted}>{session.muted ? "Unmute" : "Mute"}</button><button className="primary-button" disabled={phase !== "planning"} onClick={() => void resolveTurn()}>Resolve turn →</button></div>}
          {(session.error || turnError) && <p className="arena-error">{session.error || turnError}</p>}
        </div>
        <TeamPanel team="azure" title="The Azure Legion" hp={hp.azure} move={phase === "setup" ? characterIdea("azure") : moves.azure} messages={messages.filter((message) => message.team === "azure")} draft={drafts.azure} onDraft={(value) => setDrafts((current) => ({ ...current, azure: value }))} onSubmit={(event) => submit("azure", event)} disabled={phase !== "setup" && phase !== "planning"} setup={phase === "setup"} />
      </div>
      <div className="arena-footer"><span>✦ POWERED BY ORBIS STABLE</span><span>ATTACK 18 DMG · GUARD 12 DMG / BLOCK 7</span><span>ROUND {String(round).padStart(2, "0")}</span></div>
    </section>
  );
}

function TeamPanel({ team, title, hp, move, messages, draft, onDraft, onSubmit, disabled, setup }: { team: Team; title: string; hp: number; move: string; messages: ChatMessage[]; draft: string; onDraft: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; disabled: boolean; setup: boolean }) {
  return <div className={`team-column ${team}`}>
    <div className="team-header"><span className="team-icon">{team === "crimson" ? "⚔" : "✧"}</span><div><small>{team === "crimson" ? "TEAM 01" : "TEAM 02"}</small><h2>{title}</h2></div><span className="team-led" /></div>
    <div className="hp-card"><div className="hp-label"><span>HEALTH POINTS</span><strong>{hp} / {STARTING_HP} HP</strong></div><div className="hp-track"><div style={{ width: `${hp}%` }} /></div>{hp === 0 && <span className="defeated-label">DEFEATED</span>}</div>
    <div className="move-card"><div className="card-heading"><span>◆</span> {setup ? "FIGHTER CONCEPT" : "CURRENT MOVE"} <span className="card-index">{setup ? "CREATE" : "01 / ACTION"}</span></div><p>{move}</p></div>
    <div className="chat-panel"><div className="chat-title"><span>{setup ? "CHARACTER CHAT" : "TEAM CHAT"}</span><span>{messages.length} MESSAGES</span></div><div className="chat-scroll">{messages.length ? messages.slice(-15).map((message) => <div className="chat-message" key={message.id}><span className="chat-avatar">{team === "crimson" ? "C" : "A"}</span><div><strong>{message.name} <small>{message.round === 0 ? "CHARACTER" : `R${message.round}`}</small></strong><p>{message.text}</p></div></div>) : <div className="empty-chat">{setup ? "Describe your team’s fighter to create the opening image." : "No messages yet. Suggest your team’s next move."}</div>}</div><form className="chat-form" onSubmit={onSubmit}><input value={draft} maxLength={240} disabled={disabled} onChange={(event) => onDraft(event.target.value)} placeholder={disabled ? "Chat opens next round" : setup ? "Describe your fighter…" : "Suggest a move…"} aria-label={`${title} message`} /><button disabled={disabled || !draft.trim()} aria-label={`Send ${title} message`}>↗</button></form></div>
  </div>;
}
