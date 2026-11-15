/**
 * "Stand here in Street View" — owner: Marta (src/globe). Local signal, not shared.
 *
 * In 3D the globe first flies the camera down to a few km above the site, looking at the horizon,
 * and only then switches mode; in 2D (globe not mounted) the mode switches at once.
 */
import { create } from 'zustand';
import { useAppStore } from '@/core';
import { latLonToVec3 } from './geo';

type Vec3 = [number, number, number];

/** Camera height above the ground at the end of the flight: 3 km, in globe units (R = 1). */
export const STAND_ALTITUDE = 3000 / 1_737_400;
/** Distance to the look-at point: roughly the horizon seen from 3 km (√(2Rh) ≈ 100 km). */
export const HORIZON_DISTANCE = 100_000 / 1_737_400;
/** Flight duration (ms). */
export const FLIGHT_MS = 1500;

export interface StreetViewRequest {
  siteId: string;
  lat: number;
  lon: number;
}

interface FlightState {
  /** True while the 3D globe is mounted and can play the flight. */
  globeActive: boolean;
  request: StreetViewRequest | null;
  setGlobeActive: (on: boolean) => void;
  clear: () => void;
}

export const useStreetViewFlight = create<FlightState>()((set) => ({
  globeActive: false,
  request: null,
  setGlobeActive: (globeActive) =>
    set(globeActive ? { globeActive } : { globeActive, request: null }),
  clear: () => set({ request: null }),
}));

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

/** Button handler: fly first in 3D, otherwise go straight to Street View. */
export function standHere(site: StreetViewRequest): void {
  const flight = useStreetViewFlight.getState();
  if (flight.globeActive && !prefersReducedMotion()) {
    useStreetViewFlight.setState({ request: site });
  } else {
    useAppStore.getState().setMode('streetview');
  }
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / l, a[1] / l, a[2] / l];
};
/** Part of `v` along the ground at `up` (unit), or null when it is (nearly) vertical. */
function horizontal(v: Vec3, up: Vec3): Vec3 | null {
  const k = dot(v, up);
  const h: Vec3 = [v[0] - up[0] * k, v[1] - up[1] * k, v[2] - up[2] * k];
  return Math.hypot(h[0], h[1], h[2]) < 1e-9 ? null : norm(h);
}

/**
 * Final camera pose standing over a site: `groundLift` (terrain height in globe units) plus
 * STAND_ALTITUDE above the ground, looking level at the horizon in the direction of travel
 * (from where the camera was), or north (+Y) / +X at the pole when there is no clear direction.
 */
export function standPose(
  lat: number,
  lon: number,
  groundLift: number,
  from: Vec3,
): { position: Vec3; target: Vec3 } {
  const up = latLonToVec3(lat, lon, 1);
  const r = 1 + groundLift + STAND_ALTITUDE;
  const position: Vec3 = [up[0] * r, up[1] * r, up[2] * r];
  const f = norm(from);
  const forward =
    horizontal([up[0] - f[0], up[1] - f[1], up[2] - f[2]], up) ??
    horizontal([0, 1, 0], up) ??
    horizontal([1, 0, 0], up)!;
  const target: Vec3 = [
    position[0] + forward[0] * HORIZON_DISTANCE,
    position[1] + forward[1] * HORIZON_DISTANCE,
    position[2] + forward[2] * HORIZON_DISTANCE,
  ];
  return { position, target };
}

/** Smooth start and stop for t ∈ [0, 1]. */
export function easeInOut(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}
