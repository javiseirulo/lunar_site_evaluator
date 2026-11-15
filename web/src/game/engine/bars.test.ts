import { describe, expect, it } from 'vitest';
import type { Site } from '@lunar/contracts';
import {
  BAR_LABELS,
  barColor,
  difficultyHint,
  qualityBars,
  RUN_ZERO_H,
  type Difficulty,
} from './bars';

function makeSite(over: Partial<Site['metrics']> = {}, pending?: Site['pending_metrics']): Site {
  return {
    id: 'test',
    name: 'Test',
    lat: -89,
    lon: 0,
    elev_m: 0,
    valid: true,
    score: 0.5,
    metrics: {
      illum_pct: 0.8,
      earth_vis_pct: 0.6,
      slope_deg: 3,
      max_dark_hours: 360,
      psr_dist_km: 2,
      max_blackout_hours: 0,
      sun_earth_pct: 0.5,
      ...over,
    },
    reasons: [],
    ...(pending && { pending_metrics: pending }),
  };
}

const real = makeSite();
const terrainPending = makeSite({ slope_deg: 0, psr_dist_km: 0 }, ['slope_deg', 'psr_dist_km']);
const keys = (s: Site, d: Difficulty) => qualityBars(s, d).map((b) => b.key);

describe('qualityBars', () => {
  it('normal shows Sunlight, Earth view, Sun + Earth, and Slope only when it is real', () => {
    expect(keys(real, 'normal')).toEqual([
      'illum_pct',
      'earth_vis_pct',
      'sun_earth_pct',
      'slope_deg',
    ]);
    expect(keys(terrainPending, 'normal')).toEqual(['illum_pct', 'earth_vis_pct', 'sun_earth_pct']);
  });

  it('expert adds dark, blackout and icy craters, and omits pending metrics', () => {
    expect(keys(real, 'expert')).toEqual([
      'illum_pct',
      'earth_vis_pct',
      'sun_earth_pct',
      'slope_deg',
      'max_dark_hours',
      'max_blackout_hours',
      'psr_dist_km',
    ]);
    expect(keys(terrainPending, 'expert')).toEqual([
      'illum_pct',
      'earth_vis_pct',
      'sun_earth_pct',
      'max_dark_hours',
      'max_blackout_hours',
    ]);
  });

  it('omits optional metrics the site does not have', () => {
    const old = makeSite({ max_blackout_hours: undefined, sun_earth_pct: undefined });
    expect(keys(old, 'expert')).not.toContain('max_blackout_hours');
    expect(keys(old, 'expert')).not.toContain('sun_earth_pct');
    expect(keys(old, 'normal')).toEqual(['illum_pct', 'earth_vis_pct', 'slope_deg']);
  });

  it('every label is in BAR_LABELS, in order, and the menu hint matches', () => {
    for (const d of ['normal', 'expert'] as const) {
      for (const s of [real, terrainPending]) {
        const labels = qualityBars(s, d).map((b) => b.label);
        const positions = labels.map((l) => BAR_LABELS[d].indexOf(l));
        expect(positions.every((p) => p >= 0)).toBe(true);
        expect([...positions].sort((a, b) => a - b)).toEqual(positions);
        expect(difficultyHint(d, s)).toBe(`${labels.length} bars: ${labels.join(', ')}`);
      }
      expect(difficultyHint(d)).toBe(`${BAR_LABELS[d].length} bars: ${BAR_LABELS[d].join(', ')}`);
    }
  });

  it('slope maps 0 deg to 100 and 20 deg to 0', () => {
    const v = (d: number) =>
      qualityBars(makeSite({ slope_deg: d }), 'normal').find((b) => b.key === 'slope_deg')!.value;
    expect(v(0)).toBe(100);
    expect(v(20)).toBe(0);
    expect(v(10)).toBe(50);
  });

  it('run bars (measured over a year) map 0 h to 100 and RUN_ZERO_H (2000 h) or more to 0', () => {
    expect(RUN_ZERO_H).toBe(2000);
    const bar = (key: string, h: number) =>
      qualityBars(makeSite({ max_dark_hours: h, max_blackout_hours: h }), 'expert').find(
        (b) => b.key === key,
      )!.value;
    for (const key of ['max_dark_hours', 'max_blackout_hours']) {
      expect(bar(key, 0)).toBe(100);
      expect(bar(key, 1000)).toBe(50);
      expect(bar(key, 2000)).toBe(0);
      expect(bar(key, 3911)).toBe(0);
    }
  });

  it('barColor endpoints', () => {
    expect(barColor(0)).toBe('#5a0f0f');
    expect(barColor(100)).toBe('#a8f0a0');
  });
});
