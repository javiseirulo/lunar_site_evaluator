import { describe, expect, it } from 'vitest';
import { latLonToVec3 } from './geo';
import {
  MAX_DURATION,
  MAX_VIEW_LAT,
  MIN_DURATION,
  SITE_VIEW_DISTANCE,
  clampViewDirection,
  easeInOutCubic,
  flightAt,
  planFlight,
  slerpDir,
} from './flight';

const len = (v: number[]) => Math.hypot(v[0]!, v[1]!, v[2]!);

describe('easeInOutCubic', () => {
  it('is 0 at 0, 1 at 1, 0.5 at the middle and monotonic', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 10);
    let prev = 0;
    for (let i = 1; i <= 20; i++) {
      const v = easeInOutCubic(i / 20);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe('slerpDir', () => {
  it('stays on the unit sphere and hits the endpoints', () => {
    const a = latLonToVec3(0, 0);
    const b = latLonToVec3(0, 90);
    expect(slerpDir(a, b, 0)).toEqual(a);
    const m = slerpDir(a, b, 0.5);
    expect(len(m)).toBeCloseTo(1, 10);
    expect(m[0]).toBeCloseTo(Math.SQRT1_2, 10);
    const e = slerpDir(a, b, 1);
    e.forEach((v, i) => expect(v).toBeCloseTo(b[i]!, 10));
  });

  it('never passes through the centre for antipodal points', () => {
    const a = latLonToVec3(0, 0);
    const b = latLonToVec3(0, 180);
    for (let i = 0; i <= 10; i++) expect(len(slerpDir(a, b, i / 10))).toBeCloseTo(1, 10);
  });
});

describe('clampViewDirection', () => {
  it('keeps the camera off the exact pole', () => {
    const d = clampViewDirection(latLonToVec3(-90, 0));
    expect(len(d)).toBeCloseTo(1, 10);
    expect(Math.asin(d[1]) * (180 / Math.PI)).toBeCloseTo(-MAX_VIEW_LAT, 6);
    const ok = latLonToVec3(-60, 30);
    ok.forEach((v, i) => expect(clampViewDirection(ok)[i]).toBeCloseTo(v, 10));
  });
});

describe('planFlight / flightAt', () => {
  const start = latLonToVec3(-30, 0, 3);
  const flight = planFlight(start, latLonToVec3(-89, 40));

  it('starts at the camera and ends at the view distance above the site', () => {
    const s = flightAt(flight, 0);
    s.position.forEach((v, i) => expect(v).toBeCloseTo(start[i]!, 8));
    const end = flightAt(flight, 99);
    expect(end.done).toBe(true);
    expect(len(end.position)).toBeCloseTo(SITE_VIEW_DISTANCE, 8);
    end.position.forEach((v, i) => expect(v / SITE_VIEW_DISTANCE).toBeCloseTo(flight.to[i]!, 8));
  });

  it('lasts 1.4-1.8 s', () => {
    expect(flight.duration).toBeGreaterThanOrEqual(MIN_DURATION);
    expect(flight.duration).toBeLessThanOrEqual(MAX_DURATION);
  });

  it('never dips below the surface and pulls back mid-flight', () => {
    const near = planFlight(latLonToVec3(0, 0, SITE_VIEW_DISTANCE), latLonToVec3(0, 120));
    let max = 0;
    for (let i = 0; i <= 50; i++) {
      const r = len(flightAt(near, (i / 50) * near.duration).position);
      expect(r).toBeGreaterThan(1.05);
      max = Math.max(max, r);
    }
    expect(max).toBeGreaterThan(SITE_VIEW_DISTANCE + 0.2);
  });
});
