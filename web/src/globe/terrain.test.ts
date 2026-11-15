import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { projectSouthPolar } from '@/core/projection';
import {
  buildPatchArrays,
  float32LE,
  gridXY,
  sampleHeight,
  stereoInverse,
  xyToGrid,
  type HeightmapHeader,
} from './terrain';

const R = 1_737_400;

/** Small synthetic header: 3×3 vertices, 1000 m apart, centred on the pole, row 0 = max y. */
const header = (w = 3): HeightmapHeader => ({
  radius_m: R,
  width_px: w,
  height_px: w,
  sample_0_0_m: [-1000, 1000],
  sample_step_col_m: [1000, 0],
  sample_step_row_m: [0, -1000],
  height_reference_radius_m: R,
  heights: { file: 'x', encoding: 'float32-le', scale: 1, offset: 0, nodata: 'NaN' },
  bounds_m: [-1000, -1000, 1000, 1000],
  lat_limit: -80,
});

describe('stereographic inverse', () => {
  it('inverts projectSouthPolar (@/core)', () => {
    for (const [lat, lon] of [
      [-89.9, 0],
      [-85, 120],
      [-80.5, -45],
      [-88.25, -95],
    ] as const) {
      const [x, y] = projectSouthPolar(lat, lon, R);
      const [lat2, lon2] = stereoInverse(x, y, R);
      expect(lat2).toBeCloseTo(lat, 9);
      expect(lon2).toBeCloseTo(lon, 9);
    }
    expect(stereoInverse(0, 0, R)).toEqual([-90, 0]);
  });

  it('puts the ±304 km edge of the patch at 80°S', () => {
    expect(stereoInverse(0, 304006, R)[0]).toBeCloseTo(-80, 2);
  });
});

describe('grid geometry from the header', () => {
  it('maps row/col to x/y with row 0 at max y, and back', () => {
    const h = header();
    expect(gridXY(h, 0, 0)).toEqual([-1000, 1000]);
    expect(gridXY(h, 2, 2)).toEqual([1000, -1000]);
    expect(xyToGrid(h, 0, 0)).toEqual([1, 1]);
  });
});

describe('sampleHeight (bilinear)', () => {
  const h = header();
  // Heights grow with column (0, 10, 20 m) and with row (+100 m per row).
  const heights = new Float32Array([0, 10, 20, 100, 110, 120, 200, 210, 220]);

  it('returns grid values at samples and interpolates between them', () => {
    expect(sampleHeight(h, heights, -1000, 1000)).toBeCloseTo(0);
    expect(sampleHeight(h, heights, 1000, -1000)).toBeCloseTo(220);
    expect(sampleHeight(h, heights, -500, 500)).toBeCloseTo(55); // between rows 0–1, cols 0–1
    expect(sampleHeight(h, heights, 1000, 0)).toBeCloseTo(120); // right edge
  });

  it('is NaN outside the grid or next to missing data', () => {
    expect(sampleHeight(h, heights, 1500, 0)).toBeNaN();
    const holes = heights.slice();
    holes[4] = NaN;
    expect(sampleHeight(h, holes, -500, 500)).toBeNaN();
    const mask = new Uint8Array(9).fill(1);
    mask[0] = 0;
    expect(
      sampleHeight({ ...h, mask: { file: 'm', valid: 1 } }, heights, -900, 900, mask),
    ).toBeNaN();
  });
});

describe('buildPatchArrays', () => {
  it('puts each vertex at (R + h·exaggeration)/R on the sphere', () => {
    const h = header();
    const heights = new Float32Array(9).fill(1737.4); // 1 per mille of R
    const a1 = buildPatchArrays(h, heights, 1, 1);
    const a2 = buildPatchArrays(h, heights, 1, 2);
    const r = (a: Float32Array, k: number) => Math.hypot(a[k * 3]!, a[k * 3 + 1]!, a[k * 3 + 2]!);
    expect(r(a1.positions, 4)).toBeCloseTo(1.001, 6); // float32 positions
    expect(r(a2.positions, 4)).toBeCloseTo(1.002, 6);
    expect(a1.positions[4 * 3 + 1]).toBeLessThan(-1); // the pole sample is at −Y (south)
  });

  it('subsamples with step and only keeps triangles with three valid vertices', () => {
    const h = header(5);
    const heights = new Float32Array(25).fill(0);
    expect(buildPatchArrays(h, heights, 2, 1).n).toBe(3);
    const full = buildPatchArrays(h, heights, 1, 1);
    expect(full.indices.length).toBe(4 * 4 * 2 * 3);
    heights[12] = NaN; // centre vertex: the 8 triangles around it go
    const holed = buildPatchArrays(h, heights, 1, 1);
    expect(holed.indices.length).toBe((4 * 4 * 2 - 6) * 3);
    expect(holed.validVertices).toBe(24);
  });

  it('winds triangles outward (normals point away from the Moon centre)', () => {
    const a = buildPatchArrays(header(), new Float32Array(9).fill(0), 1, 1);
    const p = (k: number) => [
      a.positions[k * 3]!,
      a.positions[k * 3 + 1]!,
      a.positions[k * 3 + 2]!,
    ];
    const [i0, i1, i2] = [a.indices[0]!, a.indices[1]!, a.indices[2]!];
    const [A, B, C] = [p(i0), p(i1), p(i2)];
    const u = B.map((v, k) => v - A[k]!);
    const v = C.map((w, k) => w - A[k]!);
    const nrm = [
      u[1]! * v[2]! - u[2]! * v[1]!,
      u[2]! * v[0]! - u[0]! * v[2]!,
      u[0]! * v[1]! - u[1]! * v[0]!,
    ];
    expect(nrm[0]! * A[0]! + nrm[1]! * A[1]! + nrm[2]! * A[2]!).toBeGreaterThan(0);
  });
});

describe('real heightmap header', () => {
  const DATA = join(__dirname, '..', '..', 'public', 'data');
  const h = JSON.parse(
    readFileSync(join(DATA, 'terrain', 'heightmap.json'), 'utf8'),
  ) as HeightmapHeader;

  it('describes a vertex grid that spans its bounds', () => {
    expect(gridXY(h, 0, 0)).toEqual([h.bounds_m[0], h.bounds_m[3]]);
    const [x, y] = gridXY(h, h.height_px - 1, h.width_px - 1);
    expect(x).toBeCloseTo(h.bounds_m[2], 3);
    expect(y).toBeCloseTo(h.bounds_m[1], 3);
  });

  it('has a heights file of width × height float32 values', () => {
    const buf = readFileSync(join(DATA, h.heights.file));
    const heights = float32LE(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    expect(heights.length).toBe(h.width_px * h.height_px);
    const pole = sampleHeight(h, heights, 0, 0);
    expect(Number.isFinite(pole)).toBe(true);
  });
});
