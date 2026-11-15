import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { EphemIndex } from '@lunar/contracts';
import { availableYears, formatYearRanges, missingEphemYears } from '@/ephem';
import { __clearPointSeriesCache, pointSeries } from '@/ephem/activeSeries';
import { __resetEphemForTests, __setEphemYearForTests } from '@/ephem/ephem';
import { useAppStore } from '@/core/store';
import { clockRangeFor, isDefaultWindow } from '@/core/clockRange';
import { DEFAULT_MISSION_CONFIG } from './defaults';
import { landingBounds, windowIssue } from './landingWindow';

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const YEARS = [...range(1966, 1973), 1976, 2013, 2019, 2020, 2023, 2024, ...range(2025, 2055)];
const idx = {
  start_utc: '1966-01-01T00:00:00Z',
  end_utc: '2055-12-31T23:00:00Z',
  years: YEARS.map((year) => ({ year })),
} as unknown as EphemIndex;

describe('ephemeris year availability', () => {
  it('lists and collapses the available years', () => {
    expect(availableYears(idx)).toEqual(YEARS);
    expect(formatYearRanges(availableYears(idx))).toBe(
      '1966–1973, 1976, 2013, 2019–2020, 2023–2055',
    );
  });

  it('accepts future and past-mission dates, refuses gaps', () => {
    const w = (d: string, days = 7) => [
      d,
      new Date(Date.parse(d) + days * 86_400_000).toISOString(),
    ];
    expect(windowIssue(idx, ...(w('2035-06-15T00:00:00Z') as [string, string]))).toBeNull();
    expect(windowIssue(idx, ...(w('1969-07-20T00:00:00Z') as [string, string]))).toBeNull();
    expect(windowIssue(idx, ...(w('2024-02-22T00:00:00Z') as [string, string]))).toBeNull();
    for (const bad of ['1985-01-01', '2010-05-05', '1974-03-03', '2056-01-01']) {
      expect(windowIssue(idx, ...(w(`${bad}T00:00:00Z`) as [string, string]))).toMatch(
        /No Sun\/Earth data for that year/,
      );
    }
  });

  it('a window straddling New Year needs both years', () => {
    const s = Date.parse('1973-12-28T00:00:00Z');
    expect(missingEphemYears(idx, s, s + 7 * 86_400_000)).toEqual([1974]);
    const t = Date.parse('2026-12-28T00:00:00Z');
    expect(missingEphemYears(idx, t, t + 7 * 86_400_000)).toEqual([]);
    // Ending exactly at 00:00 on 1 January does not need the new year.
    expect(
      missingEphemYears(
        idx,
        Date.parse('1973-12-25T00:00:00Z'),
        Date.parse('1974-01-01T00:00:00Z'),
      ),
    ).toEqual([]);
    expect(
      missingEphemYears(
        idx,
        Date.parse('1976-12-28T00:00:00Z'),
        Date.parse('1977-01-04T00:00:00Z'),
      ),
    ).toEqual([1977]);
  });

  it('bounds the picker to the data minus the stay', () => {
    expect(landingBounds(idx, 7)).toEqual({ min: '1966-01-01', max: '2055-12-24' });
  });
});

describe('landing date wiring and stale scores', () => {
  const initial = useAppStore.getState();
  beforeEach(() => {
    useAppStore.setState(initial, true);
    __resetEphemForTests();
    __clearPointSeriesCache();
  });
  afterEach(() => __resetEphemForTests());

  const manifestRange = {
    start_utc: '2027-01-01T00:00:00Z',
    end_utc: '2028-01-01T00:00:00Z',
    step_s: 3600,
  };

  it('default window keeps the published range; any other date is the window itself', () => {
    expect(isDefaultWindow(DEFAULT_MISSION_CONFIG)).toBe(true);
    expect(clockRangeFor(manifestRange, DEFAULT_MISSION_CONFIG)).toMatchObject({ custom: false });
    const moved = { ...DEFAULT_MISSION_CONFIG, landing_utc: '1969-07-20T00:00:00.000Z' };
    expect(isDefaultWindow(moved)).toBe(false); // catalogue score/valid are stale here
    expect(clockRangeFor(manifestRange, moved)).toEqual({
      start_utc: '1969-07-20T00:00:00.000Z',
      end_utc: '1969-07-27T00:00:00.000Z',
      step_s: 3600,
      custom: true,
    });
    expect(isDefaultWindow({ ...DEFAULT_MISSION_CONFIG, surface_days: 10 })).toBe(false);
  });

  it('requestLanding resets clock and simulation; Normal + running simulation asks first', () => {
    const st = () => useAppStore.getState();
    st().setProMode(true);
    st().setSimulationStarted(true);
    st().requestLanding({ landing_utc: '2035-06-15T00:00:00.000Z' }, '2035-06-15T00:00:00.000Z');
    expect(st().missionConfig.landing_utc).toBe('2035-06-15T00:00:00.000Z');
    expect(st().currentTimeUTC).toBe('2035-06-15T00:00:00.000Z');
    expect(st().simulationStarted).toBe(false);

    st().setProMode(false);
    st().setSimulationStarted(true);
    const nonce = st().clockResetNonce;
    st().requestLanding({ landing_utc: '2040-01-10T00:00:00.000Z' }, '2040-01-10T00:00:00.000Z');
    expect(st().pendingLanding).not.toBeNull();
    expect(st().missionConfig.landing_utc).toBe('2035-06-15T00:00:00.000Z');
    st().cancelPending();
    expect(st().pendingLanding).toBeNull();
    st().requestLanding({ landing_utc: '2040-01-10T00:00:00.000Z' }, '2040-01-10T00:00:00.000Z');
    st().confirmLanding();
    expect(st().missionConfig.landing_utc).toBe('2040-01-10T00:00:00.000Z');
    expect(st().currentTimeUTC).toBe('2040-01-10T00:00:00.000Z');
    expect(st().simulationStarted).toBe(false);
    expect(st().clockResetNonce).toBe(nonce + 1);
  });

  it('computes a series for a non-2027 window (leap year, no hard-coded year)', () => {
    const rows = 8784;
    const d = new Float32Array(rows * 6);
    for (let h = 0; h < rows; h++)
      d.set([Math.cos(h / 100), Math.sin(h / 100), 0, 384400, 0, 0], h * 6);
    __setEphemYearForTests(2040, d);
    const ts = pointSeries(-89.5, 0, '2040-02-28T00:00:00Z', '2040-03-02T00:00:00Z', 2, {
      id: 'x',
      horizon: null,
    });
    expect(ts?.t_utc[0]).toBe('2040-02-28T00:00:00Z');
    expect(ts?.t_utc).toContain('2040-02-29T12:00:00Z');
    expect(ts?.t_utc).toHaveLength(48 + 24);
  });
});
