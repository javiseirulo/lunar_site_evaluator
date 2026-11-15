/**
 * Coaching for 1-2 star wins: which criteria held the score back, and what would have happened
 * if the mission had lasted longer. Pure functions over the same `simulate` the game uses.
 */
import type { Site, Timeseries } from '@lunar/contracts';
import type { Criterion, MissionRequirements } from './requirements';
import { isPending, simulate, utility, type FailCause, type Verdict } from './simulate';

export type CoachKey = 'illum' | 'comm' | 'dark' | 'blackout';

export interface WeakCriterion {
  key: CoachKey;
  label: string;
  /** Raw value (fraction for sunlight / Earth link, hours for dark / blackout). */
  value: number;
  objective: number;
  utility: number;
  /** e.g. "Earth link 61% — 3★ needs ~95%". */
  text: string;
}

export interface Projection {
  /** Mission length simulated, in days (> the played one). */
  days: number;
  survives: boolean;
  cause: FailCause | null;
  /** 1-based mission day on which it would have failed. */
  day: number | null;
  /** Mission hour of the failure. */
  hour: number | null;
  text: string;
}

export interface Coaching {
  weakest: WeakCriterion[];
  /** null when the series has no data past the played mission. */
  projection: Projection | null;
}

export const MAX_PROJECTION_DAYS = 14;

const pct = (x: number) => `${Math.round(x * 100)}%`;
const hrs = (x: number) => `${Math.round(x)} h`;

interface Def {
  key: CoachKey;
  label: string;
  pendingKey: string;
  pick: (r: MissionRequirements) => Criterion;
  value: (v: Verdict) => number;
  text: (value: number, c: Criterion) => string;
}

const DEFS: Def[] = [
  {
    key: 'illum',
    label: 'Sunlight',
    pendingKey: 'illum_pct',
    pick: (r) => r.illum_pct,
    value: (v) => v.metrics.illum_pct,
    text: (x, c) => `Sunlight ${pct(x)} — 3★ needs ~${pct(c.objective)}`,
  },
  {
    key: 'comm',
    label: 'Earth link',
    pendingKey: 'earth_vis_pct',
    pick: (r) => r.comm_pct,
    value: (v) => v.metrics.comm_pct,
    text: (x, c) => `Earth link ${pct(x)} — 3★ needs ~${pct(c.objective)}`,
  },
  {
    key: 'dark',
    label: 'Longest dark',
    pendingKey: 'max_dark_hours',
    pick: (r) => r.max_dark_h,
    value: (v) => v.metrics.max_dark_h,
    text: (x, c) => `Longest dark ${hrs(x)} — 3★ needs ${hrs(c.objective)} or less`,
  },
  {
    key: 'blackout',
    label: 'Longest blackout',
    pendingKey: 'max_blackout_hours',
    pick: (r) => r.max_blackout_h,
    value: (v) => v.metrics.max_blackout_h,
    text: (x, c) => `Longest blackout ${hrs(x)} — 3★ needs ${hrs(c.objective)} or less`,
  },
];

/** The (up to) `count` criteria with the lowest utility; ones already at the objective are skipped. */
export function weakestCriteria(
  site: Site,
  verdict: Verdict,
  req: MissionRequirements,
  count = 2,
): WeakCriterion[] {
  return DEFS.filter((d) => !isPending(site, d.pendingKey))
    .map((d): WeakCriterion => {
      const c = d.pick(req);
      const value = d.value(verdict);
      return {
        key: d.key,
        label: d.label,
        value,
        objective: c.objective,
        utility: utility(value, c),
        text: d.text(value, c),
      };
    })
    .filter((w) => w.utility < 1)
    .sort((a, b) => a.utility - b.utility)
    .slice(0, count);
}

const FAIL_REASON: Record<FailCause, string> = {
  slope: 'the slope would have been too steep',
  cold: 'the night would have passed',
  blackout: 'the Earth link would have stayed lost for over',
  low_sun: 'sunlight would have dropped below the minimum',
  low_comm: 'the Earth link would have dropped below the minimum',
};

/** Re-runs the same landing with a longer stay (up to 14 days or the end of the series). */
export function projectLonger(
  site: Site,
  ts: Timeseries,
  startIndex: number,
  req: MissionRequirements,
): Projection | null {
  const available = Math.floor((ts.t_utc.length - startIndex) / 24);
  const days = Math.min(MAX_PROJECTION_DAYS, available);
  if (days <= req.surface_days) return null;
  const more = days - req.surface_days;
  const lead = `If the mission had lasted ${more} more day${more === 1 ? '' : 's'}`;
  const v = simulate(site, ts, startIndex, { ...req, surface_days: days });
  if (v.win || v.cause === null || v.failHour === null) {
    return {
      days,
      survives: true,
      cause: null,
      day: null,
      hour: null,
      text: `${lead}, it would still have survived all ${days} days.`,
    };
  }
  const day = Math.floor(v.failHour / 24) + 1;
  let what: string;
  if (v.cause === 'cold') {
    what = `the night would have passed ${req.max_dark_h.threshold} h on day ${day}`;
  } else if (v.cause === 'blackout') {
    what = `the Earth link would have been lost for over ${req.max_blackout_h.threshold} h by day ${day}`;
  } else {
    what = `${FAIL_REASON[v.cause]} by day ${day}`;
  }
  return {
    days,
    survives: false,
    cause: v.cause,
    day,
    hour: v.failHour,
    text: `${lead}, ${what}.`,
  };
}

/** Coaching for a win with 1 or 2 stars; null for losses and 3-star wins. */
export function coachWin(
  site: Site,
  ts: Timeseries,
  startIndex: number,
  verdict: Verdict,
  req: MissionRequirements,
): Coaching | null {
  if (!verdict.win || verdict.stars >= 3) return null;
  return {
    weakest: weakestCriteria(site, verdict, req),
    projection: projectLonger(site, ts, startIndex, req),
  };
}
