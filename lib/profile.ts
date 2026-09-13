// Who's making the story. Kept in localStorage so a reload (or a judge picking
// the iPad up again) lands straight back in the same kid's world.

export type AvatarId =
  | "fox"
  | "bear"
  | "cat"
  | "bunny"
  | "robot"
  | "frog"
  | "owl"
  | "whale";

export type Profile = {
  id: string;
  name: string;
  avatar: AvatarId;
  createdAt: number;
};

export const AVATARS: { id: AvatarId; label: string; color: string }[] = [
  { id: "fox", label: "fox", color: "#FF8A4C" },
  { id: "bear", label: "bear", color: "#C98A5E" },
  { id: "cat", label: "cat", color: "#FF5D73" },
  { id: "bunny", label: "bunny", color: "#F2A6C2" },
  { id: "robot", label: "robot", color: "#7FA7FF" },
  { id: "frog", label: "frog", color: "#7BC950" },
  { id: "owl", label: "owl", color: "#B08BE8" },
  { id: "whale", label: "whale", color: "#3FB6A8" },
];

const PROFILES_KEY = "sb:profiles";
const ACTIVE_KEY = "sb:active";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function loadProfiles(): Profile[] {
  const list = read<Profile[]>(PROFILES_KEY, []);
  return Array.isArray(list) ? list.filter((p) => p && p.id && p.name) : [];
}

export function saveProfiles(list: Profile[]) {
  write(PROFILES_KEY, list);
}

export function addProfile(name: string, avatar: AvatarId): Profile {
  const profile: Profile = {
    id: `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name: tidyName(name),
    avatar,
    createdAt: Date.now(),
  };
  saveProfiles([...loadProfiles(), profile]);
  setActiveProfileId(profile.id);
  return profile;
}

export function updateProfile(id: string, patch: Partial<Omit<Profile, "id">>) {
  const next = loadProfiles().map((p) =>
    p.id === id ? { ...p, ...patch, name: patch.name ? tidyName(patch.name) : p.name } : p,
  );
  saveProfiles(next);
  return next;
}

export function removeProfile(id: string) {
  const next = loadProfiles().filter((p) => p.id !== id);
  saveProfiles(next);
  if (getActiveProfileId() === id) setActiveProfileId(next[0]?.id ?? null);
  return next;
}

export function getActiveProfileId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function setActiveProfileId(id: string | null) {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {}
}

/** "  roy  " -> "Roy"; keeps the first name only, caps it at something sane. */
export function tidyName(raw: string): string {
  const first = raw.trim().split(/\s+/)[0] ?? "";
  const clean = first.replace(/[^\p{L}\p{N}'’-]/gu, "").slice(0, 14);
  if (!clean) return "";
  return clean[0].toUpperCase() + clean.slice(1);
}

/** "Roy" -> "Roy's"; "Alex" -> "Alex's"; "Chris" -> "Chris'". */
export function possessive(name: string): string {
  if (!name) return "my";
  return /s$/i.test(name) ? `${name}’` : `${name}’s`;
}

// ── settings (the grown-ups corner writes these) ──────────
export type Settings = { sceneSeconds: number; narrate: boolean };
export const DEFAULT_SETTINGS: Settings = { sceneSeconds: 75, narrate: true };
const SETTINGS_KEY = "sb:settings";

export function loadSettings(): Settings {
  const s = read<Partial<Settings>>(SETTINGS_KEY, {});
  return {
    sceneSeconds: Math.min(180, Math.max(30, Number(s.sceneSeconds) || DEFAULT_SETTINGS.sceneSeconds)),
    narrate: s.narrate !== false,
  };
}

export function saveSettings(s: Settings) {
  write(SETTINGS_KEY, s);
}
