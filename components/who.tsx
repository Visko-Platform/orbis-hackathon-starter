"use client";

import { Avatar } from "@/components/avatar";
import { Backdrop } from "@/components/backdrop";
import type { Profile } from "@/lib/profile";

// "Who's making a story?" — only appears once more than one kid has used it.
export function Who({
  profiles,
  onPick,
  onAdd,
}: {
  profiles: Profile[];
  onPick: (p: Profile) => void;
  onAdd: () => void;
}) {
  return (
    <div className="sb-onb">
      <Backdrop />
      <div className="sb-onb-inner">
        <div className="sb-onb-step">
          <div className="sb-onb-q">who’s making a story?</div>
          <div className="sb-who-row">
            {profiles.map((p) => (
              <button key={p.id} className="sb-who" onClick={() => onPick(p)}>
                <span className="sb-who-face">
                  <Avatar id={p.avatar} />
                </span>
                <span className="sb-who-name">{p.name}</span>
              </button>
            ))}
            <button className="sb-who sb-who-add" onClick={onAdd}>
              <span className="sb-who-face sb-who-plus">
                <svg viewBox="0 0 64 64" aria-hidden>
                  <path d="M32 20v24M20 32h24" fill="none" stroke="#2B2350" strokeWidth="5" strokeLinecap="round" opacity="0.45" />
                </svg>
              </span>
              <span className="sb-who-name">someone new</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
