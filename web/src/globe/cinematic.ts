/**
 * Cinematic mode of the globe — owner: Marta (src/globe); added for the Mission game (#100).
 *
 * Optional: `<GlobeView cinematic={{ shot }} onShotDone={…} />`. Without the prop the globe is the
 * Explore globe, unchanged. With it, the camera is driven by the shot (no cards, labels, controls
 * or clicks); see CinematicCanvas.tsx. This file holds the types and the pure camera maths (tested).
 *
 * Every shot is a pose the camera flies to from wherever it is; `spin` keeps turning afterwards.
 */
import { latLonToVec3, type Vec3Tuple } from './geo';

export interface CinematicMarker {
  id: string;
  lat: number;
  lon: number;
  /** Text drawn on the marker (e.g. "1".."4"). Never a site name unless the caller wants it. */
  label: string;
}

export interface LatLon {
  lat: number;
  lon: number;
}

export type CinematicShot =
  /** Slow turn of the whole Moon (menu / intro backgrounds). Never "done". */
  | { kind: 'spin' }
  /** Fly over the south pole and show the given markers. */
  | { kind: 'pole'; markers: readonly CinematicMarker[] }
  /** Descend from where the camera is to low over `target`, fast first then gently slowing. */
  | { kind: 'dive'; target: LatLon; durationMs: number }
  /** Start low over `target` and pull back, showing `label` (e.g. the site's real name). */
  | { kind: 'reveal'; target: LatLon; label: string };

export interface CinematicView {
  shot: CinematicShot;
}

/** A camera pose: where it is, what it looks at and its "up" (globe units, Moon radius = 1). */
export interface Pose {
  position: Vec3Tuple;
  target: Vec3Tuple;
  up: Vec3Tuple;
}

/** Distance of the spinning camera from the Moon's centre. */
export const SPIN_DISTANCE = 2.9;
/** Latitude of the spinning camera (a little south, so the polar region shows). */
export const SPIN_LAT = -25;
/** Spin speed in degrees per second. */
export const SPIN_DEG_PER_S = 4;
/** Height of the camera above the site at the end of a dive: ~25 km. */
export const DIVE_ALTITUDE = 25_000 / 1_737_400;
/** Height above the site at the end of a reveal pull-back: ~500 km. */
export const REVEAL_ALTITUDE = 500_000 / 1_737_400;
/** Flight time to a pole or reveal pose. */
export const POLE_FLIGHT_MS = 2600;
export const REVEAL_FLIGHT_MS = 3200;
/** How far the camera stands back from straight above its target, per unit of altitude. */
const LEAN_BACK = 0.6;

const dot = (a: Vec3Tuple, b: Vec3Tuple) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: Vec3Tuple) => Math.hypot(a[0], a[1], a[2]);
const scale = (a: Vec3Tuple, k: number): Vec3Tuple => [a[0] * k, a[1] * k, a[2] * k];
const add = (a: Vec3Tuple, b: Vec3Tuple): Vec3Tuple => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const norm = (a: Vec3Tuple): Vec3Tuple => scale(a, 1 / (len(a) || 1));
const clamp01 = (t: number) => Math.min(1, Math.max(0, Number.isFinite(t) ? t : 1));

/**
 * Exponential ease-out for t ∈ [0, 1]: fast at first, slowing gently, exactly 0 → 1.
 * `k` sets how front-loaded it is (k → 0 is linear).
 */
export function expoOut(t: number, k = 5): number {
  const x = clamp01(t);
  return k <= 1e-6 ? x : (1 - Math.exp(-k * x)) / (1 - Math.exp(-k));
}

/** Smooth start and stop for t ∈ [0, 1]. */
export function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

/** Part of `v` along the ground at `up` (unit), or null when it is (nearly) vertical. */
function horizontal(v: Vec3Tuple, up: Vec3Tuple): Vec3Tuple | null {
  const h = add(v, scale(up, -dot(v, up)));
  return len(h) < 1e-9 ? null : norm(h);
}

/**
 * Camera position along a flight from `from` to `to` at progress `e` ∈ [0, 1]: the direction
 * turns around the globe (never through it) and the altitude changes geometrically, so a
 * descent covers the high part quickly and the last kilometres slowly.
 */
export function flightPosition(from: Vec3Tuple, to: Vec3Tuple, e: number): Vec3Tuple {
  const x = clamp01(e);
  const a = norm(from);
  const b = norm(to);
  let dir = add(scale(a, 1 - x), scale(b, x));
  if (len(dir) < 1e-6) dir = horizontal([0, 1, 0], a) ?? [1, 0, 0]; // antipodal: go round
  const h0 = Math.max(1e-5, len(from) - 1);
  const h1 = Math.max(1e-5, len(to) - 1);
  const h = Math.exp(Math.log(h0) + (Math.log(h1) - Math.log(h0)) * x);
  return scale(norm(dir), 1 + h);
}

/**
 * Pose looking at the ground point `target` (radius `r`) from `altitude` above it, leaning back
 * towards `from` (the camera's current position) so the view is oblique, with the sky as "up".
 */
export function lookDownPose(
  lat: number,
  lon: number,
  groundLift: number,
  altitude: number,
  from: Vec3Tuple,
): Pose {
  const up = latLonToVec3(lat, lon, 1);
  const target = scale(up, 1 + groundLift);
  const back =
    horizontal(add(from, scale(target, -1)), up) ??
    horizontal([1, 0, 0], up) ??
    horizontal([0, 0, 1], up)!;
  const position = add(scale(up, 1 + groundLift + altitude), scale(back, altitude * LEAN_BACK));
  return { position, target, up: norm(position) };
}

/** Pose of the spinning camera `elapsedMs` after it started at longitude `lon0`. */
export function spinPose(lon0: number, elapsedMs: number): Pose {
  const lon = lon0 + (SPIN_DEG_PER_S * elapsedMs) / 1000;
  return { position: latLonToVec3(SPIN_LAT, lon, SPIN_DISTANCE), target: [0, 0, 0], up: [0, 1, 0] };
}

/**
 * Pose framing a set of markers near the pole: looks at their centre (the south pole if there
 * are none), high enough to fit them all on screen.
 */
export function poleFraming(markers: readonly LatLon[], from: Vec3Tuple): Pose {
  if (markers.length === 0) return lookDownPose(-90, 0, 0, 0.3, from);
  let c: Vec3Tuple = [0, 0, 0];
  for (const m of markers) c = add(c, latLonToVec3(m.lat, m.lon, 1));
  c = norm(c);
  // Widest angle (radians) from the centre to a marker.
  const spread = Math.max(
    ...markers.map((m) => Math.acos(Math.min(1, dot(c, latLonToVec3(m.lat, m.lon, 1))))),
  );
  const altitude = Math.min(0.6, Math.max(0.12, spread * 3.2));
  const lat = (Math.asin(c[1]) * 180) / Math.PI;
  const lon = (Math.atan2(-c[2], c[0]) * 180) / Math.PI;
  return lookDownPose(lat, lon, 0, altitude, from);
}

/** Longitude (degrees) of a camera position, for starting a spin where the camera already is. */
export function lonOf(p: Vec3Tuple): number {
  return (Math.atan2(-p[2], p[0]) * 180) / Math.PI;
}
