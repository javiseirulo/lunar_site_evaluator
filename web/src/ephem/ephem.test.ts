import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __resetEphemForTests,
  __setEphemYearForTests,
  buildTimeseries,
  earthMoonDistanceKmAt,
  flatHorizonDeg,
  isEphemLoaded,
  R_MOON_KM,
  skyAt,
  skyFromVectors,
  sunDirectionMoonME,
  sunDiscFraction,
  vectorsAt,
  type Vec3,
} from '.';

const HOURS_2027 = 8760;
const SYNODIC_H = 29.530589 * 24;
const EARTH_KM = 384_400;

/** Synthetic 2027: the Sun circles the lunar equator once per synodic month; Earth fixed at +X. */
function syntheticYear(hours = HOURS_2027): Float32Array {
  const data = new Float32Array(hours * 6);
  for (let h = 0; h < hours; h++) {
    const th = (2 * Math.PI * h) / SYNODIC_H;
    data.set([Math.cos(th), Math.sin(th), 0, EARTH_KM, 0, 0], h * 6);
  }
  return data;
}

beforeEach(() => __resetEphemForTests());
afterEach(() => __resetEphemForTests());

describe('ephemeris cache and interpolation', () => {
  it('is null until the year is loaded', () => {
    expect(vectorsAt('2027-01-01T00:00:00Z')).toBeNull();
    expect(skyAt(0, 0, '2027-01-01T00:00:00Z')).toBeNull();
    expect(isEphemLoaded('2027-01-01T00:00:00Z', '2027-01-02T00:00:00Z')).toBe(false);
  });

  it('interpolates linearly between hourly rows and renormalises the Sun', () => {
    const data = new Float32Array(HOURS_2027 * 6);
    // Row 0: Sun +X, Earth (384400, 0, 0); row 1: Sun +Y, Earth (384400, 1000, 0).
    data.set([1, 0, 0, EARTH_KM, 0, 0], 0);
    data.set([0, 1, 0, EARTH_KM, 1000, 0], 6);
    __setEphemYearForTests(2027, data);
    expect(isEphemLoaded('2027-01-01T00:00:00Z', '2027-12-31T23:00:00Z')).toBe(true);

    const exact = vectorsAt('2027-01-01T01:00:00Z')!;
    expect(exact.sunUnit).toEqual([0, 1, 0]);
    expect(exact.earthKm).toEqual([EARTH_KM, 1000, 0]);

    const mid = vectorsAt(Date.parse('2027-01-01T00:30:00Z'))!;
    expect(mid.sunUnit[0]).toBeCloseTo(Math.SQRT1_2, 12);
    expect(mid.sunUnit[1]).toBeCloseTo(Math.SQRT1_2, 12);
    expect(Math.hypot(...mid.sunUnit)).toBeCloseTo(1, 12);
    expect(mid.earthKm).toEqual([EARTH_KM, 500, 0]);

    const quarter = vectorsAt(new Date('2027-01-01T00:15:00Z'))!;
    expect(quarter.earthKm[1]).toBeCloseTo(250, 9);
    expect(earthMoonDistanceKmAt('2027-01-01T00:00:00Z')).toBeCloseTo(EARTH_KM, 6);
    expect(sunDirectionMoonME('2027-01-01T00:00:00Z')).toEqual([1, 0, 0]);
  });

  it('is null outside the loaded data (other year, last hour without the next year)', () => {
    __setEphemYearForTests(2027, syntheticYear());
    expect(vectorsAt('2026-12-31T23:59:00Z')).toBeNull();
    expect(vectorsAt('2027-12-31T23:00:00Z')).not.toBeNull();
    expect(vectorsAt('2027-12-31T23:30:00Z')).toBeNull();
    expect(vectorsAt('not a date')).toBeNull();
    __setEphemYearForTests(2028, syntheticYear(8784));
    expect(vectorsAt('2027-12-31T23:30:00Z')).not.toBeNull();
  });
});

