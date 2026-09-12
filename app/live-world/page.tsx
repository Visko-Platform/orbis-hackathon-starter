import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "../family-world.css";
import { LiveWorld, isSeedMemoryId } from "../components/LiveWorld";
import { LiveWorldSession } from "../components/LiveWorldSession";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  variable: "--font-archivo",
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
// `memoryId` picks which experience renders: one of LiveWorld.tsx's 3
// curated seeds (or none at all) gets the local-timer simulation with its
// hand-written historical narration; anything else — an AddFamily-created
// memory — gets <LiveWorldSession>, a real Visko Orbis Stable session seeded
// from that memory's restored photo + grounded prompt. No proxy.ts change
// needed for the real path: it mints its Reactor token via the
// already-gated /api/reactor/token, and sessionStorage's per-browser
// locality means only the presenter's own browser (via the gated
// /add-family) ever has a memory to autostart from.
export default async function LiveWorldPage({
  searchParams,
}: {
  searchParams: Promise<{ memoryId?: string }>;
}) {
  const { memoryId } = await searchParams;
  const useSimulatedSeed = !memoryId || isSeedMemoryId(memoryId);
  return (
    <div className={`family-world ${archivo.variable}`}>
      <nav className="fw-nav" style={{ paddingInline: "clamp(20px, 5vw, 72px)" }}>
        <span className="fw-nav-brand">Family World</span>
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
        {useSimulatedSeed ? (
          <LiveWorld memoryId={memoryId} />
        ) : (
          <LiveWorldSession />
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
