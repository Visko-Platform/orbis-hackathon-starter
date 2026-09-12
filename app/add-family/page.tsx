import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "../family-world.css";
import { AddFamily } from "../components/AddFamily";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  variable: "--font-archivo",
});

export const metadata: Metadata = {
  title: "Add your family",
};

// "Add Family" design import (Claude Design project 868bef8e) — a fuller,
// multi-photo alternative to the single-photo "Add someone" tile inline on
// the front page (FamilyGallery.tsx). Public route: /add-family is
// unmatched by middleware.ts, same as / and /explore-grandmas-world.
export default function AddFamilyPage() {
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
          Add your family
        </span>
        <a href="/" className="fw-btn fw-btn-ghost" style={{ whiteSpace: "nowrap" }}>
          ← Back to the family
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
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "28px clamp(24px, 4vw, 72px)",
            padding: "48px 0 36px",
            alignItems: "end",
          }}
        >
          <h1
            style={{
              fontSize: "clamp(36px, 5vw, 68px)",
              lineHeight: 1.04,
              margin: "0 0 0 -0.05em",
            }}
          >
            Add your family
          </h1>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: "52ch" }}>
            <p style={{ fontSize: 16, lineHeight: "28px", margin: 0 }}>
              <strong>Add a few family photographs and tell us what you know.</strong>
            </p>
            <p
              style={{
                fontSize: 16,
                lineHeight: "28px",
                margin: 0,
                color: "var(--color-neutral-700)",
              }}
            >
              A place, an approximate year, and even a small memory are enough to begin.
              Family World uses those fragments to reconstruct a world you can explore.
            </p>
          </div>
        </section>

        <hr className="fw-hr" />

        <AddFamily />
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
        <span>We&apos;ll prepare each photograph for the world.</span>
      </footer>
    </div>
  );
}
