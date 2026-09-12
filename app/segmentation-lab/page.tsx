import type { Metadata } from "next";

import { SegmentationLab } from "./segmentation-lab";

export const metadata: Metadata = {
  title: "Orbis DeepLab-v3 profiler",
  description: "Live semantic segmentation and performance profiling for Orbis.",
};

export default function SegmentationLabPage() {
  return <SegmentationLab />;
}
