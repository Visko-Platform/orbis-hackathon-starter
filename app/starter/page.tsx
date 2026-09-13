import Link from "next/link";

import { OrbisDemo } from "@/components/orbis-demo";

export const metadata = {
  title: "Orbis starter reference",
};

export default function StarterPage() {
  return (
    <main>
      <header>
        <p className="eyebrow">Reference</p>
        <h1>Orbis starter</h1>
        <p>
          The original minimal starter: connect, generate a continuous live
          video, then steer it by changing the prompt while it runs.{" "}
          <Link href="/">Back to the Manipulation Lab</Link>.
        </p>
      </header>
      <OrbisDemo />
    </main>
  );
}
