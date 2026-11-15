/** Stereographic UVs for map layers on the polar patch (Javi, @javiseirulo; used by PolarPatch). */
import type { HeightmapHeader } from './terrain';

/**
 * UVs for the patch grid (n×n vertices, `step` subsampling) in the layers.json bounds:
 * u = (x − x0)/(x1 − x0), v = (y − y0)/(y1 − y0), so a PNG (row 0 = max y, flipY) lands pixel on pixel.
 */
export function patchUvs(
  h: HeightmapHeader,
  n: number,
  step: number,
  bounds: readonly [number, number, number, number],
): Float32Array {
  const [x0, y0, x1, y1] = bounds;
  const uv = new Float32Array(n * n * 2);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const r = i * step;
      const c = j * step;
      const x = h.sample_0_0_m[0] + c * h.sample_step_col_m[0] + r * h.sample_step_row_m[0];
      const y = h.sample_0_0_m[1] + c * h.sample_step_col_m[1] + r * h.sample_step_row_m[1];
      uv[(i * n + j) * 2] = (x - x0) / (x1 - x0);
      uv[(i * n + j) * 2 + 1] = (y - y0) / (y1 - y0);
    }
  }
  return uv;
}
