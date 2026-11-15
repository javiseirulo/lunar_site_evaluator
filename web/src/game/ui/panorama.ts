/**
 * Pure math for the recon fallback panorama (`ReconPanorama`): a 360° view around the landing
 * site that the player drags to look around when the 3D terrain is unavailable.
 *
 * Same sky model as the cockpit window (`cockpit/sky.ts`): azimuth grows to the right,
 * elevations are exaggerated to be readable, and the data's flags are authoritative. A body the
 * data says is hidden although it is geometrically above the horizon (terrain in the way) gets a
 * local peak in the ridge that covers it, so the player can actually see "a mountain hides the
 * Sun". The ridge itself is a seeded silhouette per terrain family (not the real horizon).
 */
import { isLinkUp } from '../engine/simulate';
import { mulberry32 } from '../engine/random';
import type { Terrain } from './assets';
import { exaggerateEl, HORIZON_Y, wrapDeg, type SkyState } from './cockpit/sky';

/** Panorama box in SVG units. */
export const PANO_W = 400;
export const PANO_H = 200;
export const PANO_HORIZON = HORIZON_Y * PANO_H;
/** Horizontal field of view shown at once, degrees. */
export const PANO_FOV_DEG = 100;
/** Ridge resolution: one sample every RIDGE_STEP_DEG around the full circle. */
export const RIDGE_STEP_DEG = 5;

/** Max ridge depth below the horizon line per terrain family (px of the 200-px box). */
const RIDGE_AMP: Record<Terrain, number> = {
  peak: 26,
  massif: 22,
  mons: 24,
  ridge: 16,
  rim: 12,
  cliff: 14,
  crater: 10,
  plateau: 5,
};
const RIDGE_JAG: Record<Terrain, number> = {
  peak: 1,
  massif: 0.8,
  mons: 0.6,
  ridge: 0.9,
  rim: 0.5,
  cliff: 1,
  crater: 0.4,
  plateau: 0.3,
};
const TERRAIN_SEED: Record<Terrain, number> = {
  peak: 11,
  massif: 23,
  mons: 37,
  ridge: 41,
  rim: 53,
  cliff: 67,
  crater: 71,
  plateau: 89,
};

/** Keeps a shown body peeking above the horizon, a hidden one below (px). */
const PEEK = 8;
/** Half-width of the peak that hides a body behind terrain, degrees. */
const BLOCK_HALF_WIDTH_DEG = 14;

/** Seeded ridge around the full circle: depth below the horizon in px, closing on itself. */
export function ridgeDepths(terrain: Terrain): number[] {
  const n = 360 / RIDGE_STEP_DEG;
  const rnd = mulberry32(TERRAIN_SEED[terrain]);
  const amp = RIDGE_AMP[terrain];
  const jag = RIDGE_JAG[terrain];
  const raw: number[] = [];
  let prev = 0.5;
  for (let i = 0; i < n; i++) {
    prev = Math.min(1, Math.max(0, prev + (rnd() - 0.5) * jag));
    raw.push(prev);
  }
  // Blend the last quarter towards the start so 359° meets 0° without a step.
  const blend = Math.floor(n / 4);
  for (let i = n - blend; i < n; i++) {
    const t = (i - (n - blend)) / blend;
    raw[i] = raw[i]! * (1 - t) + raw[0]! * t;
  }
  return raw.map((v) => amp * (1 - v));
}

/** Screen x of azimuth `az` with the view centred on `heading`. */
export function panoX(az: number, heading: number, fov = PANO_FOV_DEG): number {
  return PANO_W / 2 + (wrapDeg(az - heading) * PANO_W) / fov;
}

export interface PanoBody {
  az: number;
  /** Screen y (px of the 200-px box). */
  y: number;
  /** Drawn above the ridge. */
  up: boolean;
  /** Geometrically above the horizon but hidden by terrain (a peak covers it). */
  blocked: boolean;
}

