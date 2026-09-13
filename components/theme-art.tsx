"use client";

import type { ReactElement } from "react";

import type { ThemeId } from "@/lib/dream-style";

/**
 * The same tiny scene — sun, hills, a tree, a little round friend — drawn
 * eight ways, so a kid sees the look instead of reading its name.
 *
 * One shared composition across all eight: sun top-left, friend dead center,
 * tree right, horizon at two-thirds. Keep every style on these coordinates.
 */

const BOX = { viewBox: "0 0 160 120", preserveAspectRatio: "xMidYMid slice" } as const;

const SUN = { x: 30, y: 28, r: 13 };
const FRIEND = { x: 80, y: 82, r: 14 };
const TREE = { x: 127, y: 54, r: 15, trunkX: 124, trunkY: 58, trunkW: 6, trunkH: 32 };

const FAR = "M0 82 Q30 56 66 78 Q98 58 126 76 Q144 84 160 78 L160 120 L0 120 Z";
const NEAR = "M0 96 Q38 78 82 94 Q116 84 160 92 L160 120 L0 120 Z";

function Face({ x, y, ink, w = 1.6 }: { x: number; y: number; ink: string; w?: number }) {
  return (
    <g>
      <circle cx={x - 4.5} cy={y - 3} r="1.9" fill={ink} />
      <circle cx={x + 4.5} cy={y - 3} r="1.9" fill={ink} />
      <path d={`M${x - 4.5} ${y + 3.4} q4.5 3.6 9 0`} fill="none" stroke={ink} strokeWidth={w} strokeLinecap="round" />
    </g>
  );
}

function PictureBook() {
  return (
    <svg {...BOX} className="sb-art-svg">
      <defs>
        <filter id="pb-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer><feFuncA type="linear" slope="0.12" /></feComponentTransfer>
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <rect width="160" height="120" fill="#fdf6e8" />
      <circle cx={SUN.x} cy={SUN.y} r={SUN.r + 1} fill="#ffd166" />
      <path d={FAR} fill="#cfe6ff" />
      <path d={NEAR} fill="#7fc8a9" />
      <rect x={TREE.trunkX} y={TREE.trunkY} width={TREE.trunkW} height={TREE.trunkH} rx="3" fill="#2b2350" opacity=".72" />
      <circle cx={TREE.x} cy={TREE.y} r={TREE.r} fill="#3fae87" />
      <circle cx={FRIEND.x} cy={FRIEND.y} r={FRIEND.r} fill="#ff5d73" />
      <Face x={FRIEND.x} y={FRIEND.y - 1} ink="#2b2350" />
      <rect width="160" height="120" filter="url(#pb-grain)" opacity=".5" />
    </svg>
  );
}

function Crayon() {
  return (
    <svg {...BOX} className="sb-art-svg">
      <defs>
        <filter id="cr-wax">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="cr-tooth">
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer><feFuncA type="linear" slope="0.3" /></feComponentTransfer>
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <rect width="160" height="120" fill="#fffdf7" />
      <g filter="url(#cr-wax)" strokeLinecap="round" fill="none">
        <circle cx={SUN.x} cy={SUN.y} r={SUN.r} stroke="#ffb703" strokeWidth="4" />
        <path d="M20 28h20M23 22h14M23 34h14" stroke="#ffb703" strokeWidth="4" />
        <path d="M0 88q34-16 58 2t50-4 52 4" stroke="#8ac926" strokeWidth="5" />
        <path d="M2 100h156M8 110h148M14 94h54" stroke="#8ac926" strokeWidth="5" />
        <path d="M127 92V60" stroke="#b5651d" strokeWidth="5" />
        <circle cx={TREE.x} cy={TREE.y} r={TREE.r - 1} stroke="#4b9b3e" strokeWidth="4" />
        <path d="M116 54h22M119 48h16M119 60h16" stroke="#4b9b3e" strokeWidth="4" />
        <circle cx={FRIEND.x} cy={FRIEND.y} r={FRIEND.r - 1} stroke="#fb5607" strokeWidth="4" />
        <path d="M69 82h22M72 76h16M72 88h16" stroke="#fb5607" strokeWidth="4" />
      </g>
      <Face x={FRIEND.x} y={FRIEND.y - 1} ink="#3d2b1f" />
      <rect width="160" height="120" filter="url(#cr-tooth)" opacity=".55" />
    </svg>
  );
}

