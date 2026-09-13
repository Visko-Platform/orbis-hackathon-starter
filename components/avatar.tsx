import type { AvatarId } from "@/lib/profile";
import { AVATARS } from "@/lib/profile";

// Flat, dot-eyed little faces in the same picture-book language as the theme
// tiles. Drawn, not emoji, so the profile row doesn't look like a settings page.
export function Avatar({ id, className }: { id: AvatarId; className?: string }) {
  const color = AVATARS.find((a) => a.id === id)?.color ?? "#FF8A4C";
  const ink = "#2B2350";
  const eye = (x: number) => <circle key={x} cx={x} cy={30} r="3.1" fill={ink} />;
  const smile = (
    <path d="M27 38q5 4.6 10 0" fill="none" stroke={ink} strokeWidth="2.4" strokeLinecap="round" />
  );

  const art: Record<AvatarId, React.ReactNode> = {
    fox: (
      <>
        <path d="M14 22 17 8l12 7zM50 22 47 8l-12 7z" fill={color} />
        <circle cx="32" cy="32" r="20" fill={color} />
        <ellipse cx="32" cy="38" rx="11" ry="9" fill="#FFF6EC" />
        {eye(25)}{eye(39)}
        <circle cx="32" cy="36" r="2.6" fill={ink} />
      </>
    ),
    bear: (
      <>
        <circle cx="16" cy="17" r="8" fill={color} />
        <circle cx="48" cy="17" r="8" fill={color} />
        <circle cx="32" cy="32" r="20" fill={color} />
        <ellipse cx="32" cy="39" rx="9" ry="7" fill="#FFF6EC" />
        {eye(25)}{eye(39)}
        <circle cx="32" cy="37" r="2.6" fill={ink} />
      </>
    ),
    cat: (
      <>
        <path d="M13 24 15 9l13 6zM51 24 49 9l-13 6z" fill={color} />
        <circle cx="32" cy="32" r="20" fill={color} />
        {eye(25)}{eye(39)}
        {smile}
        <path d="M12 33h7M12 38h7M52 33h-7M52 38h-7" stroke={ink} strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
      </>
    ),
    bunny: (
      <>
        <ellipse cx="24" cy="12" rx="5" ry="13" fill={color} />
        <ellipse cx="40" cy="12" rx="5" ry="13" fill={color} />
        <circle cx="32" cy="34" r="19" fill={color} />
        <circle cx="26" cy="32" r="3.1" fill={ink} />
        <circle cx="38" cy="32" r="3.1" fill={ink} />
        <path d="M28 40q4 4 8 0" fill="none" stroke={ink} strokeWidth="2.4" strokeLinecap="round" />
      </>
    ),
    robot: (
      <>
        <path d="M32 6v8" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="32" cy="7" r="3.4" fill="#FF5D73" />
        <rect x="12" y="15" width="40" height="36" rx="12" fill={color} />
        {eye(24)}{eye(40)}
        <rect x="25" y="38" width="14" height="4" rx="2" fill={ink} />
      </>
    ),
    frog: (
      <>
        <circle cx="21" cy="18" r="9" fill={color} />
        <circle cx="43" cy="18" r="9" fill={color} />
        <circle cx="21" cy="18" r="4" fill="#FFF6EC" />
        <circle cx="43" cy="18" r="4" fill="#FFF6EC" />
        <circle cx="21" cy="18" r="2.2" fill={ink} />
        <circle cx="43" cy="18" r="2.2" fill={ink} />
        <circle cx="32" cy="36" r="18" fill={color} />
        <path d="M24 38q8 7 16 0" fill="none" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
      </>
    ),
    owl: (
      <>
        <path d="M32 10c12 0 20 9 20 21s-9 21-20 21-20-9-20-21 8-21 20-21z" fill={color} />
        <circle cx="24" cy="28" r="8" fill="#FFF6EC" />
        <circle cx="40" cy="28" r="8" fill="#FFF6EC" />
        <circle cx="24" cy="28" r="3.4" fill={ink} />
        <circle cx="40" cy="28" r="3.4" fill={ink} />
        <path d="M32 35l-4 5h8z" fill="#FFD166" />
      </>
    ),
    whale: (
      <>
        <path d="M32 12c1 0 2 1 2 3s-1 3-2 3-2-1-2-3 1-3 2-3z" fill="#CFE6FF" />
        <path d="M12 34c0-9 9-14 20-14s20 5 20 14-9 14-20 14S12 43 12 34z" fill={color} />
        <path d="M52 30l8-6v20l-8-6z" fill={color} />
        <circle cx="26" cy="32" r="3.1" fill={ink} />
        <path d="M20 40q6 4 12 0" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round" opacity="0.6" />
      </>
    ),
  };

  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden>
      {art[id] ?? art.fox}
    </svg>
  );
}