describe('topocentric sky', () => {
  it('Earth at the zenith of the sub-Earth point, with exact parallax elsewhere', () => {
    const earth: Vec3 = [EARTH_KM, 0, 0];
    const sun: Vec3 = [0, 1, 0];
    const sub = skyFromVectors(0, 0, sun, earth, { elev_m: 0, h_obs_m: 5 });
    expect(sub.earth_el).toBeCloseTo(90, 9);
    expect(sub.earth_km).toBeCloseTo(EARTH_KM - R_MOON_KM - 0.005, 6);

    // 90° away from the sub-Earth point the geocentric Earth is on the horizon; from the surface
    // it sits atan(r/d) lower (parallax ≈ 0.26°).
    const limb = skyFromVectors(0, 90, sun, earth, { elev_m: 0, h_obs_m: 0 });
    const parallax = (Math.atan(R_MOON_KM / EARTH_KM) * 180) / Math.PI;
    expect(limb.earth_el).toBeCloseTo(-parallax, 9);
    expect(parallax).toBeGreaterThan(0.25);
    // Sun along +Y = zenith of lon 90.
    expect(limb.sun_el).toBeCloseTo(90, 9);
  });

  it('skyAt reads the loaded vectors', () => {
    __setEphemYearForTests(2027, syntheticYear());
    const s = skyAt(0, 0, '2027-01-01T00:00:00Z')!;
    expect(s.sun_el).toBeCloseTo(90, 4); // Sun at +X = zenith of (0, 0)
    expect(s.earth_el).toBeCloseTo(90, 9);
  });
});

describe('buildTimeseries', () => {
  const site = { id: 'eq', lat: 0, lon: 0 };

  it('returns null when the ephemeris is not loaded', () => {
    expect(buildTimeseries(site, null, '2027-01-01T00:00:00Z', '2027-01-02T00:00:00Z')).toBeNull();
  });

  it('builds an hourly v1 Timeseries aligned to whole hours', () => {
    __setEphemYearForTests(2027, syntheticYear());
    const ts = buildTimeseries(site, null, '2027-01-01T00:30:00Z', '2027-01-31T00:00:00Z')!;
    expect(ts).not.toBeNull();
    const n = 30 * 24 - 1; // half-open, first sample = start rounded up to the hour
    expect(ts.t_utc).toHaveLength(n);
    expect(ts.t_utc[0]).toBe('2027-01-01T01:00:00Z');
    expect(ts.t_utc[n - 1]).toBe('2027-01-30T23:00:00Z');
    for (const k of ['sun_az', 'sun_el', 'earth_az', 'earth_el', 'lit'] as const) {
      expect(ts[k]).toHaveLength(n);
    }
    expect(ts.earth_visible).toHaveLength(n);
    expect(ts.sun_frac).toHaveLength(n);
    expect(ts).toMatchObject({
      version: 1,
      mock: false,
      site_id: 'eq',
      step_s: 3600,
      horizon_source: 'flat (no terrain)',
      antenna_margin_deg: 2,
    });
    for (let i = 0; i < n; i++) {
      expect(ts.t_utc[i]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$/);
      expect(ts.sun_az[i]).toBeGreaterThanOrEqual(0);
      expect(ts.sun_az[i]).toBeLessThan(360);
      expect(ts.lit[i]).toBe(ts.sun_frac![i]! >= 0.5 ? 1 : 0);
      expect(Math.round(ts.sun_el[i]! * 100)).toBeCloseTo(ts.sun_el[i]! * 100, 6);
      expect(Math.round(ts.sun_frac![i]! * 1000)).toBeCloseTo(ts.sun_frac![i]! * 1000, 6);
      expect(ts.earth_visible![i]).toBe(1); // Earth at the zenith
    }
    // The Sun is up about half of a synodic month at the equator.
    const litFrac = ts.lit.reduce<number>((a, b) => a + b, 0) / n;
    expect(litFrac).toBeGreaterThan(0.45);
    expect(litFrac).toBeLessThan(0.55);
    // At hour 0 the Sun is at the zenith (sample 0 = hour 1, ~0.5 deg lower); at half a synodic month it is at the nadir.
    expect(ts.sun_el[0]).toBeGreaterThan(89);
    expect(ts.lit[Math.round(SYNODIC_H / 2)]).toBe(0);
  });

  it('applies the antenna margin and the horizon profile', () => {
    __setEphemYearForTests(2027, syntheticYear());
    // Site 89° from the sub-Earth point: geocentric Earth el ≈ 1°, topocentric ≈ 0.74°.
    const limb = { id: 'limb', lat: 0, lon: 89 };
    const range = ['2027-01-01T00:00:00Z', '2027-01-01T03:00:00Z'] as const;
    const withMargin = buildTimeseries(limb, null, ...range)!;
    expect(withMargin.earth_visible).toEqual([0, 0, 0]);
    const noMargin = buildTimeseries(limb, null, ...range, { antennaMarginDeg: 0 })!;
    expect(noMargin.earth_visible).toEqual([1, 1, 1]);
    expect(noMargin.antenna_margin_deg).toBe(0);
    const wall = buildTimeseries(
      limb,
      {
        version: 1,
        site_id: 'limb',
        lat: 0,
        lon: 89,
        observer_height_m: 5,
        az_step_deg: 1,
        elev_deg: Array.from({ length: 360 }, () => 5),
        max_range_km: 150,
        source: 'test wall 5°',
      },
      ...range,
      { antennaMarginDeg: 0 },
    )!;
    expect(wall.earth_visible).toEqual([0, 0, 0]);
    expect(wall.horizon_source).toBe('test wall 5°');
  });
});

