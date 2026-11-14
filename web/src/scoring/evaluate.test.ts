import { describe, expect, it } from 'vitest';
import type { MissionConfig, RequirementKey, Timeseries } from '@lunar/contracts';
import golden from '../../../contracts/fixtures/golden-score.json';
import { computeArrival } from './arrival';
import { bestDateCurve, paretoFront } from './curves';
import { DEFAULT_MISSION_CONFIG } from './defaults';
import {
  evaluateSite,
  mergeMissionConfig,
  rankSites,
  windowMetrics,
  windowSlice,
} from './evaluate';
import { temporalRobustness } from './robustness';
import { margin, utility } from './utility';

const H = 3_600_000;
const t0 = Date.parse('2027-01-01T00:00:00Z');

function series(n: number, lit: (i: number) => 0 | 1, ev: (i: number) => 0 | 1): Timeseries {
  const iso = (i: number) => `${new Date(t0 + i * H).toISOString().slice(0, 19)}Z`;
  const L = Array.from({ length: n }, (_, i) => lit(i));
  return {
    version: 1,
    mock: false,
    site_id: 't',
    step_s: 3600,
    t_utc: Array.from({ length: n }, (_, i) => iso(i)),
    sun_az: L.map(() => 0),
    sun_el: L.map((l) => (l ? 10 : -5)),
    earth_az: L.map(() => 0),
    earth_el: L.map(() => 5),
    lit: L,
    earth_visible: Array.from({ length: n }, (_, i) => ev(i)),
    sun_frac: L.map((l) => (l ? 1 : 0)),
  } as Timeseries;
}

describe('golden-score.json', () => {
  for (const c of golden.cases) {
    it(c.name, () => {
      const ev = evaluateSite(
        { metrics: c.metrics, pending: (c as { pending?: RequirementKey[] }).pending },
        golden.config as Pick<MissionConfig, 'requirements' | 'weights'>,
      );
      expect(ev.valid).toBe(c.expected.valid);
      expect(ev.score).toBeCloseTo(c.expected.score, 3);
      for (const ch of ev.checks) {
        if (ch.pending) expect([ch.ok, ch.value, ch.margin]).toEqual([true, null, null]);
        else expect(Number.isNaN(ch.margin)).toBe(false);
      }
    });
  }
});

describe('utility / margin', () => {
  it('at threshold passes with margin 0', () => {
    const req = { threshold: 8, objective: 2 };
    expect(margin('slope_deg', 8, req)).toBe(0);
    expect(utility('slope_deg', 5, req)).toBeCloseTo(0.5);
  });
});

describe('windowMetrics', () => {
  it('half-open window, first sample at ceil hour, sun_earth = mean(frac·ev)', () => {
    const ts = series(
      10,
      (i) => (i < 4 ? 1 : 0),
      (i) => (i % 2 === 0 ? 1 : 0),
    );
    const start = new Date(t0 + 0.5 * H).toISOString();
    const end = new Date(t0 + 6 * H).toISOString();
    expect(windowSlice(ts, start, end)).toEqual([1, 6]);
    const m = windowMetrics(ts, start, end);
    expect(m.samples).toBe(5);
    expect(m.illum_pct).toBeCloseTo(3 / 5);
    expect(m.max_dark_hours).toBe(2);
    expect(m.sun_earth_pct).toBeCloseTo(1 / 5);
  });
  it('no Earth data → pending, not NaN', () => {
    const ts = series(
      5,
      () => 1,
      () => 1,
    );
    delete (ts as Partial<Timeseries>).earth_visible;
    const m = windowMetrics(ts);
    expect(m.earth_vis_pct).toBeNull();
    const ev = evaluateSite({ metrics: m }, DEFAULT_MISSION_CONFIG);
    expect(ev.checks.find((c) => c.key === 'earth_vis_pct')?.pending).toBe(true);
  });
});

describe('rankSites / mergeMissionConfig / pareto / robustness', () => {
  it('ranks valid first', () => {
    const r = rankSites([
      { id: 'a', valid: false, score: 0.9 },
      { id: 'b', valid: true, score: 0.2 },
      { id: 'c', valid: true, score: 0.5 },
    ]);
    expect(r.map((x) => x.id)).toEqual(['c', 'b', 'a']);
  });
  it('deep-merges requirements and weights', () => {
    const m = mergeMissionConfig({
      surface_days: 3,
      requirements: { slope_deg: { threshold: 5 } },
      weights: { illum_pct: 1 },
    });
    expect(m.surface_days).toBe(3);
    expect(m.requirements.slope_deg).toEqual({ threshold: 5, objective: 2 });
    expect(m.requirements.illum_pct).toEqual(DEFAULT_MISSION_CONFIG.requirements.illum_pct);
    expect(m.weights.illum_pct).toBe(1);
    expect(m.weights.slope_deg).toBe(0.2);
  });
  it('pareto front', () => {
    expect(
      paretoFront([
        { id: 'a', x: 1, y: 1 },
        { id: 'b', x: 2, y: 0 },
        { id: 'c', x: 0.5, y: 0.5 },
      ]),
    ).toEqual(['a', 'b']);
  });
  it('robustness and best-date curve on an always-good series', () => {
    const ts = series(
      24 * 20,
      () => 1,
      () => 1,
    );
    const cfg = mergeMissionConfig({ surface_days: 2 });
    const site = { metrics: { slope_deg: 3 } as never };
    const win = {
      start_utc: new Date(t0 + 5 * 24 * H).toISOString(),
      end_utc: new Date(t0 + 7 * 24 * H).toISOString(),
    };
    const r = temporalRobustness(site, ts, cfg, win, 3);
    expect(r.total).toBe(6);
    expect(r.valid_count).toBe(6);
    const curve = bestDateCurve(
      site,
      ts,
      cfg,
      new Date(t0).toISOString(),
      new Date(t0 + 30 * 24 * H).toISOString(),
    );
    expect(curve.length).toBe(19);
  });
});

describe('computeArrival distance provider', () => {
  const cfg = mergeMissionConfig({ time_mode: 'mission', trajectory: 'hohmann' });
  it('uses SPICE when available, Meeus otherwise', () => {
    expect(computeArrival(cfg, null, { earthMoonKm: () => 380_000 }).earth_moon_source).toBe(
      'spice',
    );
    expect(computeArrival(cfg, null, { earthMoonKm: () => 380_000 }).earth_moon_km).toBe(380_000);
    expect(computeArrival(cfg, null, { earthMoonKm: () => null }).earth_moon_source).toBe('meeus');
  });
});
