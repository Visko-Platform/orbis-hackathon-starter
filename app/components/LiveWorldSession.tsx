"use client";

import { Suspense, useEffect, useState } from "react";
import { ViskoOrbisStableProvider } from "@reactor-models/visko-orbis-stable";
import { fetchReactorToken } from "../lib/visko";
import {
  loadFamilyMemory,
  type FamilyPhotoInput,
} from "../lib/family-memory-store";
import { StatusBadge } from "./StatusBadge";
import { MemoryAutostart } from "./MemoryAutostart";
import { EvolveScene } from "./EvolveScene";
import { Video } from "./Video";

// Video.tsx's default className carries three `lg:` modifiers that only
// resolve against /session's fitted-shell ancestor (ViskoOrbisStableApp.tsx's
// `lg:h-screen lg:overflow-hidden`). /live-world has no such ancestor, so
// this page passes the same string WITHOUT them — the panel keeps its 16:9
// box at every width instead of collapsing to the bare <video>'s intrinsic
// height at `lg`.
const SESSION_VIDEO_CLASSNAME =
  "relative aspect-video w-full overflow-hidden rounded-lg border border-zinc-800 bg-black";

// "pending" before the client-side localStorage read resolves (matches the
// first client render to the server's — see the effect below), then either
// the stored record or `null` once the lookup has actually run.
type MemoryHeader = "pending" | FamilyPhotoInput | null;

// Real Visko Orbis Stable session for an AddFamily-created memory, rendered
// by app/live-world/page.tsx whenever `?memoryId=` isn't one of LiveWorld.tsx's
// 3 curated seeds (see isSeedMemoryId there). Reuses the same primitives
// /session's ViskoOrbisStableApp is built from — StatusBadge (connect/status),
// MemoryAutostart (does its own localStorage lookup, uploads the anchor,
// starts the stream once connected), EvolveScene (free-form live steering) —
// composed for this page's single-memory focus instead of /session's
// free-roam playground (curated-scene picker, session options, audio panel,
// snap-clip: none of that applies to "resume this one family member's
// world").
//
// This component also reads the memory a second time, display-only, purely
// to render a header (kicker + title) mirroring LiveWorld.tsx's seed-branch
// header — MemoryAutostart remains the single owner of the actual start
// pipeline and keeps its own independent lookup.
//
// StatusBadge / MemoryAutostart / EvolveScene keep their own dark
// "embedded live monitor" Tailwind styling on purpose — same treatment
// /session already gives them — wrapped here in one deliberate dark surface
// (rounded-lg border-zinc-800 bg-zinc-950, matching Video's corner
// treatment) so they read as a designed control rail next to the video
// rather than stray cards on the light `.family-world` page.
export function LiveWorldSession({ memoryId }: { memoryId: string }) {
  const [memory, setMemory] = useState<MemoryHeader>("pending");

  useEffect(() => {
    // localStorage is unavailable during SSR, and reading it during render
    // would make the first client render disagree with the server's —
    // MemoryAutostart documents the same "pending" pattern for the same
    // reason.
    setMemory(loadFamilyMemory(memoryId));
  }, [memoryId]);

  const resolved = memory !== "pending" ? memory : null;
  const kicker = resolved
    ? [
        resolved.person?.nameOrRelationship,
        resolved.place,
        resolved.time?.userText,
      ]
        .filter((v): v is string => !!v?.trim())
        .join(" · ")
    : "";
  const title = resolved?.person?.nameOrRelationship
    ? `${resolved.person.nameOrRelationship}, live`
    : "Their world, live";

  return (
    <ViskoOrbisStableProvider jwtToken={fetchReactorToken}>
      <section
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          padding: "36px 0 20px",
        }}
      >
        <span
          style={{
            fontSize: 13,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--color-accent-700)",
            minHeight: "1em",
          }}
        >
          {/* Neutral placeholder while the lookup is pending keeps this
           * render identical to the server's. */}
          {memory === "pending" ? " " : kicker || " "}
        </span>
        <h1
          style={{
            fontSize: "clamp(32px, 4.2vw, 56px)",
            lineHeight: 1.04,
            margin: "0 0 0 -0.04em",
          }}
        >
          {memory === "pending" ? " " : title}
        </h1>
      </section>

      <hr className="fw-hr" />

      <div className="grid grid-cols-1 gap-6 py-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <section className="min-w-0">
          <Video className={SESSION_VIDEO_CLASSNAME} />
        </section>
        <section className="flex min-w-0 flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <StatusBadge />
          <Suspense fallback={null}>
            <MemoryAutostart />
          </Suspense>
          <EvolveScene />
        </section>
      </div>
    </ViskoOrbisStableProvider>
  );
}
