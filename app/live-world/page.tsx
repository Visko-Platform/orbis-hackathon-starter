import type { Metadata } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import "../family-world.css";
import { LiveWorld } from "../components/LiveWorld";
import { LiveWorldSession } from "../components/LiveWorldSession";
import { isSeedMemoryId } from "../lib/live-world-scenes";

const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-schibsted",
});

export const metadata: Metadata = {
  title: "Live World",
};

// "Live World" design import (Claude Design project 868bef8e) — presenter-
// facing live-generation viewer, sibling to /add-family and
// /explore-grandmas-world from the same import. Public route: /live-world
// is unmatched by proxy.ts (unlike /add-family and /session, which are
// gated). The grandmother example cards on / link here with
// ?memoryId=<seed id> to steer that person's panorama scene.
//
// `memoryId` picks which experience renders: one of the 3 curated seeds in
// lib/live-world-scenes.ts (or none at all) gets LiveWorld.tsx's local-timer
// simulation with its hand-written historical narration; anything else — an
// AddFamily-created memory — gets <LiveWorldSession>, a real Visko Orbis
// Stable session seeded from that memory's restored photo + grounded
// prompt. isSeedMemoryId lives in that plain lib module rather than in
// LiveWorld.tsx itself because LiveWorld.tsx is "use client" — a Server
// Component page can render a client component but can't call a plain
// function exported from one (that 500s in production: "Attempted to call
// isSeedMemoryId() from the server but isSeedMemoryId is on the client").
// No proxy.ts change needed for the real path: it mints its Reactor token
// via the already-gated /api/reactor/token, and sessionStorage's
// per-browser locality means only the presenter's own browser (via the
// gated /add-family) ever has a memory to autostart from.
export default async function LiveWorldPage({
  searchParams,
}: {
  searchParams: Promise<{ memoryId?: string }>;
}) {
  const { memoryId } = await searchParams;
  return (
    <div className={`family-world live-world-theme ${schibsted.variable}`}>
      <nav className="fw-nav" style={{ paddingInline: "clamp(20px, 5vw, 72px)" }}>
        <a href="/" className="fw-nav-brand" style={{ color: "var(--color-text)", textDecoration: "none", fontSize: 18 }}>
          Family World
        </a>
        <span
          style={{
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--color-neutral-700)",
            marginLeft: "auto",
            marginRight: "var(--space-4)",
          }}
        >
          Live · Visko Orbis via Reactor
        </span>
        <a href="/" className="fw-btn fw-btn-ghost" style={{ whiteSpace: "nowrap" }}>
          ← Exit world
        </a>
      </nav>

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "0 clamp(20px, 5vw, 72px)",
          maxWidth: 1280,
          width: "100%",
          margin: "0 auto",
        }}
      >
        {!memoryId || isSeedMemoryId(memoryId) ? (
          <LiveWorld memoryId={memoryId} />
        ) : (
          <LiveWorldSession memoryId={memoryId} />
        )}
      </main>

      <footer
        style={{
          borderTop: "2px solid var(--color-divider)",
          padding: "20px clamp(20px, 5vw, 72px)",
          fontSize: 13,
          color: "var(--color-neutral-700)",
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <span>Family World</span>
        <span>Presenter-controlled live session · one continuous take</span>
      </footer>
    </div>
  );
}
