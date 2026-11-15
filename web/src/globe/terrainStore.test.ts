import { beforeEach, describe, expect, it } from 'vitest';
import { PATCH_SHOW_DISTANCE, loadTerrain, patchShownAt, useTerrain } from './terrainStore';

const header = {
  radius_m: 1737400,
  width_px: 2,
  height_px: 2,
  sample_0_0_m: [-1, 1],
  sample_step_col_m: [2, 0],
  sample_step_row_m: [0, -2],
  height_reference_radius_m: 1737400,
  heights: {
    file: 'terrain/heights.f32',
    encoding: 'float32-le',
    scale: 1,
    offset: 0,
    nodata: 'NaN',
  },
  mask: { file: 'terrain/valid.u8', valid: 1 },
  bounds_m: [-1, -1, 1, 1],
  lat_limit: -80,
};

const res = (body: unknown, type = 'application/octet-stream', ok = true) =>
  ({
    ok,
    status: ok ? 200 : 404,
    headers: new Headers({ 'content-type': type }),
    json: () => Promise.resolve(body),
    arrayBuffer: () => Promise.resolve(body as ArrayBuffer),
  }) as unknown as Response;

const heights = new Float32Array([1, 2, 3, 4]).buffer;

function fakeFetch(maskResponse: Response) {
  const calls: string[] = [];
  const f = (url: string) => {
    calls.push(url);
    if (url.endsWith('heightmap.json')) return Promise.resolve(res(header, 'application/json'));
    if (url.endsWith('heights.f32')) return Promise.resolve(res(heights));
    return Promise.resolve(maskResponse);
  };
  return { f: f as unknown as typeof fetch, calls };
}

describe('loadTerrain', () => {
  beforeEach(() =>
    useTerrain.setState({ status: 'idle', header: null, heights: null, mask: null }),
  );

  it('loads header and heights; uses NaN heights when the mask file is missing', async () => {
    // Vite answers a missing file with index.html and HTTP 200: that must not count as a mask.
    const { f } = fakeFetch(res('<html>', 'text/html'));
    await loadTerrain(f);
    const s = useTerrain.getState();
    expect(s.status).toBe('ready');
    expect(Array.from(s.heights!)).toEqual([1, 2, 3, 4]);
    expect(s.mask).toBeNull();
  });

  it('uses the mask when it exists with the right size', async () => {
    const { f } = fakeFetch(res(new Uint8Array([1, 0, 1, 1]).buffer));
    await loadTerrain(f);
    expect(Array.from(useTerrain.getState().mask!)).toEqual([1, 0, 1, 1]);
  });

  it('fetches once for repeated calls and reports errors', async () => {
    const { f, calls } = fakeFetch(res('<html>', 'text/html'));
    await Promise.all([loadTerrain(f), loadTerrain(f)]);
    await loadTerrain(f);
    expect(calls.filter((c) => c.endsWith('heights.f32'))).toHaveLength(1);

    useTerrain.setState({ status: 'idle' });
    await loadTerrain((() =>
      Promise.resolve(res({}, 'application/json', false))) as unknown as typeof fetch);
    expect(useTerrain.getState().status).toBe('error');
  });
});

describe('patchShownAt', () => {
  /** Camera at `d` from the centre, `latDeg` latitude (lon 0). */
  const cam = (d: number, latDeg: number): [number, number, number] => {
    const p = (latDeg * Math.PI) / 180;
    return [d * Math.cos(p), d * Math.sin(p), 0];
  };

  it('shows within one distance (beyond the South pole view at 1.3) and hides past it', () => {
    expect(patchShownAt(cam(1.3, -89))).toBe(true);
    expect(patchShownAt(cam(PATCH_SHOW_DISTANCE - 1e-9, -89))).toBe(true);
    expect(patchShownAt(cam(PATCH_SHOW_DISTANCE + 0.01, -89))).toBe(false);
  });

  it('needs the camera over the south polar region', () => {
    expect(patchShownAt(cam(1.1, -60))).toBe(true);
    expect(patchShownAt(cam(1.2, -40))).toBe(false);
  });
});
