import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "../family-world.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  variable: "--font-archivo",
});

export const metadata: Metadata = {
  title: "Explore Grandma's World",
};

type Memory = {
  id: string;
  person: string;
  relationship: string;
  place: string;
  year: string;
  memory: string;
  photo: string;
  video: string;
  liveMemoryId: string;
};

// Same three seed relatives as the FamilyGallery on "/", paired with the
// raw memory-video footage for each place. `liveMemoryId` is the matching
// key in LiveWorld.tsx's SCENES map (written as literals, not derived from
// `id`, so a future rename on either side fails loudly instead of silently
// falling through to the live-session branch).
const MEMORIES: Memory[] = [
  {
    id: "lola",
    person: "Lola",
    relationship: "My grandmother",
    place: "Cavite City, Philippines",
    year: "1953",
    memory:
      "She ran a small sari-sari store on the corner and knew everyone who passed by.",
    photo: "/images/cavite-1953.jpg",
    video: "/videos/cavite_city.mp4",
    liveMemoryId: "seed-lola",
  },
  {
    id: "yay",
    person: "Yay",
    relationship: "My great-grandmother",
    place: "Phnom Penh, Cambodia",
    year: "1964",
    memory:
      "She crossed the wide boulevard barefoot on her way to school every morning.",
    photo: "/images/phnom-penh-1964.jpg",
    video: "/videos/phnom_penh.mp4",
    liveMemoryId: "seed-yay",
  },
  {
    id: "babushka",
    person: "Babushka",
    relationship: "My babushka",
    place: "Leningrad, USSR",
    year: "1980s",
    memory: "She rode the tram past the old bell tower on her way to school.",
    photo: "/images/leningrad-1980s.jpg",
    video: "/videos/leningrad.mp4",
    liveMemoryId: "seed-babushka",
  },
];

export default function ExploreGrandmasWorldPage() {
  return (
    <div className={`family-world ${archivo.variable}`}>
      <nav className="fw-nav" style={{ paddingInline: "clamp(20px, 5vw, 72px)" }}>
        <span className="fw-nav-brand">Family World</span>
        <a href="/">← Back home</a>
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
        <section style={{ padding: "56px 0 42px" }}>
          <span
            style={{
              fontSize: 13,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--color-accent-700)",
            }}
          >
            Living memories
          </span>
          <h1
            style={{
              fontSize: "clamp(38px, 5.4vw, 76px)",
              lineHeight: 1.04,
              margin: "8px 0 0 -0.05em",
            }}
          >
            Explore Grandma&apos;s World
          </h1>
          <p style={{ fontSize: 16, lineHeight: "28px", maxWidth: "56ch", marginTop: 14 }}>
            One photograph became a place you can watch move. Here&apos;s the
            footage generated for each relative in the family gallery.
          </p>
        </section>

        <hr className="fw-hr" />

        <section
          style={{
            padding: "28px 0 56px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))",
            gap: 3,
          }}
        >
          {MEMORIES.map((m) => (
            <article
              key={m.id}
              style={{
                display: "flex",
                flexDirection: "column",
                background: "var(--color-surface)",
                borderTop: "2px solid var(--color-text)",
              }}
            >
              <div style={{ aspectRatio: "4 / 3", background: "var(--color-neutral-900)" }}>
                <video
                  controls
                  playsInline
                  poster={m.photo}
                  preload="none"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                >
                  <source src={m.video} type="video/mp4" />
                </video>
              </div>
              <div style={{ padding: "16px 16px 18px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                <h3 style={{ fontSize: 24, margin: 0 }}>{m.person}</h3>
                <p style={{ fontSize: 13, lineHeight: "20px", margin: 0, color: "var(--color-neutral-700)" }}>
                  {m.relationship} · {m.place} · {m.year}
                </p>
                <p style={{ fontSize: 15, lineHeight: "24px", margin: "6px 0 0" }}>{m.memory}</p>
                <div style={{ marginTop: "auto", paddingTop: 14 }}>
                  <a
                    href={`/live-world?memoryId=${encodeURIComponent(m.liveMemoryId)}`}
                    className="fw-btn fw-btn-primary"
                    style={{ justifyContent: "flex-start", whiteSpace: "nowrap", alignSelf: "flex-start" }}
                  >
                    Enter their live world →
                  </a>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>

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
