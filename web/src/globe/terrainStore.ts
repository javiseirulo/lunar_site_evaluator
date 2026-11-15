/**
 * Polar terrain state — owner: Marta (src/globe). Local, not shared.
 * Nothing is fetched until the user gets close to the south pole or presses the pole marker.
 */
import { create } from 'zustand';
import { dataUrl } from '@/core';
import { float32LE, type HeightmapHeader } from './terrain';

export type TerrainStatus = 'idle' | 'loading' | 'ready' | 'error';

interface TerrainState {
  status: TerrainStatus;
  header: HeightmapHeader | null;
  heights: Float32Array | null;
  /** Optional validity mask (terrain/valid.u8); without it, NaN heights mark missing data. */
  mask: Uint8Array | null;
  /** 1025×1025 instead of the default 513×513. */
  highDetail: boolean;
  /** Vertical exaggeration: 1 (default) or 2 (labelled on screen). */
  exaggeration: 1 | 2;
  setHighDetail: (on: boolean) => void;
  setExaggeration: (x: 1 | 2) => void;
}

export const useTerrain = create<TerrainState>()((set) => ({
  status: 'idle',
  header: null,
  heights: null,
  mask: null,
  highDetail: false,
  exaggeration: 1,
  setHighDetail: (highDetail) => set({ highDetail }),
  setExaggeration: (exaggeration) => set({ exaggeration }),
}));

/** A response is a real binary file (Vite answers missing files with index.html and HTTP 200). */
function isBinary(res: Response): boolean {
  return res.ok && !(res.headers.get('content-type') ?? '').includes('html');
}

let inflight: Promise<void> | null = null;

/** Loads the heightmap once (again only after an error). */
export function loadTerrain(fetchImpl: typeof fetch = fetch): Promise<void> {
  if (useTerrain.getState().status === 'ready') return Promise.resolve();
  if (inflight) return inflight;
  useTerrain.setState({ status: 'loading' });
  inflight = (async () => {
    const res = await fetchImpl(dataUrl('terrain/heightmap.json'));
    if (!res.ok) throw new Error(`heightmap.json: HTTP ${res.status}`);
    const header = (await res.json()) as HeightmapHeader;
    const count = header.width_px * header.height_px;
    const hRes = await fetchImpl(dataUrl(header.heights.file));
    if (!isBinary(hRes)) throw new Error(`${header.heights.file}: not available`);
    const heights = float32LE(await hRes.arrayBuffer());
    if (heights.length !== count)
      throw new Error(`${header.heights.file}: expected ${count} values`);
    let mask: Uint8Array | null = null;
    if (header.mask?.file) {
      // The mask is optional: without it, NaN heights already mark the holes.
      const mRes = await fetchImpl(dataUrl(header.mask.file)).catch(() => null);
      if (mRes && isBinary(mRes)) {
        const m = new Uint8Array(await mRes.arrayBuffer());
        if (m.length === count) mask = m;
      }
    }
    useTerrain.setState({ status: 'ready', header, heights, mask });
  })()
    .catch(() => useTerrain.setState({ status: 'error', header: null, heights: null, mask: null }))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
