// worldProvider.js — the WorldProvider boundary (spike 009).
//
// This is the actual architecture bet from tonight's priority stack:
//   UI → Memory → MemoryDirector → WorldProvider → { MockWorldProvider, OrbisWorldProvider }
//
// Every provider satisfies the SAME contract:
//   provider.enter(memory) -> WorldSession
//   session.locations            -> WorldLocation[]
//   session.goTo(locationKey)    -> WorldLocation
//   session.steer(freeText)      -> WorldLocation
//   session.exit()               -> void
//
// The rest of the app (index.html in this spike; the real my-orbis-app later)
// only ever talks to a WorldSession — it must never know or care whether the
// session is backed by a canned image swap (Mock) or a live Orbis-Stable
// WebRTC stream (Orbis). That's the whole point of building Mock first.

const STOCK_BACKDROPS = {
  market: "../006-world-select-landing/leningrad-1980s.jpg",
  neighborhood: "../006-world-select-landing/phnom-penh-1964.jpg",
};

function buildLocations(memory) {
  return [
    {
      key: "home",
      label: "Home",
      backdrop: memory.photo,
      narration: `${memory.person}'s home in ${memory.place}, around ${memory.year}. ${memory.memory}`,
    },
    {
      key: "market",
      label: "Market",
      backdrop: STOCK_BACKDROPS.market,
      narration: `Imagining the market ${memory.person} would have known near ${memory.place} in ${memory.year} — a placeholder scene standing in for a live-rendered one.`,
    },
    {
      key: "neighborhood",
      label: "Neighborhood",
      backdrop: STOCK_BACKDROPS.neighborhood,
      narration: `The streets around ${memory.place}, ${memory.year} — another placeholder scene, swapped for a live Orbis render once that provider is wired in.`,
    },
  ];
}

/**
 * MockWorldProvider — BUILD FIRST. No network, no API key, no Orbis. Cycles
 * between the memory's own photo and two stock backdrops so the interaction
 * (pick a location, steer with free text, exit) can be felt end-to-end
 * tonight even though nothing is actually being rendered live.
 */
export function createMockWorldProvider() {
  return {
    kind: "mock",
    enter(memory) {
      const locations = buildLocations(memory);
      let current = locations[0];
      const session = {
        kind: "mock",
        locations,
        current: () => current,
        goTo(key) {
          const loc = locations.find((l) => l.key === key);
          if (!loc) throw new Error(`Unknown location: ${key}`);
          current = loc;
          return current;
        },
        steer(freeText) {
          // Mock steering doesn't call any model — it deterministically
          // reflects the typed text back into a narration line so the UI
          // interaction (type -> see the scene "respond") is provable
          // without an LLM or a live render in the loop.
          current = {
            key: "steered",
            label: "Where should we go?",
            backdrop: current.backdrop,
            narration: `Steering toward: "${freeText}" — in the real build this text becomes an Orbis steering prompt; here it just confirms the round trip.`,
          };
          return current;
        },
        exit() {
          current = locations[0];
        },
      };
      return session;
    },
  };
}

/**
 * OrbisWorldProvider — SWAP IN once a live Reactor API key exists (build
 * day). Intentionally NOT implemented in this spike — the point of spike 009
 * is proving the call site (`provider.enter(memory)`) doesn't need to change
 * when this swap happens, not building the live integration itself.
 */
export function createOrbisWorldProvider() {
  return {
    kind: "orbis",
    enter() {
      throw new Error(
        "OrbisWorldProvider.enter() not implemented in this spike — swap in a real implementation on build day. " +
          "It must return the same WorldSession shape as MockWorldProvider (locations/goTo/steer/exit) so no caller changes."
      );
    },
  };
}
