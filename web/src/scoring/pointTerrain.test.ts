import { describe, expect, it } from 'vitest';
import type { HeightmapHeader } from '@/globe/terrain';
import { slopeFromHeightmap } from './pointTerrain';

// 11x11 grid, 100 m spacing around the pole, height = 0.1 * x  → constant 5.71° slope in x.
const N = 11;
const header = {
  radius_m: 1737400,
  width_px: N,
  height_px: N,
  sample_0_0_m: [-500, 500],
  sample_step_col_m: [100, 0],
  sample_step_row_m: [0, -100],
  height_reference_radius_m: 1737400,
  heights: { file: 'x', encoding: 'f32', scale: 1, offset: 0, nodata: 'nan' },
  bounds_m: [-500, -500, 500, 500],
  lat_limit: -80,
} as HeightmapHeader;
const heights = new Float32Array(N * N);
for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) heights[r * N + c] = 0.1 * (-500 + c * 100);

describe('slopeFromHeightmap', () => {
  it('derives slope and states the baseline', () => {
    const lat = -90 + (2 * Math.atan(100 / (2 * 1737400)) * 180) / Math.PI; // ~100 m from the pole
    const s = slopeFromHeightmap(header, heights, null, lat, 90); // x = +100, y ≈ 0
    expect(s?.slope_deg).toBeCloseTo(Math.atan(0.1) * (180 / Math.PI), 1);
    expect(s?.baseline_m).toBe(200);
  });
  it('is null outside the patch', () => {
    expect(slopeFromHeightmap(header, heights, null, -60, 0)).toBeNull();
    expect(slopeFromHeightmap(header, heights, null, -89.99, 0)).not.toBeNull();
    expect(slopeFromHeightmap(header, heights, null, -85, 0)).toBeNull(); // beyond the 500 m grid
    expect(slopeFromHeightmap(header, heights, null, 10, 0)).toBeNull();
  });
});
