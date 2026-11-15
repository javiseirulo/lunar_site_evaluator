/**
 * Pure maths for the camera flight to a selected site (no three.js, so it is unit-testable).
 * The camera direction slerps around the globe (never through the Moon) while the distance
 * pulls back mid-flight and settles at a closer one.
 */
import type { Vec3Tuple } from './geo';

/** Camera latitude is clamped so the view never sits exactly over a pole (up-vector flip). */
export const MAX_VIEW_LAT = 88.5;
/** Camera distance from the Moon's centre after flying to a site. */
export const SITE_VIEW_DISTANCE = 1.35;
export const MIN_DURATION = 1.4;
export const MAX_DURATION = 1.8;

export type Flight = {
  from: Vec3Tuple; // unit direction
  to: Vec3Tuple; // unit direction
  angle: number; // radians between from and to
  r0: number;
  r1: number;
  duration: number; // seconds
};

const dot = (a: Vec3Tuple, b: Vec3Tuple) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: Vec3Tuple) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: Vec3Tuple): Vec3Tuple => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Ease-in-out (cubic), 0..1 → 0..1. */
export function easeInOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/** Spherical interpolation between two unit vectors; handles identical and antipodal inputs. */
export function slerpDir(a: Vec3Tuple, b: Vec3Tuple, t: number): Vec3Tuple {
  const d = Math.min(1, Math.max(-1, dot(a, b)));
  const angle = Math.acos(d);
  if (angle < 1e-6) return a;
  if (Math.PI - angle < 1e-6) {
    // Antipodal: any great circle works; pick one through a vector perpendicular to a.
    const helper: Vec3Tuple = Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const p = norm([
      a[1] * helper[2] - a[2] * helper[1],
      a[2] * helper[0] - a[0] * helper[2],
      a[0] * helper[1] - a[1] * helper[0],
    ]);
    const th = Math.PI * t;
    const c = Math.cos(th);
    const s = Math.sin(th);
    return [a[0] * c + p[0] * s, a[1] * c + p[1] * s, a[2] * c + p[2] * s];
  }
  const sa = Math.sin(angle);
  const wa = Math.sin((1 - t) * angle) / sa;
  const wb = Math.sin(t * angle) / sa;
  return [wa * a[0] + wb * b[0], wa * a[1] + wb * b[1], wa * a[2] + wb * b[2]];
}

/** Clamps a direction's latitude to ±MAX_VIEW_LAT, keeping its longitude. */
export function clampViewDirection(dir: Vec3Tuple): Vec3Tuple {
  const u = norm(dir);
  const maxY = Math.sin((MAX_VIEW_LAT * Math.PI) / 180);
  if (Math.abs(u[1]) <= maxY) return u;
  const h = Math.hypot(u[0], u[2]);
  const k = Math.sqrt(1 - maxY * maxY) / (h || 1);
  if (h < 1e-9) return [Math.sqrt(1 - maxY * maxY), Math.sign(u[1]) * maxY, 0]; // exactly on the axis
  return [u[0] * k, Math.sign(u[1]) * maxY, u[2] * k];
}

/** Plans a flight from the current camera position to a site's surface direction. */
export function planFlight(
  cameraPos: Vec3Tuple,
  siteDir: Vec3Tuple,
  viewDistance = SITE_VIEW_DISTANCE,
): Flight {
  const from = norm(cameraPos);
  const to = clampViewDirection(siteDir);
  const angle = Math.acos(Math.min(1, Math.max(-1, dot(from, to))));
  const duration = MIN_DURATION + (MAX_DURATION - MIN_DURATION) * Math.min(1, angle / Math.PI);
  return { from, to, angle, r0: len(cameraPos), r1: viewDistance, duration };
}

/** Camera position at elapsed seconds into the flight, plus whether it has finished. */
export function flightAt(f: Flight, elapsed: number): { position: Vec3Tuple; done: boolean } {
  const t = Math.min(1, Math.max(0, elapsed / f.duration));
  const e = easeInOutCubic(t);
  const dir = slerpDir(f.from, f.to, e);
  // Pull back in proportion to the distance travelled, then settle at the closer distance.
  const pullback = 0.5 * (f.angle / Math.PI) * Math.max(f.r0, f.r1);
  const r = f.r0 + (f.r1 - f.r0) * e + pullback * Math.sin(Math.PI * e);
  return { position: [dir[0] * r, dir[1] * r, dir[2] * r], done: t >= 1 };
}
