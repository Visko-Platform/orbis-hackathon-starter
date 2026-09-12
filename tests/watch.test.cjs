const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./load.cjs");

const { adPhaseAt, readWatchOptions, formatClock, DEFAULT_AD_AT_S, PREWARM_S } = load("lib/watch/schedule.ts");

test("the ad warms up before its time, shows at its time, and never comes back", () => {
  assert.equal(adPhaseAt(0, 8, "idle"), "idle");
  assert.equal(adPhaseAt(8 - PREWARM_S, 8, "idle"), "prewarm");
  assert.equal(adPhaseAt(7.9, 8, "prewarm"), "prewarm");
  assert.equal(adPhaseAt(8, 8, "prewarm"), "show");
  assert.equal(adPhaseAt(0, 8, "show"), "show", "seeking back does not hide a showing ad");
  assert.equal(adPhaseAt(30, 8, "done"), "done", "a finished ad stays finished");
  assert.equal(adPhaseAt(0.5, 0, "idle"), "show", "an ad at zero shows immediately");
});

test("watch options come from the query string with safe fallbacks", () => {
  assert.deepEqual(readWatchOptions(""), { adAt: DEFAULT_AD_AT_S, live: true });
  assert.deepEqual(readWatchOptions("?adAt=12&live=0"), { adAt: 12, live: false });
  assert.deepEqual(readWatchOptions("?adAt=nope"), { adAt: DEFAULT_AD_AT_S, live: true });
  assert.deepEqual(readWatchOptions("?adAt=-3"), { adAt: DEFAULT_AD_AT_S, live: true });
  assert.deepEqual(readWatchOptions("?adAt=0"), { adAt: 0, live: true });
});

test("the clock reads like a video player", () => {
  assert.equal(formatClock(0), "0:00");
  assert.equal(formatClock(7.9), "0:07");
  assert.equal(formatClock(65), "1:05");
  assert.equal(formatClock(3725), "1:02:05");
  assert.equal(formatClock(NaN), "0:00");
});
