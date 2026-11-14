import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Site, SitesFile, Timeseries } from '@lunar/contracts';
import { deal, pickSubset, sampleStarts, southPoleSites, SUBSET_SIZE } from './deal';
import { DEFAULT_REQUIREMENTS } from './requirements';
import { mulberry32, shuffle } from './random';

const HOURS = DEFAULT_REQUIREMENTS.surface_days * 24;

// ---- Synthetic fixtures: outcomes never depend on the live data files. ----

type Kind = 'win' | 'cold' | 'blackout' | 'slope';

/** A series whose every 7-day window gives the same outcome for `kind`. */
function makeTs(id: string, kind: Kind, days: number): Timeseries {
  const n = days * 24;
  return {
    version: 1,
    mock: true,
    site_id: id,
    step_s: 3600,
    t_utc: Array.from({ length: n }, (_, i) =>
      new Date(Date.UTC(2027, 0, 1) + i * 3600_000).toISOString(),
    ),
    sun_az: new Array(n).fill(0),
    sun_el: new Array(n).fill(5),
    earth_az: new Array(n).fill(0),
    earth_el: new Array(n).fill(kind === 'blackout' ? -5 : 10),
    lit: new Array(n).fill(kind === 'cold' ? 0 : 1),
    earth_visible: new Array(n).fill(kind === 'blackout' ? 0 : 1),
  };
}

function makeSite(id: string, kind: Kind): Site {
  return {
    id,
    name: id,
    lat: -89,
    lon: 0,
    elev_m: 0,
    valid: true,
    score: 0.5,
    metrics: {
      illum_pct: 0.9,
      earth_vis_pct: 0.9,
      slope_deg: kind === 'slope' ? 15 : 2,
      max_dark_hours: 0,
      psr_dist_km: 1,
    },
    reasons: [],
    region: 'south_pole',
  };
}

const KINDS: [string, Kind][] = [
  ['w1', 'win'],
  ['w2', 'win'],
  ['c1', 'cold'],
  ['c2', 'cold'],
  ['c3', 'cold'],
  ['b1', 'blackout'],
  ['s1', 'slope'],
];

function fixture(days = 30): { sites: Site[]; series: Record<string, Timeseries> } {
  const sites = KINDS.map(([id, k]) => makeSite(id, k));
  const series: Record<string, Timeseries> = {};
  for (const [id, k] of KINDS) series[id] = makeTs(id, k, days);
  return { sites, series };
}

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

describe('pickSubset / southPoleSites / sampleStarts', () => {
  const ids = Array.from({ length: 30 }, (_, i) => `site_${i}`);

  it('picks a deterministic subset of unique items, different per attempt', () => {
    const a = pickSubset(ids, 5);
    expect(a).toHaveLength(SUBSET_SIZE);
    expect(new Set(a).size).toBe(SUBSET_SIZE);
    expect(pickSubset(ids, 5)).toEqual(a);
    expect(pickSubset(ids, 5, 1)).not.toEqual(a);
    expect(pickSubset(ids, 6)).not.toEqual(a);
    expect(pickSubset(ids.slice(0, 3), 5)).toHaveLength(3);
  });

  it('keeps only south_pole sites', () => {
    const { sites } = fixture();
    const north: Site = { ...sites[0]!, id: 'n', region: 'north_pole' };
    const unknown: Site = { ...sites[0]!, id: 'u', region: undefined };
    expect(southPoleSites([...sites, north, unknown]).map((s) => s.id)).toEqual(
      sites.map((s) => s.id),
    );
  });

  it('samples at most `max` distinct daily starts whose window fits', () => {
    const length = 365 * 24;
    const starts = sampleStarts(length, HOURS, mulberry32(3), 40);
    expect(starts).toHaveLength(40);
    expect(new Set(starts).size).toBe(40);
    for (const s of starts) {
      expect(s % 24).toBe(0);
      expect(s + HOURS).toBeLessThanOrEqual(length);
    }
    expect(sampleStarts(length, HOURS, mulberry32(3), 40)).toEqual(starts);
    expect(sampleStarts(9 * 24, HOURS, mulberry32(3), 40)).toHaveLength(3);
  });
});

