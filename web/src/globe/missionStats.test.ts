import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { DataManifest, Site, Timeseries } from '@lunar/contracts';
import {
  activeChecks,
  autonomyH,
  evaluateSite,
  longestRun,
  meetsText,
  missionStats,
  resolveWindow,
  sliceIndices,
  sortEvaluations,
  topRanks,
  type MissionStats,
  type Requirements,
} from './missionStats';

const T0 = Date.parse('2027-01-01T00:00:00Z');
const H = 3_600_000;

/** Hourly series from strings like "1100" (lit) and optional earth visibility. */
function series(lit: string, earth?: string): Timeseries {
  const n = lit.length;
  const t = Array.from({ length: n }, (_, i) => new Date(T0 + i * H).toISOString());
  return {
    version: 1,
    mock: true,
    site_id: 's',
    step_s: 3600,
    t_utc: t,
    sun_az: Array(n).fill(0),
    sun_el: Array(n).fill(0),
    earth_az: Array(n).fill(0),
    earth_el: Array(n).fill(0),
    lit: [...lit].map((c) => (c === '1' ? 1 : 0)),
    ...(earth ? { earth_visible: [...earth].map((c) => (c === '1' ? 1 : 0)) } : {}),
  };
}

const at = (hours: number) => new Date(T0 + hours * H).toISOString();
const win = (fromH: number, toH: number) => ({ startUtc: at(fromH), endUtc: at(toH) });

function site(name: string, slope: number, extra: Partial<Site> = {}): Site {
  return {
    id: name,
    name,
    lat: -89,
    lon: 0,
    elev_m: 0,
    valid: true,
    score: 0,
    reasons: [],
    metrics: {
      illum_pct: 0,
      earth_vis_pct: 0,
      slope_deg: slope,
      max_dark_hours: 0,
      psr_dist_km: 0,
    },
    ...extra,
  };
}

const stats = (p: Partial<MissionStats>): MissionStats => ({
  samples: 10,
  hours: 10,
  sunlitFraction: 0.5,
  longestNightH: 5,
  longestCommGapH: 2,
  ...p,
});

describe('longestRun', () => {
  it('finds the longest run of a value', () => {
    const f = series('1100011000').lit;
    expect(longestRun(f, 0, f.length, 0)).toBe(3);
    expect(longestRun(f, 0, f.length, 1)).toBe(2);
  });

  it('cuts runs that touch the window edge at the edge', () => {
    const f = series('0000110000').lit; // runs of 4 at both ends
    expect(longestRun(f, 2, 8, 0)).toBe(2);
    expect(longestRun(f, 0, 3, 0)).toBe(3);
  });
});

describe('window', () => {
  const ts = series('1111000011'); // 10 hourly samples, h0..h9

  it('slices [start, end) by timestamp', () => {
    expect(sliceIndices(ts, win(2, 6))).toEqual({ start: 2, end: 6 });
    expect(sliceIndices(ts, { startUtc: at(1.5), endUtc: at(3.5) })).toEqual({ start: 2, end: 4 });
  });

  it('is empty when the window is outside the data', () => {
    expect(sliceIndices(ts, win(20, 30))).toEqual({ start: 0, end: 0 });
    expect(sliceIndices(ts, win(-10, -5))).toEqual({ start: 0, end: 0 });
    expect(missionStats(ts, win(20, 30))).toMatchObject({ samples: 0, sunlitFraction: null });
  });

  it('uses the full range with no landing date and clamps out-of-range windows', () => {
    const range = { start_utc: at(0), end_utc: at(9), step_s: 3600 };
    expect(resolveWindow(range, { startUtc: null, durationDays: null })).toMatchObject({
      startUtc: at(0),
      endUtc: at(10),
      isFullRange: true,
    });
    const r = resolveWindow(range, { startUtc: at(5), durationDays: 30 });
    expect(r).toMatchObject({ startUtc: at(5), endUtc: at(10), clamped: true, isFullRange: false });
  });
});

