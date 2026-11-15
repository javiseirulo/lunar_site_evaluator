import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Timeseries } from '@lunar/contracts';
import { DEFAULT_REQUIREMENTS } from '../engine/requirements';
import { hourlyFlags, simulate } from '../engine/simulate';
import type { HistoricMission, MissionSummary } from './data';
import { dealHistoric, historyOption, missionRules } from './deal';

const DIR = join(__dirname, '../../../public/data/historic');
const missions: HistoricMission[] = readdirSync(DIR)
  .filter((f) => f.endsWith('.json') && f !== 'missions.json')
  .map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')) as HistoricMission);
const index = (
  JSON.parse(readFileSync(join(DIR, 'missions.json'), 'utf8')) as { missions: MissionSummary[] }
).missions;

describe('historic data', () => {
  it('has every mission of the index, each with 4 options and one real site', () => {
    expect(missions.length).toBe(index.length);
    for (const m of missions) {
      expect(m.options, m.id).toHaveLength(4);
      expect(
        m.options.filter((o) => o.history),
        m.id,
      ).toHaveLength(1);
      expect(new Set(m.options.map((o) => o.site.id)).size, m.id).toBe(4);
    }
  });

  it('series start at the landing hour and cover the stay plus the coaching projection', () => {
    for (const m of missions) {
      const hour = m.landing_utc.slice(0, 13);
      for (const o of m.options) {
        expect(o.timeseries.t_utc[0]!.slice(0, 13), o.site.id).toBe(hour);
        expect(o.timeseries.t_utc.length).toBeGreaterThanOrEqual(14 * 24);
      }
    }
  });

  it('lists at least ten playable missions, including every Apollo landing', () => {
    const playable = index.filter((m) => m.playable).map((m) => m.id);
    expect(playable.length).toBeGreaterThanOrEqual(10);
    for (const a of [
      'apollo_11',
      'apollo_12',
      'apollo_14',
      'apollo_15',
      'apollo_16',
      'apollo_17',
    ]) {
      expect(playable).toContain(a);
    }
  });
});

describe('the TypeScript engine agrees with the pipeline', () => {
  it.each(missions.map((m) => [m.id, m] as const))('%s', (_id, m) => {
    const hand = dealHistoric(m, 7);
    const byId = new Map(hand.cards.map((c) => [c.siteId, c.verdict]));
    for (const o of m.options) {
      const v = byId.get(o.site.id)!;
      expect(v.win ? 'win' : v.cause, o.site.id).toBe(o.outcome);
    }
    if (m.playable) {
      const real = historyOption(m)!;
      expect(byId.get(real.site.id)!.win).toBe(true);
      const wins = hand.cards.filter((c) => c.verdict.win).length;
      expect(wins).toBeGreaterThanOrEqual(1);
      expect(wins).toBeLessThanOrEqual(3);
    }
  });
});

describe('dealHistoric', () => {
  const m = missions.find((x) => x.id === 'apollo_11')!;

  it('is deterministic per seed and lands at the real time', () => {
    const a = dealHistoric(m, 42);
    expect(dealHistoric(m, 42)).toEqual(a);
    expect(a.landingUtc).toBe('1969-07-20T20:17:40Z');
    expect(a.startIndex).toBe(0);
    expect(a.cards.map((c) => c.slot)).toEqual([1, 2, 3, 4]);
  });

  it('carries the mission rules (Apollo: 5-20° landing light)', () => {
    expect(dealHistoric(m, 1).req?.landing_light).toEqual({ min: 5, max: 20 });
    expect(missionRules(m).surface_days).toBe(m.surface_days);
  });

  it('reproduces the documented Apollo 11 Sun angle (~10.8° at touchdown)', () => {
    expect(historyOption(m)!.landing_sun_el).toBeGreaterThan(9.5);
    expect(historyOption(m)!.landing_sun_el).toBeLessThan(12);
  });
});

describe('landing light and relay rules', () => {
  const n = 7 * 24 + 10;
  const ts = {
    t_utc: Array.from({ length: n }, (_, i) => new Date(Date.UTC(2027, 0, 1, i)).toISOString()),
    sun_az: Array(n).fill(90),
    sun_el: Array(n).fill(10),
    earth_az: Array(n).fill(0),
    earth_el: Array(n).fill(-10),
    lit: Array(n).fill(1),
    earth_visible: Array(n).fill(0),
    sun_frac: Array(n).fill(1),
  } as unknown as Timeseries;
  const site = {
    id: 's',
    metrics: { slope_deg: 0 },
    pending_metrics: ['slope_deg'],
  } as unknown as Parameters<typeof simulate>[0];
  const light = { ...DEFAULT_REQUIREMENTS, landing_light: { min: 5, max: 20 }, relay: true };

  it('loses in the dark or in glare at touchdown, at hour 0', () => {
    expect(simulate(site, ts, 0, light, 2).cause).toBe('dark_landing');
    expect(simulate(site, ts, 0, light, 30).cause).toBe('glare_landing');
    expect(simulate(site, ts, 0, light, 30).failHour).toBe(0);
  });

  it('uses the series sample when no exact angle is given', () => {
    expect(simulate(site, ts, 0, light).win).toBe(true);
  });

  it('keeps the link up through a relay even with Earth below the horizon', () => {
    expect(hourlyFlags(ts, 0, 24, 2, true).linked.every(Boolean)).toBe(true);
    expect(simulate(site, ts, 0, { ...light, relay: false }).cause).toBe('blackout');
  });

  it('South Pole rules are unchanged (no landing-light rule)', () => {
    expect(DEFAULT_REQUIREMENTS.landing_light).toBeUndefined();
    expect(simulate(site, ts, 0, { ...DEFAULT_REQUIREMENTS, relay: true }, -40).win).toBe(true);
  });
});