describe('deal (synthetic)', () => {
  const { sites, series } = fixture();
  const order = (seed: number) => deal(sites, series, seed)!.cards.map((c) => c.siteId);

  it('is deterministic per seed', () => {
    expect(deal(sites, series, 42)).toEqual(deal(sites, series, 42));
  });

  it('different seeds give different slot order', () => {
    const base = order(0).join();
    const differing = Array.from({ length: 10 }, (_, i) => i + 1).filter(
      (s) => order(s).join() !== base,
    );
    expect(differing.length).toBeGreaterThanOrEqual(8);
  });

  it('4 unique cards, slots 1-4, ≥1 win, ≥1 loss, losers with distinct causes', () => {
    for (let seed = 0; seed < 30; seed++) {
      const hand = deal(sites, series, seed)!;
      expect(hand.cards).toHaveLength(4);
      expect(hand.cards.map((c) => c.slot)).toEqual([1, 2, 3, 4]);
      expect(new Set(hand.cards.map((c) => c.siteId)).size).toBe(4);
      const losers = hand.cards.filter((c) => !c.verdict.win);
      expect(hand.cards.some((c) => c.verdict.win)).toBe(true);
      expect(losers.length).toBeGreaterThanOrEqual(1);
      // 3 loss causes are available, so the losers never repeat one.
      expect(new Set(losers.map((c) => c.verdict.cause)).size).toBe(losers.length);
    }
  });

  it('only simulates sampled starts inside the series, over a year of data', () => {
    const year = fixture(365);
    const len = 365 * 24;
    for (let seed = 0; seed < 10; seed++) {
      const hand = deal(year.sites, year.series, seed)!;
      expect(hand.startIndex % 24).toBe(0);
      expect(hand.startIndex + HOURS).toBeLessThanOrEqual(len);
      expect(sampleStarts(len, HOURS, mulberry32(seed))).toContain(hand.startIndex);
      expect(hand.landingUtc).toBe(year.series[hand.cards[0]!.siteId]!.t_utc[hand.startIndex]);
    }
  });

  it('returns null when every site loses', () => {
    const dark: Record<string, Timeseries> = {};
    for (const [id, ts] of Object.entries(series)) dark[id] = { ...ts, lit: ts.lit.map(() => 0) };
    expect(deal(sites, dark, 1)).toBeNull();
  });

  it('skips sites without a series', () => {
    const partial: Record<string, Timeseries> = {};
    for (const id of ['w1', 'c1', 'b1', 's1']) partial[id] = series[id]!;
    const hand = deal(sites, partial, 3);
    expect(hand).not.toBeNull();
    expect(new Set(hand!.cards.map((c) => c.siteId))).toEqual(new Set(Object.keys(partial)));
  });

  it('a pending slope does not make a site lose', () => {
    const pending = sites.map((s) =>
      s.id === 's1' ? { ...s, pending_metrics: ['slope_deg' as const] } : s,
    );
    for (let seed = 0; seed < 10; seed++) {
      const card = deal(pending, series, seed)!.cards.find((c) => c.siteId === 's1');
      if (card) expect(card.verdict.win).toBe(true);
    }
  });
});

// ---- Real data: invariants only (the files will change again). Reads one subset of series. ----

describe('deal (real south-pole data, invariants)', () => {
  const DATA = join(__dirname, '..', '..', '..', 'public', 'data');
  const read = <T>(p: string): T => JSON.parse(readFileSync(join(DATA, p), 'utf8')) as T;
  const pool = southPoleSites(read<SitesFile>('sites.json').sites);
  const subset = pickSubset(pool, 1);
  const series: Record<string, Timeseries> = {};
  for (const s of subset) series[s.id] = read<Timeseries>(`timeseries/${s.id}.json`);

  it('has south-pole sites to play with', () => {
    expect(pool.length).toBeGreaterThanOrEqual(4);
    expect(subset.every((s) => s.region === 'south_pole')).toBe(true);
  });

  it('dealt hands are well-formed for several seeds', () => {
    const len = Math.min(...Object.values(series).map((t) => t.t_utc.length));
    const hands = Array.from({ length: 8 }, (_, seed) => deal(subset, series, seed));
    // The game retries with other subsets; here at least one seed must deal from this one.
    expect(hands.some((h) => h !== null)).toBe(true);
    for (const hand of hands) {
      if (!hand) continue;
      expect(hand.cards).toHaveLength(4);
      expect(new Set(hand.cards.map((c) => c.siteId)).size).toBe(4);
      expect(hand.cards.some((c) => c.verdict.win)).toBe(true);
      expect(hand.cards.some((c) => !c.verdict.win)).toBe(true);
      expect(hand.startIndex + HOURS).toBeLessThanOrEqual(len);
      expect(hand.landingUtc).toBe(series[hand.cards[0]!.siteId]!.t_utc[hand.startIndex]);
      // Pending slopes must never decide a verdict.
      for (const c of hand.cards) {
        const site = subset.find((s) => s.id === c.siteId)!;
        if (site.pending_metrics?.includes('slope_deg')) {
          expect(c.verdict.cause).not.toBe('slope');
          expect(c.verdict.metrics.slope_deg).toBeNull();
        }
      }
    }
  });
});