// ---------------------------------------------------------------------------
// Parity with python/ephem (contracts/fixtures/golden-azel.json, written by the Python side).
// ---------------------------------------------------------------------------
interface GoldenAzElCase {
  lat: number;
  lon: number;
  elev_m: number;
  t_utc: string;
  sun_unit: Vec3;
  earth_km: Vec3;
  sun_az: number;
  sun_el: number;
  earth_az: number;
  earth_el: number;
  horizon_flat_deg: number;
  sun_frac_flat: number;
}

const GOLDEN = join(__dirname, '..', '..', '..', 'contracts', 'fixtures', 'golden-azel.json');
const azDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

describe('parity with python/ephem', () => {
  if (!existsSync(GOLDEN)) {
    it.skip('contracts/fixtures/golden-azel.json not published yet (python/ephem writes it)', () => {});
    return;
  }
  const golden = JSON.parse(readFileSync(GOLDEN, 'utf8')) as {
    observer_height_m: number;
    cases: GoldenAzElCase[];
  };

  it(`reproduces ${golden.cases.length} az/el cases to 1e-6°`, () => {
    expect(golden.cases.length).toBeGreaterThan(0);
    const h = golden.observer_height_m;
    for (const c of golden.cases) {
      const tag = `${c.lat},${c.lon} @ ${c.t_utc}`;
      const s = skyFromVectors(c.lat, c.lon, c.sun_unit, c.earth_km, {
        elev_m: c.elev_m,
        h_obs_m: h,
      });
      // Azimuth is undefined at the zenith/nadir: only check it when the target is off the axis.
      if (Math.abs(c.sun_el) < 89.9) {
        expect(azDiff(s.sun_az, c.sun_az), `${tag} sun_az`).toBeLessThan(1e-6);
      }
      expect(Math.abs(s.sun_el - c.sun_el), `${tag} sun_el`).toBeLessThan(1e-6);
      if (Math.abs(c.earth_el) < 89.9) {
        expect(azDiff(s.earth_az, c.earth_az), `${tag} earth_az`).toBeLessThan(1e-6);
      }
      expect(Math.abs(s.earth_el - c.earth_el), `${tag} earth_el`).toBeLessThan(1e-6);
      expect(Math.abs(flatHorizonDeg(h) - c.horizon_flat_deg), `${tag} flat`).toBeLessThan(1e-6);
      const frac = sunDiscFraction(s.sun_el, flatHorizonDeg(h));
      expect(Math.abs(frac - c.sun_frac_flat), `${tag} sun_frac`).toBeLessThan(1e-6);
    }
  });
});
