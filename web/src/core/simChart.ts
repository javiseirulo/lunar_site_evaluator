/**
 * Pure logic for the live simulation chart (Explore, under the Mission Clock): downsampling a
 * year of hourly samples to the chart width, on/off runs for the sun/Earth bands, month ticks and
 * the running "so far" stats. No React, no physics: it only reshapes the Timeseries contract.
 */

export interface MinMax {
  min: number[];
  max: number[];
}

/** Min/max of `values` in `buckets` equal slices (keeps peaks that plain striding would drop). */
export function downsampleMinMax(values: readonly number[], buckets: number): MinMax {
  const n = values.length;
  const b = Math.max(1, Math.min(buckets, n));
  const min: number[] = new Array(b);
  const max: number[] = new Array(b);
  for (let k = 0; k < b; k++) {
    const from = Math.floor((k * n) / b);
    const to = Math.max(from + 1, Math.floor(((k + 1) * n) / b));
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = from; i < to && i < n; i++) {
      const v = values[i]!;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    min[k] = lo;
    max[k] = hi;
  }
  return { min, max };
}

/** Half-open [start, end) index runs where `flags` is 1. */
export function onRuns(flags: readonly number[]): [number, number][] {
  const runs: [number, number][] = [];
  let start = -1;
  for (let i = 0; i <= flags.length; i++) {
    const on = i < flags.length && flags[i] === 1;
    if (on && start < 0) start = i;
    if (!on && start >= 0) {
      runs.push([start, i]);
      start = -1;
    }
  }
  return runs;
}

/** Cumulative stats per sample index, so a lookup at the cursor is O(1) every frame. */
export interface RunningStats {
  /** litCount[i] = number of lit samples in 0..i (inclusive). */
  litCount: Int32Array;
  /** longestDark[i] = longest run of unlit samples within 0..i, in samples. */
  longestDark: Int32Array;
}

export function buildRunningStats(lit: readonly number[]): RunningStats {
  const n = lit.length;
  const litCount = new Int32Array(n);
  const longestDark = new Int32Array(n);
  let count = 0;
  let run = 0;
  let best = 0;
  for (let i = 0; i < n; i++) {
    if (lit[i] === 1) {
      count++;
      run = 0;
    } else {
      run++;
      if (run > best) best = run;
    }
    litCount[i] = count;
    longestDark[i] = best;
  }
  return { litCount, longestDark };
}

export interface StatsAt {
  /** 0–1 share of samples 0..index that are lit. */
  litFraction: number;
  /** Longest unlit stretch so far, in hours. */
  longestDarkHours: number;
}

export function statsAt(stats: RunningStats, index: number, stepS: number): StatsAt {
  const n = stats.litCount.length;
  if (n === 0 || index < 0) return { litFraction: 0, longestDarkHours: 0 };
  const i = Math.min(index, n - 1);
  return {
    litFraction: stats.litCount[i]! / (i + 1),
    longestDarkHours: (stats.longestDark[i]! * stepS) / 3600,
  };
}

/** First sample index of each UTC month (after the first), for axis ticks. */
export function monthTicks(tUtc: readonly string[]): { index: number; label: string }[] {
  const names = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const ticks: { index: number; label: string }[] = [];
  let prev = -1;
  for (let i = 0; i < tUtc.length; i++) {
    const m = new Date(tUtc[i]!).getUTCMonth();
    if (prev >= 0 && m !== prev) ticks.push({ index: i, label: names[m]! });
    prev = m;
  }
  return ticks;
}
