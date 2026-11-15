import { describe, expect, it } from 'vitest';
import { latLonToVec3, type Vec3Tuple } from './geo';
import {
  DIVE_ALTITUDE,
  SPIN_DISTANCE,
  easeInOutCubic,
  expoOut,
  flightPosition,
  lonOf,
  lookDownPose,
  mixDir,
  poleFraming,
  spinPose,
  stepToward,
} from './cinematic';

const len = (v: readonly number[]) => Math.hypot(v[0]!, v[1]!, v[2]!);
const sub = (a: readonly number[], b: readonly number[]) => a.map((x, i) => x - b[i]!);
const dot = (a: readonly number[], b: readonly number[]) => a.reduce((s, x, i) => s + x * b[i]!, 0);

describe('expoOut', () => {
  it('goes exactly 0 → 1 and clamps', () => {
    expect(expoOut(0)).toBe(0);
    expect(expoOut(1)).toBeCloseTo(1, 12);
    expect(expoOut(-3)).toBe(0);
    expect(expoOut(4)).toBeCloseTo(1, 12);
    expect(expoOut(Number.NaN)).toBeCloseTo(1, 12);
  });

  it('is fast at first and slows down at the end', () => {
    expect(expoOut(0.25)).toBeGreaterThan(0.5);
    const early = expoOut(0.1) - expoOut(0);
    const late = expoOut(1) - expoOut(0.9);
    expect(early).toBeGreaterThan(late * 10);
    for (let t = 0; t < 1; t += 0.05) expect(expoOut(t + 0.05)).toBeGreaterThan(expoOut(t));
  });

  it('is linear for k = 0', () => {
    expect(expoOut(0.3, 0)).toBeCloseTo(0.3);
  });
});

describe('easeInOutCubic', () => {
  it('is symmetric and clamped', () => {
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
    expect(easeInOutCubic(-1)).toBe(0);
    expect(easeInOutCubic(2)).toBe(1);
  });
});

describe('flightPosition', () => {
  const from = latLonToVec3(-30, 20, 3);
  const to = latLonToVec3(-88, 40, 1 + DIVE_ALTITUDE);

  it('starts and ends at the given points', () => {
    sub(flightPosition(from, to, 0), from).forEach((d) => expect(d).toBeCloseTo(0, 9));
    sub(flightPosition(from, to, 1), to).forEach((d) => expect(d).toBeCloseTo(0, 9));
  });

  it('never goes inside the Moon and loses altitude geometrically', () => {
    const alt = (e: number) => len(flightPosition(from, to, e)) - 1;
    for (let e = 0; e <= 1; e += 0.1) expect(alt(e)).toBeGreaterThan(0);
    // Geometric: the same ratio over every equal step.
    expect(alt(0.2) / alt(0)).toBeCloseTo(alt(0.6) / alt(0.4), 6);
  });

  it('copes with antipodal start and end', () => {
    const p = flightPosition([0, 2, 0], [0, -2, 0], 0.5);
    expect(p.every(Number.isFinite)).toBe(true);
    expect(len(p)).toBeCloseTo(2, 6);
  });
});

describe('lookDownPose', () => {
  it('stands `altitude` above the site, leaning back towards the camera', () => {
    const from = latLonToVec3(-60, 0, 3);
    const pose = lookDownPose(-85, 0, 0.001, DIVE_ALTITUDE, from);
    const up = latLonToVec3(-85, 0, 1);
    expect(len(pose.target)).toBeCloseTo(1.001, 9);
    // Height above the target along the local vertical.
    expect(dot(sub(pose.position, pose.target), up)).toBeCloseTo(DIVE_ALTITUDE, 9);
    // Leaning towards where the camera came from (north, towards lat −60).
    const north = sub(latLonToVec3(-84, 0, 1), up);
    expect(dot(sub(pose.position, pose.target), north)).toBeGreaterThan(0);
  });

  it('has a direction straight above the site and at the pole', () => {
    for (const [lat, lon] of [
      [-85, 30],
      [-90, 0],
    ] as const) {
      const pose = lookDownPose(lat, lon, 0, 0.1, latLonToVec3(lat, lon, 2));
      expect(pose.position.every(Number.isFinite)).toBe(true);
      expect(len(pose.up)).toBeCloseTo(1, 9);
    }
  });
});

describe('poleFraming', () => {
  const from: Vec3Tuple = latLonToVec3(-30, 0, 3);
  const markers = [
    { lat: -89.5, lon: 0 },
    { lat: -85, lon: 90 },
    { lat: -86, lon: -120 },
    { lat: -84, lon: 200 },
  ];

  it('looks at a point near the markers and keeps them all in a 45° view', () => {
    const pose = poleFraming(markers, from);
    const view = sub(pose.target, pose.position);
    const halfFov = (22.5 * Math.PI) / 180;
    for (const m of markers) {
      const toMarker = sub(latLonToVec3(m.lat, m.lon, 1), pose.position);
      const angle = Math.acos(dot(view, toMarker) / (len(view) * len(toMarker)));
      expect(angle).toBeLessThan(halfFov);
    }
  });

  it('falls back to the south pole without markers', () => {
    const pose = poleFraming([], from);
    expect(pose.target[1]).toBeCloseTo(-1, 9);
  });
});

describe('spinPose', () => {
  it('turns around the Moon at a fixed distance', () => {
    const a = spinPose(10, 0);
    const b = spinPose(10, 5000);
    expect(len(a.position)).toBeCloseTo(SPIN_DISTANCE, 9);
    expect(lonOf(a.position)).toBeCloseTo(10, 9);
    expect(lonOf(b.position)).toBeCloseTo(30, 9);
  });
});

describe('dive altitude', () => {
  it('stops between 60 and 100 km above the site', () => {
    const km = DIVE_ALTITUDE * 1737.4;
    expect(km).toBeGreaterThanOrEqual(60);
    expect(km).toBeLessThanOrEqual(100);
  });
});

describe('light blending', () => {
  it('stepToward moves linearly, clamps at the target and jumps without a duration', () => {
    expect(stepToward(0, 1, 500, 1000)).toBeCloseTo(0.5);
    expect(stepToward(0.9, 1, 500, 1000)).toBe(1);
    expect(stepToward(1, 0, 250, 1000)).toBeCloseTo(0.75);
    expect(stepToward(0.2, 0, 1000, 1000)).toBe(0);
    expect(stepToward(0.3, 1, 16, 0)).toBe(1);
    expect(stepToward(0.3, 1, -50, 1000)).toBe(0.3);
  });

  it('mixDir returns unit vectors at both ends and in between', () => {
    const a = [1, 0, 0] as const;
    const b = [0, 1, 0] as const;
    expect(mixDir([...a], [...b], 0)).toEqual([1, 0, 0]);
    expect(mixDir([...a], [...b], 1)).toEqual([0, 1, 0]);
    expect(len(mixDir([...a], [...b], 0.5))).toBeCloseTo(1, 12);
  });
});
