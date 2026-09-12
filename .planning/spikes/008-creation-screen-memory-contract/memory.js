// memory.js — the UI → Memory contract (spike 008).
//
// Pure, framework-free, and reused as-is by spikes 009/010 (and eventually
// the real my-orbis-app). No DOM or fetch calls in this file — keep it
// importable from a browser <script type="module"> AND runnable bare via
// `node --experimental-strip-types` for a fast contract test, per this
// project's established spike convention (see CONVENTIONS.md).

/**
 * Turns raw form input into the Memory object that's the boundary between
 * the creation UI and everything downstream (MemoryDirector, WorldProvider).
 *
 * "Who is this?" is deliberately a single free-text field in the UI (matches
 * the approved wireframe), but the Memory contract needs a short `person`
 * label distinct from `relationship` for gallery cards. `derivePersonLabel`
 * strips a leading "My " if present ("My grandmother" -> "Grandmother");
 * anything else passes through unchanged. This is a real, documented
 * limitation — see this spike's README Investigation Trail.
 */
export function derivePersonLabel(relationshipText) {
  const trimmed = (relationshipText || "").trim();
  const m = trimmed.match(/^my\s+(.+)$/i);
  const base = m ? m[1] : trimmed;
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : base;
}

export function buildMemory({ relationship, place, year, memory, photo }) {
  const missing = [];
  if (!relationship || !relationship.trim()) missing.push("relationship");
  if (!place || !place.trim()) missing.push("place");
  if (!year || !String(year).trim()) missing.push("year");
  if (!memory || !memory.trim()) missing.push("memory");
  if (!photo) missing.push("photo");
  if (missing.length) {
    throw new Error(`Memory is missing required field(s): ${missing.join(", ")}`);
  }

  return {
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    person: derivePersonLabel(relationship),
    relationship: relationship.trim(),
    place: place.trim(),
    year: String(year).trim(),
    memory: memory.trim(),
    photo, // data: URL string — portable without a backend/object storage in this spike
    createdAt: new Date().toISOString(),
  };
}

const STORAGE_KEY = "familyWorldMemories";

export function loadFamily() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveMemory(mem) {
  const all = loadFamily();
  all.push(mem);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return all;
}

export function deleteMemory(id) {
  const all = loadFamily().filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return all;
}
