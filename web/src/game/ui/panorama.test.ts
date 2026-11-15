import { describe, expect, it } from 'vitest';
import type { SkyState } from './cockpit/sky';
import {
  compassPoint,
  earthText,
  PANO_FOV_DEG,
  PANO_HORIZON,
  PANO_W,
  panoX,
  panoramaGround,
  placePanoBody,
  reconSky,
  ridgeDepths,
  ridgeTopAt,
  RIDGE_STEP_DEG,
} from './panorama';

const sky = (over: Partial<SkyState> = {}): SkyState => ({
  sunAz: 90,
  sunEl: 1,
  earthAz: 0,
  earthEl: 5,
  lit: true,
  earthVisible: true,
  ...over,
});

describe('recon panorama', () => {
  it('builds a closed seeded ridge below the horizon', () => {
    const d = ridgeDepths('peak');
    expect(d).toHaveLength(360 / RIDGE_STEP_DEG);
    expect(d.every((v) => v >= 0 && v <= 26)).toBe(true);
    expect(ridgeDepths('peak')).toEqual(d);
    expect(ridgeDepths('plateau').every((v) => v <= 5)).toBe(true);
    // 359.9° meets 0° without a visible step.
    expect(Math.abs(ridgeTopAt(d, 359.9, []) - ridgeTopAt(d, 0, []))).toBeLessThan(0.5);
  });

  it('centres the heading and wraps azimuths', () => {
    expect(panoX(10, 10)).toBe(PANO_W / 2);
    expect(panoX(350, 10)).toBeCloseTo(PANO_W / 2 - (20 * PANO_W) / PANO_FOV_DEG);
    expect(panoX(10 + PANO_FOV_DEG / 2, 10)).toBeCloseTo(PANO_W);
  });

  it('keeps shown bodies above and hidden ones below the horizon', () => {
    expect(placePanoBody(0, -0.5, true).y).toBeLessThan(PANO_HORIZON);
    const below = placePanoBody(0, -3, false);
    expect(below.y).toBeGreaterThan(PANO_HORIZON);
    expect(below.blocked).toBe(false);
  });

  it('raises a peak over a body hidden by terrain', () => {
    const d = ridgeDepths('rim');
    const body = placePanoBody(120, 1.2, false);
    expect(body.blocked).toBe(true);
    expect(body.y).toBeLessThan(PANO_HORIZON);
    expect(ridgeTopAt(d, 120, [body])).toBeLessThan(body.y);
    // Far from the body the ridge is untouched.
    expect(ridgeTopAt(d, 300, [body])).toBe(ridgeTopAt(d, 300, []));
  });

  it('draws a closed ground path', () => {
    const path = panoramaGround(ridgeDepths('crater'), 45, []);
    expect(path.startsWith('M')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
  });

  it('names compass points', () => {
    expect(compassPoint(0)).toBe('N');
    expect(compassPoint(359)).toBe('N');
    expect(compassPoint(90)).toBe('E');
    expect(compassPoint(-90)).toBe('W');
    expect(compassPoint(202.5)).toBe('SSW');
  });

  it('says why the Sun or the Earth is not up', () => {
    expect(reconSky(sky(), 2)).toEqual({ sun: 'up', earth: 'up', earthShown: true });
    expect(reconSky(sky({ lit: false, sunEl: 0.8 }), 2).sun).toBe('blocked');
    expect(reconSky(sky({ lit: false, sunEl: -1 }), 2).sun).toBe('down');
    expect(reconSky(sky({ earthVisible: false }), 2).earth).toBe('blocked');
    expect(reconSky(sky({ earthEl: 1 }), 2).earth).toBe('low');
    expect(reconSky(sky({ earthEl: -4, earthVisible: false }), 2).earth).toBe('down');
    // Unknown visibility counts as visible, as in the engine.
    expect(reconSky(sky({ earthVisible: null }), 2).earthShown).toBe(true);
    expect(earthText('low', 2)).toContain('2°');
  });
});
