import { afterEach, describe, expect, it } from 'vitest';
import { __resetEphemForTests, __setEphemYearForTests, sunDirectionMoonME } from '@/ephem';
import { latLonToVec3 } from './geo';
import { ephemWindow, inEphemRange, moonMeToThree, sunStateFrom } from './sunLight';

const DEG = Math.PI / 180;
/** Unit vector at (lat, lon) in MOON_ME: X lon 0, Y lon 90°E, Z north. */
const moonMe = (lat: number, lon: number): [number, number, number] => [
  Math.cos(lat * DEG) * Math.cos(lon * DEG),
  Math.cos(lat * DEG) * Math.sin(lon * DEG),
  Math.sin(lat * DEG),
];

const close = (a: number[], b: number[]) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i]!, 10));

const INDEX = { start_utc: '2026-01-01T00:00:00Z', end_utc: '2055-12-31T23:00:00Z', step_s: 3600 };

describe('moonMeToThree', () => {
  it('maps MOON_ME axes onto the globe axes of geo.ts', () => {
    close(moonMeToThree([1, 0, 0]), [1, 0, 0]); // lon 0
    close(moonMeToThree([0, 1, 0]), [0, 0, -1]); // lon 90°E
    close(moonMeToThree([0, 0, 1]), [0, 1, 0]); // north pole
  });

  it('agrees with latLonToVec3 for any point', () => {
    for (const [lat, lon] of [
      [-89.5, 141],
      [26.13, 3.63],
      [-45.46, 177.59],
      [0, -90],
    ] as const) {
      close(moonMeToThree(moonMe(lat, lon)), latLonToVec3(lat, lon, 1));
    }
  });
});

describe('ephemeris window and range', () => {
  it('aligns the window to the hour and spans two hours', () => {
    expect(ephemWindow('2027-03-01T10:37:12Z')).toEqual([
      '2027-03-01T10:00:00.000Z',
      '2027-03-01T12:00:00.000Z',
    ]);
    expect(ephemWindow('not a date')).toEqual([null, null]);
  });

  it('knows when a date is outside 2026–2055', () => {
    expect(inEphemRange('2027-01-01T00:00:00Z', INDEX)).toBe(true);
    expect(inEphemRange('2025-12-31T23:00:00Z', INDEX)).toBe(false);
    expect(inEphemRange('2056-01-01T01:00:00Z', INDEX)).toBe(false);
  });
});

describe('sunStateFrom', () => {
  afterEach(() => __resetEphemForTests());

  it('uses the interpolated ephemeris Sun, converted to globe axes', () => {
    // Synthetic year: Sun towards lon 0 at 00:00 and towards lon 90°E at 01:00.
    const data = new Float32Array(6 * 24);
    data.set([1, 0, 0, 384400, 0, 0], 0);
    data.set([0, 1, 0, 384400, 0, 0], 6);
    __setEphemYearForTests(2027, data);
    const t = '2027-01-01T00:30:00Z';
    const s = sunStateFrom(t, INDEX, sunDirectionMoonME(t), null);
    expect(s.status).toBe('ok');
    close(s.dir!, [Math.SQRT1_2, 0, -Math.SQRT1_2]);
  });

  it('falls back when the date has no ephemeris or the data cannot load', () => {
    expect(sunStateFrom('2070-01-01T00:00:00Z', INDEX, null, null).status).toBe('no_ephemeris');
    expect(sunStateFrom('2027-01-01T00:00:00Z', INDEX, null, 'HTTP 404').status).toBe(
      'no_ephemeris',
    );
    expect(sunStateFrom('2027-01-01T00:00:00Z', null, null, null).status).toBe('loading');
  });
});
