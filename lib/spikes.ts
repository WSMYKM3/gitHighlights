import type { GrowthEpisode, StarPoint } from "./types";

const DAY_MS = 86_400_000;

export function normalizeHistory(
  rows: Array<{ date: string; count: number }>,
  createdAt: string,
  currentCount: number,
  today = new Date(),
): StarPoint[] {
  const todayUtc = utcDay(today);
  const start = utcDay(new Date(createdAt));
  const values = new Map<string, number>();

  for (const row of rows) {
    if (!Number.isFinite(row.count)) continue;
    values.set(row.date.slice(0, 10), Math.max(0, Math.round(row.count)));
  }

  const latestSuppliedDate = [...values.keys()]
    .filter((date) => date <= todayUtc.toISOString().slice(0, 10))
    .sort()
    .at(-1);
  const end = latestSuppliedDate
    ? utcDay(new Date(`${latestSuppliedDate}T00:00:00Z`))
    : todayUtc;
  const points: StarPoint[] = [];
  let lastCount = 0;
  for (let time = start.getTime(); time <= end.getTime(); time += DAY_MS) {
    const date = new Date(time).toISOString().slice(0, 10);
    const supplied = values.get(date);
    if (supplied !== undefined) lastCount = Math.max(lastCount, supplied);
    points.push({ date, count: lastCount, daily: 0 });
  }

  if (points.length === 0) {
    points.push({
      date: end.toISOString().slice(0, 10),
      count: currentCount,
      daily: 0,
    });
  } else if (end.getTime() === todayUtc.getTime()) {
    points[points.length - 1].count = Math.max(
      points[points.length - 1].count,
      currentCount,
    );
  }

  for (let index = 1; index < points.length; index += 1) {
    points[index].daily = Math.max(
      0,
      points[index].count - points[index - 1].count,
    );
  }

  return points;
}

export function detectGrowthEpisodes(points: StarPoint[]): GrowthEpisode[] {
  if (points.length < 8) return [];
  const candidates: number[] = [];

  for (let index = 7; index < points.length; index += 1) {
    const lookback = points
      .slice(Math.max(0, index - 28), index)
      .map((point) => point.daily);
    const baseline = median(lookback);
    const deviations = lookback.map((value) => Math.abs(value - baseline));
    const mad = median(deviations);
    const robustSpread = Math.max(1, mad * 1.4826);
    const threshold = Math.max(5, baseline * 3, baseline + robustSpread * 6);

    if (points[index].daily >= threshold) candidates.push(index);
  }

  const groups: number[][] = [];
  for (const index of candidates) {
    const group = groups.at(-1);
    if (!group || index - group.at(-1)! > 3) groups.push([index]);
    else group.push(index);
  }

  const totalStars = points.at(-1)?.count ?? 0;
  const minimumGain = Math.max(8, Math.round(totalStars * 0.0005));

  return groups
    .map((group) => {
      const first = group[0];
      const last = group.at(-1)!;
      const from = Math.max(0, first - 1);
      const to = Math.min(points.length - 1, last + 1);
      const lookback = points
        .slice(Math.max(0, first - 28), first)
        .map((point) => point.daily);
      const baseline = median(lookback);
      const window = points.slice(from, to + 1);
      const peak = window.reduce((best, point) =>
        point.daily > best.daily ? point : best,
      );
      const starsGained = window.reduce((sum, point) => sum + point.daily, 0);
      const excessStars = Math.max(
        0,
        Math.round(starsGained - baseline * window.length),
      );
      return {
        id: `${points[first].date}:${points[last].date}`,
        start: points[first].date,
        end: points[last].date,
        peakDate: peak.date,
        baseline: round1(baseline),
        peakDaily: peak.daily,
        starsGained,
        excessStars,
        score: round1(
          excessStars / Math.max(1, Math.sqrt(Math.max(1, totalStars))),
        ),
      };
    })
    .filter((episode) => episode.starsGained >= minimumGain)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function utcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
