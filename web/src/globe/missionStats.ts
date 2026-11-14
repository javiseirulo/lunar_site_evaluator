/**
 * Mission statistics and requirement checks for Explore — owner: Marta (src/globe).
 * Pure functions over the Timeseries contract (docs/10 §5 Marta, v1). No score, weights or `valid`
 * from sites.json: a site is a candidate only if it meets every mission requirement the user added.
 *
 * ASSUMPTION (shown in the UI): vertical solar panels at the pole. With the Sun a few degrees above
 * the horizon, a panel facing it delivers ≈ its nominal power whenever the site is lit. A panel
 * fixed in one direction would deliver less.
 *
 * Same rule as `@/scoring` (decisions/log, Javi 2026-11-14): a value exactly at the limit passes,
 * the window is [start, end) and requirements without data (pending terrain, no Earth visibility)
 * do not count: they are shown as "?" but never make a site fail.
 */
import type { Site, Timeseries } from '@lunar/contracts';
import { indexAt } from '@/core/timeseries';

// ---------------------------------------------------------------------------
// Mission window
// ---------------------------------------------------------------------------

export interface TimeRange {
  start_utc: string;
  end_utc: string;
  step_s: number;
}

/** User window: landing date + duration. Both optional. */
export interface WindowInput {
  startUtc: string | null;
  durationDays: number | null;
}

