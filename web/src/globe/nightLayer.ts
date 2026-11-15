/**
 * Day / night layer over the 3D globe — owner: Marta (src/globe). Local, off by default.
 *
 * Off: realistic lighting (no atmosphere, so the night side is black). On: a bluish fill light
 * shows the night side's surface, and a line marks the terminator (day/night boundary) for the
 * Mission Clock time, so you can watch the night move.
 */
import { create } from 'zustand';

interface NightLayerState {
  on: boolean;
  setOn: (on: boolean) => void;
}

export const useNightLayer = create<NightLayerState>()((set) => ({
  on: false,
  setOn: (on) => set({ on }),
}));

/** Fill light while the layer is on: the night side shows in blue, the day side stays sunlit. */
export const NIGHT_FILL = { color: '#8ea4dc', intensity: 0.6 } as const;
/** Terminator line radius: just above the highest polar relief (~+2 km ≈ 0.0012). */
export const TERMINATOR_RADIUS = 1.003;

type Vec3 = readonly [number, number, number];

/**
 * Closed great circle of `n` points perpendicular to the Sun direction: where the Sun is on the
 * horizon of a smooth Moon (the terminator), as x, y, z triplets.
 */
export function terminatorPoints(sun: Vec3, radius = TERMINATOR_RADIUS, n = 256): Float32Array {
  const l = Math.hypot(sun[0], sun[1], sun[2]);
  const d = [sun[0] / l, sun[1] / l, sun[2] / l] as const;
  // Any axis not parallel to d, then two unit vectors spanning the plane perpendicular to it.
  const a = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let u = [d[1] * a[2]! - d[2] * a[1]!, d[2] * a[0]! - d[0] * a[2]!, d[0] * a[1]! - d[1] * a[0]!];
  const ul = Math.hypot(u[0]!, u[1]!, u[2]!);
  u = u.map((x) => x / ul);
  const v = [d[1] * u[2]! - d[2] * u[1]!, d[2] * u[0]! - d[0] * u[2]!, d[0] * u[1]! - d[1] * u[0]!];
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const t = (2 * Math.PI * i) / n;
    for (let k = 0; k < 3; k++)
      out[i * 3 + k] = radius * (u[k]! * Math.cos(t) + v[k]! * Math.sin(t));
  }
  return out;
}
