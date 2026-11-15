/**
 * Pure helpers over the Timeseries contract (shared by Street View, the game and the time bar).
 */
import type { Timeseries } from '@lunar/contracts';

export interface SkySample {
  index: number;
  t_utc: string;
  sun_az: number;
  sun_el: number;
  earth_az: number;
  earth_el: number;
  lit: boolean;
  earthVisible: boolean | null;
}

/** Index of the sample at or just before `isoUtc`, clamped to the series. */
export function indexAt(ts: Timeseries, isoUtc: string): number {
  const n = ts.t_utc.length;
  if (n === 0) return -1;
  const t = Date.parse(isoUtc);
  const t0 = Date.parse(ts.t_utc[0]!);
  // Fast path: regular step.
  const guess = Math.floor((t - t0) / (ts.step_s * 1000));
  if (guess >= 0 && guess < n && ts.t_utc[guess] && Date.parse(ts.t_utc[guess]!) <= t) {
    const next = ts.t_utc[guess + 1];
    if (!next || Date.parse(next) > t) return guess;
  }
  // Fallback: binary search for irregular series.
  let lo = 0;
  let hi = n - 1;
  if (t <= t0) return 0;
  if (t >= Date.parse(ts.t_utc[hi]!)) return hi;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (Date.parse(ts.t_utc[mid]!) <= t) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export function sampleAt(ts: Timeseries, isoUtc: string): SkySample | null {
  const i = indexAt(ts, isoUtc);
  if (i < 0) return null;
  return {
    index: i,
    t_utc: ts.t_utc[i]!,
    sun_az: ts.sun_az[i]!,
    sun_el: ts.sun_el[i]!,
    earth_az: ts.earth_az[i]!,
    earth_el: ts.earth_el[i]!,
    lit: ts.lit[i] === 1,
    earthVisible: ts.earth_visible ? ts.earth_visible[i] === 1 : null,
  };
}

/**
 * Hours from `isoUtc` until `flags` next changes value (e.g. time to sunset when lit, time to
 * sunrise when dark). Returns null if it never changes inside the series.
 */
export function hoursUntilChange(ts: Timeseries, flags: (0 | 1)[], isoUtc: string): number | null {
  const i = indexAt(ts, isoUtc);
  if (i < 0) return null;
  const current = flags[i];
  for (let j = i + 1; j < flags.length; j++) {
    if (flags[j] !== current) {
      return (Date.parse(ts.t_utc[j]!) - Date.parse(isoUtc)) / 3_600_000;
    }
  }
  return null;
}

/** Fraction (0–1) of samples where `flags` is 1. */
export function fractionOn(flags: (0 | 1)[]): number {
  if (flags.length === 0) return 0;
  let on = 0;
  for (const f of flags) on += f;
  return on / flags.length;
}

/**
 * What happens next to a flag (sun lit, Earth visible) from a given time, told apart so the UI never
 * confuses "never happens in the loaded data" with "no data":
 * - `in`: flips after `hours`.
 * - `never`: the flag has one value for the whole series (e.g. Earth never rises from a far-side site).
 * - `not-again`: it flipped earlier in the series but does not flip again.
 * - `unknown`: no series or no flags (not loaded / failed / field missing).
 */
export type NextChange =
  { kind: 'in'; hours: number } | { kind: 'never' } | { kind: 'not-again' } | { kind: 'unknown' };

export function nextChange(
  ts: Timeseries | null | undefined,
  flags: (0 | 1)[] | null | undefined,
  isoUtc: string,
): NextChange {
  if (!ts || !flags || flags.length === 0) return { kind: 'unknown' };
  const hours = hoursUntilChange(ts, flags, isoUtc);
  if (hours !== null) return { kind: 'in', hours };
  return flags.every((f) => f === flags[0]) ? { kind: 'never' } : { kind: 'not-again' };
}

/** Period the series covers, from its own timestamps: "2027" or "2027–2028" (never hardcoded). */
export function seriesSpanLabel(ts: Timeseries): string {
  const first = ts.t_utc[0]?.slice(0, 4);
  const last = ts.t_utc[ts.t_utc.length - 1]?.slice(0, 4);
  if (!first || !last) return 'the data range';
  return first === last ? first : `${first}–${last}`;
}

/** Value text for a countdown: "3 d", "never in 2027", "not again in 2027", "no data". */
export function changeWhen(next: NextChange, span: string, fmt: (hours: number) => string): string {
  switch (next.kind) {
    case 'in':
      return fmt(next.hours);
    case 'never':
      return `never in ${span}`;
    case 'not-again':
      return `not again in ${span}`;
    default:
      return 'no data';
  }
}

/** "Sunset in" before a countdown, "Sunset:" when there is none. */
export const changeLead = (label: string, next: NextChange) =>
  next.kind === 'in' ? `${label} in` : `${label}:`;

/** Sentence clause: "the Sun sets in 3 days", "Earth never rises here in 2027". */
export function changeClause(
  subject: string,
  verb: 'set' | 'rise',
  next: NextChange,
  span: string,
  fmt: (hours: number) => string,
): string {
  switch (next.kind) {
    case 'in':
      return `${subject} ${verb}s in ${fmt(next.hours)}`;
    case 'never':
      return `${subject} never ${verb}s here in ${span}`;
    case 'not-again':
      return `${subject} does not ${verb} again in ${span}`;
    default:
      return `${subject} ${verb}s: no data`;
  }
}
