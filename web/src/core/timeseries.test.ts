import { describe, expect, it } from 'vitest';
import type { Timeseries } from '@lunar/contracts';
import { fractionOn, hoursUntilChange, indexAt, sampleAt } from './timeseries';

const ts: Timeseries = {
  version: 1,
  mock: true,
  site_id: 'x',
  step_s: 3600,
  t_utc: [
    '2027-01-01T00:00:00Z',
    '2027-01-01T01:00:00Z',
    '2027-01-01T02:00:00Z',
    '2027-01-01T03:00:00Z',
  ],
  sun_az: [10, 20, 30, 40],
  sun_el: [1, 2, 3, 4],
  earth_az: [0, 0, 0, 0],
  earth_el: [5, 5, 5, 5],
  lit: [1, 1, 0, 0],
};

describe('timeseries helpers', () => {
  it('finds the sample at or before a time, clamped', () => {
    expect(indexAt(ts, '2026-12-31T00:00:00Z')).toBe(0);
    expect(indexAt(ts, '2027-01-01T01:30:00Z')).toBe(1);
    expect(indexAt(ts, '2027-01-01T03:00:00Z')).toBe(3);
    expect(indexAt(ts, '2030-01-01T00:00:00Z')).toBe(3);
  });

  it('samples values', () => {
    const s = sampleAt(ts, '2027-01-01T02:10:00Z');
    expect(s).toMatchObject({ index: 2, sun_az: 30, lit: false, earthVisible: null });
  });

  it('computes time to the next change (e.g. sunset)', () => {
    expect(hoursUntilChange(ts, ts.lit, '2027-01-01T00:30:00Z')).toBe(1.5);
    expect(hoursUntilChange(ts, ts.lit, '2027-01-01T02:00:00Z')).toBeNull();
  });

  it('computes fraction on', () => {
    expect(fractionOn(ts.lit)).toBe(0.5);
  });
});
