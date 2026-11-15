import { describe, expect, it } from 'vitest';
import type { Site, Timeseries } from '@lunar/contracts';
import { coachWin, projectLonger, weakestCriteria } from './coaching';
import { DEFAULT_REQUIREMENTS as REQ } from './requirements';
import { simulate } from './simulate';

function makeTs(lit: (0 | 1)[], earthVisible?: (0 | 1)[]): Timeseries {
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
    earth_el: new Array(n).fill(10),
    lit,
    earth_visible: earthVisible ?? new Array(n).fill(1),
  };
}

const site = (pending: NonNullable<Site['pending_metrics']> = []): Site => ({
  id: 'test',
  name: 'Test',
  lat: -89,
  lon: 0,
  elev_m: 0,
  valid: true,
  score: 0.5,
  metrics: { illum_pct: 0.9, earth_vis_pct: 0.9, slope_deg: 2, max_dark_hours: 0, psr_dist_km: 1 },
  reasons: [],
  pending_metrics: pending,
});

/** Lit for the first 90 h, then dark for good: a 2-star week that fails on day 8 if extended. */
const lateNight = (n: number) => makeTs(Array.from({ length: n }, (_, i) => (i < 90 ? 1 : 0)));

describe('coachWin', () => {
  it('returns null for 3-star wins and losses', () => {
    const ts = makeTs(new Array(400).fill(1));
    const v = simulate(site(), ts, 0, REQ);
    expect(v.stars).toBe(3);
    expect(coachWin(site(), ts, 0, v, REQ)).toBeNull();
    const lost = simulate(site(), lateNight(400), 0, { ...REQ, surface_days: 9 });
    expect(coachWin(site(), lateNight(400), 0, lost, REQ)).toBeNull();
  });

  it('lists the weakest criteria and the day a longer mission fails', () => {
    const ts = lateNight(400);
    const v = simulate(site(), ts, 0, REQ);
    expect(v).toMatchObject({ win: true, stars: 2 });
    const c = coachWin(site(), ts, 0, v, REQ)!;
    expect(c.weakest.map((w) => w.key)).toEqual(['illum', 'dark']);
    expect(c.weakest[0]?.text).toBe('Sunlight 54% — 3★ needs ~85%');
    expect(c.weakest[1]?.text).toBe('Longest dark 78 h — 3★ needs 24 h or less');
    expect(c.projection).toMatchObject({ survives: false, cause: 'cold', day: 8, days: 14 });
    expect(c.projection!.text).toBe(
      'If the mission had lasted 7 more days, the night would have passed 100 h on day 8.',
    );
  });

  it('says so when the mission would survive 14 days, and caps at the series end', () => {
    const ts = makeTs(new Array(400).fill(1));
    expect(projectLonger(site(), ts, 0, REQ)).toMatchObject({ survives: true, days: 14 });
    expect(projectLonger(site(), makeTs(new Array(216).fill(1)), 0, REQ)).toMatchObject({
      survives: true,
      days: 9,
    });
    expect(projectLonger(site(), makeTs(new Array(168).fill(1)), 0, REQ)).toBeNull();
  });

  it('skips pending metrics', () => {
    const ts = lateNight(400);
    const v = simulate(site(), ts, 0, REQ);
    const w = weakestCriteria(site(['illum_pct']), v, REQ);
    expect(w.map((x) => x.key)).toEqual(['dark']);
  });
});
