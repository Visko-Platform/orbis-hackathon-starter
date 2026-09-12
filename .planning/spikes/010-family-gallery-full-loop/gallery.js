// gallery.js — the family gallery (spike 010).
//
// The key architectural decision here: the three example relatives are NOT
// a separate hardcoded model from user-added ones. They're seeded as plain
// Memory objects (same shape spike 008's memory.js produces) into the exact
// same localStorage-backed family list. That's what makes "Lola -> Enter Her
// World -> Market -> Home -> Exit -> another relative" a single uniform loop
// instead of two different code paths (curated worlds vs. user worlds).

import { loadFamily, saveMemory } from "../008-creation-screen-memory-contract/memory.js";

export const SEED_FAMILY = [
  {
    id: "seed-lola",
    seed: true,
    person: "Lola",
    relationship: "My grandmother",
    place: "Cavite City, Philippines",
    year: "1953",
    memory: "She ran a small sari-sari store on the corner and knew everyone who passed by.",
    photo: "../006-world-select-landing/cavite-1953.jpg",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "seed-yay",
    seed: true,
    person: "Yay",
    relationship: "My great-grandmother",
    place: "Phnom Penh, Cambodia",
    year: "1964",
    memory: "She crossed the wide boulevard barefoot on her way to school every morning.",
    photo: "../006-world-select-landing/phnom-penh-1964.jpg",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "seed-babushka",
    seed: true,
    person: "Babushka",
    relationship: "My babushka",
    place: "Leningrad, USSR",
    year: "1980s",
    memory: "She rode the tram past the old bell tower on her way to school.",
    photo: "../006-world-select-landing/leningrad-1980s.jpg",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

/** Pure merge — given what's already stored and the fixed seed set, return
 * the seeds not yet present. No localStorage access, so this is unit-testable. */
export function missingSeeds(existing, seeds = SEED_FAMILY) {
  const existingIds = new Set(existing.map((m) => m.id));
  return seeds.filter((s) => !existingIds.has(s.id));
}

/** Idempotent: safe to call on every gallery load. Only writes the seeds
 * that aren't already in storage (e.g. because the user deleted one — a
 * deleted seed is NOT resurrected, matching normal delete semantics). */
export function ensureSeedsInStorage() {
  // Gated on a one-time flag, NOT on "is the family list currently empty" —
  // a user who tested spike 008 first already has a non-empty list before
  // ever opening the gallery, and that must not suppress seeding.
  const alreadySeeded = localStorage.getItem("familyWorldSeeded") === "1";
  if (!alreadySeeded) {
    missingSeeds(loadFamily()).forEach((seed) => saveMemory(seed));
    localStorage.setItem("familyWorldSeeded", "1");
  }
  return loadFamily();
}
