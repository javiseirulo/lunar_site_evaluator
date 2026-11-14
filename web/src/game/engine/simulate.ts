import type { Site, Timeseries } from '@lunar/contracts';
import { DEFAULT_REQUIREMENTS, type Criterion, type MissionRequirements } from './requirements';

export type FailCause = 'slope' | 'cold' | 'blackout' | 'low_sun' | 'low_comm';

export interface WindowMetrics {
  illum_pct: number;
  comm_pct: number;
  max_dark_h: number;
  max_blackout_h: number;
  slope_deg: number;
}

export interface Verdict {
  win: boolean;
  cause: FailCause | null;
  /** Mission-relative hour (0 = landing hour) at which the mission first fails. */
  failHour: number | null;
  metrics: WindowMetrics;
  score: number;
  stars: 0 | 1 | 2 | 3;
  detail: string;
}

/** 0 at the threshold, 1 at the objective, clamped; works whichever side is "better". */
export function utility(value: number, c: Criterion): number {
  const u = (value - c.threshold) / (c.objective - c.threshold);
  return Math.min(1, Math.max(0, u));
}

/** Longest run of `true` in `flags`, and the first index at which a run exceeds `limit` (or null). */
function runs(flags: boolean[], limit: number): { longest: number; exceedsAt: number | null } {
  let run = 0;
  let longest = 0;
  let exceedsAt: number | null = null;
  flags.forEach((f, i) => {
    run = f ? run + 1 : 0;
    longest = Math.max(longest, run);
    if (exceedsAt === null && run > limit) exceedsAt = i;
  });
  return { longest, exceedsAt };
}

function starsFor(score: number): 1 | 2 | 3 {
  return score < 1 / 3 ? 1 : score < 2 / 3 ? 2 : 3;
}

export function simulate(
  site: Site,
  ts: Timeseries,
  startIndex: number,
  req: MissionRequirements = DEFAULT_REQUIREMENTS,
): Verdict {
  const hours = req.surface_days * 24;
  if (startIndex < 0 || startIndex + hours > ts.t_utc.length) {
    throw new RangeError(
      `Mission window [${startIndex}, ${startIndex + hours}) exceeds timeseries length ${ts.t_utc.length}`,
    );
  }

  const win = (i: number) => startIndex + i;
  const dark = Array.from({ length: hours }, (_, i) => ts.lit[win(i)] !== 1);
  // Adapter approximation until real horizon profiles exist: Earth link needs
  // terrain visibility (when provided) and elevation above the antenna margin.
  const linked = Array.from(
    { length: hours },
    (_, i) =>
      (ts.earth_visible?.[win(i)] ?? 1) === 1 &&
      (ts.earth_el[win(i)] ?? -90) >= req.antenna_margin_deg,
  );

  const cold = runs(dark, req.max_dark_h.threshold);
  const blackout = runs(
    linked.map((l) => !l),
    req.max_blackout_h.threshold,
  );
  const metrics: WindowMetrics = {
    illum_pct: dark.filter((d) => !d).length / hours,
    comm_pct: linked.filter(Boolean).length / hours,
    max_dark_h: cold.longest,
    max_blackout_h: blackout.longest,
    slope_deg: site.metrics.slope_deg,
  };

  const score =
    (utility(metrics.illum_pct, req.illum_pct) +
      utility(metrics.comm_pct, req.comm_pct) +
      utility(metrics.max_dark_h, req.max_dark_h) +
      utility(metrics.max_blackout_h, req.max_blackout_h) +
      utility(metrics.slope_deg, { threshold: req.slope_max_deg, objective: 0 })) /
    5;

  const lose = (cause: FailCause, failHour: number, detail: string): Verdict => ({
    win: false,
    cause,
    failHour,
    metrics,
    score,
    stars: 0,
    detail,
  });

  if (metrics.slope_deg > req.slope_max_deg) {
    return lose('slope', 0, `Slope ${metrics.slope_deg.toFixed(1)}° > ${req.slope_max_deg}° limit`);
  }

  // Earliest of the two run failures wins.
  const candidates: { cause: FailCause; at: number; detail: string }[] = [];
  if (cold.exceedsAt !== null) {
    candidates.push({
      cause: 'cold',
      at: cold.exceedsAt,
      detail: `Longest night ${metrics.max_dark_h} h > ${req.max_dark_h.threshold} h`,
    });
  }
  if (blackout.exceedsAt !== null) {
    candidates.push({
      cause: 'blackout',
      at: blackout.exceedsAt,
      detail: `Longest comms blackout ${metrics.max_blackout_h} h > ${req.max_blackout_h.threshold} h`,
    });
  }
  if (candidates.length > 0) {
    const first = candidates.reduce((a, b) => (b.at < a.at ? b : a));
    return lose(first.cause, first.at, first.detail);
  }

  const last = hours - 1;
  if (metrics.illum_pct < req.illum_pct.threshold) {
    return lose(
      'low_sun',
      last,
      `Sunlight ${(metrics.illum_pct * 100).toFixed(0)}% < ${(req.illum_pct.threshold * 100).toFixed(0)}% minimum`,
    );
  }
  if (metrics.comm_pct < req.comm_pct.threshold) {
    return lose(
      'low_comm',
      last,
      `Earth link ${(metrics.comm_pct * 100).toFixed(0)}% < ${(req.comm_pct.threshold * 100).toFixed(0)}% minimum`,
    );
  }

  return {
    win: true,
    cause: null,
    failHour: null,
    metrics,
    score,
    stars: starsFor(score),
    detail: `Mission complete: ${(metrics.illum_pct * 100).toFixed(0)}% sunlight, ${(metrics.comm_pct * 100).toFixed(0)}% Earth link`,
  };
}
