import { describe, expect, it } from 'vitest';
import type { Site, Timeseries } from '@lunar/contracts';
import { DEFAULT_REQUIREMENTS } from './requirements';
import { isPending, simulate, starsFor, utility } from './simulate';

const HOURS = 168;

function makeTs(lit: (0 | 1)[], earthVisible: (0 | 1)[], earthEl?: number[]): Timeseries {
  const n = lit.length;
  return {
    version: 1,
    mock: true,
    site_id: 'test',
    step_s: 3600,
    t_utc: Array.from({ length: n }, (_, i) => new Date(i * 3600_000).toISOString()),
    sun_az: new Array(n).fill(0),
    sun_el: new Array(n).fill(0),
    earth_az: new Array(n).fill(0),
    earth_el: earthEl ?? new Array(n).fill(10),
    lit,
    earth_visible: earthVisible,
  };
}

function makeSite(slope: number): Site {
  return {
    id: 'test',
    name: 'Test',
    lat: -89,
    lon: 0,
    elev_m: 0,
    valid: true,
    score: 0.5,
    metrics: {
      illum_pct: 0.9,
      earth_vis_pct: 0.9,
      slope_deg: slope,
      max_dark_hours: 0,
      psr_dist_km: 1,
    },
    reasons: [],
  };
}

const ones = (n: number): (0 | 1)[] => new Array(n).fill(1);

describe('simulate', () => {
  it('fails on slope at the landing hour', () => {
    const v = simulate(makeSite(12), makeTs(ones(HOURS), ones(HOURS)), 0);
    expect(v).toMatchObject({ win: false, cause: 'slope', failHour: 0, stars: 0 });
  });

  it('fails cold at the hour a dark run exceeds the limit', () => {
    const lit = ones(HOURS);
    for (let i = 10; i < 111; i++) lit[i] = 0; // 101 h
    const v = simulate(makeSite(2), makeTs(lit, ones(HOURS)), 0);
    expect(v).toMatchObject({ win: false, cause: 'cold', failHour: 110 });
  });

  it('fails blackout when Earth is below the antenna margin for 73 h', () => {
    const el = new Array(HOURS).fill(10);
    for (let i = 0; i < 73; i++) el[i] = 1;
    const v = simulate(makeSite(2), makeTs(ones(HOURS), ones(HOURS), el), 0);
    expect(v).toMatchObject({ win: false, cause: 'blackout', failHour: 72 });
  });

  it('the earlier failure wins when cold and blackout both happen', () => {
    const lit = ones(HOURS);
    for (let i = 0; i < 101; i++) lit[i] = 0; // cold at 100
    const el = new Array(HOURS).fill(10);
    for (let i = 0; i < 73; i++) el[i] = 1; // blackout at 72
    const v = simulate(makeSite(2), makeTs(lit, ones(HOURS), el), 0);
    expect(v).toMatchObject({ cause: 'blackout', failHour: 72 });
  });

  it('aggregate low_comm fails at the last hour', () => {
    // 40 % link in short runs (24 h up / 36 h down), never a run > 72 h
    const ev: (0 | 1)[] = Array.from({ length: HOURS }, (_, i) => (i % 60 < 24 ? 1 : 0));
    const linked = ev.filter((x) => x === 1).length / HOURS;
    expect(linked).toBeLessThan(0.5);
    const v = simulate(makeSite(2), makeTs(ones(HOURS), ev), 0);
    expect(v).toMatchObject({ win: false, cause: 'low_comm', failHour: 167 });
  });

  it('aggregate low_sun fails at the last hour, before low_comm', () => {
    const lit: (0 | 1)[] = Array.from({ length: HOURS }, (_, i) => (i % 60 < 24 ? 1 : 0));
    const v = simulate(makeSite(2), makeTs(lit, ones(HOURS)), 0);
    expect(v).toMatchObject({ cause: 'low_sun', failHour: 167 });
  });

  it('wins with 3 stars on a perfect site', () => {
    const v = simulate(makeSite(2), makeTs(ones(HOURS), ones(HOURS)), 0);
    expect(v).toMatchObject({ win: true, stars: 3, cause: null, failHour: null });
    expect(v.score).toBeGreaterThan(0.8);
  });

  it('honours startIndex and throws RangeError past the end', () => {
    const ts = makeTs(ones(HOURS + 10), ones(HOURS + 10));
    expect(simulate(makeSite(2), ts, 10).win).toBe(true);
    expect(() => simulate(makeSite(2), ts, 11)).toThrow(RangeError);
    expect(DEFAULT_REQUIREMENTS.surface_days).toBe(7);
  });

  it('a pending slope is neither a failure nor part of the score', () => {
    const ts = makeTs(ones(HOURS), ones(HOURS));
    const steep: Site = { ...makeSite(12), pending_metrics: ['slope_deg', 'psr_dist_km'] };
    expect(isPending(steep, 'slope_deg')).toBe(true);
    expect(isPending(makeSite(12), 'slope_deg')).toBe(false);
    const v = simulate(steep, ts, 0);
    expect(v).toMatchObject({ win: true, cause: null, stars: 3 });
    expect(v.metrics.slope_deg).toBeNull();
    // Perfect window: the 4 remaining criteria are all at their objective.
    expect(v.score).toBe(1);
    // The same steep slope, when real, fails at landing and drags the score down.
    const real = simulate(makeSite(12), ts, 0);
    expect(real).toMatchObject({ win: false, cause: 'slope', failHour: 0 });
    expect(real.score).toBeCloseTo(4 / 5);
  });
});

describe('utility', () => {
  const c = { threshold: 100, objective: 24 };
  it('is 1 at the objective, 0 at the threshold, clamped beyond', () => {
    expect(utility(24, c)).toBe(1);
    expect(utility(100, c)).toBe(0);
    expect(utility(150, c)).toBe(0);
    expect(utility(0, c)).toBe(1);
    expect(utility(62, c)).toBeCloseTo(0.5);
  });
  it('works for higher-is-better criteria', () => {
    const k = { threshold: 0.5, objective: 0.95 };
    expect(utility(0.95, k)).toBe(1);
    expect(utility(0.5, k)).toBe(0);
    expect(utility(0.2, k)).toBe(0);
    expect(utility(1, k)).toBe(1);
  });
});

describe('review fixes', () => {
  it('utility is 1, not NaN, when threshold equals objective', () => {
    expect(utility(5, { threshold: 3, objective: 3 })).toBe(1);
  });

  it('star boundaries sit at 1/3 and 2/3', () => {
    expect(starsFor(0)).toBe(1);
    expect(starsFor(1 / 3 - 1e-9)).toBe(1);
    expect(starsFor(1 / 3)).toBe(2);
    expect(starsFor(2 / 3 - 1e-9)).toBe(2);
    expect(starsFor(2 / 3)).toBe(3);
    expect(starsFor(1)).toBe(3);
  });

  it('a run failure reports the limit and the failing hour, not the longest run', () => {
    // Always dark: the run exceeds 100 h at hour 100 even though the longest run is 168 h.
    const v = simulate(makeSite(1), makeTs(new Array(HOURS).fill(0), new Array(HOURS).fill(1)), 0);
    expect(v).toMatchObject({ win: false, cause: 'cold', failHour: 100 });
    expect(v.detail).toBe('Night lasted over 100 h (failed at hour 100)');
  });
});
