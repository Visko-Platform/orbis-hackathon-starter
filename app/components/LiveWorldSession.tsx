"use client";

import { Suspense } from "react";
import { ViskoOrbisStableProvider } from "@reactor-models/visko-orbis-stable";
import { fetchReactorToken } from "../lib/visko";
import { StatusBadge } from "./StatusBadge";
import { MemoryAutostart } from "./MemoryAutostart";
import { EvolveScene } from "./EvolveScene";
import { Video } from "./Video";

// Real Visko Orbis Stable session for an AddFamily-created memory, rendered
// by app/live-world/page.tsx whenever `?memoryId=` isn't one of LiveWorld.tsx's
// 3 curated seeds (see isSeedMemoryId there). Reuses the same primitives
// /session's ViskoOrbisStableApp is built from — StatusBadge (connect/status),
// MemoryAutostart (reads the memory MemoryAutostart's own sessionStorage
// lookup, uploads the anchor, starts the stream once connected), EvolveScene
// (free-form live steering) — composed for this page's single-memory focus
// instead of /session's free-roam playground (curated-scene picker, session
// options, audio panel, snap-clip: none of that applies to "resume this one
// family member's world").
//
// These panels keep their own dark Tailwind styling rather than the
// family-world.css light theme the rest of this page uses — same
// "embedded live monitor" treatment /session already gives them.
export function LiveWorldSession() {
  return (
    <ViskoOrbisStableProvider jwtToken={fetchReactorToken}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)",
          gap: "24px clamp(24px, 4vw, 56px)",
          padding: "24px 0 48px",
        }}
      >
        <section style={{ gridColumn: "1 / -1", minWidth: 0 }}>
          <Video />
        </section>
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            gridColumn: "1 / -1",
            maxWidth: 420,
          }}
        >
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
