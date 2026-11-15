/**
 * South polar terrain patch — owner: Marta (src/globe). v2 of docs/10 §5 Marta.
 *
 * Pure functions over Pablo's heightmap (web/public/data/terrain/heightmap.json + heights.f32):
 * grid → stereographic x/y → lat/lon → a point on the real sphere at (R + h·exaggeration)/R,
 * so lunar curvature comes out by itself. Nothing is hard-coded: size, origin, steps, radius and
 * nodata come from the header.
 */
import { latLonToVec3 } from './geo';

const DEG = Math.PI / 180;

/** The part of terrain/heightmap.json this module reads. */
export interface HeightmapHeader {
  radius_m: number;
  width_px: number;
  height_px: number;
  /** x, y (m) of sample [row 0, col 0]. */
  sample_0_0_m: [number, number];
  /** x, y step (m) when the column index grows by one. */
  sample_step_col_m: [number, number];
  /** x, y step (m) when the row index grows by one. */
  sample_step_row_m: [number, number];
  height_reference_radius_m: number;
  heights: { file: string; encoding: string; scale: number; offset: number; nodata: string };
  mask?: { file: string; valid: number };
  bounds_m: [number, number, number, number];
  lat_limit: number;
}

/** Inverse of `projectSouthPolar` (@/core): x, y in metres → [lat, lon] in degrees. */
export function stereoInverse(x: number, y: number, radiusM: number): [lat: number, lon: number] {
  const rho = Math.hypot(x, y);
  const lat = -90 + (2 * Math.atan(rho / (2 * radiusM))) / DEG;
  const lon = rho === 0 ? 0 : Math.atan2(x, y) / DEG;
  return [lat, lon];
}

/** Stereographic x, y (m) of grid sample (row, col). */
export function gridXY(h: HeightmapHeader, row: number, col: number): [x: number, y: number] {
  return [
    h.sample_0_0_m[0] + col * h.sample_step_col_m[0] + row * h.sample_step_row_m[0],
    h.sample_0_0_m[1] + col * h.sample_step_col_m[1] + row * h.sample_step_row_m[1],
  ];
}

/** Grid coordinates (fractional row, col) of stereographic x, y. Axis-aligned grids only. */
export function xyToGrid(h: HeightmapHeader, x: number, y: number): [row: number, col: number] {
  const col = (x - h.sample_0_0_m[0]) / h.sample_step_col_m[0];
  const row = (y - h.sample_0_0_m[1]) / h.sample_step_row_m[1];
  return [row, col];
}

/** Height (m) at a sample, NaN where there is no data (NaN value or mask = nodata). */
export function heightAt(
  h: HeightmapHeader,
  heights: Float32Array,
  row: number,
  col: number,
  mask?: Uint8Array | null,
): number {
  const i = row * h.width_px + col;
  if (mask && mask[i] !== (h.mask?.valid ?? 1)) return NaN;
  const v = heights[i]!;
  return Number.isFinite(v) ? v * h.heights.scale + h.heights.offset : NaN;
}

/** Bilinear height (m) at stereographic x, y; NaN outside the grid or next to a nodata sample. */
export function sampleHeight(
  h: HeightmapHeader,
  heights: Float32Array,
  x: number,
  y: number,
  mask?: Uint8Array | null,
): number {
  const [r, c] = xyToGrid(h, x, y);
  if (!(r >= 0 && c >= 0 && r <= h.height_px - 1 && c <= h.width_px - 1)) return NaN;
  const r0 = Math.min(Math.floor(r), h.height_px - 2);
  const c0 = Math.min(Math.floor(c), h.width_px - 2);
  const fr = r - r0;
  const fc = c - c0;
  const h00 = heightAt(h, heights, r0, c0, mask);
  const h01 = heightAt(h, heights, r0, c0 + 1, mask);
  const h10 = heightAt(h, heights, r0 + 1, c0, mask);
  const h11 = heightAt(h, heights, r0 + 1, c0 + 1, mask);
  const top = h00 + (h01 - h00) * fc;
  const bottom = h10 + (h11 - h10) * fc;
  return top + (bottom - top) * fr;
}

export interface PatchArrays {
  /** Vertices per side after subsampling. */
  n: number;
  positions: Float32Array;
  /** Triangles whose three vertices all have data. */
  indices: Uint32Array;
  validVertices: number;
}

/**
 * Mesh arrays for the patch, in globe units (Moon radius = 1). `step` subsamples the grid
 * (2 → 513×513 for the 1025 file). Vertices without data stay on the sphere but no triangle uses them.
 */
export function buildPatchArrays(
  h: HeightmapHeader,
  heights: Float32Array,
  step: number,
  exaggeration: number,
  mask?: Uint8Array | null,
): PatchArrays {
  const n = Math.floor((h.width_px - 1) / step) + 1;
  const positions = new Float32Array(n * n * 3);
  const valid = new Uint8Array(n * n);
  const R = h.radius_m;
  const ref = h.height_reference_radius_m;
  let validVertices = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const row = i * step;
      const col = j * step;
      const [x, y] = gridXY(h, row, col);
      const [lat, lon] = stereoInverse(x, y, R);
      const height = heightAt(h, heights, row, col, mask);
      const ok = Number.isFinite(height);
      const radius = ok ? (ref + height * exaggeration) / R : 1;
      const [px, py, pz] = latLonToVec3(lat, lon, radius);
      const k = (i * n + j) * 3;
      positions[k] = px;
      positions[k + 1] = py;
      positions[k + 2] = pz;
      if (ok) {
        valid[i * n + j] = 1;
        validVertices += 1;
      }
    }
  }
  const tris: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1; j++) {
      const a = i * n + j;
      const b = a + 1;
      const c = a + n;
      const d = c + 1;
      // Counter-clockwise seen from outside the Moon (the grid's row axis points south in y).
      if (valid[a] && valid[c] && valid[b]) tris.push(a, c, b);
      if (valid[b] && valid[c] && valid[d]) tris.push(b, c, d);
    }
  }
  return { n, positions, indices: Uint32Array.from(tris), validVertices };
}

/** Decodes a float32 little-endian buffer on any platform. */
export function float32LE(buf: ArrayBuffer): Float32Array {
  const littleEndian = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
  if (littleEndian) return new Float32Array(buf);
  const view = new DataView(buf);
  const out = new Float32Array(buf.byteLength / 4);
  for (let i = 0; i < out.length; i++) out[i] = view.getFloat32(i * 4, true);
  return out;
}
