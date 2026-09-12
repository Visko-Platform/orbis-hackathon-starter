import type { Metadata } from "next";

import { LifeDashboard } from "@/components/life-dashboard";
import { loadScenario } from "@/lib/sim/scenarios";

export const metadata: Metadata = {
  title: "Teaching AI how to live",
  description: "A live, closed-loop life simulation powered by Orbis.",
};

export default function LifePage() {
  return <LifeDashboard scenario={loadScenario("new-in-sf-v2")} />;
}
