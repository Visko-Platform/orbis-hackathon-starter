import { Archivo } from "next/font/google";
import { GoogleSignInButton } from "./components/GoogleSignInButton";
import { FamilyGallery } from "./components/FamilyGallery";
import "./family-world.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  variable: "--font-archivo",
});

// Public teaser landing — no login required to view it. "Family World"
// design import (Claude Design project 868bef8e). Only /session (and
// /api/reactor/token behind it) require the presenter's Google login —
// see middleware.ts. The sign-in control here is a convenience so the
// presenter doesn't have to hit the redirect wall first.
export default function Page() {
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
          className="hidden sm:inline"
        >
          Step into a family photograph
        </span>
        <a href="/explore-grandmas-world" style={{ whiteSpace: "nowrap" }}>
          Explore Grandma&apos;s World
        </a>
        <a href="/add-family" style={{ whiteSpace: "nowrap" }}>
          Add your family
        </a>
        <a
          href="/add-family"
          className="fw-btn fw-btn-primary"
          style={{ justifyContent: "flex-start", whiteSpace: "nowrap" }}
        >
          Add someone
        </a>
        <GoogleSignInButton />
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
            padding: "56px 0 42px",
            alignItems: "end",
          }}
        >
          <h1
            style={{
              fontSize: "clamp(38px, 5.4vw, 76px)",
              lineHeight: 1.04,
              margin: "0 0 0 -0.05em",
            }}
          >
            Enter your family&apos;s memories
          </h1>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: "52ch" }}>
            <p style={{ fontSize: 16, lineHeight: "28px", margin: 0 }}>
              One photograph of a relative becomes a living, steerable world.
              Walk from their home to the market, hear the story narrated, and
              steer where it goes next.
            </p>
            <p
              style={{
                fontSize: 16,
                lineHeight: "28px",
                margin: 0,
                color: "var(--color-neutral-700)",
              }}
            >
              Three example relatives are here to start. Add your own from a
              single family photo.
            </p>
          </div>
        </section>

        <hr className="fw-hr" />

        <FamilyGallery />
      </main>

      <section style={{ background: "var(--color-accent)", color: "var(--color-bg)" }}>
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "56px clamp(20px, 5vw, 72px)",
            display: "flex",
            flexDirection: "column",
            gap: 24,
            alignItems: "flex-start",
          }}
        >
          <h2
            style={{
              fontSize: "clamp(34px, 4.2vw, 56px)",
              lineHeight: 1.06,
              margin: "0 0 0 -0.05em",
              color: "var(--color-bg)",
            }}
          >
            Lola. Enter her world. Market. Home. Exit. Someone else.
          </h2>
          <a
            href="#add"
            className="fw-btn fw-btn-ghost"
            style={{
              color: "var(--color-bg)",
              border: "1px solid var(--color-bg)",
              padding: "12px 18px",
              whiteSpace: "nowrap",
            }}
          >
            Add your own relative
          </a>
        </div>
      </section>

      <footer
        style={{
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
        <span>Live worlds are presenter-controlled — powered by Visko Orbis via Reactor</span>
      </footer>
    </div>
  );
}
