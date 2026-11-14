import { describe, expect, it } from 'vitest';
import type { Site, Timeseries } from '@lunar/contracts';
import { DEFAULT_REQUIREMENTS } from '../engine/requirements';
import { simulate } from '../engine/simulate';
import {
  dayOfMission,
  isLinkUp,
  isoAtHour,
  missionHourAt,
  missionRuns,
  runLengths,
  stopHourFor,
} from './timelapse';

const HOURS = 168;
const MARGIN = DEFAULT_REQUIREMENTS.antenna_margin_deg;

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

const site: Site = {
  id: 'test',
  name: 'Test',
  lat: -89,
  lon: 0,
  elev_m: 0,
  valid: true,
  score: 0.5,
  metrics: { illum_pct: 0.9, earth_vis_pct: 0.9, slope_deg: 1, max_dark_hours: 0, psr_dist_km: 1 },
  reasons: [],
};

const ones = (n: number): (0 | 1)[] => new Array(n).fill(1);

describe('stopHourFor', () => {
  it('stops at the fail hour on a loss and at the last hour on a win', () => {
    expect(stopHourFor(0, HOURS)).toBe(0);
    expect(stopHourFor(110, HOURS)).toBe(110);
    expect(stopHourFor(null, HOURS)).toBe(167);
  });

  it('clamps out-of-range fail hours into the mission', () => {
    expect(stopHourFor(500, HOURS)).toBe(167);
    expect(stopHourFor(-3, HOURS)).toBe(0);
  });
});

describe('missionHourAt', () => {
  it('advances linearly: the whole mission in totalMs', () => {
    expect(missionHourAt(0, 25_000, HOURS, 167)).toBe(0);
    expect(missionHourAt(12_500, 25_000, HOURS, 167)).toBe(84);
    expect(missionHourAt(25_000 / HOURS, 25_000, HOURS, 167)).toBeCloseTo(1);
  });

  it('freezes exactly at the stop hour', () => {
    expect(missionHourAt(30_000, 25_000, HOURS, 167)).toBe(167);
    expect(missionHourAt(20_000, 25_000, HOURS, 101)).toBe(101);
    expect(missionHourAt(5_000, 25_000, HOURS, 0)).toBe(0);
  });

  it('jumps to the stop hour with no duration and ignores bad elapsed values', () => {
    expect(missionHourAt(0, 0, HOURS, 42)).toBe(42);
    expect(missionHourAt(-100, 25_000, HOURS, 42)).toBe(0);
    expect(missionHourAt(Number.NaN, 25_000, HOURS, 42)).toBe(0);
  });
});

describe('isoAtHour', () => {
  it('adds whole and fractional hours to the landing time', () => {
    expect(isoAtHour('2027-01-01T00:00:00Z', 0)).toBe('2027-01-01T00:00:00Z');
    expect(isoAtHour('2027-01-01T00:00:00Z', 25)).toBe('2027-01-02T01:00:00Z');
    expect(isoAtHour('2027-01-01T00:00:00Z', 167)).toBe('2027-01-07T23:00:00Z');
    expect(isoAtHour('2027-01-01T00:00:00Z', 0.5)).toBe('2027-01-01T00:30:00Z');
  });
});

describe('dayOfMission', () => {
  it('counts 1-based days and caps at the mission length', () => {
    expect(dayOfMission(0, 7)).toBe(1);
    expect(dayOfMission(23.9, 7)).toBe(1);
    expect(dayOfMission(24, 7)).toBe(2);
    expect(dayOfMission(167, 7)).toBe(7);
    expect(dayOfMission(168, 7)).toBe(7);
  });
});

describe('isLinkUp', () => {
  it('needs Earth visible (when known) and above the antenna margin', () => {
    expect(isLinkUp(true, 2, MARGIN)).toBe(true);
    expect(isLinkUp(null, 5, MARGIN)).toBe(true);
    expect(isLinkUp(false, 30, MARGIN)).toBe(false);
    expect(isLinkUp(true, 1.9, MARGIN)).toBe(false);
  });
});

describe('runLengths', () => {
  it('counts the run of true ending at each index', () => {
    expect(runLengths([true, true, false, true, true, true])).toEqual([1, 2, 0, 1, 2, 3]);
    expect(runLengths([])).toEqual([]);
  });
});

describe('missionRuns', () => {
  it('counts from the landing index only', () => {
    const lit = ones(10);
    lit[1] = 0;
    lit[2] = 0;
    const runs = missionRuns(makeTs(lit, ones(10)), 2, 5, MARGIN);
    expect(runs.dark).toEqual([1, 0, 0, 0, 0]);
    expect(runs.blackout).toEqual([0, 0, 0, 0, 0]);
  });

  it('crosses the engine limit at the hour the engine fails (cold)', () => {
    const lit = ones(HOURS);
    for (let i = 10; i < 111; i++) lit[i] = 0; // 101 h of night
    const ts = makeTs(lit, ones(HOURS));
    const v = simulate(site, ts, 0);
    const runs = missionRuns(ts, 0, HOURS, MARGIN);
    expect(v.cause).toBe('cold');
    expect(runs.dark[v.failHour!]).toBe(DEFAULT_REQUIREMENTS.max_dark_h.threshold + 1);
    expect(runs.dark[v.failHour! - 1]).toBe(DEFAULT_REQUIREMENTS.max_dark_h.threshold);
    expect(Math.max(...runs.dark)).toBe(v.metrics.max_dark_h);
  });

  it('treats low Earth elevation as blackout, like the engine', () => {
    const el = new Array(HOURS + 24).fill(10);
    for (let i = 24 + 20; i < 24 + 20 + 73; i++) el[i] = 1; // 73 h below the 2° margin
    const ts = makeTs(ones(HOURS + 24), ones(HOURS + 24), el);
    const v = simulate(site, ts, 24);
    const runs = missionRuns(ts, 24, HOURS, MARGIN);
    expect(v.cause).toBe('blackout');
    expect(runs.blackout[v.failHour!]).toBe(DEFAULT_REQUIREMENTS.max_blackout_h.threshold + 1);
    expect(Math.max(...runs.blackout)).toBe(v.metrics.max_blackout_h);
  });

  it('stops at the end of the series', () => {
    expect(missionRuns(makeTs(ones(5), ones(5)), 3, HOURS, MARGIN).dark).toHaveLength(2);
  });
});