describe('missionStats', () => {
  it('computes sunlight, longest night and longest comm gap in the window', () => {
    const ts = series('1100011100', '1000000111');
    const s = missionStats(ts, win(0, 10));
    expect(s.samples).toBe(10);
    expect(s.sunlitFraction).toBeCloseTo(0.5);
    expect(s.longestNightH).toBe(3);
    expect(s.longestCommGapH).toBe(6);
  });

  it('reports the comm gap as unknown when earth_visible is missing', () => {
    expect(missionStats(series('1100'), win(0, 4)).longestCommGapH).toBeNull();
  });
});

describe('requirements', () => {
  it('needs battery and load for the night check, panel and load for energy', () => {
    expect(activeChecks({ batteryWh: 1000 })).toEqual([]);
    expect(activeChecks({ batteryWh: 1000, loadW: 50 })).toEqual(['night']);
    expect(activeChecks({ panelW: 200, loadW: 50, maxCommGapH: 10, maxSlopeDeg: 8 })).toEqual([
      'energy',
      'comms',
      'slope',
    ]);
    expect(autonomyH({ batteryWh: 3000, loadW: 50 })).toBe(60);
  });

  it('passes and fails each requirement with a readable text', () => {
    const req: Requirements = {
      batteryWh: 3000,
      loadW: 50,
      panelW: 120,
      maxCommGapH: 4,
      maxSlopeDeg: 8,
    };
    const good = evaluateSite(
      site('A', 5),
      stats({ longestNightH: 38, sunlitFraction: 0.5, longestCommGapH: 3 }),
      req,
    );
    expect(good.candidate).toBe(true);
    expect(good.checks.map((c) => c.status)).toEqual(['pass', 'pass', 'pass', 'pass']);
    expect(good.checks[0]!.text).toBe('Longest night 38 h ≤ battery autonomy 60 h ✔');
    expect(good.checks[1]!.text).toBe('Mean solar power 60 W ≥ load 50 W ✔');

    const bad = evaluateSite(
      site('B', 12),
      stats({ longestNightH: 70, sunlitFraction: 0.3, longestCommGapH: 9 }),
      req,
    );
    expect(bad.candidate).toBe(false);
    expect(bad.checks.map((c) => c.status)).toEqual(['fail', 'fail', 'fail', 'fail']);
    expect(bad.checks[0]!.margin).toBe(-10);
    expect(bad.checks[3]!.text).toBe('Slope 12.0° > 8.0° ✖');
  });

  it('shows missing data as pending and does not let it count (same rule as @/scoring)', () => {
    const pendingSlope = site('C', 3, { pending_metrics: ['slope_deg'] } as Partial<Site>);
    const e = evaluateSite(pendingSlope, stats({ longestCommGapH: null }), {
      maxCommGapH: 10,
      maxSlopeDeg: 8,
    });
    expect(e.checks.map((c) => c.status)).toEqual(['unknown', 'unknown']);
    expect(e.pending).toBe(2);
    expect(e.candidate).toBe(true);
    expect(meetsText(e)).toBe('No requirement can be checked yet · 2 pending (no data)');

    // A real failure still rules the site out, whatever is pending.
    const f = evaluateSite(pendingSlope, stats({ longestCommGapH: 20 }), {
      maxCommGapH: 10,
      maxSlopeDeg: 8,
    });
    expect(f.candidate).toBe(false);
    expect(meetsText(f)).toBe('Meets 0 of 1 requirements · 1 pending (no data)');
  });

  it('passes a value exactly at the limit', () => {
    const e = evaluateSite(site('E', 8), stats({}), { maxSlopeDeg: 8 });
    expect(e.candidate).toBe(true);
    expect(meetsText(e)).toBe('Meets 1 of 1 requirements');
  });

  it('is not a candidate without any active requirement', () => {
    expect(evaluateSite(site('D', 1), stats({}), {}).candidate).toBe(false);
  });
});

