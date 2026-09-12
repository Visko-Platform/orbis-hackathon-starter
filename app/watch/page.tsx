import type { Metadata } from "next";

import { WatchPage } from "@/components/watch/watch-page";

import "./watch.css";

export const metadata: Metadata = {
  title: "Sintel — Official Trailer (Open Movie) · ViewTube",
  description: "A viewer's watch page with an interactive ad break, for demonstrating Orbis Ad.",
};

export default function Watch() {
  return <WatchPage />;
}
