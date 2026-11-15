import { describe, expect, it } from 'vitest';
import { patchUvs } from './layerUv';
import type { HeightmapHeader } from './terrain';

const h = {
  sample_0_0_m: [-10, 10],
  sample_step_col_m: [10, 0],
  sample_step_row_m: [0, -10],
} as unknown as HeightmapHeader;

describe('patchUvs', () => {
  it('maps row 0 / col 0 to the top-left (u 0, v 1) and the last sample to (1, 0)', () => {
    const uv = patchUvs(h, 3, 1, [-10, -10, 10, 10]);
    expect([uv[0], uv[1]]).toEqual([0, 1]);
    expect([uv[16], uv[17]]).toEqual([1, 0]);
    expect([uv[8], uv[9]]).toEqual([0.5, 0.5]);
  });
});
