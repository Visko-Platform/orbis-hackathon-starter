import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "../family-world.css";
import { LiveWorld } from "../components/LiveWorld";

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
// is unmatched by proxy.ts, same as /, /add-family, and
// /explore-grandmas-world.
export default function LiveWorldPage() {
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
        <LiveWorld />
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
