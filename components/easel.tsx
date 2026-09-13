"use client";

import { THEMES, type ThemeId } from "@/lib/dream-style";

/**
 * The quiet loading state: one brush stroke painting itself across the page,
 * in the color of the look the kid picked. No card, no cover — it sits in the
 * layout where the hint line would be.
 */
export function Easel({
  theme,
  line,
  first = false,
}: {
  theme: ThemeId | null;
  line?: string;
  /** the very first scene — say so, once */
  first?: boolean;
}) {
  const accent = THEMES.find((t) => t.id === theme)?.swatch[1] ?? "#ff5d73";

  return (
    <div className="sb-easel">
      <span className="sb-easel-word">{first ? "painting your first scene" : "painting"}</span>
      <span className="sb-easel-track" aria-hidden>
        <i className="sb-easel-stroke" style={{ background: accent }} />
      </span>
      {line ? <span className="sb-easel-line">“{line}”</span> : null}
    </div>
  );
}
