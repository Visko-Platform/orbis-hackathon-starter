import type { CSSProperties } from "react";

const paths = {
  play: "m9 5 11 7-11 7Z",
  pause: "M8 5v14M16 5v14",
  stop: "M6 6h12v12H6z",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  upload: "M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5",
  spark: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z",
  film: "M4 4h16v16H4zM4 9h16M4 15h16M9 4v16M15 4v16",
  layers: "m12 3 10 5-10 5L2 8Zm-10 9 10 5 10-5M2 17l10 5 10-5",
  clock: "M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  check: "m5 12 4 4L19 6",
  expand: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5",
  audio: "m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14",
  mute: "m11 4-6 5H2v6h3l6 5ZM16 9l6 6m0-6-6 6",
  close: "m6 6 12 12M6 18 18 6",
  download: "M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4",
  image: "M3 3h18v18H3zM3 16l5-5 4 4 3-3 6 6M8 7h.01",
  chevron: "m8 5 7 7-7 7",
  refresh: "M3 11a9 9 0 0 1 15-7l3 3m0-5v5h-5M21 13a9 9 0 0 1-15 7l-3-3m0 5v-5h5",
};
export function Icon({ name, size = 18, style }: { name: keyof typeof paths; size?: number; style?: CSSProperties }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={style}><path d={paths[name]} /></svg>;
}
