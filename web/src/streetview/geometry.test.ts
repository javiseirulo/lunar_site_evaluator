import { describe, expect, it } from 'vitest';
import type { Timeseries } from '@lunar/contracts';
import { limitLook, skyAt, skyDirection } from './geometry';

describe('lunar azimuth/elevation convention', () => {
  it('maps the cardinal directions and zenith at equator / prime meridian', () => {
    const north = skyDirection(0, 0, 0, 0);
    const east = skyDirection(0, 0, 90, 0);
    const up = skyDirection(0, 0, 0, 90);
    expect(north.z).toBeCloseTo(1);
    expect(east.y).toBeCloseTo(1);
    expect(up.x).toBeCloseTo(1);
    expect(east.x).toBeCloseTo(0);
  });
  it('uses the selected longitude to define directions at the south pole', () => {
    const north = skyDirection(-90, 90, 0, 0);
    const east = skyDirection(-90, 90, 90, 0);
    const up = skyDirection(-90, 90, 0, 90);
    expect(north.y).toBeCloseTo(1);
    expect(east.x).toBeCloseTo(-1);
    expect(up.z).toBeCloseTo(-1);
  });
  it.each([
    [-89.9, 0],
    [-80, 179],
    [0, -90],
    [90, 45],
  ])('preserves elevation and unit length at %s, %s', (lat, lon) => {
    const direction = skyDirection(lat, lon, 123, 17);
    const up = skyDirection(lat, lon, 0, 90);
    expect(Math.hypot(direction.x, direction.y, direction.z)).toBeCloseTo(1);
    expect(direction.x * up.x + direction.y * up.y + direction.z * up.z).toBeCloseTo(
      Math.sin((17 * Math.PI) / 180),
    );
  });
});

const ts: Timeseries = {
  version: 1,
  mock: true,
  site_id: 'site-a',
  step_s: 3600,
  t_utc: ['2027-01-01T00:00:00Z', '2027-01-01T01:00:00Z'],
  sun_az: [0, 90],
  sun_el: [1, 2],
  earth_az: [180, 190],
  earth_el: [3, 4],
  lit: [1, 0],
};
describe('observer and temporal coverage', () => {
  it('retains the actual sampled timestamp and unknown Earth visibility', () => {
    const sample = skyAt(ts, 'site-a', '2027-01-01T00:30:00Z');
    expect(sample?.t_utc).toBe(ts.t_utc[0]);
    expect(sample?.earthVisible).toBeNull();
    expect(skyAt(ts, 'site-a', ts.t_utc[1]!)?.sun_az).toBe(90);
  });
  it.each(['2026-12-31T23:59:59Z', '2027-01-01T01:00:01Z', 'invalid'])(
    'does not extrapolate %s',
    (time) => {
      expect(skyAt(ts, 'site-a', time)).toBeNull();
    },
  );
  it('rejects another site or unavailable data', () => {
    expect(skyAt(ts, 'site-b', ts.t_utc[0]!)).toBeNull();
    expect(skyAt(null, 'site-a', ts.t_utc[0]!)).toBeNull();
    expect(skyAt({ ...ts, t_utc: [] }, 'site-a', ts.t_utc[0]!)).toBeNull();
  });
});
it('wraps a full 360 degree turn and limits pitch', () => {
  expect(limitLook(-15, 100)).toEqual({ heading: 345, pitch: 85 });
  expect(limitLook(725, -90)).toEqual({ heading: 5, pitch: -85 });
});
