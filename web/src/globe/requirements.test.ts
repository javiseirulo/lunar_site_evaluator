import { describe, expect, it } from 'vitest';
import type { MissionConfig, Site } from '@lunar/contracts';
import { evaluateSite, rankSites, utility } from './requirements';

const site = (id: string, m: Partial<Site['metrics']>, valid = true): Site => ({
  id,
  name: id,
  lat: -89,
  lon: 0,
  elev_m: 0,
  valid,
  score: 0,
  reasons: [],
  metrics: {
    illum_pct: 0.7,
    earth_vis_pct: 0.7,
    slope_deg: 5,
    max_dark_hours: 60,
    psr_dist_km: 3,
    ...m,
  },
});

const config: Pick<MissionConfig, 'requirements' | 'weights'> = {
  requirements: {
    illum_pct: { threshold: 0.5, objective: 0.9 },
    slope_deg: { threshold: 10, objective: 2 },
    max_blackout_hours: { threshold: 72, objective: 12 }, // not in v1 data → skipped
  },
  weights: { illum_pct: 0.5, slope_deg: 0.5, max_blackout_hours: 1 },
};

describe('utility', () => {
  it('is 0 at the threshold and 1 at the objective (more is better)', () => {
    expect(utility(0.5, { threshold: 0.5, objective: 0.9 }, 'high')).toBe(0);
    expect(utility(0.7, { threshold: 0.5, objective: 0.9 }, 'high')).toBeCloseTo(0.5);
    expect(utility(0.95, { threshold: 0.5, objective: 0.9 }, 'high')).toBe(1);
    expect(utility(0.4, { threshold: 0.5, objective: 0.9 }, 'high')).toBe(0);
  });

  it('is inverted when less is better', () => {
    expect(utility(6, { threshold: 10, objective: 2 }, 'low')).toBeCloseTo(0.5);
    expect(utility(12, { threshold: 10, objective: 2 }, 'low')).toBe(0);
  });

  it('is 1 for any passing value without an objective or past it', () => {
    expect(utility(0.6, { threshold: 0.5 }, 'high')).toBe(1);
    expect(utility(0.95, { threshold: 0.95, objective: 0.9 }, 'high')).toBe(1);
  });
});

describe('evaluateSite', () => {
  it('skips metrics without data and normalises by the weights used', () => {
    const e = evaluateSite(site('a', { illum_pct: 0.7, slope_deg: 6 }), config);
    expect(e.criteria.map((c) => c.key).sort()).toEqual(['illum_pct', 'slope_deg']);
    expect(e.pass).toBe(true);
    expect(e.score).toBeCloseTo(0.5);
  });

  it('lists failed requirements, worst margin first', () => {
    const e = evaluateSite(site('b', { illum_pct: 0.45, slope_deg: 20 }), config);
    expect(e.pass).toBe(false);
    expect(e.failed.map((c) => c.key)).toEqual(['slope_deg', 'illum_pct']);
  });

  it('fails a site the safety filter rejects even if it meets the requirements', () => {
    const e = evaluateSite(site('c', {}, false), config);
    expect(e.safe).toBe(false);
    expect(e.pass).toBe(false);
  });
});

describe('rankSites', () => {
  it('puts passing sites first by score, then the rest by fewest misses', () => {
    const ranked = rankSites(
      [
        site('fail2', { illum_pct: 0.1, slope_deg: 30 }),
        site('ok-low', { illum_pct: 0.55, slope_deg: 9 }),
        site('fail1', { illum_pct: 0.1 }),
        site('ok-high', { illum_pct: 0.9, slope_deg: 2 }),
      ],
      config,
    );
    expect(ranked.map((r) => r.site.id)).toEqual(['ok-high', 'ok-low', 'fail1', 'fail2']);
  });
});