function Clay() {
  return (
    <svg {...BOX} className="sb-art-svg">
      <defs>
        <radialGradient id="cl-sun" cx="35%" cy="30%"><stop offset="0" stopColor="#ffe9a8" /><stop offset="1" stopColor="#f2b33d" /></radialGradient>
        <radialGradient id="cl-ball" cx="32%" cy="28%"><stop offset="0" stopColor="#ff9d7e" /><stop offset="1" stopColor="#d95f42" /></radialGradient>
        <radialGradient id="cl-tree" cx="32%" cy="26%"><stop offset="0" stopColor="#6fc2ae" /><stop offset="1" stopColor="#3d8476" /></radialGradient>
        <linearGradient id="cl-far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9ecfc6" /><stop offset="1" stopColor="#6ba99f" /></linearGradient>
        <linearGradient id="cl-near" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e8c98f" /><stop offset="1" stopColor="#c9a163" /></linearGradient>
        <filter id="cl-soft"><feGaussianBlur stdDeviation="1.1" /></filter>
      </defs>
      <rect width="160" height="120" fill="#f6e7d3" />
      <circle cx={SUN.x} cy={SUN.y} r={SUN.r + 1} fill="url(#cl-sun)" />
      <ellipse cx={SUN.x + 2} cy={SUN.y + 16} rx="12" ry="3" fill="#c9a163" opacity=".3" filter="url(#cl-soft)" />
      <path d={FAR} fill="url(#cl-far)" />
      <path d={NEAR} fill="url(#cl-near)" />
      <rect x={TREE.trunkX} y={TREE.trunkY} width={TREE.trunkW + 1} height={TREE.trunkH} rx="3.5" fill="#8a6240" />
      <circle cx={TREE.x} cy={TREE.y} r={TREE.r} fill="url(#cl-tree)" />
      <ellipse cx={FRIEND.x + 4} cy={FRIEND.y + 14} rx="15" ry="3.5" fill="#8a6240" opacity=".3" filter="url(#cl-soft)" />
      <circle cx={FRIEND.x} cy={FRIEND.y} r={FRIEND.r} fill="url(#cl-ball)" />
      <Face x={FRIEND.x} y={FRIEND.y - 1} ink="#3a2416" />
      <circle cx={FRIEND.x - 5.5} cy={FRIEND.y - 5} r="1.1" fill="#fff" opacity=".7" />
    </svg>
  );
}

function Paper() {
  return (
    <svg {...BOX} className="sb-art-svg">
      <defs>
        <filter id="pa-shadow" x="-30%" y="-30%" width="170%" height="170%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.1" floodColor="#2b2350" floodOpacity="0.3" />
        </filter>
        <filter id="pa-fiber">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer><feFuncA type="linear" slope="0.14" /></feComponentTransfer>
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <rect width="160" height="120" fill="#e7f0fb" />
      <g filter="url(#pa-shadow)">
        {/* sun, cut with scissors */}
        <path d="M30 13l4.5 9.5 10.5-2.5-4.5 9.5 8.5 6.5-10.5 2 1 10.5-9.5-6.5-8.5 7.5-1-10.5L10 37l6.5-8.5L11 20l10.5 2z" fill="#ffc94d" />
        {/* two torn bands of land */}
        <path d="M0 80l36-14 32 13 30-16 33 11 29-6v52H0z" fill="#6fd3e8" />
        <path d="M0 95l42-12 40 11 38-9 40 7v28H0z" fill="#8fdc7a" />
        {/* tree */}
        <path d="M123 92l3-34h7l3 34z" fill="#c08e60" />
        <path d="M127 38l15 12-6 15h-18l-6-15z" fill="#2f9e6b" />
        {/* friend */}
        <path d="M80 68c9.5 0 16 6.2 16 14s-6.5 14-16 14-16-6.2-16-14 6.5-14 16-14z" fill="#ff8fab" />
      </g>
      <Face x={FRIEND.x} y={FRIEND.y - 1} ink="#2b2350" />
      <rect width="160" height="120" filter="url(#pa-fiber)" opacity=".6" />
    </svg>
  );
}

