/**
 * Pure sky math for the cockpit window: interpolated Sun/Earth state at a fractional mission
 * hour, and the projection of azimuth/elevation onto the window (x, y in 0..1 of its box).
 *
 * Window model: a fixed view heading (`viewHeading`), a wide horizontal field of view
 * (VIEW_FOV_DEG); azimuth grows to the right (facing north, east is on the right). Elevations
 * at the pole are tiny (Sun within ~±1.5°, Earth within ~±7°), so they are exaggerated with a
 * sign-keeping power law to be readable. `lit` / Earth visibility are authoritative: a body
 * the data says is hidden is drawn below the horizon (behind the terrain) and vice versa.
 */
import type { Timeseries } from '@lunar/contracts';

/** Horizontal field of view of the window, degrees. */
export const VIEW_FOV_DEG = 160;
/** Horizon height as a fraction of the window height from the top. */
export const HORIZON_Y = 0.66;
/** Exponent of the elevation exaggeration (1 = linear, smaller = stronger). */
export const EL_POWER = 0.4;

/** Angle in [-180, 180). */
export function wrapDeg(deg: number): number {
  return ((((deg + 180) % 360) + 360) % 360) - 180;
}

/** Shortest-path interpolation between two azimuths, result in [0, 360). */
export function lerpAngle(a: number, b: number, t: number): number {
  return (((a + wrapDeg(b - a) * t) % 360) + 360) % 360;
}

/** Display elevation: keeps the sign, 0 → 0, ±90 → ±90, small angles enlarged. */
export function exaggerateEl(elDeg: number): number {
  const c = Math.min(90, Math.abs(elDeg));
  return Math.sign(elDeg) * 90 * (c / 90) ** EL_POWER;
}

/** Heading half-way (on the short arc) between two azimuths, so both fit when possible. */
export function viewHeading(sunAz: number, earthAz: number): number {
  return lerpAngle(earthAz, sunAz, 0.5);
}

export interface SkyPoint {
  /** 0..1 across the window (may be outside when out of view). */
  x: number;
  /** 0..1 down the window; > HORIZON_Y = below the horizon. */
  y: number;
  /** Within the horizontal field of view. */
  inView: boolean;
  /** Shown above the horizon (after applying `shown`). */
  up: boolean;
  /** Which edge to point at when the body is up but out of view. */
  edge: 'left' | 'right' | null;
}

/** Margin (fraction of height) that keeps a "shown" body peeking above / "hidden" below. */
const PEEK = 0.04;

/**
 * Window position of a body at `azDeg`/`elDeg`. `shown` (from the data: lit, Earth visible)
 * overrides the geometric sign: a shown body is kept at least just above the horizon, a hidden
 * one just below.
 */
export function placeBody(
  azDeg: number,
  elDeg: number,
  shown: boolean,
  headingDeg: number,
  fovDeg: number = VIEW_FOV_DEG,
): SkyPoint {
  const delta = wrapDeg(azDeg - headingDeg);
  const x = 0.5 + delta / fovDeg;
  let y = HORIZON_Y * (1 - exaggerateEl(elDeg) / 90);
  y = shown ? Math.min(y, HORIZON_Y - PEEK) : Math.max(y, HORIZON_Y + PEEK);
  const inView = Math.abs(delta) <= fovDeg / 2;
  return {
    x,
    y,
    inView,
    up: shown,
    edge: shown && !inView ? (delta < 0 ? 'left' : 'right') : null,
  };
}

export interface SkyState {
  sunAz: number;
  sunEl: number;
  earthAz: number;
  earthEl: number;
  lit: boolean;
  /** null = unknown (counts as visible), as in the engine. */
  earthVisible: boolean | null;
}

/**
 * Sky at fractional mission hour `h` (0 = landing hour = sample `startIndex`): angles linearly
 * interpolated between hourly samples (azimuths on the short arc), flags from the earlier one.
 * Returns null outside the series.
 */
export function skyAt(ts: Timeseries, startIndex: number, h: number): SkyState | null {
  const n = ts.t_utc.length;
  const pos = startIndex + Math.max(0, h);
  const i0 = Math.floor(pos);
  if (i0 < 0 || i0 >= n) return null;
  const i1 = Math.min(n - 1, i0 + 1);
  const t = pos - i0;
  const lerp = (arr: readonly number[]) => arr[i0]! + (arr[i1]! - arr[i0]!) * t;
  const vis = ts.earth_visible?.[i0];
  return {
    sunAz: lerpAngle(ts.sun_az[i0]!, ts.sun_az[i1]!, t),
    sunEl: lerp(ts.sun_el),
    earthAz: lerpAngle(ts.earth_az[i0]!, ts.earth_az[i1]!, t),
    earthEl: lerp(ts.earth_el),
    lit: ts.lit[i0] === 1,
    earthVisible: vis === undefined ? null : vis === 1,
  };
}
