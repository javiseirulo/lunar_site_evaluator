import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __resetEphemForTests, __setEphemYearForTests } from './ephem';
import {
  __clearPointSeriesCache,
  pointName,
  pointSeries,
  pointSeriesKey,
  pointSite,
} from './activeSeries';

const HOURS = 8760;
function year(): Float32Array {
  const d = new Float32Array(HOURS * 6);
  for (let h = 0; h < HOURS; h++) {
    const th = (2 * Math.PI * h) / 708;
    d.set([Math.cos(th), Math.sin(th), 0, 384400, 0, 0], h * 6);
  }
  return d;
}
const START = '2027-01-01T00:00:00Z';
const END = '2028-01-01T00:00:00Z';

beforeEach(() => {
  __resetEphemForTests();
  __clearPointSeriesCache();
});
afterEach(() => __resetEphemForTests());

describe('active series (free point)', () => {
  it('names a point from its coordinates', () => {
    expect(pointName(-89.5, 12.345)).toBe('89.50°S, 12.35°E');
    expect(pointSite(10, -20)).toMatchObject({ id: 'point', lat: 10, lon: -20 });
  });
  it('key depends on point, margin and range', () => {
    const k = pointSeriesKey(-89.5, 0, 2, START, END);
    expect(k).not.toBe(pointSeriesKey(-89.5, 1, 2, START, END));
    expect(k).not.toBe(pointSeriesKey(-89.5, 0, 0, START, END));
  });
  it('is null until the ephemeris is loaded, then computed once and cached', () => {
    expect(pointSeries(-89.5, 0, START, END, 2)).toBeNull();
    __setEphemYearForTests(2027, year());
    const a = pointSeries(-89.5, 0, START, END, 2);
    expect(a).not.toBeNull();
    expect(a!.t_utc.length).toBe(HOURS);
    expect(a!.horizon_source).toMatch(/flat/);
    expect(pointSeries(-89.5, 0, START, END, 2)).toBe(a);
  });
});
