import assert from "node:assert/strict";
import test from "node:test";
import { detectGrowthEpisodes, normalizeHistory } from "../lib/spikes.ts";

test("normalizes sparse cumulative history into daily velocity", () => {
  const points = normalizeHistory(
    [
      { date: "2026-01-02", count: 2 },
      { date: "2026-01-04", count: 7 },
    ],
    "2026-01-01T00:00:00Z",
    7,
    new Date("2026-01-04T12:00:00Z"),
  );

  assert.deepEqual(
    points.map((point) => [point.date, point.count, point.daily]),
    [
      ["2026-01-01", 0, 0],
      ["2026-01-02", 2, 2],
      ["2026-01-03", 2, 0],
      ["2026-01-04", 7, 5],
    ],
  );
});

test("detects a clear growth episode without flagging steady growth", () => {
  const points = Array.from({ length: 50 }, (_, index) => ({
    date: new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10),
    daily: index >= 34 && index <= 36 ? 80 : 2,
    count: 0,
  }));
  let count = 0;
  for (const point of points) {
    count += point.daily;
    point.count = count;
  }

  const episodes = detectGrowthEpisodes(points);
  assert.equal(episodes.length, 1);
  assert.equal(episodes[0].peakDaily, 80);
  assert.ok(episodes[0].starsGained >= 240);
});

test("returns no episode for a stable history", () => {
  const points = Array.from({ length: 60 }, (_, index) => ({
    date: new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10),
    daily: 3,
    count: (index + 1) * 3,
  }));
  assert.deepEqual(detectGrowthEpisodes(points), []);
});

test("does not invent a present-day spike when a source is delayed", () => {
  const points = normalizeHistory(
    [
      { date: "2026-01-01", count: 100 },
      { date: "2026-01-10", count: 120 },
    ],
    "2026-01-01T00:00:00Z",
    800,
    new Date("2026-03-01T12:00:00Z"),
  );

  assert.equal(points.at(-1).date, "2026-01-10");
  assert.equal(points.at(-1).count, 120);
});
