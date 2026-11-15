import { describe, expect, it } from 'vitest';
import type { MissionConfig } from '@lunar/contracts';
import {
  computeArrival,
  earthMoonDistanceKm,
  hohmannTransferDays,
  landingTime,
  lloPeriodHours,
  missionWindow,
  trackAlignmentWaitDays,
  LEO_ALT_KM,
  R_EARTH_KM,
} from './arrival';
import { DEFAULT_MISSION_CONFIG } from './defaults';

const cfg = (patch: Partial<MissionConfig>): MissionConfig => ({
  ...DEFAULT_MISSION_CONFIG,
  ...patch,
});

describe('Earth–Moon distance (Meeus ch. 47, truncated)', () => {
  it('matches Meeus example 47.a (1992-04-12 0h: 368 409.7 km) within 50 km', () => {
    expect(
      Math.abs(earthMoonDistanceKm(new Date('1992-04-12T00:00:00Z')) - 368_409.7),
    ).toBeLessThan(50);
  });

  it('stays between perigee and apogee over 2027', () => {
    let min = Infinity;
    let max = -Infinity;
    for (let d = 0; d < 365 * 4; d++) {
      const km = earthMoonDistanceKm(new Date(Date.UTC(2027, 0, 1) + d * 21_600_000));
      min = Math.min(min, km);
      max = Math.max(max, km);
    }
    expect(min).toBeGreaterThan(355_000);
    expect(min).toBeLessThan(362_000);
    expect(max).toBeGreaterThan(404_000);
    expect(max).toBeLessThan(407_500);
  });
});

describe('orbital helpers', () => {
  it('Hohmann LEO 200 km → mean lunar distance ≈ 4.98 days', () => {
    expect(hohmannTransferDays(R_EARTH_KM + LEO_ALT_KM, 384_400)).toBeCloseTo(4.98, 1);
  });

  it('100 km low lunar orbit period ≈ 1.96 h', () => {
    expect(lloPeriodHours(100)).toBeCloseTo(1.96, 1);
  });

  it('polar orbit: near-pole sites are reachable on every orbit', () => {
    expect(trackAlignmentWaitDays(-89.9, 0, 90)).toBe(0);
  });

  it('polar orbit: an equatorial site can wait up to ~13.7 days', () => {
    // Just east of the plane (outside the ~1° cross-range): the plane drifts west, away from it,
    // so the next pass is the opposite half of the orbit, ~178° later.
    const worst = trackAlignmentWaitDays(0, 1.5, 0);
    expect(worst).toBeGreaterThan(13);
    expect(worst).toBeLessThan(13.7);
    expect(trackAlignmentWaitDays(0, 0, 0)).toBe(0);
  });
});

describe('computeArrival', () => {
  it('Hohmann transfer takes 4.4–5.5 days and lands after one orbit + descent', () => {
    const a = computeArrival(cfg({ time_mode: 'mission', launch_utc: '2027-03-02T00:00:00Z' }));
    expect(a.transfer_days).toBeGreaterThan(4.4);
    expect(a.transfer_days).toBeLessThan(5.5);
    expect(a.earth_moon_km).not.toBeNull();
    const landingAfterOrbitH =
      (Date.parse(a.landing_utc) - Date.parse(a.lunar_orbit_utc)) / 3_600_000;
    expect(landingAfterOrbitH).toBeCloseTo(a.llo_period_hours + 1, 5);
  });

  it('fixed trajectories use their fixed duration', () => {
    expect(computeArrival(cfg({ trajectory: 'fast' })).transfer_days).toBe(3);
    expect(computeArrival(cfg({ trajectory: 'low_energy' })).transfer_days).toBe(105);
  });

  it('already in orbit: no transfer, waits for the ground track', () => {
    const c = cfg({ time_mode: 'mission', start_in_orbit: true, orbit_plane_lon_deg: 0 });
    const pole = computeArrival(c, { lat: -89.9, lon: 45 });
    const equator = computeArrival(c, { lat: 0, lon: 90 });
    expect(pole.transfer_days).toBe(0);
    expect(pole.wait_hours).toBeCloseTo(pole.llo_period_hours, 5);
    expect(equator.wait_hours).toBeGreaterThan(24 * 6);
  });

  it('design mode lands exactly at the chosen time; the window is surface_days long', () => {
    const c = cfg({ time_mode: 'design', landing_utc: '2027-01-10T12:00:00Z', surface_days: 7 });
    expect(landingTime(c)).toBe('2027-01-10T12:00:00.000Z');
    expect(missionWindow(c)).toEqual({
      start_utc: '2027-01-10T12:00:00.000Z',
      end_utc: '2027-01-17T12:00:00.000Z',
    });
  });
});
