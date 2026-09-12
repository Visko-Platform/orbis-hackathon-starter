import { OrbisDemo } from "@/components/orbis-demo";

export default function Home() {
  return (
    <main>
      <header>
        <p className="eyebrow">Dreams to Reality</p>
        <h1>Bring your imagination to life.</h1>
        <p>
          Shape a living visual world with AI. Start with a prompt, then guide
          the scene in real time as it unfolds.
        </p>
      </header>
      <OrbisDemo />
    </main>
  );
}
