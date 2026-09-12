"use client";

import { useEffect, useState, type RefObject } from "react";

/** How often to look for the player's <video> until it exists. */
const FIND_MS = 200;

type FrameCallbackVideo = HTMLVideoElement & { requestVideoFrameCallback?: (callback: () => void) => number };

/**
 * True once the <video> inside `container` has painted a real frame. A live
 * WebRTC stream reports that it is playing before any picture arrives, so
 * this waits for a presented frame (requestVideoFrameCallback where the
 * browser has it, else the first loadeddata or timeupdate) and never flips
 * back. While `active` is false nothing is watched.
 */
export function useFirstFrame(container: RefObject<HTMLElement | null>, active: boolean): boolean {
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (!active || seen) return;
    let cancelled = false;
    let video: HTMLVideoElement | null = null;
    const mark = () => { if (!cancelled) setSeen(true); };
    const events = ["loadeddata", "timeupdate"] as const;
    const attach = (found: FrameCallbackVideo) => {
      video = found;
      if (found.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && found.currentTime > 0) { mark(); return; }
      for (const name of events) found.addEventListener(name, mark);
      found.requestVideoFrameCallback?.(mark);
    };
    const finder = setInterval(() => {
      const found = container.current?.querySelector("video");
      if (found) { clearInterval(finder); attach(found); }
    }, FIND_MS);
    return () => {
      cancelled = true;
      clearInterval(finder);
      if (video) for (const name of events) video.removeEventListener(name, mark);
    };
  }, [active, seen, container]);

  return seen;
}