function Cartoon() {
  const K = "#1b1b28";
  return (
    <svg {...BOX} className="sb-art-svg">
      <rect width="160" height="120" fill="#3a86ff" />
      <g stroke={K} strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round">
        <circle cx={SUN.x} cy={SUN.y} r={SUN.r} fill="#ffbe0b" />
        <path d="M30 8V2M30 54v6M10 28H4M56 28h6M16 14l-4-4M44 42l4 4M44 14l4-4M16 42l-4 4" fill="none" />
        <path d={FAR} fill="#8ac926" />
        <path d={NEAR} fill="#5ea50f" />
        <rect x={TREE.trunkX} y={TREE.trunkY} width={TREE.trunkW + 1} height={TREE.trunkH} rx="2" fill="#8a5a2b" />
        <circle cx={TREE.x} cy={TREE.y} r={TREE.r} fill="#2fb36b" />
        <circle cx={FRIEND.x} cy={FRIEND.y} r={FRIEND.r} fill="#ff006e" />
      </g>
      <circle cx={FRIEND.x - 5} cy={FRIEND.y - 4} r="3.6" fill="#fff" stroke={K} strokeWidth="1.4" />
      <circle cx={FRIEND.x + 5} cy={FRIEND.y - 4} r="3.6" fill="#fff" stroke={K} strokeWidth="1.4" />
      <circle cx={FRIEND.x - 4} cy={FRIEND.y - 3.4} r="1.5" fill={K} />
      <circle cx={FRIEND.x + 6} cy={FRIEND.y - 3.4} r="1.5" fill={K} />
      <path d={`M${FRIEND.x - 6} ${FRIEND.y + 4}q6 5 12 0`} fill="none" stroke={K} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function Pixel() {
  // 20 × 15 grid of 8px cells
  const px = (x: number, y: number, w: number, h: number, fill: string) => (
    <rect key={`${x}-${y}-${w}-${fill}`} x={x * 8} y={y * 8} width={w * 8} height={h * 8} fill={fill} />
  );
  return (
    <svg {...BOX} className="sb-art-svg" shapeRendering="crispEdges">
      <rect width="160" height="120" fill="#4cc9f0" />
      {/* sun, top left */}
      {px(2, 1, 4, 1, "#ffd166")}{px(1, 2, 6, 3, "#ffd166")}{px(2, 5, 4, 1, "#ffd166")}
      {px(2, 2, 1, 1, "#fff3c4")}
      {/* far hills */}
      {px(0, 8, 5, 7, "#7b5ea7")}{px(5, 7, 5, 8, "#7b5ea7")}{px(10, 8, 4, 7, "#7b5ea7")}{px(14, 7, 6, 8, "#7b5ea7")}
      {/* ground */}
      {px(0, 11, 20, 4, "#3fa34d")}{px(0, 11, 20, 1, "#5fd16f")}
      {/* tree, right */}
      {px(15, 8, 2, 3, "#7a4a21")}{px(14, 6, 4, 2, "#2f8f4e")}{px(13, 7, 6, 1, "#2f8f4e")}{px(15, 5, 2, 1, "#2f8f4e")}
      {/* friend, centre */}
      {px(9, 8, 3, 3, "#f72585")}{px(8, 9, 5, 2, "#f72585")}
      {px(9, 9, 1, 1, "#fff")}{px(11, 9, 1, 1, "#fff")}
      {px(10, 10, 1, 1, "#7a0f3f")}
    </svg>
  );
}

function Watercolor() {
  return (
    <svg {...BOX} className="sb-art-svg">
      <defs>
        <filter id="wc-wash" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="4" seed="9" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="0.7" />
        </filter>
        <filter id="wc-paper">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer><feFuncA type="linear" slope="0.16" /></feComponentTransfer>
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <rect width="160" height="120" fill="#fffdfb" />
      <g filter="url(#wc-wash)">
        <circle cx={SUN.x} cy={SUN.y} r={SUN.r + 2} fill="#f4a7c0" opacity=".85" />
        <circle cx={SUN.x} cy={SUN.y} r={SUN.r - 5} fill="#ec7fa3" opacity=".55" />
        <ellipse cx="104" cy="30" rx="24" ry="8" fill="#bcd8f5" opacity=".8" />
        <path d={FAR} fill="#8fbde8" opacity=".85" />
        <path d={NEAR} fill="#9ccf92" opacity=".9" />
        <rect x={TREE.trunkX} y={TREE.trunkY} width={TREE.trunkW} height={TREE.trunkH} fill="#b98a63" opacity=".9" />
        <circle cx={TREE.x} cy={TREE.y} r={TREE.r} fill="#5fa87f" opacity=".85" />
        <circle cx={FRIEND.x} cy={FRIEND.y} r={FRIEND.r} fill="#b48ad4" opacity=".9" />
        <circle cx={FRIEND.x - 4} cy={FRIEND.y + 4} r="6" fill="#9a6fc4" opacity=".45" />
      </g>
      <g opacity=".7">
        <path d="M65 81q9 14 31 3" fill="none" stroke="#4c3f5e" strokeWidth="1" strokeLinecap="round" />
        <path d="M113 58q14-13 28-1" fill="none" stroke="#4c3f5e" strokeWidth="1" strokeLinecap="round" />
        <path d="M17 28a13 13 0 0 1 26 0" fill="none" stroke="#4c3f5e" strokeWidth="0.9" strokeLinecap="round" />
      </g>
      <Face x={FRIEND.x} y={FRIEND.y - 1} ink="#4c3f5e" />
      <rect width="160" height="120" filter="url(#wc-paper)" opacity=".7" />
    </svg>
  );
}

function Felt() {
  return (
    <svg {...BOX} className="sb-art-svg">
      <defs>
        <filter id="fe-fuzz">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" seed="2" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="0.4" />
        </filter>
        <filter id="fe-wool">
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer><feFuncA type="linear" slope="0.22" /></feComponentTransfer>
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <rect width="160" height="120" fill="#efe4cf" />
      <g filter="url(#fe-fuzz)">
        <circle cx={SUN.x} cy={SUN.y} r={SUN.r + 1} fill="#f2b544" />
        <path d={FAR} fill="#5e9c85" />
        <path d={NEAR} fill="#46806c" />
        <rect x={TREE.trunkX} y={TREE.trunkY} width={TREE.trunkW + 2} height={TREE.trunkH} rx="4" fill="#a3714a" />
        <circle cx={TREE.x} cy={TREE.y} r={TREE.r} fill="#3f7f62" />
        <circle cx={FRIEND.x} cy={FRIEND.y} r={FRIEND.r} fill="#dd6b45" />
      </g>
      <g fill="none" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="2.6 3">
        <circle cx={SUN.x} cy={SUN.y} r={SUN.r - 3} stroke="#fff3d9" opacity=".9" />
        <circle cx={TREE.x} cy={TREE.y} r={TREE.r - 4} stroke="#d8eadf" opacity=".85" />
        <circle cx={FRIEND.x} cy={FRIEND.y} r={FRIEND.r - 4} stroke="#ffe2cf" opacity=".9" />
      </g>
      <Face x={FRIEND.x} y={FRIEND.y - 1} ink="#33241a" />
      <circle cx={FRIEND.x - 5.2} cy={FRIEND.y - 4.8} r="0.85" fill="#fff" opacity=".85" />
      <circle cx={FRIEND.x + 3.8} cy={FRIEND.y - 4.8} r="0.85" fill="#fff" opacity=".85" />
      <rect width="160" height="120" filter="url(#fe-wool)" opacity=".6" />
    </svg>
  );
}

const ART: Record<ThemeId, () => ReactElement> = {
  "picture-book": PictureBook,
  crayon: Crayon,
  clay: Clay,
  paper: Paper,
  cartoon: Cartoon,
  pixel: Pixel,
  watercolor: Watercolor,
  felt: Felt,
};

export function ThemeArt({ id }: { id: ThemeId }) {
  const Art = ART[id] ?? PictureBook;
  return <Art />;
}
