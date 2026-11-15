import { describe, expect, it } from 'vitest';
import type { Timeseries } from '@lunar/contracts';
import {
  exaggerateEl,
  HORIZON_Y,
  lerpAngle,
  placeBody,
  signalBars,
  skyAt,
  VIEW_FOV_DEG,
  viewHeading,
  wrapDeg,
} from './sky';

describe('sky math', () => {
  it('wrapDeg / lerpAngle take the short way round', () => {
    expect(wrapDeg(190)).toBe(-170);
    expect(wrapDeg(-190)).toBe(170);
    expect(wrapDeg(360)).toBe(0);
    expect(lerpAngle(350, 10, 0.5)).toBeCloseTo(0, 9);
    expect(lerpAngle(10, 350, 0.25)).toBeCloseTo(5, 9);
    expect(lerpAngle(90, 180, 0.5)).toBe(135);
  });

  it('exaggerateEl keeps the sign, the ends and the order, and enlarges small angles', () => {
    expect(exaggerateEl(0)).toBe(0);
    expect(exaggerateEl(90)).toBeCloseTo(90, 9);
    expect(exaggerateEl(-90)).toBeCloseTo(-90, 9);
    expect(exaggerateEl(1.5)).toBeGreaterThan(10);
    expect(exaggerateEl(-1.5)).toBeLessThan(-10);
    expect(exaggerateEl(2)).toBeGreaterThan(exaggerateEl(1));
    expect(exaggerateEl(120)).toBeCloseTo(90, 9);
  });

  it('viewHeading is the short-arc midpoint', () => {
    expect(viewHeading(10, 350)).toBeCloseTo(0, 9);
    expect(viewHeading(100, 0)).toBe(50);
  });

  it('placeBody maps azimuth to x around the heading, with wrap-around', () => {
    expect(placeBody(0, 5, true, 0).x).toBe(0.5);
    expect(placeBody(40, 5, true, 0).x).toBeCloseTo(0.5 + 40 / VIEW_FOV_DEG, 9);
    expect(placeBody(350, 5, true, 10).x).toBeCloseTo(0.5 - 20 / VIEW_FOV_DEG, 9);
    const behind = placeBody(180, 5, true, 0);
    expect(behind.inView).toBe(false);
    expect(behind.edge).not.toBeNull();
    expect(placeBody(-100, 5, true, 0).edge).toBe('left');
    expect(placeBody(100, 5, true, 0).edge).toBe('right');
    expect(placeBody(100, 5, false, 0).edge).toBeNull();
  });

  it('placeBody puts shown bodies above the horizon and hidden ones below', () => {
    const high = placeBody(0, 5, true, 0);
    const low = placeBody(0, 1, true, 0);
    expect(high.y).toBeLessThan(low.y);
    expect(low.y).toBeLessThan(HORIZON_Y);
    expect(placeBody(0, -0.5, true, 0).y).toBeLessThan(HORIZON_Y); // data says lit
    expect(placeBody(0, 3, false, 0).y).toBeGreaterThan(HORIZON_Y); // data says hidden
    expect(placeBody(0, -3, false, 0).y).toBeGreaterThan(HORIZON_Y);
  });

  it('skyAt interpolates angles between hourly samples and takes flags from the earlier one', () => {
    const ts = {
      t_utc: ['a', 'b', 'c'],
      sun_az: [350, 10, 30],
      sun_el: [1, 2, 3],
      earth_az: [0, 2, 4],
      earth_el: [5, 6, 7],
      lit: [1, 0, 0],
      earth_visible: [1, 1, 0],
    } as unknown as Timeseries;
    const s = skyAt(ts, 0, 0.5)!;
    expect(s.sunAz).toBeCloseTo(0, 9);
    expect(s.sunEl).toBe(1.5);
    expect(s.earthEl).toBe(5.5);
    expect(s.lit).toBe(true);
    expect(skyAt(ts, 1, 1)!.earthVisible).toBe(false);
    expect(skyAt(ts, 1, 1.9)!.sunEl).toBe(3); // last sample: no next one to blend with
    expect(skyAt(ts, 0, 5)).toBeNull();
    const noVis = { ...ts, earth_visible: undefined } as unknown as Timeseries;
    expect(skyAt(noVis, 0, 0)!.earthVisible).toBeNull();
  });

  it('signalBars: 0 when down, 1 at the margin, up to 4', () => {
    expect(signalBars(false, 10, 2)).toBe(0);
    expect(signalBars(true, 2, 2)).toBe(1);
    expect(signalBars(true, 3.6, 2)).toBe(2);
    expect(signalBars(true, 30, 2)).toBe(4);
    expect(signalBars(true, -5, 2)).toBe(1); // unknown-visibility edge cases still show a bar
  });
});
