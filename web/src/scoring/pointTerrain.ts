/**
 * Slope of a free lat/lon from Pablo's polar heightmap (pure). Only available where the heightmap
 * has valid samples (the south-polar patch); anywhere else the slope stays "not measured".
 */
import { projectSouthPolar } from '@/core/projection';
import { sampleHeight, type HeightmapHeader } from '@/globe/terrain';

export interface PointSlope {
  slope_deg: number;
  /** Finite-difference baseline, metres (2 grid steps: one on each side of the point). */
  baseline_m: number;
}

/** Central-difference slope (degrees) at lat/lon, or null outside the patch / on nodata. */
export function slopeFromHeightmap(
  h: HeightmapHeader,
  heights: Float32Array,
  mask: Uint8Array | null,
  lat: number,
  lon: number,
): PointSlope | null {
  if (!(lat <= h.lat_limit)) return null;
  const [x, y] = projectSouthPolar(lat, lon, h.radius_m);
  const d = Math.abs(h.sample_step_col_m[0]);
  if (!(d > 0)) return null;
  const hx1 = sampleHeight(h, heights, x + d, y, mask);
  const hx0 = sampleHeight(h, heights, x - d, y, mask);
  const hy1 = sampleHeight(h, heights, x, y + d, mask);
  const hy0 = sampleHeight(h, heights, x, y - d, mask);
  const g = Math.hypot((hx1 - hx0) / (2 * d), (hy1 - hy0) / (2 * d));
  if (!Number.isFinite(g)) return null;
  return { slope_deg: (Math.atan(g) * 180) / Math.PI, baseline_m: 2 * d };
}
