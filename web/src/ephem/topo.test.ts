import { describe, expect, it } from 'vitest';
import type { HorizonProfile } from '@lunar/contracts';
import {
  azEl,
  enuBasis,
  flatHorizonDeg,
  horizonAt,
  R_MOON_KM,
  siteVectorKm,
  sunDiscFraction,
  wrap360,
  type Vec3,
} from './topo';

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const neg = (a: Vec3): Vec3 => [-a[0], -a[1], -a[2]];

const PLACES: [number, number][] = [
  [0, 0],
  [0.674, 23.473],
  [-89.9, 0],
  [-89.45, -137.3],
  [-90, 45],
  [90, -120],
  [45, 179.9],
  [-30, -180],
];

describe('ENU basis', () => {
  it.each(PLACES)('is orthonormal and right-handed at lat %s lon %s', (lat, lon) => {
    const { e, n, u } = enuBasis(lat, lon);
    for (const v of [e, n, u]) expect(dot(v, v)).toBeCloseTo(1, 12);
    expect(dot(e, n)).toBeCloseTo(0, 12);
    expect(dot(e, u)).toBeCloseTo(0, 12);
    expect(dot(n, u)).toBeCloseTo(0, 12);
    // E × N = U
    const cross: Vec3 = [
      e[1] * n[2] - e[2] * n[1],
      e[2] * n[0] - e[0] * n[2],
      e[0] * n[1] - e[1] * n[0],
    ];
    for (let i = 0; i < 3; i++) expect(cross[i]).toBeCloseTo(u[i]!, 12);
  });

  it('site vector has radius R + elevation + observer height', () => {
    const r = siteVectorKm(-89.9, 0, 649, 5);
    expect(Math.hypot(...r)).toBeCloseTo(R_MOON_KM + 0.654, 9);
    expect(siteVectorKm(0, 0, 0, 0)).toEqual([R_MOON_KM, 0, 0]);
  });
});

describe('azimuth / elevation', () => {
  it.each(PLACES)('zenith → el 90 and the four cardinal points at lat %s lon %s', (lat, lon) => {
    const b = enuBasis(lat, lon);
    expect(azEl(b.u, b).el).toBeCloseTo(90, 9);
    expect(azEl(neg(b.u), b).el).toBeCloseTo(-90, 9);
    const cases: [Vec3, number][] = [
      [b.n, 0],
      [b.e, 90],
      [neg(b.n), 180],
      [neg(b.e), 270],
    ];
    for (const [v, az] of cases) {
      const r = azEl(v, b);
      expect(r.az).toBeCloseTo(az, 9);
      expect(r.el).toBeCloseTo(0, 9);
    }
  });

  it('elevation of a vector 30° above the north horizon, any length', () => {
    const b = enuBasis(-45, 10);
    const s = Math.sin(Math.PI / 6);
    const c = Math.cos(Math.PI / 6);
    const v: Vec3 = [0, 1, 2].map((i) => 1000 * (c * b.n[i]! + s * b.u[i]!)) as Vec3;
    const r = azEl(v, b);
    expect(r.el).toBeCloseTo(30, 9);
    expect(r.az).toBeCloseTo(0, 9);
  });

  it('wraps azimuth into [0, 360)', () => {
    expect(wrap360(-90)).toBe(270);
    expect(wrap360(360)).toBe(0);
    expect(wrap360(725)).toBe(5);
    expect(wrap360(-1e-15)).toBe(0);
  });
});

describe('horizon', () => {
  it('flat horizon at 5 m is −acos(R/(R+h)) ≈ −0.1375°', () => {
    expect(flatHorizonDeg(5)).toBeCloseTo(-0.1375, 4);
    expect(flatHorizonDeg(0)).toBe(-0);
    expect(horizonAt(null, 123)).toBe(flatHorizonDeg(5));
  });

  it('interpolates the profile linearly with wrap-around', () => {
    const profile: HorizonProfile = {
      version: 1,
      site_id: 'x',
      lat: -89,
      lon: 0,
      observer_height_m: 5,
      az_step_deg: 90,
      elev_deg: [0, 2, 4, 6],
      max_range_km: 150,
      source: 'test',
    };
    expect(horizonAt(profile, 0)).toBe(0);
    expect(horizonAt(profile, 45)).toBe(1);
    expect(horizonAt(profile, 180)).toBe(4);
    expect(horizonAt(profile, 315)).toBe(3); // between 6 (270°) and 0 (360° = 0°)
    expect(horizonAt(profile, -45)).toBe(3);
    expect(horizonAt(profile, 360)).toBe(0);
  });
});

describe('visible fraction of the solar disc', () => {
  const r = 0.2666;
  it('is 0 fully below, 0.5 at the centre, 1 fully above', () => {
    expect(sunDiscFraction(-r, 0)).toBe(0);
    expect(sunDiscFraction(-5, 0)).toBe(0);
    expect(sunDiscFraction(0, 0)).toBeCloseTo(0.5, 12);
    expect(sunDiscFraction(r, 0)).toBe(1);
    expect(sunDiscFraction(10, 0)).toBe(1);
    expect(sunDiscFraction(1, 1)).toBeCloseTo(0.5, 12);
  });

  it('is monotonic and symmetric around the centre', () => {
    let prev = -1;
    for (let x = -1.2; x <= 1.2; x += 0.01) {
      const f = sunDiscFraction(x * r, 0);
      expect(f).toBeGreaterThanOrEqual(prev);
      expect(f + sunDiscFraction(-x * r, 0)).toBeCloseTo(1, 12);
      prev = f;
    }
  });
});
