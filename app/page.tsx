import Link from "next/link";

import { ManipulationLab } from "@/components/manipulation-lab";

export default function Home() {
  return (
    <main className="lab-main">
      <header>
        <p className="eyebrow">Synthetic manipulation data · Visko Orbis Stable</p>
        <h1>Manipulation Lab</h1>
        <p>
          Pick a robot and a task, generate the start frame it acts on, and let
          the director steer Orbis through the manipulation one chunk at a time
          — checking each phase against what is actually on screen before it
          moves on. Out the back: a minute-long episode and a manifest.{" "}
          <Link href="/starter">Starter reference →</Link>
        </p>
      </header>
      <ManipulationLab />
    </main>
  );
}
