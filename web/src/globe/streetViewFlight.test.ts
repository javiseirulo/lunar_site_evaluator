import { vi, beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '@/core';
import { latLonToVec3 } from './geo';
import {
  HORIZON_DISTANCE,
  STAND_ALTITUDE,
  easeInOut,
  standHere,
  standPose,
  useStreetViewFlight,
} from './streetViewFlight';

const len = (v: number[]) => Math.hypot(v[0]!, v[1]!, v[2]!);
const sub = (a: number[], b: number[]) => a.map((x, i) => x - b[i]!);
const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i]!, 0);

describe('standPose', () => {
  it('stands STAND_ALTITUDE above the terrain and looks level at the horizon', () => {
    const lift = 0.001;
    const { position, target } = standPose(-89.78, 222.7, lift, [0, -3, 1]);
    expect(len(position)).toBeCloseTo(1 + lift + STAND_ALTITUDE, 12);
    const view = sub(target, position);
    expect(len(view)).toBeCloseTo(HORIZON_DISTANCE, 12);
    expect(dot(view, position) / len(position)).toBeCloseTo(0, 12); // level: no up/down
  });

  it('keeps looking the way the camera was travelling', () => {
    const from = latLonToVec3(-60, 0, 3); // north of the site, flying south
    const { position, target } = standPose(-85, 0, 0, from);
    const view = sub(target, position);
    const south = sub(latLonToVec3(-86, 0, 1), latLonToVec3(-85, 0, 1));
    expect(dot(view, south)).toBeGreaterThan(0);
  });

  it('still has a direction straight above the site and at the pole', () => {
    for (const [lat, lon] of [
      [-85, 30],
      [-90, 0],
    ] as const) {
      const above = latLonToVec3(lat, lon, 2);
      const { position, target } = standPose(lat, lon, 0, above);
      expect(len(sub(target, position))).toBeCloseTo(HORIZON_DISTANCE, 9);
      expect(target.every(Number.isFinite)).toBe(true);
    }
  });
});

describe('easeInOut', () => {
  it('goes 0 → 1 smoothly and clamps', () => {
    expect(easeInOut(-1)).toBe(0);
    expect(easeInOut(0.5)).toBeCloseTo(0.5);
    expect(easeInOut(2)).toBe(1);
    expect(easeInOut(0.25)).toBeLessThan(0.25);
  });
});

describe('standHere', () => {
  beforeEach(() => {
    useStreetViewFlight.setState({ globeActive: false, request: null });
    useAppStore.getState().setMode('explore');
  });

  it('switches straight to Street View when the 3D globe is not shown (2D map)', () => {
    standHere({ siteId: 'sr1', lat: -89.78, lon: 222.7 });
    expect(useAppStore.getState().mode).toBe('streetview');
    expect(useStreetViewFlight.getState().request).toBeNull();
  });

  it('asks the globe to fly first in 3D', () => {
    useStreetViewFlight.getState().setGlobeActive(true);
    standHere({ siteId: 'sr1', lat: -89.78, lon: 222.7 });
    expect(useAppStore.getState().mode).toBe('explore');
    expect(useStreetViewFlight.getState().request?.siteId).toBe('sr1');
  });
});

it('reuses the existing flight for a free-coordinate URL, including immediate entry', () => {
  const arrive = vi.fn();
  useStreetViewFlight.setState({ globeActive: false, request: null });
  standHere({ siteId: 'free', lat: -34.2, lon: 12.4, onArrive: arrive });
  expect(arrive).toHaveBeenCalledTimes(1);
  useStreetViewFlight.getState().setGlobeActive(true);
  standHere({ siteId: 'free', lat: -34.2, lon: 12.4, onArrive: arrive });
  expect(arrive).toHaveBeenCalledTimes(1);
  const request = useStreetViewFlight.getState().request!;
  expect(request).toMatchObject({ siteId: 'free', lat: -34.2, lon: 12.4 });
  request.onArrive!();
  expect(arrive).toHaveBeenCalledTimes(2);
  useStreetViewFlight.setState({ globeActive: false, request: null });
});
