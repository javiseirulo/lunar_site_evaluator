/**
 * Pure time math for the mission timelapse. Mission hours are 0-based sample indices from the
 * landing hour (`hand.startIndex`), the same convention as `Verdict.failHour`.
 */
import type { Timeseries } from '@lunar/contracts';
import { hourlyFlags } from '../engine/simulate';

/** Wall-clock length of a full mission timelapse. */
export const TIMELAPSE_MS = 25_000;

const HOUR_MS = 3_600_000;

/** Last mission hour shown: `failHour` on a loss, the final hour (`missionHours - 1`) on a win. */
export function stopHourFor(failHour: number | null, missionHours: number): number {
  const last = Math.max(0, missionHours - 1);
  if (failHour === null) return last;
  return Math.min(last, Math.max(0, failHour));
}

/**
 * Mission hour (fractional) after `elapsedMs` of a timelapse that plays `missionHours` in
 * `totalMs`, clamped to `[0, stopHour]` so it freezes exactly at `stopHour`.
 */
export function missionHourAt(
  elapsedMs: number,
  totalMs: number,
  missionHours: number,
  stopHour: number,
): number {
  const stop = Math.max(0, stopHour);
  if (!(totalMs > 0)) return stop;
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  return Math.min(stop, (elapsed / totalMs) * missionHours);
}

/** ISO UTC time `hour` hours after `landingUtc` (whole seconds keep the `...:00Z` form). */
export function isoAtHour(landingUtc: string, hour: number): string {
  return new Date(Date.parse(landingUtc) + hour * HOUR_MS).toISOString().replace('.000Z', 'Z');
}

/** 1-based mission day for a mission hour, capped at `days`. */
export function dayOfMission(hour: number, days: number): number {
  return Math.min(days, Math.floor(Math.max(0, hour) / 24) + 1);
}

/** `out[i]` = length of the run of `true` ending at `i` (0 where `flags[i]` is false). */
export function runLengths(flags: readonly boolean[]): number[] {
  let run = 0;
  return flags.map((f) => (run = f ? run + 1 : 0));
}

export interface MissionRuns {
  /** Hours of the current dark (battery night) run at each mission hour. */
  dark: number[];
  /** Hours of the current Earth blackout run at each mission hour. */
  blackout: number[];
}

/** Running dark and blackout counters for each hour of the mission window (engine rules). */
export function missionRuns(
  ts: Timeseries,
  startIndex: number,
  missionHours: number,
  marginDeg: number,
): MissionRuns {
  const { dark, linked } = hourlyFlags(ts, startIndex, missionHours, marginDeg);
  return { dark: runLengths(dark), blackout: runLengths(linked.map((l) => !l)) };
}
