import { describe, expect, it } from 'vitest';
import { coordsForClipboard, latLonToVec3, parseCoordinate, vec3ToLatLon } from './geo';

function expectClose(actual: number[], expected: number[]) {
  actual.forEach((v, i) => expect(v).toBeCloseTo(expected[i]!, 10));
}

describe('latLonToVec3', () => {
  it('puts lon 0 on the equator at +X', () => {
    expectClose(latLonToVec3(0, 0, 1), [1, 0, 0]);
  });

  it('puts lon 90 (east) at -Z', () => {
    expectClose(latLonToVec3(0, 90, 1), [0, 0, -1]);
  });

  it('puts the south pole at -Y', () => {
    expectClose(latLonToVec3(-90, 0, 1), [0, -1, 0]);
  });

  it('scales with the radius', () => {
    expectClose(latLonToVec3(0, 180, 2), [-2, 0, 0]);
  });
});

describe('vec3ToLatLon', () => {
  it('inverts latLonToVec3 at any radius', () => {
    for (const [lat, lon] of [
      [-89.45, 141],
      [-85.99, -0.1],
      [12.5, -170],
      [0, 90],
    ] as const) {
      const [x, y, z] = latLonToVec3(lat, lon, 1.002);
      expectClose(vec3ToLatLon(x, y, z), [lat, lon]);
    }
  });
});

describe('parseCoordinate', () => {
  it('reads signed decimals and comma decimals', () => {
    expect(parseCoordinate('-89.5', 'lat')).toBe(-89.5);
    expect(parseCoordinate(' 12,25 ', 'lon')).toBe(12.25);
  });

  it('reads hemisphere letters', () => {
    expect(parseCoordinate('89.5 S', 'lat')).toBe(-89.5);
    expect(parseCoordinate('45.2e', 'lon')).toBe(45.2);
    expect(parseCoordinate('10°W', 'lon')).toBe(-10);
  });

  it('rejects out-of-range, wrong-axis and garbage input', () => {
    expect(parseCoordinate('91', 'lat')).toBeNull();
    expect(parseCoordinate('-181', 'lon')).toBeNull();
    expect(parseCoordinate('10 E', 'lat')).toBeNull();
    expect(parseCoordinate('-10 S', 'lat')).toBeNull();
    expect(parseCoordinate('abc', 'lat')).toBeNull();
    expect(parseCoordinate('', 'lon')).toBeNull();
  });

  it('accepts arbitrary points and the exact range limits', () => {
    expect(parseCoordinate('12.5', 'lat')).toBe(12.5);
    expect(parseCoordinate('45.0', 'lon')).toBe(45);
    expect(parseCoordinate('90', 'lat')).toBe(90);
    expect(parseCoordinate('-90', 'lat')).toBe(-90);
    expect(parseCoordinate('180', 'lon')).toBe(180);
    expect(parseCoordinate('-180', 'lon')).toBe(-180);
    expect(parseCoordinate('90.0001', 'lat')).toBeNull();
    expect(parseCoordinate('180.0001', 'lon')).toBeNull();
  });
});

describe('coordsForClipboard', () => {
  it('formats with 4 decimals', () => {
    expect(coordsForClipboard(-89.45, 141)).toBe('-89.4500, 141.0000');
  });
});
