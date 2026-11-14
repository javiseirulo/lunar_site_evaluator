/**
 * Temporal robustness (owner: Javi; docs/10 J7.3): "what if the launch slips a few days?"
 * Shifts the mission window by ±1…N days and counts how often the site stays valid.
 *
 *   const range = robustnessRange(window, 3);                    // Timeseries must cover this
 *   const r = temporalRobustness(site, ts, config, window, 3);   // r.valid_count of r.total
 */
import type { Timeseries } from '@lunar/contracts';
import {
  evaluateWindow,
  type EvaluableSite,
  type ScoringConfig,
  type WindowSpan,
} from './evaluate';

const DAY_MS = 86_400_000;

export interface RobustnessShift {
  shift_days: number;
  start_utc: string;
  end_utc: string;
  valid: boolean;
  score: number;
  /** The timeseries covers this shifted window; uncovered shifts are not counted. */
  covered: boolean;
}

export interface Robustness {
  /** Covered shifts where the site is still valid. */
  valid_count: number;
  /** Covered shifts (the 0 shift is excluded). */
  total: number;
  /** valid_count / total, null when no shift is covered. */
  fraction: number | null;
  days: number;
  step_days: number;
  shifts: RobustnessShift[];
}

export function shiftWindow(window: WindowSpan, days: number): WindowSpan {
  const d = days * DAY_MS;
  return {
    start_utc: new Date(Date.parse(window.start_utc) + d).toISOString(),
    end_utc: new Date(Date.parse(window.end_utc) + d).toISOString(),
  };
}

/** The span a Timeseries must cover for `temporalRobustness(…, days)`: [start − days, end + days]. */
export function robustnessRange(window: WindowSpan, days = 3): WindowSpan {
  return {
    start_utc: shiftWindow(window, -days).start_utc,
    end_utc: shiftWindow(window, days).end_utc,
  };
}

/**
 * Evaluate the window shifted by −N…−1 and +1…+N days (steps of `stepDays`, 0 excluded).
 * `ts` must cover `robustnessRange(window, days)`; shifts it does not cover are reported with
 * `covered: false` and left out of the count.
 */
export function temporalRobustness(
  site: EvaluableSite,
  ts: Timeseries,
  config: ScoringConfig,
  window: WindowSpan,
  days = 3,
  stepDays = 1,
): Robustness {
  const k = stepDays > 0 ? Math.floor(days / stepDays + 1e-9) : 0;
  const offsets: number[] = [];
  for (let i = -k; i <= k; i++) if (i !== 0) offsets.push(i * stepDays);
  const shifts = offsets.map((shift_days): RobustnessShift => {
    const w = shiftWindow(window, shift_days);
    const ev = evaluateWindow(site, ts, config, w);
    return { shift_days, ...w, valid: ev.valid, score: ev.score, covered: ev.covered };
  });
  const counted = shifts.filter((s) => s.covered);
  const valid_count = counted.filter((s) => s.valid).length;
  return {
    valid_count,
    total: counted.length,
    fraction: counted.length > 0 ? valid_count / counted.length : null,
    days,
    step_days: stepDays,
    shifts,
  };
}