/** Vertical placement of a body; `shown` comes from the data (lit, Earth link). */
export function placePanoBody(az: number, el: number, shown: boolean): PanoBody {
  const raw = PANO_HORIZON * (1 - exaggerateEl(el) / 90);
  if (shown) return { az, y: Math.min(raw, PANO_HORIZON - PEEK), up: true, blocked: false };
  if (el > 0) return { az, y: raw, up: false, blocked: true };
  return { az, y: Math.max(raw, PANO_HORIZON + PEEK), up: false, blocked: false };
}

/** Ridge top (screen y) at azimuth `az`: the seeded ridge, raised over blocked bodies. */
export function ridgeTopAt(depths: readonly number[], az: number, blocked: readonly PanoBody[]) {
  const n = depths.length;
  const pos = (((az % 360) + 360) % 360) / RIDGE_STEP_DEG;
  const i0 = Math.floor(pos) % n;
  const i1 = (i0 + 1) % n;
  const t = pos - Math.floor(pos);
  let top = PANO_HORIZON + depths[i0]! * (1 - t) + depths[i1]! * t;
  for (const b of blocked) {
    const d = Math.abs(wrapDeg(az - b.az));
    if (d >= BLOCK_HALF_WIDTH_DEG) continue;
    // A rounded peak whose summit sits clearly above the hidden body.
    const summit = b.y - PEEK - 6;
    const base = PANO_HORIZON + 4;
    const k = d / BLOCK_HALF_WIDTH_DEG;
    top = Math.min(top, summit + (base - summit) * k * k);
  }
  return top;
}

/** SVG path of the ground (ridge silhouette down to the bottom) for the visible arc. */
export function panoramaGround(
  depths: readonly number[],
  heading: number,
  blocked: readonly PanoBody[],
  fov = PANO_FOV_DEG,
): string {
  const half = fov / 2 + 2;
  const pts: string[] = [];
  for (let d = -half; d <= half; d += 1) {
    const x = PANO_W / 2 + (d * PANO_W) / fov;
    pts.push(`${x.toFixed(1)},${ridgeTopAt(depths, heading + d, blocked).toFixed(1)}`);
  }
  const left = (PANO_W / 2 - (half * PANO_W) / fov).toFixed(1);
  const right = (PANO_W / 2 + (half * PANO_W) / fov).toFixed(1);
  return `M${left},${PANO_H} L${pts.join(' L')} L${right},${PANO_H} Z`;
}

/** 16-point compass label for a heading in degrees. */
export function compassPoint(heading: number): string {
  const points = [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
  ];
  const i = Math.round((((heading % 360) + 360) % 360) / 22.5) % 16;
  return points[i]!;
}

export type SunStatus = 'up' | 'blocked' | 'down';
export type EarthStatus = 'up' | 'blocked' | 'low' | 'down';

export interface ReconSky {
  sun: SunStatus;
  earth: EarthStatus;
  /** Earth shown in the sky (the link condition: not masked by terrain and above the margin). */
  earthShown: boolean;
}

/**
 * Sun and Earth at touchdown, as the engine judges them: Sun up = `lit`; Earth in view = link
 * up (not hidden by terrain and at least `marginDeg` high). Also says why a body is not up:
 * behind terrain (above the horizon but hidden), too low for the antenna, or below the horizon.
 */
export function reconSky(sky: SkyState, marginDeg: number): ReconSky {
  const sun: SunStatus = sky.lit ? 'up' : sky.sunEl > 0 ? 'blocked' : 'down';
  const earthShown = isLinkUp(sky.earthVisible, sky.earthEl, marginDeg);
  const earth: EarthStatus = earthShown
    ? 'up'
    : sky.earthEl > 0 && sky.earthVisible === false
      ? 'blocked'
      : sky.earthEl > 0
        ? 'low'
        : 'down';
  return { sun, earth, earthShown };
}

export const SUN_TEXT: Record<SunStatus, string> = {
  up: 'Sun up',
  blocked: 'Sun hidden by terrain',
  down: 'Sun below the horizon',
};

export function earthText(status: EarthStatus, marginDeg: number): string {
  switch (status) {
    case 'up':
      return 'Earth in view';
    case 'blocked':
      return 'Earth hidden by terrain';
    case 'low':
      return `Earth too low (under ${marginDeg}°)`;
    case 'down':
      return 'Earth below the horizon';
  }
}