export interface ResolvedWindow {
  startUtc: string;
  /** Exclusive end. */
  endUtc: string;
  /** True when no landing date was given and the whole data range is used. */
  isFullRange: boolean;
  /** True when the requested window had to be cut to the data range. */
  clamped: boolean;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const iso = (ms: number) => new Date(ms).toISOString();

/** Turns the user's window into concrete [start, end) inside the data range. */
export function resolveWindow(range: TimeRange, input: WindowInput): ResolvedWindow {
  const r0 = Date.parse(range.start_utc);
  const r1 = Date.parse(range.end_utc) + range.step_s * 1000; // last sample covers one step
  if (!input.startUtc || Number.isNaN(Date.parse(input.startUtc))) {
    return { startUtc: iso(r0), endUtc: iso(r1), isFullRange: true, clamped: false };
  }
  const s = Date.parse(input.startUtc);
  const e = input.durationDays && input.durationDays > 0 ? s + input.durationDays * DAY : r1;
  const start = Math.min(Math.max(s, r0), r1);
  const end = Math.min(Math.max(e, start), r1);
  return {
    startUtc: iso(start),
    endUtc: iso(end),
    isFullRange: false,
    clamped: start !== s || end !== e,
  };
}

/** Sample indices [start, end) whose timestamps fall inside the window. */
export function sliceIndices(ts: Timeseries, win: Pick<ResolvedWindow, 'startUtc' | 'endUtc'>) {
  const n = ts.t_utc.length;
  const t0 = Date.parse(win.startUtc);
  const t1 = Date.parse(win.endUtc);
  if (n === 0 || t1 <= t0) return { start: 0, end: 0 };
  const first = Date.parse(ts.t_utc[0]!);
  const last = Date.parse(ts.t_utc[n - 1]!);
  if (t1 <= first || t0 > last) return { start: 0, end: 0 };
  let start = indexAt(ts, win.startUtc);
  if (Date.parse(ts.t_utc[start]!) < t0) start += 1;
  let endIdx = indexAt(ts, win.endUtc);
  if (Date.parse(ts.t_utc[endIdx]!) >= t1) endIdx -= 1;
  return { start, end: Math.max(start, endIdx + 1) };
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

/** Longest run of `value` in flags[start, end), in samples. Runs touching the edges are cut there. */
export function longestRun(flags: (0 | 1)[], start: number, end: number, value: 0 | 1): number {
  let best = 0;
  let run = 0;
  for (let i = start; i < end; i++) {
    if (flags[i] === value) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

export interface MissionStats {
  /** Samples inside the window (0 = window outside the data). */
  samples: number;
  /** Hours covered by those samples. */
  hours: number;
  /** 0–1, null if no samples. */
  sunlitFraction: number | null;
  /** Longest stretch with lit = 0, hours. */
  longestNightH: number | null;
  /** Longest stretch with earth_visible = 0, hours. null = unknown (no earth_visible data). */
  longestCommGapH: number | null;
}

export function missionStats(
  ts: Timeseries,
  win: Pick<ResolvedWindow, 'startUtc' | 'endUtc'>,
): MissionStats {
  const { start, end } = sliceIndices(ts, win);
  const samples = end - start;
  const stepH = ts.step_s / 3600;
  if (samples === 0) {
    return {
      samples: 0,
      hours: 0,
      sunlitFraction: null,
      longestNightH: null,
      longestCommGapH: null,
    };
  }
  let lit = 0;
  for (let i = start; i < end; i++) lit += ts.lit[i] ?? 0;
  const ev = ts.earth_visible;
  return {
    samples,
    hours: samples * stepH,
    sunlitFraction: lit / samples,
    longestNightH: longestRun(ts.lit, start, end, 0) * stepH,
    longestCommGapH:
      ev && ev.length === ts.t_utc.length ? longestRun(ev, start, end, 0) * stepH : null,
  };
}

// ---------------------------------------------------------------------------
// Requirements
// ---------------------------------------------------------------------------

export interface Requirements {
  batteryWh?: number;
  loadW?: number;
  panelW?: number;
  maxCommGapH?: number;
  maxSlopeDeg?: number;
}

export type RequirementField = keyof Requirements;

/** Battery autonomy in hours, or null if battery or load is missing / not positive. */
export function autonomyH(req: Requirements): number | null {
  return isValidValue('batteryWh', req.batteryWh) && isValidValue('loadW', req.loadW)
    ? req.batteryWh! / req.loadW!
    : null;
}

/**
 * Battery, load and panel must be > 0; comm gap and slope limits must be ≥ 0.
 * An invalid value is kept in the form (so the user can fix it) but checks nothing.
 */
export function isValidValue(field: RequirementField, v: number | undefined): boolean {
  if (v === undefined || !Number.isFinite(v)) return false;
  return field === 'maxCommGapH' || field === 'maxSlopeDeg' ? v >= 0 : v > 0;
}

/** Mean solar power over the window (vertical-panel assumption). */
export function meanPowerW(panelW: number, sunlitFraction: number): number {
  return panelW * sunlitFraction;
}

export type CheckId = 'night' | 'energy' | 'comms' | 'slope';
export type CheckStatus = 'pass' | 'fail' | 'unknown';

export interface Check {
  id: CheckId;
  status: CheckStatus;
  /** Measured value (h, W or °), null if unknown. */
  value: number | null;
  /** Limit it is compared with (h, W or °). */
  limit: number;
  /** Signed margin in the check's unit: > 0 passes, < 0 fails. null if unknown. */
  margin: number | null;
  /** e.g. "Longest night 38 h ≤ battery autonomy 60 h ✔" */
  text: string;
}

export interface SiteEvaluation {
  site: Site;
  stats: MissionStats | null;
  checks: Check[];
  passed: number;
  /** Checks with no data (pending): shown, but they do not count. */
  pending: number;
  /**
   * The site has no timeseries for the window (still loading, failed to load, or the window has
   * no samples) while a time-based requirement is active. Unlike pending terrain, this is not
   * ignored: such a site is never a candidate.
   */
  noData: boolean;
  /** No active check fails and the site has data. Pending checks are ignored, like `@/scoring`. */
  candidate: boolean;
}

const h = (v: number) => `${Math.round(v)} h`;
const w = (v: number) => `${Math.round(v)} W`;
const deg = (v: number) => `${v.toFixed(1)}°`;
const mark = (s: CheckStatus) => (s === 'pass' ? '✔' : s === 'fail' ? '✖' : '?');

function check(
  id: CheckId,
  value: number | null,
  limit: number,
  better: 'low' | 'high',
  describe: (v: number) => string,
  unknownText: string,
): Check {
  if (value === null) {
    return { id, status: 'unknown', value: null, limit, margin: null, text: `${unknownText} ?` };
  }
  const margin = better === 'low' ? limit - value : value - limit;
  const status: CheckStatus = margin >= 0 ? 'pass' : 'fail';
  return { id, status, value, limit, margin, text: `${describe(value)} ${mark(status)}` };
}

/** Slope from sites.json, or null if missing or marked pending (contract v1.1 `pending_metrics`). */
export function siteSlope(site: Site): number | null {
  const pending = (site as Site & { pending_metrics?: string[] }).pending_metrics;
  if (pending?.includes('slope_deg')) return null;
  const v = site.metrics?.slope_deg;
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * Which requirements are active. Night needs battery + load; energy needs panel + load.
 * A lone battery, load or panel value is kept but checks nothing yet.
 */
export function activeChecks(req: Requirements): CheckId[] {
  const ids: CheckId[] = [];
  if (autonomyH(req) !== null) ids.push('night');
  if (isValidValue('panelW', req.panelW) && isValidValue('loadW', req.loadW)) ids.push('energy');
  if (isValidValue('maxCommGapH', req.maxCommGapH)) ids.push('comms');
  if (isValidValue('maxSlopeDeg', req.maxSlopeDeg)) ids.push('slope');
  return ids;
}

export function evaluateSite(
  site: Site,
  stats: MissionStats | null,
  req: Requirements,
): SiteEvaluation {
  const checks: Check[] = [];
  const s = stats && stats.samples > 0 ? stats : null;
  for (const id of activeChecks(req)) {
    if (id === 'night') {
      const auto = autonomyH(req)!;
      checks.push(
        check(
          'night',
          s?.longestNightH ?? null,
          auto,
          'low',
          (v) => `Longest night ${h(v)} ${v <= auto ? '≤' : '>'} battery autonomy ${h(auto)}`,
          `Longest night vs battery autonomy ${h(auto)}`,
        ),
      );
    } else if (id === 'energy') {
      const load = req.loadW!;
      const mean = s?.sunlitFraction != null ? meanPowerW(req.panelW!, s.sunlitFraction) : null;
      checks.push(
        check(
          'energy',
          mean,
          load,
          'high',
          (v) => `Mean solar power ${w(v)} ${v >= load ? '≥' : '<'} load ${w(load)}`,
          `Mean solar power vs load ${w(load)}`,
        ),
      );
    } else if (id === 'comms') {
      const max = req.maxCommGapH!;
      checks.push(
        check(
          'comms',
          s?.longestCommGapH ?? null,
          max,
          'low',
          (v) => `Longest comm gap ${h(v)} ${v <= max ? '≤' : '>'} ${h(max)}`,
          `Comm gap vs ${h(max)}: no Earth-visibility data`,
        ),
      );
    } else {
      const max = req.maxSlopeDeg!;
      checks.push(
        check(
          'slope',
          siteSlope(site),
          max,
          'low',
          (v) => `Slope ${deg(v)} ${v <= max ? '≤' : '>'} ${deg(max)}`,
          `Slope vs ${deg(max)}: pending terrain`,
        ),
      );
    }
  }
  const passed = checks.filter((c) => c.status === 'pass').length;
  const pending = checks.filter((c) => c.status === 'unknown').length;
  const failed = checks.length - passed - pending;
  const noData = s === null && checks.some((c) => c.id !== 'slope');
  return {
    site,
    stats,
    checks,
    passed,
    pending,
    noData,
    candidate: checks.length > 0 && failed === 0 && !noData,
  };
}

/** "Meets 2 of 2 requirements · 1 pending (no data)" */
export function meetsText(
  e: Pick<SiteEvaluation, 'checks' | 'passed' | 'pending'> & { noData?: boolean },
): string {
  if (e.noData) return 'No data for this site in the mission window';
  const counted = e.checks.length - e.pending;
  const base =
    counted > 0
      ? `Meets ${e.passed} of ${counted} requirements`
      : 'No requirement can be checked yet';
  return e.pending > 0 ? `${base} · ${e.pending} pending (no data)` : base;
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

export type SortBy = 'battery_margin' | 'comms' | 'flattest' | 'sunlight';

/** Sort key, lower = better; null sorts last. */
export function sortKey(e: SiteEvaluation, by: SortBy, req: Requirements): number | null {
  const s = e.stats;
  switch (by) {
    case 'battery_margin': {
      const auto = autonomyH(req);
      if (s?.longestNightH == null) return null;
      return auto !== null ? -(auto - s.longestNightH) : s.longestNightH; // no battery: shortest night first
    }
    case 'comms':
      return s?.longestCommGapH ?? null;
    case 'flattest':
      return siteSlope(e.site);
    case 'sunlight':
      return s?.sunlitFraction != null ? -s.sunlitFraction : null;
  }
}

/** Candidates first, then by the chosen key (unknown last), then by name. */
export function sortEvaluations(
  evals: SiteEvaluation[],
  by: SortBy,
  req: Requirements,
): SiteEvaluation[] {
  return [...evals].sort((a, b) => {
    if (a.candidate !== b.candidate) return a.candidate ? -1 : 1;
    const ka = sortKey(a, by, req);
    const kb = sortKey(b, by, req);
    if (ka === null && kb !== null) return 1;
    if (kb === null && ka !== null) return -1;
    if (ka !== null && kb !== null && ka !== kb) return ka - kb;
    return a.site.name.localeCompare(b.site.name);
  });
}

/** Site id → 1…5 for the first five candidates whose sort key has data (no alphabetical ranks). */
export function topRanks(
  sorted: SiteEvaluation[],
  by: SortBy,
  req: Requirements,
): Map<string, number> {
  const ranked = sorted.filter((e) => e.candidate && sortKey(e, by, req) !== null).slice(0, TOP_N);
  return new Map(ranked.map((e, i) => [e.site.id, i + 1]));
}

/** How many candidates get a numbered badge. */
export const TOP_N = 5;
