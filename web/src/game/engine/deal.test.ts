import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Site, SitesFile, Timeseries } from '@lunar/contracts';
import { BAR_LABELS, barColor, difficultyHint, qualityBars } from './bars';
import { deal } from './deal';
import { DEFAULT_REQUIREMENTS } from './requirements';
import { mulberry32, shuffle } from './random';

const DATA = join(__dirname, '..', '..', '..', 'public', 'data');
const read = <T>(p: string): T => JSON.parse(readFileSync(join(DATA, p), 'utf8')) as T;

const sites = read<SitesFile>('sites.json').sites;
const series: Record<string, Timeseries> = {};
for (const s of sites) series[s.id] = read<Timeseries>(`timeseries/${s.id}.json`);

describe('random', () => {
  it('mulberry32 is deterministic and in [0,1)', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    const xs = Array.from({ length: 5 }, () => a());
    expect(xs).toEqual(Array.from({ length: 5 }, () => b()));
    xs.forEach((x) => {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    });
  });

  it('shuffle returns a permutation without mutating the input', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, mulberry32(1));
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual(input);
  });
});

describe('deal', () => {
  const order = (seed: number) => deal(sites, series, seed)!.cards.map((c) => c.siteId);

  it('is deterministic per seed', () => {
    expect(deal(sites, series, 42)).toEqual(deal(sites, series, 42));
  });

  it('different seeds give different slot order', () => {
    const base = order(0).join();
    const differing = Array.from({ length: 10 }, (_, i) => i + 1).filter(
      (s) => order(s).join() !== base,
    );
    expect(differing.length).toBeGreaterThanOrEqual(9);
  });

  it('every hand has 4 unique cards, slots 1-4, at least one win and one loss', () => {
    for (let seed = 0; seed < 50; seed++) {
      const hand = deal(sites, series, seed)!;
      expect(hand.cards).toHaveLength(4);
      expect(hand.cards.map((c) => c.slot)).toEqual([1, 2, 3, 4]);
      expect(new Set(hand.cards.map((c) => c.siteId)).size).toBe(4);
      expect(hand.cards.some((c) => c.verdict.win)).toBe(true);
      expect(hand.cards.some((c) => !c.verdict.win)).toBe(true);
    }
  });

  it('keeps the window inside every series and sets landingUtc', () => {
    const len = Math.min(...Object.values(series).map((t) => t.t_utc.length));
    for (let seed = 0; seed < 50; seed++) {
      const hand = deal(sites, series, seed)!;
      expect(hand.startIndex % 24).toBe(0);
      expect(hand.startIndex + DEFAULT_REQUIREMENTS.surface_days * 24).toBeLessThanOrEqual(len);
      const first = series[hand.cards[0]!.siteId]!;
      expect(hand.landingUtc).toBe(first.t_utc[hand.startIndex]);
    }
  });

  it('returns null when every site loses', () => {
    const dark: Record<string, Timeseries> = {};
    for (const [id, ts] of Object.entries(series)) {
      dark[id] = { ...ts, lit: ts.lit.map(() => 0) };
    }
    expect(deal(sites, dark, 1)).toBeNull();
  });

  it('skips sites without a series', () => {
    // Keep only the series of a known-valid hand's four sites: deal must still find a hand,
    // and only with those sites.
    const full = deal(sites, series, 3)!;
    const partial: Record<string, Timeseries> = {};
    for (const c of full.cards) partial[c.siteId] = series[c.siteId]!;
    const hand = deal(sites, partial, 3);
    expect(hand).not.toBeNull();
    expect(new Set(hand!.cards.map((c) => c.siteId))).toEqual(new Set(Object.keys(partial)));
  });
});

describe('qualityBars', () => {
  const site = (slope: number): Site => ({
    ...sites[0]!,
    metrics: { ...sites[0]!.metrics, slope_deg: slope },
  });

  it('BAR_LABELS and the menu hint match qualityBars', () => {
    for (const d of ['normal', 'expert'] as const) {
      expect(qualityBars(sites[0]!, d).map((b) => b.label)).toEqual(BAR_LABELS[d]);
      expect(difficultyHint(d)).toBe(`${BAR_LABELS[d].length} bars: ${BAR_LABELS[d].join(', ')}`);
    }
  });

  it('normal and expert keys', () => {
    expect(qualityBars(site(3), 'normal').map((b) => b.key)).toEqual([
      'illum_pct',
      'earth_vis_pct',
      'slope_deg',
    ]);
    expect(qualityBars(site(3), 'expert').map((b) => b.key)).toEqual([
      'illum_pct',
      'earth_vis_pct',
      'slope_deg',
      'max_dark_hours',
      'psr_dist_km',
    ]);
  });

  it('slope maps 0 deg to 100 and 20 deg to 0', () => {
    const v = (d: number) =>
      qualityBars(site(d), 'normal').find((b) => b.key === 'slope_deg')!.value;
    expect(v(0)).toBe(100);
    expect(v(20)).toBe(0);
    expect(v(10)).toBe(50);
  });

  it('barColor endpoints', () => {
    expect(barColor(0)).toBe('#5a0f0f');
    expect(barColor(100)).toBe('#a8f0a0');
  });
});