describe('sortEvaluations', () => {
  const req: Requirements = { batteryWh: 3000, loadW: 50 };
  const evals = [
    evaluateSite(
      site('far', 2),
      stats({ longestNightH: 50, longestCommGapH: 9, sunlitFraction: 0.4 }),
      req,
    ),
    evaluateSite(
      site('near', 9),
      stats({ longestNightH: 10, longestCommGapH: 1, sunlitFraction: 0.9 }),
      req,
    ),
    evaluateSite(
      site('fails', 1),
      stats({ longestNightH: 80, longestCommGapH: 0, sunlitFraction: 0.95 }),
      req,
    ),
  ];
  const names = (by: Parameters<typeof sortEvaluations>[1]) =>
    sortEvaluations(evals, by, req).map((e) => e.site.name);

  it('puts candidates first, then sorts by the chosen key', () => {
    expect(names('battery_margin')).toEqual(['near', 'far', 'fails']);
    expect(names('flattest')).toEqual(['far', 'near', 'fails']);
    expect(names('comms')).toEqual(['near', 'far', 'fails']);
    expect(names('sunlight')).toEqual(['near', 'far', 'fails']);
  });
});

describe('missing data (review D1)', () => {
  const req: Requirements = { batteryWh: 3000, loadW: 50 };

  it('is not a candidate while its timeseries is missing (loading or failed)', () => {
    const e = evaluateSite(site('X', 1), null, req);
    expect(e.checks[0]!.status).toBe('unknown');
    expect(e.candidate).toBe(false);
    expect(meetsText(e)).toBe('No data for this site in the mission window');
  });

  it('is not a candidate when the window has no samples', () => {
    const range = { start_utc: at(0), end_utc: at(9), step_s: 3600 };
    const w = resolveWindow(range, { startUtc: at(50), durationDays: 1 });
    const s = missionStats(series('1111000011'), w);
    expect(s.samples).toBe(0);
    expect(evaluateSite(site('X', 1), s, req).candidate).toBe(false);
  });

  it('still lets pending terrain alone not count (Javi rule)', () => {
    const e = evaluateSite(
      site('Y', 3, { pending_metrics: ['slope_deg'] } as Partial<Site>),
      null,
      { maxSlopeDeg: 8 },
    );
    expect(e.candidate).toBe(true);
  });
});

describe('invalid values and ranks (review D2)', () => {
  it('ignores non-positive battery, load and panel and negative limits', () => {
    expect(activeChecks({ batteryWh: 3000, loadW: 0 })).toEqual([]);
    expect(activeChecks({ batteryWh: -1, loadW: 50 })).toEqual([]);
    expect(activeChecks({ panelW: 120, loadW: -5 })).toEqual([]);
    expect(activeChecks({ maxCommGapH: -1, maxSlopeDeg: -2 })).toEqual([]);
    expect(activeChecks({ maxCommGapH: 0, maxSlopeDeg: 0 })).toEqual(['comms', 'slope']);
  });

  it('numbers the top five only when the sort key has data', () => {
    const pending = (n: string) => site(n, 1, { pending_metrics: ['slope_deg'] } as Partial<Site>);
    const evals = ['b', 'a', 'c'].map((n) =>
      evaluateSite(pending(n), stats({}), { maxSlopeDeg: 8 }),
    );
    const sorted = sortEvaluations(evals, 'flattest', { maxSlopeDeg: 8 });
    expect(topRanks(sorted, 'flattest', { maxSlopeDeg: 8 }).size).toBe(0);
    const ranked = topRanks(sorted, 'sunlight', { maxSlopeDeg: 8 });
    expect(ranked.size).toBe(3);
  });
});

describe('comm gap at the start of the window (synthetic)', () => {
  it('counts a gap that starts at the first sample', () => {
    expect(missionStats(series('1111', '0001'), win(0, 4)).longestCommGapH).toBe(3);
  });
});

describe('real data: shackleton_rim_01 over the whole manifest range', () => {
  const DATA = join(__dirname, '..', '..', 'public', 'data');
  const read = <T>(p: string): T => JSON.parse(readFileSync(join(DATA, p), 'utf8')) as T;
  const manifest = read<DataManifest>('manifest.json');
  const ts = read<Timeseries>('timeseries/shackleton_rim_01.json');
  const window = resolveWindow(manifest.time_range, { startUtc: null, durationDays: null });

  it('uses every sample and finds a comm gap (values change when the data is regenerated)', () => {
    const s = missionStats(ts, window);
    expect(s.samples).toBe(ts.t_utc.length);
    expect(s.longestCommGapH).not.toBeNull();
    expect(s.longestNightH).not.toBeNull();
  });
});
