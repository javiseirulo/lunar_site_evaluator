import { describe, expect, it } from 'vitest';
import {
  NavigationGestures,
  SurfaceTap,
  canWalk,
  lightingState,
  limitFov,
  surfaceDistance,
  wheelFactor,
} from './navigation';

describe('street view pointer gestures', () => {
  it('recognizes a nearby second tap for saving and keeps distant taps independent', () => {
    const taps = new SurfaceTap();
    expect(taps.tap(100, 200, 0)).toBe('wait');
    expect(taps.tap(105, 204, 250)).toBe('save');
    expect(taps.tap(100, 200, 600)).toBe('wait');
    expect(taps.tap(200, 300, 700)).toBe('wait');
    taps.clear();
    expect(taps.tap(200, 300, 800)).toBe('wait');
  });
  it('only accepts the primary button and distinguishes a tap from a drag', () => {
    const g = new NavigationGestures();
    expect(g.down(1, 20, 30, 2)).toBe(false);
    g.down(1, 20, 30);
    expect(g.move(1, 22, 31)).toBeNull();
    expect(g.up(1, 22, 31)).toEqual({ type: 'tap', x: 22, y: 31 });
    g.down(1, 20, 30);
    expect(g.move(1, 60, 40)).toEqual({ type: 'look', dx: -40, dy: 10 });
    expect(g.up(1, 60, 40)).toBeNull();
  });
  it('pinches without walking when either finger is released', () => {
    const g = new NavigationGestures();
    g.down(1, 0, 0);
    g.down(2, 100, 0);
    expect(g.move(2, 200, 0)).toEqual({ type: 'zoom', factor: 0.5 });
    expect(g.up(2, 200, 0)).toBeNull();
    expect(g.up(1, 0, 0)).toBeNull();
    expect(g.active).toBe(false);
  });
  it('cancels interrupted gestures without leaving the camera captured', () => {
    const g = new NavigationGestures();
    g.down(1, 0, 0);
    g.cancel();
    expect(g.move(1, 50, 50)).toBeNull();
    expect(g.up(1, 50, 50)).toBeNull();
  });
});
it('limits walking and zoom and normalises wheel units', () => {
  expect(canWalk(200)).toBe(true);
  expect(canWalk(201)).toBe(false);
  expect(canWalk(NaN)).toBe(false);
  expect(canWalk(0.5)).toBe(false);
  expect(limitFov(1)).toBe(25);
  expect(limitFov(180)).toBe(90);
  expect(wheelFactor(3, 1, 400)).toBe(wheelFactor(48, 0, 400));
});
it('measures nearby movement across the dateline on the Moon', () => {
  const d = surfaceDistance({ lat: 0, lon: 179.999 }, { lat: 0, lon: -179.999 });
  expect(d).toBeGreaterThan(60);
  expect(d).toBeLessThan(61);
});
it('distinguishes night, local shadow, sunlight and missing sky data', () => {
  expect(lightingState(null)).toBe('unknown');
  expect(lightingState({ sun_el: -1, lit: false })).toBe('night');
  expect(lightingState({ sun_el: 1, lit: false })).toBe('shadow');
  expect(lightingState({ sun_el: 1, lit: true })).toBe('sunlight');
  expect(lightingState({ sun_el: -0.05, lit: true })).toBe('sunlight');
});
